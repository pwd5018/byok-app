import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    hasAnyResponseScore,
    normalizeResponseScores,
    summarizeModelRatings,
    type ResponseScores,
} from "@/lib/responseRatings";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ratings = await prisma.responseRating.findMany({
        where: {
            userId: session.user.id,
        },
        select: {
            correctness: true,
            usefulness: true,
            style: true,
            instructionFollowing: true,
            safety: true,
            conciseness: true,
            chatMessage: {
                select: {
                    provider: true,
                    model: true,
                },
            },
        },
    });

    const summary = summarizeModelRatings(
        ratings.map((rating) => ({
            provider: rating.chatMessage.provider,
            model: rating.chatMessage.model,
            scores: {
                correctness: rating.correctness,
                usefulness: rating.usefulness,
                style: rating.style,
                instructionFollowing: rating.instructionFollowing,
                safety: rating.safety,
                conciseness: rating.conciseness,
            } satisfies ResponseScores,
        }))
    );

    return NextResponse.json({ summary });
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const chatMessageId = typeof body.chatMessageId === "string" ? body.chatMessageId.trim() : "";
    const scores = normalizeResponseScores(body.scores);

    if (!chatMessageId) {
        return NextResponse.json({ error: "Chat message id is required" }, { status: 400 });
    }

    if (!hasAnyResponseScore(scores)) {
        return NextResponse.json({ error: "At least one rating score is required" }, { status: 400 });
    }

    const message = await prisma.chatMessage.findFirst({
        where: {
            id: chatMessageId,
            userId: session.user.id,
            role: "assistant",
        },
        select: {
            id: true,
            provider: true,
            model: true,
        },
    });

    if (!message) {
        return NextResponse.json({ error: "Assistant message not found" }, { status: 404 });
    }

    const rating = await prisma.responseRating.upsert({
        where: {
            chatMessageId: message.id,
        },
        update: {
            ...scores,
        },
        create: {
            userId: session.user.id,
            chatMessageId: message.id,
            ...scores,
        },
    });

    return NextResponse.json({ rating });
}
