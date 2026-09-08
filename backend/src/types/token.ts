import { JwtPayload } from "jsonwebtoken";
import { Role } from "./role.js";

export interface BaseTokenPayload extends JwtPayload {
  id: string;
  role: Role;
}

export interface ForgetPasswordPayload extends BaseTokenPayload {
  version: number;
}

export type AdminTokenPayload = BaseTokenPayload;
export type TenantTokenPayload = BaseTokenPayload;

export interface CustomerTokenPayload extends BaseTokenPayload {
  tenantId: string;
}

export type CookieConfig = {
  name: string;
  secret: string;
  expiryMs: number;
};

export type TokenTypes =
  "access" | "refresh" | "otp" | "forgetPassword" | "oauth";
export type TokenConfig = Record<TokenTypes, CookieConfig>;
export type TokenConfigMap = Record<Role, TokenConfig>;
