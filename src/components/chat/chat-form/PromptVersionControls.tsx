import type { PromptVersionType } from "@/lib/promptVersions";
import type { PromptVersionRecord } from "./types";

const PROMPT_VERSION_LABELS: Record<PromptVersionType, string> = {
    system: "System prompt",
    developer: "Developer prompt",
    user: "User prompt",
    template: "Template",
};

const PROMPT_VERSION_PLACEHOLDERS: Record<PromptVersionType, string> = {
    system: "Helpful system prompt",
    developer: "Structured developer prompt",
    user: "Favorite user prompt",
    template: "Reusable template",
};

type PromptVersionControlsProps = {
    type: PromptVersionType;
    selectedId: string;
    name: string;
    versions: PromptVersionRecord[];
    onSelectedIdChange: (value: string) => void;
    onNameChange: (value: string) => void;
    onApply: () => void;
    onSave: () => void;
    onDelete: () => void;
    applyLabel?: string;
};

export default function PromptVersionControls({
    type,
    selectedId,
    name,
    versions,
    onSelectedIdChange,
    onNameChange,
    onApply,
    onSave,
    onDelete,
    applyLabel = "Load",
}: PromptVersionControlsProps) {
    return (
        <div className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold text-slate-900">{PROMPT_VERSION_LABELS[type]}</p>
                    <p className="mt-1 text-xs text-slate-500">Save multiple versions and reload them whenever you want to repeat a setup.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{versions.length} saved</span>
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr_auto_auto]">
                <select
                    value={selectedId}
                    onChange={(event) => onSelectedIdChange(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                >
                    <option value="">Choose a saved {type} version</option>
                    {versions.map((version) => (
                        <option key={version.id} value={version.id}>{version.name}</option>
                    ))}
                </select>
                <input
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                    placeholder={PROMPT_VERSION_PLACEHOLDERS[type]}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-amber-100"
                />
                <button
                    type="button"
                    onClick={onApply}
                    disabled={!selectedId}
                    className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {applyLabel}
                </button>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onSave}
                        className="rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                        Save current
                    </button>
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={!selectedId}
                        className="rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}
