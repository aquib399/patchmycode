const DEV_API_BASE_URL =
  process.env.NEXT_PUBLIC_DEV_API_BASE_URL || "http://localhost:8082";
const PROD_API_BASE_URL =
  process.env.NEXT_PUBLIC_PROD_API_BASE_URL || "https://api.patchmycode.com";

const isLocalhost =
  typeof window !== "undefined"
    ? window.location.protocol === "http:"
    : process.env.NODE_ENV !== "production";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const API_BASE_URL = isLocalhost ? DEV_API_BASE_URL : PROD_API_BASE_URL;

export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
