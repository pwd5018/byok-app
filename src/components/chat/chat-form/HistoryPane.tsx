import { memo } from "react";
import MarkdownMessage from "@/components/chat/MarkdownMessage";
import PurgeChatHistoryButton from "@/components/chat/PurgeChatHistoryButton";
import {
    getModelLabel,
    getProviderDefinition,
    isSupportedProvider,
} from "@/lib/modelCatalog";
import {
    formatTimestamp,
    getRoleLabel,
    GROUPS_PER_PAGE,
} from "./utils";
import type { ChatHistoryItem, ConversationGroup } from "./types";

type HistoryMessageProps = {
    message: ChatHistoryItem;
    showMetadata: boolean;
};

const HistoryMessage = memo(function HistoryMessage({ message, showMetadata }: HistoryMessageProps) {
    const isUser = message.role === "user";

    return (
        <div
            className={`rounded-[18px] border px-4 py-3 ${
                isUser
                    ? "border-amber-200/80 bg-amber-50/75"
                    : "border-slate-200/80 bg-white/80"
            }`}
            style={{
                contentVisibility: "auto",
                containIntrinsicSize: "220px",
            }}
        >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
                            isUser
                                ? "bg-amber-100 text-amber-800"
                                : "bg-slate-100 text-slate-700"
                        }`}
                    >
                        {getRoleLabel(message.role)}
                    </span>
                    {message.model ? (
                        <span className="text-[11px] text-slate-500">{getModelLabel(message.model) || message.model}</span>
                    ) : null}
                </div>
                <span className="text-[11px] text-slate-400">{formatTimestamp(message.createdAt)}</span>
            </div>

            {showMetadata && (message.runMode || message.provider || message.latencyMs !== null || message.totalTokens !== null || message.toolCalls !== null || message.comparisonGroupId) ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {message.runMode ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Mode:</span> {message.runMode}
                        </div>
                    ) : null}
                    {message.memoryMode ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Memory:</span> {message.memoryMode}
                        </div>
                    ) : null}
                    {message.provider && isSupportedProvider(message.provider) ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Provider:</span> {getProviderDefinition(message.provider).label}
                        </div>
                    ) : null}
                    {message.latencyMs !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Latency:</span> {message.latencyMs} ms
                        </div>
                    ) : null}
                    {message.totalTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Total tokens:</span> {message.totalTokens}
                        </div>
                    ) : null}
                    {message.promptTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Prompt tokens:</span> {message.promptTokens}
                        </div>
                    ) : null}
                    {message.completionTokens !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Completion tokens:</span> {message.completionTokens}
                        </div>
                    ) : null}
                    {message.toolCalls !== null ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600">
                            <span className="font-semibold text-slate-900">Tool calls:</span> {message.toolCalls}
                        </div>
                    ) : null}
                    {message.comparisonGroupId ? (
                        <div className="rounded-2xl bg-slate-100/90 px-3 py-2 text-xs text-slate-600 sm:col-span-2 xl:col-span-3">
                            <span className="font-semibold text-slate-900">Comparison group:</span> {message.comparisonGroupId}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {isUser ? (
                <p className="mt-2.5 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                    {message.content}
                </p>
            ) : (
                <div className="mt-2.5 text-sm text-slate-800">
                    <MarkdownMessage content={message.content} className="[&_p]:leading-6 [&_p]:text-slate-700" />
                </div>
            )}
        </div>
    );
});

type ConversationBlockProps = {
    group: ConversationGroup;
    index: number;
    showMetadata: boolean;
};

const ConversationBlock = memo(function ConversationBlock({ group, index, showMetadata }: ConversationBlockProps) {
    return (
        <section className="rounded-[22px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,247,242,0.92))] p-4 shadow-[0_10px_30px_rgba(20,33,61,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                        Exchange {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-xs text-slate-500">
                        {group.messages.length} message{group.messages.length === 1 ? "" : "s"}
                    </span>
                </div>
                <span className="text-[11px] text-slate-400">
                    {formatTimestamp(group.messages[group.messages.length - 1].createdAt)}
                </span>
            </div>

            <div className="mt-3 space-y-3">
                {group.messages.map((message) => (
                    <HistoryMessage key={message.id} message={message} showMetadata={showMetadata} />
                ))}
            </div>
        </section>
    );
});

type HistoryPaneProps = {
    conversationGroups: ConversationGroup[];
    visibleGroups: ConversationGroup[];
    hiddenGroupCount: number;
    showHistoryMetadata: boolean;
    onToggleMetadata: () => void;
    onLoadOlder: () => void;
    onHistoryPurged: () => void;
};

export default function HistoryPane({
    conversationGroups,
    visibleGroups,
    hiddenGroupCount,
    showHistoryMetadata,
    onToggleMetadata,
    onLoadOlder,
    onHistoryPurged,
}: HistoryPaneProps) {
    return (
        <section className="flex min-h-0 flex-col overflow-hidden rounded-[32px] bg-[rgba(255,251,245,0.76)] shadow-[0_20px_60px_rgba(20,33,61,0.08)] ring-1 ring-slate-200/70 backdrop-blur-[14px]">
            <div className="min-h-0 flex-1 overflow-y-auto p-5 pr-4 [scrollbar-gutter:stable]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <p className="eyebrow">Conversation log</p>
                        <h3 className="display-font text-xl font-semibold text-slate-950">Chat history</h3>
                        <p className="mt-1 text-sm text-slate-500">All history is loaded from the database, but only the newest exchanges are rendered at first.</p>
                    </div>
                    <div className="flex flex-wrap items-start justify-end gap-3">
                        <div className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-xs text-slate-600">
                            {conversationGroups.length} exchange{conversationGroups.length === 1 ? "" : "s"}
                        </div>
                        <button
                            type="button"
                            onClick={onToggleMetadata}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            {showHistoryMetadata ? "Hide metadata" : "Show metadata"}
                        </button>
                        <PurgeChatHistoryButton
                            disabled={!conversationGroups.length}
                            onPurged={onHistoryPurged}
                        />
                    </div>
                </div>

                {hiddenGroupCount > 0 ? (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-slate-200/80 bg-white/65 px-4 py-3 text-sm text-slate-600">
                        <span>
                            Showing the newest {visibleGroups.length} of {conversationGroups.length} exchanges.
                        </span>
                        <button
                            type="button"
                            onClick={onLoadOlder}
                            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50"
                        >
                            Load {Math.min(GROUPS_PER_PAGE, hiddenGroupCount)} older exchange{Math.min(GROUPS_PER_PAGE, hiddenGroupCount) === 1 ? "" : "s"}
                        </button>
                    </div>
                ) : null}

                <div className="mt-4 space-y-4">
                    {visibleGroups.length ? (
                        visibleGroups.map((group, index) => {
                            const absoluteIndex = conversationGroups.length - visibleGroups.length + index;

                            return (
                                <ConversationBlock
                                    key={group.id}
                                    group={group}
                                    index={absoluteIndex}
                                    showMetadata={showHistoryMetadata}
                                />
                            );
                        })
                    ) : (
                        <div className="rounded-[24px] border border-dashed border-slate-300 bg-white/60 px-5 py-8 text-sm text-slate-600">
                            No chat history yet. Send your first prompt to start building the conversation log.
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
