import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
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
          className="h-auto w-[140px] sm:w-[170px] lg:w-[200px]"
        />
      </Link>
    </div>
  );
};

const FlagProfileLink = ({ size, countryCode }: { size: number; countryCode: string }) => {
  return (
    <Link href="/members/me" aria-label="Open your country profile">
        <Image
          src={`/flags/btn/${countryCode.toLocaleLowerCase()}.png`}
          alt="Country Flag"
          width={24 * size}
          height={16 * size}
          className="inline-block h-auto w-[56px] rounded-[2px] sm:w-[68px] lg:w-[84px]"
        />
    </Link>
  );
};

type LinkItem = {
  href: string;
  label: string;
  auth: boolean;
};

const Links: LinkItem[] = [
  { href: "/documents", label: "Documents", auth: false },
  { href: "/amendments", label: "Amendments", auth: true },
  { href: "/chair", label: "Chair", auth: false },
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
          <div className="w-full bg-red-600 px-4 py-2 text-center text-sm font-semibold sm:text-base">
            Your country has pending votes closing soon.
          </div>
        </Link>
      )}
      <div className="mx-auto flex max-w-8xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <LogoPart size={200} />

        <nav className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-3 lg:w-auto lg:justify-end lg:gap-4">
          {Links.filter((link) => {
            if (link.auth && !user) return false;
            return true;
          }).map((link, index) => (
            <NavButton key={index} href={link.href} label={link.label} />
          ))}
          {user && <FlagProfileLink size={3.5} countryCode={countryCode} />}
          {!user && <SignInButton />}
        </nav>
      </div>
    </header>
  );
}
