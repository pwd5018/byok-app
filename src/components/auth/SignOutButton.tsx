import { signOut } from "@/auth";

export default function SignOutButton() {
    return (
        <form
            action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
            }}
        >
            <button
                type="submit"
                className="rounded bg-black px-4 py-2 text-white"
            >
                Sign out
            </button>
        </form>
    );
}