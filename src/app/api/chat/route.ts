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
    DEFAULT_CHAT_MODEL,
    DEFAULT_CHAT_PROVIDER,
    findChatModel,
    getProviderDefinition,
    isSupportedProvider,
} from "@/lib/modelCatalog";

const DEFAULT_SYSTEM_PROMPT =
    "You are a helpful assistant inside a bring-your-own-key multi-provider app.";

function isDatabaseAvailabilityError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P1011"].includes(error.code)
    );
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const provider =
            typeof body.provider === "string" ? body.provider : DEFAULT_CHAT_PROVIDER;
        const model = typeof body.model === "string" ? body.model : DEFAULT_CHAT_MODEL;
        const controls = sanitizeGenerationControls(body.controls);
        const memoryMode = getMemoryMode(body.memoryMode);
        const systemPrompt = typeof body.systemPrompt === "string" && body.systemPrompt.trim()
            ? body.systemPrompt.trim()
            : DEFAULT_SYSTEM_PROMPT;
        const developerPrompt = typeof body.developerPrompt === "string" ? body.developerPrompt.trim() : "";
        const combinedSystemPrompt = developerPrompt ? `${systemPrompt}\n\nDeveloper instructions:\n${developerPrompt}` : systemPrompt;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        if (!isSupportedProvider(provider)) {
            return NextResponse.json(
                { error: "Unsupported provider" },
                { status: 400 }
            );
        }

        const selectedModel = findChatModel(provider, model);
        if (!selectedModel) {
            return NextResponse.json(
                { error: "Unsupported model" },
                { status: 400 }
            );
        }

        const apiKeyRecord = await prisma.apiKey.findUnique({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider,
                },
            },
        });

        if (!apiKeyRecord) {
            return NextResponse.json(
                { error: `No ${getProviderDefinition(provider).label} API key saved for this user` },
                { status: 400 }
            );
        }

        const apiKey = decryptApiKey({
            encryptedKey: apiKeyRecord.encryptedKey,
            keyIv: apiKeyRecord.keyIv,
            keyTag: apiKeyRecord.keyTag,
        });

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

        const messages: ChatMessageInput[] = [
            {
                role: "system",
                content: combinedSystemPrompt,
            },
            ...buildScopedHistoryMessages(historyRecords, memoryMode, {
                provider,
                model: selectedModel.id,
            }),
            {
                role: "user",
                content: prompt,
            },
        ];

        const startedAt = performance.now();
        const completion =
            provider === "groq"
                ? await createGroqChatCompletion({
                      apiKey,
                      model: selectedModel.id,
                      messages,
                      controls,
                  })
                : provider === "google"
                    ? await createGoogleChatCompletion({
                          apiKey,
                          model: selectedModel.id,
                          messages,
                          controls,
                      })
                    : provider === "together"
                        ? await createTogetherChatCompletion({
                              apiKey,
                              model: selectedModel.id,
                              messages,
                              controls,
                          })
                        : await createOpenRouterChatCompletion({
                              apiKey,
                              model: selectedModel.id,
                              messages,
                              controls,
                          });
        const latencyMs = Math.round(performance.now() - startedAt);

        const content = completion?.choices?.[0]?.message?.content;

        if (typeof content !== "string") {
            return NextResponse.json(
                { error: `${getProviderDefinition(provider).label} returned an unexpected response format` },
                { status: 502 }
            );
        }

        const now = new Date();
        const completionModel =
            typeof completion.model === "string" ? completion.model : selectedModel.id;

        const [, , assistantMessage] = await prisma.$transaction([
            prisma.apiKey.update({
                where: { id: apiKeyRecord.id },
                data: {
                    lastUsedAt: now,
                    status: "valid",
                    verificationError: null,
                },
            }),
            prisma.chatMessage.create({
                data: {
                    userId: session.user.id,
                    role: "user",
                    content: prompt,
                    provider,
                    model: selectedModel.id,
                    runMode: "single",
                    memoryMode,
                },
            }),
            prisma.chatMessage.create({
                data: {
                    userId: session.user.id,
                    role: "assistant",
                    content,
                    provider,
                    model: completionModel,
                    runMode: "single",
                    memoryMode,
                    latencyMs,
                    promptTokens: completion.usage?.prompt_tokens ?? null,
                    completionTokens: completion.usage?.completion_tokens ?? null,
                    totalTokens: completion.usage?.total_tokens ?? null,
                    toolCalls: Array.isArray(completion?.choices?.[0]?.message?.tool_calls)
                        ? completion.choices[0].message.tool_calls.length
                        : null,
                },
            }),
        ]);

        return NextResponse.json({
            output: content,
            model: completionModel,
            usage: completion.usage ?? null,
            latencyMs,
            memoryMode,
            messageId: assistantMessage.id,
            provider,
        });
    } catch (error) {
        if (isDatabaseAvailabilityError(error)) {
            return NextResponse.json(
                {
                    error: "The database is temporarily unavailable, so we could not load your saved API key or store chat history.",
                },
                { status: 503 }
            );
        }

        const message =
            error instanceof Error ? error.message : "Failed to generate response";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}


