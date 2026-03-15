import assert from "node:assert/strict";
import { sanitizeGenerationControls } from "../src/lib/chatOptions.ts";
import {
    buildStructuredJsonDiff,
    buildTextDiff,
    compareResponseMetrics,
    tryParseResponseJson,
} from "../src/lib/responseDiffs.ts";
import {
    hasAnyResponseScore,
    normalizeResponseScores,
    summarizeModelRatings,
} from "../src/lib/responseRatings.ts";
import {
    isPromptVersionType,
    normalizePromptVersionContent,
    normalizePromptVersionName,
    sanitizePromptVersionType,
} from "../src/lib/promptVersions.ts";

function testResponseDiffs() {
    assert.deepEqual(buildTextDiff("alpha\nbeta", "alpha\ngamma"), [
        { type: "same", left: "alpha", right: "alpha" },
        { type: "remove", left: "beta" },
        { type: "add", right: "gamma" },
    ]);

    assert.deepEqual(buildTextDiff("left\nshared\nend", "shared\nright"), [
        { type: "remove", left: "left" },
        { type: "same", left: "shared", right: "shared" },
        { type: "remove", left: "end" },
        { type: "add", right: "right" },
    ]);

    assert.deepEqual(tryParseResponseJson('```json\n{"ok": true}\n```'), { ok: true });
    assert.deepEqual(tryParseResponseJson('```\n{"nested": [1,2]}\n```'), { nested: [1, 2] });
    assert.equal(tryParseResponseJson('not-json'), null);

    const structured = buildStructuredJsonDiff('{"ok":true}', '{"ok":false,"count":2}');
    assert.ok(structured);
    assert.equal(structured?.leftPretty, '{\n  "ok": true\n}');
    assert.equal(structured?.rightPretty, '{\n  "ok": false,\n  "count": 2\n}');
    assert.equal(structured?.diff.some((entry) => entry.type === "add"), true);
    assert.equal(buildStructuredJsonDiff('{"ok":true}', 'not-json'), null);

    assert.deepEqual(
        compareResponseMetrics({
            leftTokens: 120,
            rightTokens: 100,
            leftLatency: 800,
            rightLatency: 600,
        }),
        {
            leftTokens: 120,
            rightTokens: 100,
            tokenDelta: 20,
            leftLatency: 800,
            rightLatency: 600,
            latencyDelta: 200,
        }
    );

    assert.deepEqual(
        compareResponseMetrics({
            leftTokens: null,
            rightTokens: 100,
            leftLatency: 800,
            rightLatency: null,
        }),
        {
            leftTokens: null,
            rightTokens: 100,
            tokenDelta: null,
            leftLatency: 800,
            rightLatency: null,
            latencyDelta: null,
        }
    );
}

function testResponseRatings() {
    const scores = normalizeResponseScores({
        correctness: 5,
        usefulness: "3",
        style: 9,
        instructionFollowing: "",
        safety: 2.5,
        conciseness: 1,
    });

    assert.deepEqual(scores, {
        correctness: 5,
        usefulness: 3,
        style: null,
        instructionFollowing: null,
        safety: null,
        conciseness: 1,
    });

    assert.equal(hasAnyResponseScore({ correctness: null }), false);
    assert.equal(hasAnyResponseScore({ correctness: 4 }), true);
    assert.equal(hasAnyResponseScore({ usefulness: undefined, style: null }), false);

    const summary = summarizeModelRatings([
        { provider: "groq", model: "llama", scores: { correctness: 5, usefulness: 4 } },
        { provider: "groq", model: "llama", scores: { correctness: 3, usefulness: 2 } },
        { provider: "openai", model: "gpt", scores: { correctness: 5, safety: 5, conciseness: 4 } },
        { provider: null, model: null, scores: { style: 4 } },
    ]);

    assert.equal(summary.length, 3);
    assert.equal(summary[0].provider, "openai");
    assert.equal(summary[0].overallAverage, 4.67);
    assert.equal(summary[1].modelKey, "unknown::unknown");
    assert.equal(summary[1].averages.style, 4);
    assert.equal(summary[1].overallAverage, 4);
    assert.equal(summary[2].provider, "groq");
    assert.equal(summary[2].sampleCount, 2);
    assert.equal(summary[2].averages.correctness, 4);
    assert.equal(summary[2].averages.usefulness, 3);
    assert.equal(summary[2].overallAverage, 3.5);
  }

function testPromptVersions() {
    assert.equal(isPromptVersionType("system"), true);
    assert.equal(isPromptVersionType("bad"), false);
    assert.equal(sanitizePromptVersionType("developer"), "developer");
    assert.equal(sanitizePromptVersionType("bad"), null);
    assert.equal(normalizePromptVersionContent("  hello  "), "hello");
    assert.equal(normalizePromptVersionContent(42), "");
    assert.equal(normalizePromptVersionName("", "template"), "Template prompt");
    assert.equal(normalizePromptVersionName("  My prompt  ", "user"), "My prompt");
    assert.equal(
        normalizePromptVersionName("x".repeat(90), "system"),
        "x".repeat(80)
    );
}

function testGenerationControls() {
    assert.deepEqual(sanitizeGenerationControls(null), {});
    assert.deepEqual(
        sanitizeGenerationControls({
            temperature: 3,
            top_p: -1,
            max_tokens: 9000,
            frequency_penalty: -3,
            presence_penalty: 5,
            seed: 9999999999,
            reasoning_effort: "medium",
            verbosity: "high",
        }),
        {
            temperature: 2,
            top_p: 0,
            max_tokens: 4096,
            frequency_penalty: -2,
            presence_penalty: 2,
            seed: 2147483647,
            reasoning_effort: "medium",
            verbosity: "high",
        }
    );

    assert.deepEqual(
        sanitizeGenerationControls({
            temperature: 0.4,
            top_p: 0.8,
            max_tokens: 1000,
            frequency_penalty: 1,
            presence_penalty: -1,
            seed: 42,
            reasoning_effort: "invalid",
            verbosity: "invalid",
        }),
        {
            temperature: 0.4,
            top_p: 0.8,
            max_tokens: 1000,
            frequency_penalty: 1,
            presence_penalty: -1,
            seed: 42,
            reasoning_effort: undefined,
            verbosity: undefined,
        }
    );
}

function run() {
    testResponseDiffs();
    testResponseRatings();
    testPromptVersions();
    testGenerationControls();
    console.log("Unit tests passed.");
}

run();

