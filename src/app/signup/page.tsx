"use client";

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
        <main className="min-h-screen flex items-center justify-center p-8">
            <form onSubmit={handleSignup} className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-bold">Create account</h1>

                <input
                    className="w-full rounded border px-3 py-2"
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    className="w-full rounded border px-3 py-2"
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button
                    className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                    disabled={loading}
                    type="submit"
                >
                    {loading ? "Creating..." : "Sign up"}
                </button>

                {message ? <p className="text-sm text-red-600">{message}</p> : null}
            </form>
        </main>
    );
}