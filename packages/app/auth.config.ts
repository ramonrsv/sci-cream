import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

export default {
  providers: [Google, GitHub],
  pages: { signIn: "/signin" },
  trustHost: true,
  // Previews get a fresh host each deploy, so they proxy OAuth through production, the only host
  // registered with the providers. Production sets it too, to know when to forward. Unset locally.
  redirectProxyUrl: process.env.AUTH_REDIRECT_PROXY_URL,
} satisfies NextAuthConfig;
