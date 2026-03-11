import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
    throw new Error("Missing DATABASE_URL");
}

const parsedUrl = new URL(rawConnectionString);
const isLocalHost =
    parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1";

if (!isLocalHost) {
    if (!parsedUrl.searchParams.has("sslmode")) {
        parsedUrl.searchParams.set("sslmode", "require");
    }

    if (parsedUrl.searchParams.get("sslmode") === "require" && !parsedUrl.searchParams.has("uselibpqcompat")) {
        parsedUrl.searchParams.set("uselibpqcompat", "true");
    }
}

const adapter = new PrismaPg({
    connectionString: parsedUrl.toString(),
});

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
