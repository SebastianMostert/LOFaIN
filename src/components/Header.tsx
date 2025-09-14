import Link from "next/link";
import Image from "next/image";
import { auth, signIn, signOut } from "@/auth";
import NavButton from "./NavButton";

const LogoPart = ({ size }: { size: number }) => {
  return (
    <div className="flex items-center">
      <Link href="/">
        <Image
          src="/logo.png"
          alt="League of Free & Independent Nations Logo"
          width={size}
          height={size}
          priority
        />
      </Link>
    </div>
  );
};

const FlagSignOutButton = ({ size, countryCode }: { size: number; countryCode: string; }) => {
  return (
    <form
      action={async () => {
        "use server"
        await signOut()
      }}
    >
      <button
        type="submit"
      >
        <Image
          src={"/flags/btn/" + countryCode.toLocaleLowerCase() + ".png"}
          alt="Country Flag"
          width={24 * size}
          height={16 * size}
          className="inline-block rounded-[2px]"
        />
      </button>
    </form>
  );
}

type LinkItem = {
  href: string;
  label: string;
  auth: boolean; // true = requires login
};

const Links: LinkItem[] = [
  { href: "/treaty", label: "Treaty", auth: false },
  { href: "/amendments", label: "Amendments", auth: true },
  { href: "/members", label: "Members", auth: false },
  { href: "/work", label: "Our Work", auth: false },
  { href: "/logout", label: "Log Out", auth: true },
];

export default async function Header() {
  const session = await auth();
  const user = session?.user;
  const countryCode = user?.country?.code ?? "DEFAULT";

  return (
    <header className="w-full sticky top-0 z-[999] bg-sky-200 border-b-4 border-red-700 shadow-md">
      <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-3">
        {/* Left: Logo */}
        <LogoPart size={200} />

        {/* Right: Navigation */}
        <nav className="flex items-center gap-4">
          {Links.filter((link) => {
            if (link.auth && !user) return false; // requires auth but not logged in
            return true;
          }).map((link, i) => {
            const t = link.href === "/logout";
            return t ? (
              <FlagSignOutButton key={i} size={3.5} countryCode={countryCode} />
            ) : (
              <NavButton key={i} href={link.href} label={link.label} />
            )
          })}
          {!user && (
            <form
              method="post"
              action={async () => {
                "use server"
                await signIn("discord")
              }}
            >
              <button
                type="submit"
                className={"px-6 py-2 rounded-sm text-white text-lg bg-[#6e2e2e] hover:bg-[#823a3a] tracking-wide uppercase transition-transform active:translate-y-0.5 focus:outline-none"}
                style={{
                  background: "linear-gradient(180deg, #0d5a86 0%, #0a4566 100%)",
                  boxShadow: "0 3px 6px rgba(0,0,0,0.45)",
                }}
              >
                Sign In
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}
