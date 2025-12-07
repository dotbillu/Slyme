import NextAuth, { AuthOptions, DefaultSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

declare module "next-auth" {
  interface Session {
    user: {
      isNewUser?: boolean;
    } & DefaultSession["user"];
  }
  interface User {
    isNewUser?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    isNewUser?: boolean;
  }
}

export const authOptions: AuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const existing = await prisma.user.findUnique({
          where: { email: user.email! },
        });

        if (!existing) {
          user.isNewUser = true;
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }) {
      if (user?.isNewUser) {
        token.isNewUser = true;
      }
      if (trigger === "update" && session?.isNewUser === false) {
        token.isNewUser = false;
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.isNewUser) {
        session.user.isNewUser = true;
      } else {
        session.user.isNewUser = false;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
