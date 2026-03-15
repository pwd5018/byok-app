import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { listGoogleModels } from "@/lib/google";
import { listGroqModels } from "@/lib/groq";
import { mergeProviderModels, isSupportedProvider } from "@/lib/modelCatalog";
import { listOpenRouterModels } from "@/lib/openrouter";
import { listTogetherModels } from "@/lib/together";

function isDatabaseAvailabilityError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P1011"].includes(error.code)
    );
}

export async function GET(
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
                { error: `No saved ${provider} key found` },
                { status: 404 }
            );
        }

        const apiKey = decryptApiKey({
            encryptedKey: record.encryptedKey,
            keyIv: record.keyIv,
            keyTag: record.keyTag,
        });

        const liveModels =
            provider === "groq"
                ? (await listGroqModels(apiKey)).map((id) => ({ id }))
                : provider === "google"
                    ? await listGoogleModels(apiKey)
                    : provider === "together"
                        ? await listTogetherModels(apiKey)
                        : await listOpenRouterModels(apiKey);

        return NextResponse.json({
            provider,
            models: mergeProviderModels(provider, liveModels),
            source: "live",
        });
    } catch (error) {
        if (isDatabaseAvailabilityError(error)) {
            return NextResponse.json(
                { error: "The database is temporarily unavailable." },
                { status: 503 }
            );
        }

        const message =
            error instanceof Error ? error.message : "Failed to load models";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
