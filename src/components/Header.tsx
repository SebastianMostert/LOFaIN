import Link from "next/link";
import Image from "next/image";
import { auth, signOut } from "@/auth";
import { prisma } from "@/prisma";
import NavButton from "./NavButton";
import SignInButton from "./SignInButton";

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

const FlagSignOutButton = ({ size, countryCode }: { size: number; countryCode: string }) => {
  return (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button type="submit">
        <Image
          src={`/flags/btn/${countryCode.toLocaleLowerCase()}.png`}
          alt="Country Flag"
          width={24 * size}
          height={16 * size}
          className="inline-block rounded-[2px]"
        />
      </button>
    </form>
  );
};

type LinkItem = {
  href: string;
  label: string;
  auth: boolean;
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

  let pending = 0;
  if (user?.countryId && user.id) {
    const pref = await prisma.notificationSetting.findUnique({
      where: { userId: user.id },
    });
    if (pref?.inAppOnClose !== false) {
      const soon = new Date(Date.now() + 24 * 60 * 60 * 1000);
      pending = await prisma.amendment.count({
        where: {
          status: "OPEN",
          closesAt: { lte: soon, gt: new Date() },
          votes: { none: { countryId: user.countryId } },
        },
      });
    }
  }

  const showBanner = pending > 0;

  return (
    <header className="w-full sticky top-0 z-[999] bg-sky-200 border-b-4 border-red-700 shadow-md">
      {showBanner && (
        <Link href="/amendments?status=OPEN&q=&nv=1">
          <div className="w-full bg-red-600 text-center py-2 font-semibold">
            Your country has pending votes closing soon.
          </div>
        </Link>
      )}
      <div className="mx-auto flex max-w-8xl items-center justify-between px-6 py-3">
        <LogoPart size={200} />

        <nav className="flex items-center gap-4">
          {Links.filter((link) => {
            if (link.auth && !user) return false;
            return true;
          }).map((link, index) => {
            const isLogout = link.href === "/logout";
            return isLogout ? (
              <FlagSignOutButton key={index} size={3.5} countryCode={countryCode} />
            ) : (
              <NavButton key={index} href={link.href} label={link.label} />
            );
          })}
          {!user && <SignInButton />}
        </nav>
      </div>
    </header>
  );
}
