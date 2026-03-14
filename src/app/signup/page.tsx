"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSignup(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const res = await fetch("/api/signup", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
            setMessage(data.error || "Signup failed");
            setLoading(false);
            return;
        }

        const loginResult = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (loginResult?.error) {
            setMessage("Account created, but sign-in failed");
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }

    return (
        <main className="app-shell min-h-screen px-6 py-10 sm:px-8 lg:px-10">
            <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
                <section className="glass-panel order-2 rounded-[32px] p-6 sm:p-8 lg:order-1">
                    <div className="space-y-2">
                        <p className="eyebrow">Create your workspace</p>
                        <h1 className="display-font text-3xl font-semibold text-slate-950 sm:text-4xl">Get set up in a minute</h1>
                        <p className="text-sm leading-6 text-slate-600">
                            Create an account to store and verify your provider keys, then start chatting with your own API access.
                        </p>
                    </div>

                    <form onSubmit={handleSignup} className="mt-8 space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-semibold text-slate-800">
                                Email
                            </label>
                            <input
                                id="email"
                                className="w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-semibold text-slate-800">
                                Password
                            </label>
                            <input
                                id="password"
                                className="w-full rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-teal-100"
                                type="password"
                                placeholder="At least 8 characters"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <div className="rounded-2xl border border-teal-100 bg-teal-50/80 p-4 text-sm leading-6 text-slate-700">
                            Your password is hashed before storage, and each provider key is encrypted separately once you add it.
                        </div>

                        <button
                            className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                            disabled={loading}
                            type="submit"
                        >
                            {loading ? "Creating account..." : "Create account"}
                        </button>

                        {message ? (
                            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                                {message}
                            </p>
                        ) : null}
                    </form>

                    <div className="mt-6 text-sm text-slate-600">
                        Already have an account?{" "}
                        <Link href="/signin" className="font-semibold text-slate-900 underline decoration-teal-300 underline-offset-4">
                            Sign in
                        </Link>
                    </div>
                </section>

                <section className="order-1 space-y-6 lg:order-2 lg:pl-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-white/60 px-4 py-2 text-sm text-[var(--muted)] backdrop-blur-sm">
                        <span className="h-2 w-2 rounded-full bg-teal-500" />
                        Personal provider access with modern account management
                    </div>

                    <div className="space-y-4">
                        <p className="eyebrow">Built for BYOK</p>
                        <h2 className="display-font max-w-2xl text-5xl font-semibold tracking-tight text-slate-900 sm:text-6xl">
                            A calmer control panel for your model credentials.
                        </h2>
                        <p className="text-balance max-w-xl text-lg leading-8 text-slate-600">
                            Keep your team-friendly app experience while each user connects with their own provider accounts and usage limits.
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="section-card p-5">
                            <p className="text-base font-semibold text-slate-900">Account security</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Passwords are hashed and sessions are handled through NextAuth credentials.</p>
                        </div>
                        <div className="section-card p-5">
                            <p className="text-base font-semibold text-slate-900">Key lifecycle</p>
                            <p className="mt-2 text-sm leading-6 text-slate-600">Save, verify, rotate, or remove your provider keys from one place.</p>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    );
}
