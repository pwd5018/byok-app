import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaveApiKeyForm from "@/components/keys/SaveApiKeyForm";
import VerifyApiKeyButton from "@/components/keys/VerifyApiKeyButton";
import DeleteApiKeyButton from "@/components/keys/DeleteApiKeyButton";
import SignOutButton from "@/components/auth/SignOutButton";
import ChatForm from "@/components/chat/ChatForm";
import { PROVIDERS } from "@/lib/modelCatalog";

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

    let existingKeys: Awaited<ReturnType<typeof prisma.apiKey.findMany>> = [];
    let chatHistory: Awaited<ReturnType<typeof prisma.chatMessage.findMany>> = [];
    let databaseError = false;

    try {
        [existingKeys, chatHistory] = await Promise.all([
            prisma.apiKey.findMany({
                where: {
                    userId: session.user.id,
                    provider: {
                        in: PROVIDERS.map((provider) => provider.id),
                    },
                },
                orderBy: {
                    provider: "asc",
                },
            }),
            prisma.chatMessage.findMany({
                where: {
                    userId: session.user.id,
                },
                orderBy: {
                    createdAt: "asc",
                },
            }),
        ]);
    } catch (error) {
        databaseError = true;
        console.error("Dashboard database load failed:", error);
    }

    const keyByProvider = new Map(
        existingKeys.map((record) => [record.provider, record] as const)
    );
    const configuredProviders = PROVIDERS.filter((provider) =>
        keyByProvider.has(provider.id)
    );

    return (
        <main className="app-shell min-h-screen px-6 py-8 sm:px-8 lg:px-10 xl:h-screen xl:overflow-hidden">
            <div className="mx-auto flex max-w-[1720px] flex-col gap-6 xl:h-full xl:min-h-0">
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
                                    Manage your model providers in one polished workspace.
                                </h1>
                                <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                                    Save separate API keys per provider, verify each one, remove them when needed, and test prompts without leaving the app.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="rounded-[24px] border border-slate-200/80 bg-white/75 px-4 py-3 text-sm text-slate-600">
                                Providers: <span className="font-semibold text-slate-900">{PROVIDERS.map((provider) => provider.label).join(", ")}</span>
                            </div>
                            <SignOutButton />
                        </div>
                    </div>
                </section>

                {databaseError ? (
                    <section className="glass-panel rounded-[30px] border border-rose-200 bg-rose-50/80 p-6 text-rose-800 sm:p-7">
                        <p className="eyebrow text-rose-600">Database issue</p>
                        <h2 className="display-font mt-2 text-2xl font-semibold text-rose-900">The dashboard could not reach PostgreSQL</h2>
                        <p className="mt-3 max-w-3xl text-sm leading-7">
                            Your session is active, but the app timed out while loading your saved API keys and chat history. The remaining issue is the database connection path rather than the dashboard UI.
                        </p>
                    </section>
                ) : null}

                <div className="grid gap-6 xl:min-h-0 xl:flex-1 xl:grid-cols-[360px_minmax(0,1fr)] xl:items-stretch">
                    <aside className="space-y-6 xl:min-h-0 xl:overflow-y-auto xl:pr-2 [scrollbar-gutter:stable]">
                        <div className="glass-panel rounded-[30px] p-6 sm:p-7">
                            <p className="eyebrow">Providers</p>
                            <h2 className="display-font text-2xl font-semibold text-slate-950">Keys and access</h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Configure providers in the left rail while keeping the prompt workspace visible on the right.</p>
                        </div>

                        <div className="space-y-4">
                            {PROVIDERS.map((provider) => {
                                const existingKey = keyByProvider.get(provider.id) ?? null;

                                return (
                                    <div key={provider.id} className="glass-panel rounded-[26px] p-5 sm:p-6">
                                        <div className="flex flex-col gap-4">
                                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                <div>
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <h2 className="display-font text-xl font-semibold text-slate-950">{provider.label}</h2>
                                                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusTone(existingKey?.status ?? null)}`}>
                                                            {existingKey?.status ? existingKey.status : "Not configured"}
                                                        </span>
                                                    </div>
                                                    <p className="mt-2 text-sm leading-6 text-slate-600">
                                                        {provider.freeAccessNote}
                                                    </p>
                                                </div>
                                                <a
                                                    href={provider.signupUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-sm font-semibold text-slate-900 underline decoration-slate-300 underline-offset-4"
                                                >
                                                    Get a {provider.label} key
                                                </a>
                                            </div>

                                            {existingKey ? (
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5 sm:col-span-2">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Saved key</p>
                                                        <p className="mt-1 break-all font-mono text-xs text-slate-900">{existingKey.maskedKey}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Verified</p>
                                                        <p className="mt-1 text-xs text-slate-900">{formatDate(existingKey.lastVerifiedAt)}</p>
                                                    </div>
                                                    <div className="rounded-2xl border border-slate-200/80 bg-white/75 px-3 py-2.5">
                                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Last used</p>
                                                        <p className="mt-1 text-xs text-slate-900">{formatDate(existingKey.lastUsedAt)}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="rounded-[22px] border border-dashed border-slate-300 bg-white/55 px-4 py-4 text-sm leading-6 text-slate-600">
                                                    No {provider.label} API key is saved yet. Add one below to unlock verification and chat for this provider.
                                                </div>
                                            )}

                                            {existingKey?.verificationError ? (
                                                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-700">
                                                    Last verification error: {existingKey.verificationError}
                                                </div>
                                            ) : null}

                                            <div className="rounded-[24px] border border-slate-200/80 bg-white/70 p-4">
                                                {existingKey ? (
                                                    <div className="flex flex-wrap items-start gap-3">
                                                        <VerifyApiKeyButton provider={provider.id} />
                                                        <DeleteApiKeyButton provider={provider.id} />
                                                    </div>
                                                ) : (
                                                    <SaveApiKeyForm provider={provider.id} />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

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
                                    <p className="mt-2 text-sm leading-6 text-slate-600">Chat becomes available as soon as at least one provider key is saved for your account.</p>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <section className="xl:min-h-0 xl:overflow-hidden">
                        {configuredProviders.length ? (
                            <ChatForm history={chatHistory} configuredProviders={configuredProviders.map((provider) => provider.id)} />
                        ) : (
                            <div className="glass-panel flex h-full min-h-[24rem] flex-col justify-center rounded-[32px] p-8 text-center xl:min-h-0">
                                <p className="eyebrow">Prompt playground</p>
                                <h2 className="display-font mt-2 text-3xl font-semibold text-slate-950">Save a provider key to unlock the workspace</h2>
                                <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                                    Add at least one provider in the left rail. As soon as a key is saved, the chat, comparison, rating, and diff workflow will appear here without leaving the dashboard.
                                </p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </main>
    );
}





