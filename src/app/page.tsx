import Link from "next/link";
import { auth } from "../../auth";

export default async function HomePage() {
    const session = await auth();

    return (
        <main className="min-h-screen flex items-center justify-center p-8">
            <div className="max-w-xl text-center space-y-4">
                <h1 className="text-3xl font-bold">Groq BYOK App</h1>

                {session?.user ? (
                    <>
                        <p>Signed in as {session.user.email}</p>
                        <p>User ID: {session.user.id}</p>
                    </>
                ) : (
                    <>
                        <p className="text-gray-600">You are not signed in yet.</p>
                        <div className="space-x-4">
                            <Link className="underline" href="/signup">
                                Sign up
                            </Link>
                            <Link className="underline" href="/signin">
                                Sign in
                            </Link>
                        </div>
                    </>
                )}
            </div>
        </main>
    );
}