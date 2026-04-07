import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { prisma } from "@/prisma";
import { getCountryFlagAspectRatio, getCountryFlagSrc } from "@/utils/flags";
import { getCurrentSimulatedNow } from "@/utils/time/server";
import NavButton from "./NavButton";
import SignInButton from "./SignInButton";
import FlagImage from "./FlagImage";

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

const FlagProfileLink = ({
  size,
  country,
}: {
  size: number;
  country: {
    code?: string | null;
    flagImagePath?: string | null;
    flagAspectRatio?: string | null;
  };
}) => {
  return (
    <Link
      href="/members/me"
      aria-label="Open your country profile"
      className="group inline-flex rounded-[0.6rem] transition hover:scale-[1.02]"
    >
      <div className="rounded-[0.2rem] bg-[#083a57] p-[2.5px] shadow-[0_8px_18px_rgba(0,0,0,0.22)] sm:p-[5px]">
        <div
          className="relative w-[56px] overflow-hidden rounded-[0.2rem] bg-white sm:w-[68px] lg:w-[84px]"
          style={{ aspectRatio: getCountryFlagAspectRatio(country) }}
        >
          <FlagImage
            src={getCountryFlagSrc(country)}
            alt="Country Flag"
            sizes={`${24 * size}px`}
            className="object-cover"
          />
        </div>
      </div>
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
  { href: "/calendar", label: "Calendar", auth: false },
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
      const simulatedNow = await getCurrentSimulatedNow();
      const soon = new Date(simulatedNow.getTime() + 24 * 60 * 60 * 1000);
      pending = await prisma.amendment.count({
        where: {
          status: "OPEN",
          closesAt: { lte: soon, gt: simulatedNow },
          votes: { none: { countryId: user.countryId } },
        },
      });
    }
  }

  const showBanner = pending > 0;

  return (
    <header className="site-header w-full sticky top-0 z-[999] bg-sky-200 border-b-4 border-red-700 shadow-md">
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
          {user && <FlagProfileLink size={3.5} country={user.country ?? { code: countryCode }} />}
          {!user && <SignInButton />}
        </nav>
      </div>
    </header>
  );
}
