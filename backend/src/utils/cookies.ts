import { CookieOptions } from "express";
import { Role } from "@/types/role.js";

export function getCookies(raw: string | undefined) {
  if (!raw) return {};

  const cookiePairs = raw?.split(";") || [];

  const cookieEntries = cookiePairs?.map((cookie) => {
    const [name, value] = cookie?.trim()?.split?.("=");
    return [name, decodeURIComponent(value || "")];
  });

  const cookies = Object.fromEntries(cookieEntries);

  return cookies;
}

export function getCookieSetting(maxAgeMs: number, role: Role): CookieOptions {
  const settings: CookieOptions = {
    // Prevents client-side scripts (like document.cookie) from accessing the cookie.
    // This is a critical security measure to mitigate Cross-Site Scripting (XSS) attacks.
    httpOnly: true,

    // Ensures the browser only sends the cookie over encrypted (HTTPS) connections.
    // Required to be true in production when sameSite is set to "none".
    // secure: IS_PRODUCTION,
    secure: true,

    // Specifies the URL path where the cookie is valid.
    path: `/api/${role}`, // only sent to this role's endpoints

    // Defines the cookie's lifespan in milliseconds.
    // Once this time elapses, the browser will automatically delete the cookie.
    maxAge: maxAgeMs,

    // Restricts the cookie to a specific domain.
    // In production, this should be set to actual domain (e.g., "yourdomain.com") to ensure the cookie is sent correctly.
    // domain: IS_PRODUCTION ? APP_DOMAIN : undefined,

    // Controls cross-origin cookie sharing.
    // "none" allows cross-domain backend/frontend communication in production.
    // "lax" provides baseline CSRF protection and allows local HTTP development.
    // sameSite: IS_PRODUCTION ? "none" : "lax"
    sameSite: "none"
  };

  return settings;
}
