import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SaveApiKeyForm from "@/components/keys/SaveApiKeyForm";
import VerifyApiKeyButton from "@/components/keys/VerifyApiKeyButton";
import DeleteApiKeyButton from "@/components/keys/DeleteApiKeyButton";
import SignOutButton from "@/components/auth/SignOutButton";
import ChatForm from "@/components/chat/ChatForm";

export default async function DashboardPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/signin");
    }

    const existingKey = await prisma.apiKey.findUnique({
        where: {
            userId_provider: {
                userId: session.user.id,
                provider: "groq",
            },
        },
    });

    return (
        <main className="min-h-screen p-8">
            <div className="mx-auto max-w-3xl space-y-6">
                <section className="rounded-2xl border p-6 shadow-sm">
                    <h1 className="text-2xl font-bold">Dashboard</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Signed in as{" "}
                        <span className="font-medium">{session.user.email}</span>
                    </p>

                    <div className="mt-4">
                        <SignOutButton />
                    </div>
                </section>

                <section className="rounded-2xl border p-6 shadow-sm space-y-4">
                    <div>
                        <h2 className="text-xl font-semibold">Groq API Key</h2>
                        <p className="mt-1 text-sm text-gray-600">
                            Save, verify, or delete your Groq API key.
                        </p>
                    </div>

                    {existingKey ? (
                        <div className="rounded-lg border bg-gray-50 p-4 text-sm space-y-1">
                            <p>
                                Saved key:{" "}
                                <span className="font-mono">{existingKey.maskedKey}</span>
                            </p>
                            <p>Status: {existingKey.status}</p>

                            {existingKey.lastVerifiedAt ? (
                                <p>
                                    Last verified:{" "}
                                    {new Date(existingKey.lastVerifiedAt).toLocaleString()}
                                </p>
                            ) : null}

                            {existingKey.lastUsedAt ? (
                                <p>
                                    Last used:{" "}
                                    {new Date(existingKey.lastUsedAt).toLocaleString()}
                                </p>
                            ) : null}

                            {existingKey.verificationError ? (
                                <p className="text-red-600">
                                    Last error: {existingKey.verificationError}
                                </p>
                            ) : null}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-600">
                            No Groq API key saved yet.
                        </p>
                    )}

                    {existingKey ? null : <SaveApiKeyForm />}

                    {existingKey ? (
                        <div className="flex flex-wrap gap-3">
                            <VerifyApiKeyButton />
                            <DeleteApiKeyButton />
                        </div>
                    ) : null}
                </section>

                {existingKey ? <ChatForm /> : null}
            </div>
        </main>
    );
}