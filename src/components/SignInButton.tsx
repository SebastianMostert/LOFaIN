"use client";

export default function SignInButton({ callbackUrl = "/" }: { callbackUrl?: string }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const { authClient } = await import("@/auth-client");
        await authClient.signIn.social({
          provider: "discord",
          callbackURL: callbackUrl,
        });
      }}
      className="rounded-sm px-4 py-2 text-sm uppercase tracking-[0.16em] text-white transition-transform active:translate-y-0.5 focus:outline-none hover:bg-[#823a3a] sm:px-6 sm:text-lg sm:tracking-wide"
      style={{
        background: "linear-gradient(180deg, #0d5a86 0%, #0a4566 100%)",
        boxShadow: "0 3px 6px rgba(0,0,0,0.45)",
      }}
    >
      Sign In
    </button>
  );
}
