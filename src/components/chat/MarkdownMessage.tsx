"use client";

import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";

type MarkdownMessageProps = {
    content: string;
    className?: string;
};

function normalizeContent(content: string) {
    return content
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>\s*<p>/gi, "\n\n");
}

const markdownComponents = {
    h1: ({ children }: { children?: React.ReactNode }) => <h1 className="display-font mt-6 text-3xl font-semibold text-slate-950 first:mt-0">{children}</h1>,
    h2: ({ children }: { children?: React.ReactNode }) => <h2 className="display-font mt-6 text-2xl font-semibold text-slate-950 first:mt-0">{children}</h2>,
    h3: ({ children }: { children?: React.ReactNode }) => <h3 className="mt-5 text-xl font-semibold text-slate-900 first:mt-0">{children}</h3>,
    p: ({ children }: { children?: React.ReactNode }) => <p className="mt-4 leading-7 first:mt-0">{children}</p>,
    ul: ({ children }: { children?: React.ReactNode }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
    ol: ({ children }: { children?: React.ReactNode }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
    li: ({ children }: { children?: React.ReactNode }) => <li className="pl-1">{children}</li>,
    blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="mt-4 overflow-x-auto rounded-r-2xl border-l-4 border-amber-300 bg-amber-50/70 px-4 py-3 italic text-slate-700">
            {children}
        </blockquote>
    ),
    a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
        <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-slate-900 underline decoration-amber-300 underline-offset-4"
        >
            {children}
        </a>
    ),
    code: ({ children, className: codeClassName, ...props }: { children?: React.ReactNode; className?: string }) => {
        const match = /language-(\w+)/.exec(codeClassName || "");
        const value = String(children).replace(/\n$/, "");

        if (!match) {
            return (
                <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.95em] text-slate-900 break-all">
                    {children}
                </code>
            );
        }

        return (
            <div className="mt-4 w-full overflow-x-auto">
                <SyntaxHighlighter
                    {...props}
                    PreTag="div"
                    language={match[1]}
                    style={oneLight}
                    customStyle={{
                        marginTop: 0,
                        marginBottom: 0,
                        borderRadius: "20px",
                        border: "1px solid rgba(148, 163, 184, 0.28)",
                        padding: "1rem",
                        fontSize: "0.9rem",
                        lineHeight: "1.7",
                        background: "rgba(248, 250, 252, 0.95)",
                        minWidth: 0,
                    }}
                    codeTagProps={{
                        style: {
                            fontFamily: "var(--font-code)",
                        },
                    }}
                >
                    {value}
                </SyntaxHighlighter>
            </div>
        );
    },
    pre: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    table: ({ children }: { children?: React.ReactNode }) => (
        <div className="mt-4 w-full overflow-x-auto">
            <table className="min-w-full border-collapse overflow-hidden rounded-2xl border border-slate-200 bg-white">
                {children}
            </table>
        </div>
    ),
    thead: ({ children }: { children?: React.ReactNode }) => <thead className="bg-slate-100 text-slate-700">{children}</thead>,
    th: ({ children }: { children?: React.ReactNode }) => <th className="border border-slate-200 px-3 py-2 text-left text-sm font-semibold">{children}</th>,
    td: ({ children }: { children?: React.ReactNode }) => <td className="border border-slate-200 px-3 py-2 text-sm align-top">{children}</td>,
    hr: () => <hr className="mt-6 border-slate-200" />,
};

const MarkdownMessage = memo(function MarkdownMessage({ content, className = "" }: MarkdownMessageProps) {
    const normalizedContent = normalizeContent(content);

    return (
        <div className={`markdown-body min-w-0 max-w-full overflow-x-hidden ${className}`.trim()}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {normalizedContent}
            </ReactMarkdown>
        </div>
    );
});

export default MarkdownMessage;
