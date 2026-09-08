// services/index.ts

import { getCookieSetting } from "@/utils/cookies.js";
import { TokenConfig } from "@/types/token.js";
import { Role } from "@/types/role.js";

interface SetAuthCookiesProps {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  tokenConfig: TokenConfig;
  role: Role;
  res: routerResponse;
}

export function setAuthCookies(props: SetAuthCookiesProps): void {
  const { tokens, tokenConfig, role, res } = props;
  const { accessToken, refreshToken } = tokens;

  const accessCookieSetting = getCookieSetting(
    tokenConfig.access.expiryMs,
    role
  );
  const refreshCookieSetting = getCookieSetting(
    tokenConfig.refresh.expiryMs,
    role
  );
  res.cookie(tokenConfig.access.name, accessToken, accessCookieSetting);
  res.cookie(tokenConfig.refresh.name, refreshToken, refreshCookieSetting);
}

interface ClearAuthCookiesProps {
  tokenConfig: TokenConfig;
  res: routerResponse;
  role: Role;
}

export function clearAuthCookies(props: ClearAuthCookiesProps): void {
  const { tokenConfig, res, role } = props;
  const opts = getCookieSetting(0, role);
  res.clearCookie(tokenConfig.access.name, opts);
  res.clearCookie(tokenConfig.refresh.name, opts);
}
