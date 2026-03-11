import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import { validateGroqApiKey } from "@/lib/groq";

export async function POST(req: NextRequest) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const apiKey =
            typeof body.apiKey === "string" ? body.apiKey.trim() : "";

        if (!apiKey) {
            return NextResponse.json(
                { error: "API key is required" },
                { status: 400 }
            );
        }

        const validation = await validateGroqApiKey(apiKey);
        const encrypted = encryptApiKey(apiKey);
        const now = new Date();

        await prisma.apiKey.upsert({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: "groq",
                },
            },
            update: {
                encryptedKey: encrypted.encryptedKey,
                keyIv: encrypted.keyIv,
                keyTag: encrypted.keyTag,
                maskedKey: maskApiKey(apiKey),
                status: validation.ok ? "valid" : "invalid",
                lastVerifiedAt: now,
                verificationError: validation.ok ? null : validation.error,
            },
            create: {
                userId: session.user.id,
                provider: "groq",
                encryptedKey: encrypted.encryptedKey,
                keyIv: encrypted.keyIv,
                keyTag: encrypted.keyTag,
                maskedKey: maskApiKey(apiKey),
                status: validation.ok ? "valid" : "invalid",
                lastVerifiedAt: now,
                verificationError: validation.ok ? null : validation.error,
            },
        });

        if (!validation.ok) {
            return NextResponse.json(
                {
                    error: validation.error,
                    saved: true,
                    valid: false,
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            valid: true,
        });
    } catch (error) {
        console.error("Save Groq key error:", error);

        return NextResponse.json(
            { error: "Failed to save API key" },
            { status: 500 }
        );
    }
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await prisma.apiKey.deleteMany({
            where: {
                userId: session.user.id,
                provider: "groq",
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete Groq key error:", error);

        return NextResponse.json(
            { error: "Failed to delete API key" },
            { status: 500 }
        );
    }
}