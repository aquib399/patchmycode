import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { IS_PRODUCTION } from "@/lib/constant.js";

function getMax(number: number) {
  return IS_PRODUCTION ? number : Infinity;
}

function getResponseMessage(message: string) {
  return {
    error: true,
    message
  };
}

function identifierKey(
  rawValue: unknown,
  ipKey: string,
  fallback = "unknown"
): string {
  const value =
    typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  if (value) {
    return value;
  }
  return ipKey || fallback;
}

function compositeIdentifierKey(
  rawValue: unknown,
  ipKey: string,
  fallback = "unknown"
): string {
  const value =
    typeof rawValue === "string" ? rawValue.trim().toLowerCase() : "";
  return `${value || fallback}_${ipKey || fallback}`;
}

export const apiLimiter = rateLimit({
  windowMs: 20 * 1000, // 20 seconds
  max: getMax(50),
  message: getResponseMessage("Too many requests, please try again later."),
  standardHeaders: true,
  legacyHeaders: false
});

export const signInLimiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: getMax(5),
  skipSuccessfulRequests: true,
  message: getResponseMessage(
    "Too many sign-in attempts. Please try again in 10 seconds."
  ),
  keyGenerator: (req) => {
    const identifier = req.body?.email;
    const ipKey = ipKeyGenerator(req.ip ?? "");
    return compositeIdentifierKey(identifier, ipKey);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: getMax(6),
  message: getResponseMessage(
    "Too many OTP requests. Please try again in 15 minutes."
  ),
  keyGenerator: (req) => {
    const identifier = req.body?.email;
    const ipKey = ipKeyGenerator(req.ip ?? "");
    return compositeIdentifierKey(identifier, ipKey);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const otpVerifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minutes
  max: getMax(12),
  skipSuccessfulRequests: true,
  message: getResponseMessage(
    "Too many OTP verification attempts. Please try again in a minute."
  ),
  keyGenerator: (req) => {
    const identifier = req.body?.userId || req.body?.forgetPasswordToken;
    const ipKey = ipKeyGenerator(req.ip ?? "");
    return compositeIdentifierKey(identifier, ipKey);
  },
  standardHeaders: true,
  legacyHeaders: false
});

export const writeActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: getMax(90),
  message: getResponseMessage(
    "Too many actions. Please slow down and try again."
  ),
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req.ip ?? "");
    return identifierKey(req.headers.authorization, ipKey);
  },
  standardHeaders: true,
  legacyHeaders: false
});
