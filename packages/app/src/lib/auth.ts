import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import authConfig from "@/../auth.config";
import { findUserByEmail, insertUser } from "@/lib/data";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials.email as string | undefined;
        const password = credentials.password as string | undefined;

        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: String(user.id), name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!account || !user.email) return true;

      // OAuth sign-in: find or create user by email
      if (account.provider !== "credentials") {
        const existing = await findUserByEmail(user.email);
        if (!existing) await insertUser({ name: user.name ?? user.email, email: user.email });
      }

      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        const dbUser = await findUserByEmail(user.email!);
        if (dbUser) {
          token.dbUserId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.dbUserId) {
        session.user.id = String(token.dbUserId);
      }
      return session;
    },
  },
});
