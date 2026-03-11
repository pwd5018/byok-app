import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { createGroqChatCompletion } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();

        const prompt =
            typeof body.prompt === "string" ? body.prompt.trim() : "";

        if (!prompt) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        const apiKeyRecord = await prisma.apiKey.findUnique({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: "groq",
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
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful assistant inside a bring-your-own-key Groq app.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const content =
            completion?.choices?.[0]?.message?.content;

        if (typeof content !== "string") {
            return NextResponse.json(
                { error: "Groq returned an unexpected response format" },
                { status: 502 }
            );
        }

        await prisma.apiKey.update({
            where: { id: apiKeyRecord.id },
            data: {
                lastUsedAt: new Date(),
                status: "valid",
                verificationError: null,
            },
        });

        return NextResponse.json({
            output: content,
            model: completion.model,
            usage: completion.usage ?? null,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : "Failed to generate response";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}