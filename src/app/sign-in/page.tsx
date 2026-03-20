import { redirect } from "next/navigation";
import { auth } from "@/auth";
import SignInButton from "@/components/SignInButton";

interface SignInPageProps {
  searchParams?: Promise<{
    callbackUrl?: string;
  }>;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const params = (await searchParams) ?? {};
  const callbackUrl = params.callbackUrl || "/";

  if (session) {
    redirect(callbackUrl);
  }

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold text-stone-100">Sign in with Discord</h1>
        <p className="text-stone-300">
          Authentication is now handled through Better Auth. Continue with Discord to access protected League pages.
        </p>
      </div>
      <SignInButton callbackUrl={callbackUrl} />
    </main>
  );
}
