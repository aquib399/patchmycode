import { NODE_ENV, ORIGINS } from "@/configs/env.js";

export const deployedAt: Date = new Date();

export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
  DEFAULT_SORT: "createdAt"
};
export const IS_PRODUCTION = NODE_ENV === "production";
export const CORS_ORIGINS = IS_PRODUCTION ? ORIGINS : true;

// cache
export const MAXIMUM_IN_MEMORY_CACHE_SIZE_BYTES: number = 50 * 1024 * 1024; // 50 MB
export const DEFAULT_TTL_SECONDS: number = IS_PRODUCTION ? 300 : 1;

export const APP_NAME: string =
  "Patch My Code - AI Code Review & Refactoring Tool";
