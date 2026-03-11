import { signIn } from "@/auth";
import { redirect } from "next/navigation";

export default function SignInPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
                <h1 className="text-2xl font-semibold mb-2">Sign in</h1>
                <p className="text-sm text-muted-foreground mb-6">
                    Enter your email and password to continue.
                </p>

                <form
                    action={async (formData) => {
                        "use server";

                        const email = formData.get("email") as string;
                        const password = formData.get("password") as string;

                        await signIn("credentials", {
                            email,
                            password,
                            redirectTo: "/dashboard",
                        });
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium">
                            Email
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            className="w-full rounded-lg border px-3 py-2"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="password" className="text-sm font-medium">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            className="w-full rounded-lg border px-3 py-2"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-lg border px-4 py-2 font-medium"
                    >
                        Sign in
                    </button>
                </form>

                <p className="mt-4 text-sm">
                    Don&apos;t have an account?{" "}
                    <a href="/signup" className="underline">
                        Create one
                    </a>
                </p>
            </div>
        </main>
    );
}