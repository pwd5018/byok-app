import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { createGroqChatCompletion } from "@/lib/groq";
import { DEFAULT_CHAT_MODEL, DEFAULT_CHAT_PROVIDER, findGroqChatModel } from "@/lib/modelCatalog";

const systemPrompt =
    "You are a helpful assistant inside a bring-your-own-key Groq app.";

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
        const prompt =
            typeof body.prompt === "string" ? body.prompt.trim() : "";
        const provider =
            typeof body.provider === "string" ? body.provider : DEFAULT_CHAT_PROVIDER;
        const model =
            typeof body.model === "string" ? body.model : DEFAULT_CHAT_MODEL;

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        if (provider !== "groq") {
            return NextResponse.json(
                { error: "Unsupported provider" },
                { status: 400 }
            );
        }

        const selectedModel = findGroqChatModel(model);
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
                { error: "No Groq API key saved for this user" },
                { status: 400 }
            );
        }

        const groqApiKey = decryptApiKey({
            encryptedKey: apiKeyRecord.encryptedKey,
            keyIv: apiKeyRecord.keyIv,
            keyTag: apiKeyRecord.keyTag,
        });

        const completion = await createGroqChatCompletion({
            apiKey: groqApiKey,
            model: selectedModel.id,
            messages: [
                {
                    role: "system",
                    content: systemPrompt,
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const content = completion?.choices?.[0]?.message?.content;

        if (typeof content !== "string") {
            return NextResponse.json(
                { error: "Groq returned an unexpected response format" },
                { status: 502 }
            );
        }

        const now = new Date();
        const completionModel =
            typeof completion.model === "string" ? completion.model : selectedModel.id;

        await prisma.$transaction([
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
                },
            }),
            prisma.chatMessage.create({
                data: {
                    userId: session.user.id,
                    role: "assistant",
                    content,
                    model: completionModel,
                },
            }),
        ]);

        return NextResponse.json({
            output: content,
            model: completionModel,
            usage: completion.usage ?? null,
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
