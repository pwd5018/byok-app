import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptApiKey, maskApiKey } from "@/lib/crypto";
import { validateGoogleApiKey } from "@/lib/google";
import { validateGroqApiKey } from "@/lib/groq";
import { validateOpenRouterApiKey } from "@/lib/openrouter";
import { validateTogetherApiKey } from "@/lib/together";
import {
    getProviderDefinition,
    isSupportedProvider,
    type SupportedProvider,
} from "@/lib/modelCatalog";

async function validateApiKey(provider: SupportedProvider, apiKey: string) {
    if (provider === "groq") {
        return validateGroqApiKey(apiKey);
    }

    if (provider === "google") {
        return validateGoogleApiKey(apiKey);
    }

    if (provider === "together") {
        return validateTogetherApiKey(apiKey);
    }

    return validateOpenRouterApiKey(apiKey);
}

function getProviderFromParams(params: { provider: string }) {
    if (!isSupportedProvider(params.provider)) {
        return null;
    }

    return params.provider;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const provider = getProviderFromParams(await params);

        if (!provider) {
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
        }

        const body = await req.json();
        const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

        if (!apiKey) {
            return NextResponse.json({ error: "API key is required" }, { status: 400 });
        }

        const validation = await validateApiKey(provider, apiKey);
        const encrypted = encryptApiKey(apiKey);
        const now = new Date();

        await prisma.apiKey.upsert({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider,
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
                provider,
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
                { error: validation.error, saved: true, valid: false },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            valid: true,
            provider,
            providerLabel: getProviderDefinition(provider).label,
        });
    } catch (error) {
        console.error("Save API key error:", error);
        return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
    }
}

export async function DELETE(
    _req: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const provider = getProviderFromParams(await params);

        if (!provider) {
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
        }

        await prisma.apiKey.deleteMany({
            where: {
                userId: session.user.id,
                provider,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Delete API key error:", error);
        return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }
}
