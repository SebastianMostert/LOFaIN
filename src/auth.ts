import { headers } from "next/headers";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { customSession } from "better-auth/plugins";
import { prisma } from "@/prisma";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  countryId?: string | null;
  country?: {
    id: string;
    name: string;
    slug: string;
    code: string | null;
    colorHex: string | null;
  } | null;
  discord?: {
    id: string;
    username: string;
  };
}

export interface Session {
  session: {
    id: string;
    token: string;
    userId: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  user: SessionUser;
}

type CustomSessionInput = {
  session: Session["session"];
  user: {
    id: string;
    countryId?: string | null;
    discordId?: string | null;
    discordUsername?: string | null;
  } & Omit<SessionUser, "country" | "discord" | "countryId">;
};

const baseAuthOptions = {
  appName: "League of Free & Independent Nations",
  baseURL:
    process.env.BETTER_AUTH_URL ||
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_BASE_URL,
  database: prismaAdapter(prisma, {
    provider: "mongodb",
  }),
  advanced: {
    database: {
      generateId: false,
    },
  },
  socialProviders: {
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID as string,
      clientSecret: process.env.DISCORD_CLIENT_SECRET as string,
      mapProfileToUser(profile) {
        return {
          name: profile.global_name || profile.username,
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : undefined,
          discordId: profile.id,
          discordUsername: profile.username,
        };
      },
    },
  },
  user: {
    modelName: "User",
    fields: {
      emailVerified: "emailVerifiedBool",
    },
    additionalFields: {
      countryId: {
        type: "string",
        required: false,
        input: false,
      },
      discordId: {
        type: "string",
        required: false,
        input: false,
      },
      discordUsername: {
        type: "string",
        required: false,
        input: false,
      },
    },
  },
  session: {
    modelName: "Session",
    fields: {
      token: "sessionToken",
      expiresAt: "expires",
    },
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
    },
  },
  account: {
    modelName: "Account",
    fields: {
      accountId: "providerAccountId",
      providerId: "provider",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
    },
  },
  verification: {
    modelName: "VerificationToken",
    fields: {
      value: "token",
      expiresAt: "expires",
    },
  },
} satisfies BetterAuthOptions;

export const authInstance = betterAuth({
  ...baseAuthOptions,
  plugins: [
    customSession(async ({ user, session }: CustomSessionInput) => {
      let countryId = user.countryId ?? null;

      if (user.discordId) {
        const mapping = await prisma.countryMapping.findUnique({
          where: { discordId: user.discordId },
          select: { countryId: true },
        });

        const mappedCountryId = mapping?.countryId ?? null;
        if (mappedCountryId !== countryId) {
          await prisma.user.update({
            where: { id: user.id },
            data: { countryId: mappedCountryId },
          });
          countryId = mappedCountryId;
        }
      }

      const country = countryId
        ? await prisma.country.findUnique({
            where: { id: countryId },
            select: {
              id: true,
              name: true,
              slug: true,
              code: true,
              colorHex: true,
            },
          })
        : null;

      return {
        session,
        user: {
          ...user,
          countryId,
          country,
          discord: user.discordId
            ? {
                id: user.discordId,
                username: user.discordUsername ?? "",
              }
            : undefined,
        },
      };
    }, baseAuthOptions),
    nextCookies(),
  ],
});

export async function auth() {
  const session = await authInstance.api.getSession({
    headers: await headers(),
  });
  return session as Session | null;
}

export async function signOut() {
  return authInstance.api.signOut({
    headers: await headers(),
  });
}

export function getSignInPath(callbackUrl: string) {
  return `/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
