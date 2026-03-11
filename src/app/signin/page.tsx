import Link from "next/link";
import SignInForm from "@/components/auth/SignInForm";

export default function SignInPage() {
    return (
        <main className="app-shell min-h-screen px-6 py-10 sm:px-8 lg:px-10">
            <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <section className="space-y-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--muted)] backdrop-blur-sm">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Bring your own Groq key, keep control of access
                    </div>

                    <div className="space-y-4">
                        <p className="eyebrow">Groq Workspace</p>
                        <h1 className="display-font max-w-2xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                            Clean, private access to your AI workspace.
                        </h1>
                        <p className="text-balance max-w-xl text-lg leading-8 text-slate-600">
                            Sign in to manage your encrypted Groq API key, verify connectivity, and use your own account for chat requests.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="section-card p-4">
                            <p className="text-sm font-semibold text-slate-900">Encrypted at rest</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Keys are stored with AES-256-GCM and only surfaced as masked values.</p>
                        </div>
                        <div className="section-card p-4">
                            <p className="text-sm font-semibold text-slate-900">Fast verification</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Validate your saved key against Groq before you use it.</p>
                        </div>
                        <div className="section-card p-4">
                            <p className="text-sm font-semibold text-slate-900">Personal access</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Every user brings their own key, usage stays scoped to their account.</p>
                        </div>
                    </div>
                </section>

                <section className="glass-panel rounded-[32px] p-6 sm:p-8">
                    <div className="space-y-2">
                        <p className="eyebrow">Welcome back</p>
                        <h2 className="display-font text-3xl font-semibold text-slate-950">Sign in</h2>
                        <p className="text-sm leading-6 text-slate-600">
                            Enter your email and password to continue to your dashboard.
                        </p>
                    </div>

                    <SignInForm />

                    <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white/70 p-4 text-sm text-slate-600">
                        New here?{" "}
                        <Link href="/signup" className="font-semibold text-slate-900 underline decoration-amber-300 underline-offset-4">
                            Create an account
                        </Link>
                    </div>
                </section>
            </div>
        </main>
    );
}
