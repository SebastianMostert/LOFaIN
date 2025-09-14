import NextAuth, { type DefaultSession } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/prisma"
import Discord from "next-auth/providers/discord"

declare module "next-auth" {
  interface User {
    id?: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;

    countryId?: string | null;
    country?: {
      id: string;
      name: string;
      slug: string;
      code: string | null;
      colorHex: string | null;
    } | null;

    // NEW: Discord payload you attach in the provider profile()
    discord?: {
      id: string;        // Discord user id (string)
      username: string;  // Discord username (not display name)
    };
  }

  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
      countryId?: string | null;
      country?: {
        id: string;
        name: string;
        slug: string;
        code: string | null;
        colorHex: string | null;
      } | null;

      // NEW: surface the same discord data on the session
      discord?: {
        id: string;
        username: string;
      };
    };
  }
}


export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      async profile(profile) {
        return {
          id: profile.id,
          name: profile.global_name || profile.username, // prefer global_name if set
          email: profile.email,
          discord: {
            id: profile.id,
            username: profile.username,
          },
          image: profile.avatar
            ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
            : null,
        }
      },
    })
  ],
  callbacks: {
    /**
     * Auto-assign user's country based on CountryMapping.discordId
     */
    async signIn({ user, account }) {
      if (account?.provider === "discord") {
        const discordId = account.providerAccountId;

        // 1) Resolve the DB user id via Account table (this gives ObjectId)
        const dbAccount = await prisma.account.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "discord",
              providerAccountId: discordId,
            },
          },
          select: { userId: true },
        });

        
        if (!dbAccount?.userId) {
          // Nothing to do (new user still being created or mismatch)
          return true;
        }

        // 2) Optional: fetch current user to compare (avoid unnecessary writes)
        const dbUser = await prisma.user.findUnique({
          where: { id: dbAccount.userId },
          select: { id: true, countryId: true },
        });

        // 3) Find mapping for this Discord ID
        const mapping = await prisma.countryMapping.findUnique({
          where: { discordId },
          select: { countryId: true },
        });

        if (mapping && dbUser && dbUser.countryId !== mapping.countryId) {
          await prisma.user.update({
            where: { id: dbUser.id }, // << ObjectId-safe
            data: { countryId: mapping.countryId },
          });
        }
      }
      return true;
    },

    /**
     * Put country on session (unchanged logic, but safe).
     */
    async session({ session, user }) {
      // 'user.id' here is from adapter; at this point it is the DB user (ObjectId string)
      (session.user as any).countryId = user.countryId ?? null;

      if (user.countryId) {
        const country = await prisma.country.findUnique({
          where: { id: user.countryId },
          select: { id: true, name: true, slug: true, code: true, colorHex: true },
        });
        (session.user as any).country = country ?? null;
      } else {
        (session.user as any).country = null;
      }
      return session;
    },
  },

  session: {
    strategy: "database",
  },
});
