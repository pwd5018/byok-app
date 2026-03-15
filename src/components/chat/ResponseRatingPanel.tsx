"use client";

import { RESPONSE_RATING_FIELDS, type ResponseScores } from "@/lib/responseRatings";

const FIELD_LABELS: Record<(typeof RESPONSE_RATING_FIELDS)[number], string> = {
    correctness: "Correctness",
    usefulness: "Usefulness",
    style: "Style",
    instructionFollowing: "Instruction following",
    safety: "Safety",
    conciseness: "Conciseness",
};

type ResponseRatingPanelProps = {
    messageId: string | null | undefined;
    scores: ResponseScores;
    saving: boolean;
    onChange: (field: (typeof RESPONSE_RATING_FIELDS)[number], value: number) => void;
    onSave: () => void;
};

export default function ResponseRatingPanel({ messageId, scores, saving, onChange, onSave }: ResponseRatingPanelProps) {
    return (
        <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Evaluation</p>
                    <h4 className="mt-1 text-sm font-semibold text-slate-900">Rate this output</h4>
                </div>
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!messageId || saving}
                    className="rounded-full border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {saving ? "Saving..." : "Save ratings"}
                </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {RESPONSE_RATING_FIELDS.map((field) => (
                    <label key={field} className="space-y-2 text-sm font-semibold text-slate-800">
                        <span>{FIELD_LABELS[field]}</span>
                        <select
                            value={scores[field] ?? ""}
                            onChange={(event) => onChange(field, Number(event.target.value))}
                            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                        >
                            <option value="">Not rated</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                        </select>
                    </label>
                ))}
            </div>
        </div>
    );
}
