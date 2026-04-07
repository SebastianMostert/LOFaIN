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
      className="inline-flex rounded-[0.6rem] bg-[#083a57] p-[2.5px] shadow-[0_8px_18px_rgba(0,0,0,0.22)] transition hover:scale-[1.02] active:translate-y-0.5 focus:outline-none sm:p-[5px]"
    >
      <span className="inline-flex h-[28px] items-center justify-center rounded-[0.42rem] bg-[#0f4766] px-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d7ebf4] transition hover:bg-[#14506f] sm:h-[34px] sm:px-6 sm:text-sm sm:tracking-[0.2em] lg:h-[42px]">
        Sign In
      </span>
    </button>
  );
}
