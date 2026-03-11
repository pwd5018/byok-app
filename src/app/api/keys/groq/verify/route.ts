import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { validateGroqApiKey } from "@/lib/groq";

export async function POST() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const record = await prisma.apiKey.findUnique({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: "groq",
                },
            },
        });

        if (!record) {
            return NextResponse.json(
                { error: "No saved Groq key found" },
                { status: 404 }
            );
        }

        const apiKey = decryptApiKey({
            encryptedKey: record.encryptedKey,
            keyIv: record.keyIv,
            keyTag: record.keyTag,
        });

        const validation = await validateGroqApiKey(apiKey);
        const now = new Date();

        await prisma.apiKey.update({
            where: { id: record.id },
            data: {
                status: validation.ok ? "valid" : "invalid",
                lastVerifiedAt: now,
                verificationError: validation.ok ? null : validation.error,
            },
        });

        if (!validation.ok) {
            return NextResponse.json(
                { valid: false, error: validation.error },
                { status: 400 }
            );
        }

        return NextResponse.json({ valid: true });
    } catch (error) {
        console.error("Verify Groq key error:", error);

        return NextResponse.json(
            { error: "Failed to verify API key" },
            { status: 500 }
        );
    }
}