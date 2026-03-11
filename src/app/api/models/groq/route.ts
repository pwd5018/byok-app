import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decryptApiKey } from "@/lib/crypto";
import { listGroqModels } from "@/lib/groq";
import { mergeGroqModels } from "@/lib/modelCatalog";

function isDatabaseAvailabilityError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P1011"].includes(error.code)
    );
}

export async function GET() {
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

        const liveModelIds = await listGroqModels(apiKey);

        return NextResponse.json({
            provider: "groq",
            models: mergeGroqModels(liveModelIds),
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
            error instanceof Error ? error.message : "Failed to load Groq models";

        return NextResponse.json({ error: message }, { status: 500 });
    }
}
