import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { sanitizeGenerationControls } from "@/lib/chatOptions";
import { buildScopedHistoryMessages, getMemoryMode, type ChatHistoryContextRecord, type ChatMessageInput } from "@/lib/chatMemory";
import { createGoogleChatCompletion } from "@/lib/google";
import { createGroqChatCompletion } from "@/lib/groq";
import { createOpenRouterChatCompletion } from "@/lib/openrouter";
import { createTogetherChatCompletion } from "@/lib/together";
import {
    findChatModel,
    getProviderDefinition,
    isSupportedProvider,
    type SupportedProvider,
} from "@/lib/modelCatalog";

const DEFAULT_SYSTEM_PROMPT =
    "You are a helpful assistant inside a bring-your-own-key multi-provider app.";

type ComparisonTarget = {
    provider: SupportedProvider;
    model: string;
};

function isDatabaseAvailabilityError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P1011"].includes(error.code)
    );
}

async function runTarget(apiKey: string, target: ComparisonTarget, messages: ChatMessageInput[], controls: ReturnType<typeof sanitizeGenerationControls>) {
    const startedAt = performance.now();

    const completion =
        target.provider === "groq"
            ? await createGroqChatCompletion({
                  apiKey,
                  model: target.model,
                  messages,
                  controls,
              })
            : target.provider === "google"
                ? await createGoogleChatCompletion({
                      apiKey,
                      model: target.model,
                      messages,
                      controls,
                  })
                : target.provider === "together"
                    ? await createTogetherChatCompletion({
                          apiKey,
                          model: target.model,
                          messages,
                          controls,
                      })
                    : await createOpenRouterChatCompletion({
                          apiKey,
                          model: target.model,
                          messages,
                          controls,
                      });

    const latencyMs = Math.round(performance.now() - startedAt);
    const message = completion?.choices?.[0]?.message;
    const content = message?.content;

    if (typeof content !== "string") {
        throw new Error(
            `${getProviderDefinition(target.provider).label} returned an unexpected response format`
        );
    }

    return {
        provider: target.provider,
        model: typeof completion.model === "string" ? completion.model : target.model,
        output: content,
        usage: completion.usage ?? null,
        latencyMs,
        toolCalls: Array.isArray(message?.tool_calls) ? message.tool_calls.length : 0,
    };
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const controls = sanitizeGenerationControls(body.controls);
        const memoryMode = getMemoryMode(body.memoryMode);
        const rawTargets = Array.isArray(body.targets) ? (body.targets as unknown[]) : [];
        const systemPrompt = typeof body.systemPrompt === "string" && body.systemPrompt.trim()
            ? body.systemPrompt.trim()
            : DEFAULT_SYSTEM_PROMPT;
        const developerPrompt = typeof body.developerPrompt === "string" ? body.developerPrompt.trim() : "";
        const combinedSystemPrompt = developerPrompt ? `${systemPrompt}\n\nDeveloper instructions:\n${developerPrompt}` : systemPrompt;

        if (!prompt) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
        }

        const targets = rawTargets
            .map((target) => {
                if (!target || typeof target !== "object") return null;
                const record = target as Record<string, unknown>;
                if (typeof record.provider !== "string" || typeof record.model !== "string") {
                    return null;
                }
                if (!isSupportedProvider(record.provider)) {
                    return null;
                }
                const matchedModel = findChatModel(record.provider, record.model);
                if (!matchedModel) {
                    return null;
                }
                return {
                    provider: record.provider,
                    model: matchedModel.id,
                } satisfies ComparisonTarget;
            })
            .filter((target): target is ComparisonTarget => Boolean(target));

        if (targets.length < 2) {
            return NextResponse.json(
                { error: "Select at least two model targets to compare." },
                { status: 400 }
            );
        }

        const uniqueProviders = [...new Set(targets.map((target) => target.provider))];
        const apiKeyRecords = await prisma.apiKey.findMany({
            where: {
                userId: session.user.id,
                provider: {
                    in: uniqueProviders,
                },
            },
        });

        const apiKeyByProvider = new Map(
            apiKeyRecords.map((record) => [record.provider, decryptApiKey({
                encryptedKey: record.encryptedKey,
                keyIv: record.keyIv,
                keyTag: record.keyTag,
            })] as const)
        );

        const missingProviders = uniqueProviders.filter(
            (provider) => !apiKeyByProvider.has(provider)
        );

        if (missingProviders.length) {
            return NextResponse.json(
                {
                    error: `Missing saved API key for: ${missingProviders.map((provider) => getProviderDefinition(provider).label).join(", ")}`,
                },
                { status: 400 }
            );
        }

        const historyRecords: ChatHistoryContextRecord[] = memoryMode === "stateless"
            ? []
            : await prisma.chatMessage.findMany({
                  where: {
                      userId: session.user.id,
                      role: {
                          in: ["user", "assistant"],
                      },
                  },
                  orderBy: {
                      createdAt: "asc",
                  },
                  select: {
                      role: true,
                      content: true,
                      provider: true,
                      model: true,
                      comparisonGroupId: true,
                  },
              });

        const results = await Promise.all(
            targets.map(async (target) => {
                const apiKey = apiKeyByProvider.get(target.provider)!;

                try {
                    const messages: ChatMessageInput[] = [
                        {
                            role: "system",
                            content: combinedSystemPrompt,
                        },
                        ...buildScopedHistoryMessages(historyRecords, memoryMode, {
                            provider: target.provider,
                            model: target.model,
                        }),
                        {
                            role: "user",
                            content: prompt,
                        },
                    ];

                    const result = await runTarget(apiKey, target, messages, controls);
                    return {
                        ...result,
                        status: "success" as const,
                    };
                } catch (error) {
                    return {
                        provider: target.provider,
                        model: target.model,
                        status: "error" as const,
                        error:
                            error instanceof Error ? error.message : "Comparison request failed",
                        latencyMs: null,
                        usage: null,
                        toolCalls: 0,
                    };
                }
            })
        );

        const now = new Date();
        const comparisonGroupId = randomUUID();
        const successfulResults = results.filter((entry) => entry.status === "success");
        let savedResultsByKey = new Map<string, string>();

        if (successfulResults.length) {
            const transactionSteps = [
                prisma.chatMessage.create({
                    data: {
                        userId: session.user.id,
                        role: "user",
                        content: prompt,
                        runMode: "compare",
                        memoryMode,
                        comparisonGroupId,
                    },
                }),
                ...successfulResults.map((entry) =>
                    prisma.chatMessage.create({
                        data: {
                            userId: session.user.id,
                            role: "assistant",
                            content: entry.output,
                            provider: entry.provider,
                            model: entry.model,
                            runMode: "compare",
                            memoryMode,
                            comparisonGroupId,
                            latencyMs: entry.latencyMs,
                            promptTokens: entry.usage?.prompt_tokens ?? null,
                            completionTokens: entry.usage?.completion_tokens ?? null,
                            totalTokens: entry.usage?.total_tokens ?? null,
                            toolCalls: entry.toolCalls,
                        },
                    })
                ),
                prisma.apiKey.updateMany({
                    where: {
                        id: {
                            in: apiKeyRecords.map((record) => record.id),
                        },
                    },
                    data: {
                        lastUsedAt: now,
                        status: "valid",
                        verificationError: null,
                    },
                }),
            ];

            const transactionResults = await prisma.$transaction(transactionSteps);
            const savedAssistantMessages = transactionResults.slice(1, 1 + successfulResults.length) as Array<{ id: string }>;
            savedResultsByKey = new Map(
                successfulResults.map((entry, index) => [`${entry.provider}:${entry.model}`, savedAssistantMessages[index]?.id ?? ""])
            );
        }

        return NextResponse.json({
            results: results.map((entry) => ({
                ...entry,
                messageId:
                    entry.status === "success"
                        ? savedResultsByKey.get(`${entry.provider}:${entry.model}`) ?? null
                        : null,
            })),
            memoryMode,
        });
    } catch (error) {
        if (isDatabaseAvailabilityError(error)) {
            return NextResponse.json(
                {
                    error: "The database is temporarily unavailable, so we could not load your saved API keys or store comparison history.",
                },
                { status: 503 }
            );
        }

        return NextResponse.json(
            {
                error:
                    error instanceof Error ? error.message : "Failed to compare models",
            },
            { status: 500 }
        );
    }
}


