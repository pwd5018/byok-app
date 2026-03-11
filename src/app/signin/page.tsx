"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function SigninPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSignin(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setMessage("Invalid email or password");
            setLoading(false);
            return;
        }

        router.push("/");
        router.refresh();
    }

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <form onSubmit={handleSignin} className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-bold">Sign in</h1>

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
                    {loading ? "Signing in..." : "Sign in"}
                </button>

                {message ? <p className="text-sm text-red-600">{message}</p> : null}
            </form>
        </main>
    );
}