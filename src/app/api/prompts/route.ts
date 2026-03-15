import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
    normalizePromptVersionContent,
    normalizePromptVersionName,
    sanitizePromptVersionType,
} from "@/lib/promptVersions";

export async function GET() {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const versions = await prisma.promptVersion.findMany({
        where: {
            userId: session.user.id,
        },
        orderBy: [
            { type: "asc" },
            { updatedAt: "desc" },
        ],
    });

    return NextResponse.json({ versions });
}

export async function POST(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const type = sanitizePromptVersionType(body.type);

    if (!type) {
        return NextResponse.json({ error: "Unsupported prompt version type" }, { status: 400 });
    }

    const content = normalizePromptVersionContent(body.content);

    if (!content) {
        return NextResponse.json({ error: "Prompt content is required" }, { status: 400 });
    }

    const version = await prisma.promptVersion.create({
        data: {
            userId: session.user.id,
            type,
            name: normalizePromptVersionName(body.name, type),
            content,
        },
    });

    return NextResponse.json({ version }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
    const session = await auth();

    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = req.nextUrl.searchParams.get("id")?.trim();

    if (!id) {
        return NextResponse.json({ error: "Prompt version id is required" }, { status: 400 });
    }

    await prisma.promptVersion.deleteMany({
        where: {
            id,
            userId: session.user.id,
        },
    });

    return NextResponse.json({ ok: true });
}
