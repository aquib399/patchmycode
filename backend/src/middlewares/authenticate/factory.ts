import { getCookies, getCookieSetting } from "@/utils/cookies.js";
import { Request, Response, NextFunction } from "express";
import { BaseTokenPayload } from "@/types/token.js";

type VerifyFn = (token: string) => Promise<BaseTokenPayload | false>;
type CreateFn = (payload: BaseTokenPayload) => Promise<string>;

interface AuthConfig {
  accessCookie: {
    name: string;
    expiryMs: number;
  };
  refreshCookie: {
    name: string;
    expiryMs: number;
  };
  attachLocalsConfig: Partial<Record<keyof AttachedLocals, string>>;

  verifyAccess: VerifyFn;
  verifyRefresh: VerifyFn;
  createAccess: CreateFn;
  signOut: (req: Request, res: Response) => Promise<any>;

  messages: {
    noToken: string;
    accessExpired: string;
    invalidRefresh: string;
  };
}

const headerRefreshVarName = "x-refresh-token";

const baseAttachPayloadKey = {
  exp: "exp"
};

function attachPayloadToLocals(
  res: Response,
  payload: Record<string, any>,
  attachLocalsConfig: Record<string, string>
) {
  const mergedConfig = Object.assign(
    {},
    baseAttachPayloadKey,
    attachLocalsConfig
  );
  Object.entries(mergedConfig).forEach(([localKey, payloadKey]) => {
    res.locals[localKey] = payload[payloadKey];
  });
}

export function createAuthMiddleware(config: AuthConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const headers = req.headers;
    const { authorization, cookie } = headers;
    const cookies = getCookies(cookie);

    const headerAccessToken = authorization?.split(" ")[1];
    const cookieAccessToken = cookies[config.accessCookie.name];

    const headerRefreshToken = Array.isArray(headers[headerRefreshVarName])
      ? headers[headerRefreshVarName][0]
      : headers[headerRefreshVarName];
    const cookieRefreshToken = cookies[config.refreshCookie.name];

    const accessToken = headerAccessToken || cookieAccessToken;
    const refreshToken = headerRefreshToken || cookieRefreshToken;

    if (!accessToken && !refreshToken) {
      return res.status(401).json({
        error: true,
        message: config.messages.noToken
      });
    }

    if (accessToken) {
      const payload = await config.verifyAccess(accessToken);
      if (payload) {
        attachPayloadToLocals(res, payload, config.attachLocalsConfig);
        return next();
      }
    }

    if (!refreshToken) {
      await config.signOut(req, res);
      return res.status(401).json({
        error: true,
        message: config.messages.accessExpired
      });
    }

    const refreshPayload = await config.verifyRefresh(refreshToken);

    if (!refreshPayload) {
      await config.signOut(req, res);
      return res.status(403).json({
        error: true,
        message: config.messages.invalidRefresh
      });
    }

    const newAccessToken = await config.createAccess({
      id: refreshPayload.id,
      role: refreshPayload.role
    });

    res.setHeader("Authorization", `Bearer ${newAccessToken}`);
    const cookieSettings = getCookieSetting(
      config.accessCookie.expiryMs,
      refreshPayload.role
    );
    res.cookie(config.accessCookie.name, newAccessToken, cookieSettings);

    const newPayload = await config.verifyAccess(newAccessToken);
    if (!newPayload) {
      await config.signOut(req, res);
      return res.status(401).json({
        error: true,
        message: config.messages.invalidRefresh
      });
    }
    attachPayloadToLocals(res, newPayload, config.attachLocalsConfig);

    return next();
  };
}
