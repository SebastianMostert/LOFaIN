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
      className="px-6 py-2 rounded-sm text-white text-lg bg-[#6e2e2e] hover:bg-[#823a3a] tracking-wide uppercase transition-transform active:translate-y-0.5 focus:outline-none"
      style={{
        background: "linear-gradient(180deg, #0d5a86 0%, #0a4566 100%)",
        boxShadow: "0 3px 6px rgba(0,0,0,0.45)",
      }}
    >
      Sign In
    </button>
  );
}
