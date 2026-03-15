export type DiffLine = {
    type: "same" | "add" | "remove";
    left?: string;
    right?: string;
};

export type ResponseMetricComparison = {
    leftTokens: number | null;
    rightTokens: number | null;
    tokenDelta: number | null;
    leftLatency: number | null;
    rightLatency: number | null;
    latencyDelta: number | null;
};

function buildLcsTable(left: string[], right: string[]) {
    const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));

    for (let i = left.length - 1; i >= 0; i -= 1) {
        for (let j = right.length - 1; j >= 0; j -= 1) {
            if (left[i] === right[j]) {
                table[i][j] = table[i + 1][j + 1] + 1;
            } else {
                table[i][j] = Math.max(table[i + 1][j], table[i][j + 1]);
            }
        }
    }

    return table;
}

export function buildTextDiff(leftText: string, rightText: string): DiffLine[] {
    const left = leftText.split(/\r?\n/);
    const right = rightText.split(/\r?\n/);
    const table = buildLcsTable(left, right);
    const diff: DiffLine[] = [];
    let i = 0;
    let j = 0;

    while (i < left.length && j < right.length) {
        if (left[i] === right[j]) {
            diff.push({ type: "same", left: left[i], right: right[j] });
            i += 1;
            j += 1;
            continue;
        }

        if (table[i + 1][j] >= table[i][j + 1]) {
            diff.push({ type: "remove", left: left[i] });
            i += 1;
            continue;
        }

        diff.push({ type: "add", right: right[j] });
        j += 1;
    }

    while (i < left.length) {
        diff.push({ type: "remove", left: left[i] });
        i += 1;
    }

    while (j < right.length) {
        diff.push({ type: "add", right: right[j] });
        j += 1;
    }

    return diff;
}

function unwrapJsonFence(value: string) {
    const fenced = value.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
    return fenced ? fenced[1].trim() : value.trim();
}

export function tryParseResponseJson(value: string) {
    const candidate = unwrapJsonFence(value);

    try {
        return JSON.parse(candidate) as unknown;
    } catch {
        return null;
    }
}

export function buildStructuredJsonDiff(leftText: string, rightText: string) {
    const leftJson = tryParseResponseJson(leftText);
    const rightJson = tryParseResponseJson(rightText);

    if (leftJson === null || rightJson === null) {
        return null;
    }

    const leftPretty = JSON.stringify(leftJson, null, 2);
    const rightPretty = JSON.stringify(rightJson, null, 2);

    return {
        leftPretty,
        rightPretty,
        diff: buildTextDiff(leftPretty, rightPretty),
    };
}

export function compareResponseMetrics(input: {
    leftTokens: number | null;
    rightTokens: number | null;
    leftLatency: number | null;
    rightLatency: number | null;
}): ResponseMetricComparison {
    return {
        leftTokens: input.leftTokens,
        rightTokens: input.rightTokens,
        tokenDelta:
            input.leftTokens !== null && input.rightTokens !== null
                ? input.leftTokens - input.rightTokens
                : null,
        leftLatency: input.leftLatency,
        rightLatency: input.rightLatency,
        latencyDelta:
            input.leftLatency !== null && input.rightLatency !== null
                ? input.leftLatency - input.rightLatency
                : null,
    };
}
