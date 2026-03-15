import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
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

export async function POST(
    _req: Request,
    { params }: { params: Promise<{ provider: string }> }
) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { provider: rawProvider } = await params;

        if (!isSupportedProvider(rawProvider)) {
            return NextResponse.json({ error: "Unsupported provider" }, { status: 400 });
        }

        const provider = rawProvider;
        const providerDefinition = getProviderDefinition(provider);

        const record = await prisma.apiKey.findUnique({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider,
                },
            },
        });

        if (!record) {
            return NextResponse.json(
                { error: `No saved ${providerDefinition.label} key found` },
                { status: 404 }
            );
        }

        const apiKey = decryptApiKey({
            encryptedKey: record.encryptedKey,
            keyIv: record.keyIv,
            keyTag: record.keyTag,
        });

        const validation = await validateApiKey(provider, apiKey);
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
        console.error("Verify API key error:", error);
        return NextResponse.json({ error: "Failed to verify API key" }, { status: 500 });
    }
}
