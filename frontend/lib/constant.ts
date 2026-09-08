const DEV_API_BASE_URL = process.env.NEXT_PUBLIC_DEV_API_BASE_URL!;
const PROD_API_BASE_URL = process.env.NEXT_PUBLIC_PROD_API_BASE_URL!;

const isLocalhost =
  typeof window !== "undefined"
    ? window.location.protocol === "http:"
    : process.env.NODE_ENV !== "production";

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const API_BASE_URL = isLocalhost ? DEV_API_BASE_URL : PROD_API_BASE_URL;
console.log("API_BASE_URL", API_BASE_URL);

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
