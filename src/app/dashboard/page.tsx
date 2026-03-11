import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaveApiKeyForm from "@/components/keys/SaveApiKeyForm";
import VerifyApiKeyButton from "@/components/keys/VerifyApiKeyButton";
import DeleteApiKeyButton from "@/components/keys/DeleteApiKeyButton";
import SignOutButton from "@/components/auth/SignOutButton";
import ChatForm from "@/components/chat/ChatForm";

function formatDate(value: Date | null) {
    if (!value) return "Not yet";
    return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(value);
}

function getStatusTone(status: string | null) {
    if (status === "valid") {
        return "border-emerald-200 bg-emerald-50 text-emerald-700";
    }

    if (status === "invalid") {
        return "border-rose-200 bg-rose-50 text-rose-700";
    }

    return "border-slate-200 bg-slate-100 text-slate-600";
}

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/signin");
    }

    const [existingKey, chatHistory] = await Promise.all([
        prisma.apiKey.findUnique({
            where: {
                userId_provider: {
                    userId: session.user.id,
                    provider: "groq",
                },
            },
        }),
        prisma.chatMessage.findMany({
            where: {
                userId: session.user.id,
            },
            orderBy: {
                createdAt: "asc",
            },
            take: 20,
        }),
    ]);

    return (
        <main className="app-shell min-h-screen px-6 py-8 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-6xl space-y-6">
                <section className="glass-panel rounded-[32px] p-6 sm:p-8">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-4">
                            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--muted)]">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Signed in as {session.user.email}
                            </div>
                            <div>
                                <p className="eyebrow">Dashboard</p>
                                <h1 className="display-font text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                                    Manage your Groq access in one polished workspace.
                                </h1>
                                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                    Save your personal API key, verify its status, remove it when needed, and test prompts without leaving the app.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-[24px] border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-600">
                                Provider: <span className="font-semibold text-slate-900">Groq</span>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className="glass-panel rounded-[30px] p-6 sm:p-7">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="eyebrow">Credential status</p>
                                <h2 className="display-font text-2xl font-semibold text-slate-950">Groq API key</h2>
                                <p className="mt-2 text-sm leading-6 text-slate-600">
                                    Add a key once, then monitor validation and recent usage from this panel.
                                </p>
                            </div>
                            <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${getStatusTone(existingKey?.status ?? null)}`}>
                                {existingKey?.status ? existingKey.status : "Not configured"}
                            </span>
                        </div>

                        {existingKey ? (
                            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Saved key</p>
                                    <p className="mt-2 break-all font-mono text-sm text-slate-900">{existingKey.maskedKey}</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last verified</p>
                                    <p className="mt-2 text-sm text-slate-900">{formatDate(existingKey.lastVerifiedAt)}</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Last used</p>
                                    <p className="mt-2 text-sm text-slate-900">{formatDate(existingKey.lastUsedAt)}</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Provider</p>
                                    <p className="mt-2 text-sm text-slate-900">groq</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-white/55 p-5 text-sm leading-6 text-slate-600">
                                No Groq API key is saved yet. Add one below to unlock verification and chat.
                            </div>
                        )}

                        {existingKey?.verificationError ? (
                            <div className="mt-4 rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-700">
                                Last verification error: {existingKey.verificationError}
                            </div>
                        ) : null}

                        <div className="mt-6 rounded-[28px] border border-slate-200/80 bg-white/70 p-5">
                            {existingKey ? (
                                <div className="flex flex-wrap items-start gap-3">
                                    <VerifyApiKeyButton />
                                    <DeleteApiKeyButton />
                                </div>
                            ) : (
                                <SaveApiKeyForm />
                            )}
                        </div>
                    </div>

                    <aside className="space-y-6">
                        <div className="glass-panel rounded-[30px] p-6 sm:p-7">
                            <p className="eyebrow">Quick checks</p>
                            <h2 className="display-font text-2xl font-semibold text-slate-950">Workspace health</h2>

                            <div className="mt-5 grid gap-4">
                                <div className="section-card p-4">
                                    <p className="text-sm font-semibold text-slate-900">Authentication</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">Credentials-based sign-in is active for this session.</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-sm font-semibold text-slate-900">Encryption</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">Stored keys remain encrypted and only a masked preview is shown in the UI.</p>
                                </div>
                                <div className="section-card p-4">
                                    <p className="text-sm font-semibold text-slate-900">Prompt access</p>
                                    <p className="mt-2 text-sm leading-6 text-slate-600">Chat becomes available as soon as a Groq key is saved for your account.</p>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel rounded-[30px] p-6 sm:p-7">
                            <p className="eyebrow">What to do next</p>
                            <h2 className="display-font text-2xl font-semibold text-slate-950">Suggested flow</h2>
                            <ol className="mt-5 space-y-3 text-sm leading-6 text-slate-600">
                                <li className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">1. Save a Groq API key for your account.</li>
                                <li className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">2. Verify the credential and check the saved status.</li>
                                <li className="rounded-2xl border border-slate-200/80 bg-white/70 px-4 py-3">3. Send a test prompt in the playground below.</li>
                            </ol>
                        </div>
                    </aside>
                </section>

                {existingKey ? <ChatForm history={chatHistory} /> : null}
            </div>
        </main>
    );
}
