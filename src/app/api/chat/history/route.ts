import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

function isDatabaseAvailabilityError(error: unknown) {
    return (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P1008", "P1011"].includes(error.code)
    );
}

export async function DELETE() {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const deleted = await prisma.chatMessage.deleteMany({
            where: {
                userId: session.user.id,
            },
        });

        return NextResponse.json({
            success: true,
            deletedCount: deleted.count,
        });
    } catch (error) {
        if (isDatabaseAvailabilityError(error)) {
            return NextResponse.json(
                {
                    error: "The database is temporarily unavailable, so chat history could not be deleted.",
                },
                { status: 503 }
            );
        }

        console.error("Delete chat history error:", error);
        return NextResponse.json(
            { error: "Failed to delete chat history" },
            { status: 500 }
        );
    }
}

