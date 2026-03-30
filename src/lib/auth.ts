import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { openAPI } from "better-auth/plugins";

import { prisma } from "./db.js";
import { env } from "./env.js";

export const auth = betterAuth({
  baseURL: env.API_BASE_URL,
  trustedOrigins: [
    env.WEB_APP_BASE_URL,
    "https://gymbro-frontend-chi.vercel.app",
  ],
  socialProviders: {
    google: {
      prompt: "select_account",
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.API_BASE_URL}/api/auth/callback/google`,
    },
  },
  account: {
    skipStateCookieCheck: true,
  },
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  plugins: [openAPI()],
  advanced: {
    cookiePrefix: "gymbro",
    crossSubDomainCookies: {
      enabled: false,
    },
    cookieOptions: {
      sameSite: "lax",
      secure: false,
      httpOnly: true,
    },
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false,
      httpOnly: true,
    },
  },
});
