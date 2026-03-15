export const RESPONSE_RATING_FIELDS = [
    "correctness",
    "usefulness",
    "style",
    "instructionFollowing",
    "safety",
    "conciseness",
] as const;

export type ResponseRatingField = (typeof RESPONSE_RATING_FIELDS)[number];

export type ResponseScores = Partial<Record<ResponseRatingField, number | null>>;

export type ModelRatingSummary = {
    modelKey: string;
    provider: string | null;
    model: string | null;
    sampleCount: number;
    overallAverage: number | null;
    averages: Record<ResponseRatingField, number | null>;
};

export function normalizeResponseScores(input: unknown): ResponseScores {
    const source = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

    return Object.fromEntries(
        RESPONSE_RATING_FIELDS.map((field) => {
            const value = source[field];

            if (value === null || value === undefined || value === "") {
                return [field, null];
            }

            const numeric = Number(value);
            const isValid = Number.isInteger(numeric) && numeric >= 1 && numeric <= 5;
            return [field, isValid ? numeric : null];
        })
    ) as ResponseScores;
}

export function hasAnyResponseScore(scores: ResponseScores) {
    return RESPONSE_RATING_FIELDS.some((field) => typeof scores[field] === "number");
}

function average(values: number[]) {
    if (!values.length) {
        return null;
    }

    const total = values.reduce((sum, value) => sum + value, 0);
    return Number((total / values.length).toFixed(2));
}

export function summarizeModelRatings(
    rows: Array<{
        provider: string | null;
        model: string | null;
        scores: ResponseScores;
    }>
): ModelRatingSummary[] {
    const grouped = new Map<string, Array<{ provider: string | null; model: string | null; scores: ResponseScores }>>();

    for (const row of rows) {
        const key = `${row.provider ?? "unknown"}::${row.model ?? "unknown"}`;
        const current = grouped.get(key) ?? [];
        current.push(row);
        grouped.set(key, current);
    }

    return [...grouped.entries()]
        .map(([modelKey, items]) => {
            const perField = Object.fromEntries(
                RESPONSE_RATING_FIELDS.map((field) => {
                    const values = items
                        .map((item) => item.scores[field])
                        .filter((value): value is number => typeof value === "number");

                    return [field, average(values)];
                })
            ) as Record<ResponseRatingField, number | null>;

            const overallValues = Object.values(perField).filter((value): value is number => typeof value === "number");

            return {
                modelKey,
                provider: items[0]?.provider ?? null,
                model: items[0]?.model ?? null,
                sampleCount: items.length,
                overallAverage: average(overallValues),
                averages: perField,
            } satisfies ModelRatingSummary;
        })
        .sort((a, b) => {
            const overallA = a.overallAverage ?? -1;
            const overallB = b.overallAverage ?? -1;

            if (overallB !== overallA) {
                return overallB - overallA;
            }

            return b.sampleCount - a.sampleCount;
        });
}
