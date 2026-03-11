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
                className="rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-slate-400 hover:bg-white"
            >
                Sign out
            </button>
        </form>
    );
}
