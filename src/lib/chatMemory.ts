export type MemoryMode = "shared" | "provider" | "model" | "stateless";

export type ContextTarget = {
    provider: string;
    model: string;
};

export type ChatHistoryContextRecord = {
    role: string;
    content: string;
    provider: string | null;
    model: string | null;
    comparisonGroupId: string | null;
};

export type ChatMessageInput = {
    role: "system" | "user" | "assistant";
    content: string;
};

export function getMemoryMode(value: unknown): MemoryMode {
    if (value === "provider" || value === "model" || value === "shared") {
        return value;
    }

    return "stateless";
}

export function buildScopedHistoryMessages(
    records: ChatHistoryContextRecord[],
    memoryMode: MemoryMode,
    target: ContextTarget
): ChatMessageInput[] {
    if (memoryMode === "stateless") {
        return [];
    }

    if (memoryMode === "shared") {
        return records
            .filter((record) => record.role === "user" || record.role === "assistant")
            .map((record) => ({
                role: record.role as "user" | "assistant",
                content: record.content,
            }));
    }

    const matchingAssistantRecords = records.filter((record) => {
        if (record.role !== "assistant") {
            return false;
        }

        if (memoryMode === "provider") {
            return record.provider === target.provider;
        }

        return record.provider === target.provider && record.model === target.model;
    });

    const matchingComparisonGroups = new Set(
        matchingAssistantRecords
            .map((record) => record.comparisonGroupId)
            .filter((value): value is string => Boolean(value))
    );

    return records
        .filter((record) => {
            if (record.role === "assistant") {
                return matchingAssistantRecords.includes(record);
            }

            if (record.role !== "user") {
                return false;
            }

            if (record.comparisonGroupId && matchingComparisonGroups.has(record.comparisonGroupId)) {
                return true;
            }

            if (memoryMode === "provider") {
                return record.provider === target.provider;
            }

            return record.provider === target.provider && record.model === target.model;
        })
        .map((record) => ({
            role: record.role as "user" | "assistant",
            content: record.content,
        }));
}
