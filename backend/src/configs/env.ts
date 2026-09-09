import { TokenConfigMap } from "@/types/token.js";
import { calculateMs } from "@/utils/time.js";
import { Role } from "@/types/role.js";
import "dotenv/config";

type EnvType = "production" | "development";

const env = process.env;

export const NODE_ENV = (env.NODE_ENV as EnvType) || "development";
export const PORT = String(env.PORT || 8082);

export const DATABASE_CONFIG = {
  URL: env.DATABASE_URL!,
  NAME: env.DATABASE_NAME!
};

export const TOKEN_CONFIG: TokenConfigMap = {
  [Role.Admin]: {
    access: {
      name: "a_at",
      secret: env.ADMIN_ACCESS_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 5 })
    },
    refresh: {
      name: "a_rt",
      secret: env.ADMIN_REFRESH_TOKEN_SECRET!,
      expiryMs: calculateMs({ days: 7 })
    },
    otp: {
      name: "a_ot",
      secret: env.ADMIN_OTP_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 15 })
    },
    forgetPassword: {
      name: "a_fpt",
      secret: env.ADMIN_FORGET_PASSWORD_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 15 })
    },
    oauth: {
      name: "a_oat",
      secret: env.ADMIN_OAUTH_TOKEN_SECRET!,
      expiryMs: calculateMs({ months: 1 })
    }
  },
  [Role.User]: {
    access: {
      name: "u_at",
      secret: env.USER_ACCESS_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 5 })
    },
    refresh: {
      name: "u_rt",
      secret: env.USER_REFRESH_TOKEN_SECRET!,
      expiryMs: calculateMs({ days: 7 })
    },
    otp: {
      name: "u_ot",
      secret: env.USER_OTP_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 5 })
    },
    forgetPassword: {
      name: "u_fpt",
      secret: env.USER_FORGET_PASSWORD_TOKEN_SECRET!,
      expiryMs: calculateMs({ minutes: 15 })
    },
    oauth: {
      name: "u_oat",
      secret: env.USER_OAUTH_TOKEN_SECRET!,
      expiryMs: calculateMs({ months: 1 })
    }
  }
};

export const ORIGINS = env.CORS_ORIGINS?.split(" ").filter(Boolean)!;

export const APP_URL = env.APP_URL!;
export const BASE_URL = env.BASE_URL!;
export const APP_DOMAIN = env.APP_DOMAIN!;

export const EMAIL_CONFIG = {
  USER: env.GMAIL_USER!,
  APP_PASSWORD: env.GMAIL_APP_PASSWORD!
};

export const GITHUB_CONFIG = {
  GITHUB_APP_WEBHOOK_SECRET: env.GITHUB_APP_WEBHOOK_SECRET!,
  GITHUB_APP_ID: env.GITHUB_APP_ID!,
  GITHUB_APP_CLIENT_ID: env.GITHUB_APP_CLIENT_ID!,
  GITHUB_APP_CLIENT_SECRET: env.GITHUB_APP_CLIENT_SECRET!,
  GITHUB_APP_PRIVATE_KEY: env.GITHUB_APP_PRIVATE_KEY!
};

import * as envKeys from "./env.js";

function getMissingValues(
  obj: Record<string, unknown>,
  parent = "",
  paths: string[] = []
): string[] {
  for (const [key, value] of Object.entries(obj)) {
    const path = parent ? `${parent}.${key}` : key;

    if (value !== null && typeof value === "object") {
      getMissingValues(value as Record<string, unknown>, path, paths);
    } else if (value === null || value === undefined || value === "") {
      paths.push(path);
    }
  }

  return paths;
}

const missingsPaths = getMissingValues(envKeys);

if (missingsPaths.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missingsPaths.join("\n")}`
  );
}
