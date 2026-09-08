import { BaseTokenPayload, ForgetPasswordPayload } from "@/types/token.js";
import { Token, TokenType } from "@/models/index.js";
import { createOrUpdateToken } from "../token.js";
import { TOKEN_CONFIG } from "@/configs/env.js";
import { Role } from "@/types/role.js";
import jwt from "jsonwebtoken";

type TokenInput = Omit<BaseTokenPayload, "role">;

interface TokenServiceOptions {
  role: Role;
  target: Role;
}

export class TokenService {
  private readonly config;
  private readonly target: Role;
  private readonly role: Role;

  constructor({ role, target }: TokenServiceOptions) {
    this.config = TOKEN_CONFIG[role];
    this.target = target;
    this.role = role as Role;
  }

  private signToken(
    payload: object,
    secret: string,
    expiresIn: number
  ): string {
    return jwt.sign(payload, secret, {
      expiresIn: Math.floor(expiresIn / 1000)
    });
  }

  private verifyToken<T>(token: string, secret: string): T | false {
    try {
      return jwt.verify(token, secret) as T;
    } catch {
      return false;
    }
  }

  async createAccessToken(payload: TokenInput): Promise<string> {
    return this.signToken(
      { ...payload, role: this.role },
      this.config.access.secret,
      this.config.access.expiryMs
    );
  }

  async verifyAccessToken(token: string): Promise<BaseTokenPayload | false> {
    return this.verifyToken<BaseTokenPayload>(token, this.config.access.secret);
  }

  async createRefreshToken(
    payload: TokenInput,
    req: routerRequest
  ): Promise<string> {
    const token = this.signToken(
      { ...payload, role: this.role },
      this.config.refresh.secret,
      this.config.refresh.expiryMs
    );

    await createOrUpdateToken({
      targetId: payload.id,
      req,
      target: this.target,
      type: TokenType.Refresh,
      token
    });

    return token;
  }

  async verifyRefreshToken(token: string): Promise<BaseTokenPayload | false> {
    const verified = this.verifyToken<BaseTokenPayload>(
      token,
      this.config.refresh.secret
    );

    if (!verified) return false;

    const tokenDoc = await Token.findOne({
      target: this.target,
      type: TokenType.Refresh,
      token
    });

    if (!tokenDoc || !tokenDoc.isActive || tokenDoc.expiresAt < new Date()) {
      return false;
    }

    return verified;
  }

  async createOtpToken(payload: TokenInput): Promise<string> {
    return this.signToken(
      { ...payload, role: this.role },
      this.config.otp.secret,
      this.config.otp.expiryMs
    );
  }

  async verifyOtpToken(token: string): Promise<BaseTokenPayload | false> {
    return this.verifyToken<BaseTokenPayload>(token, this.config.otp.secret);
  }

  async createForgetPasswordToken(
    payload: ForgetPasswordPayload
  ): Promise<string> {
    return this.signToken(
      { ...payload, role: this.role },
      this.config.forgetPassword.secret,
      this.config.forgetPassword.expiryMs
    );
  }

  async verifyForgetPasswordToken(
    token: string
  ): Promise<ForgetPasswordPayload | false> {
    return this.verifyToken<ForgetPasswordPayload>(
      token,
      this.config.forgetPassword.secret
    );
  }

  async createOAuthToken(payload: TokenInput): Promise<string> {
    return this.signToken(
      { ...payload, role: this.role },
      this.config.oauth.secret,
      this.config.oauth.expiryMs
    );
  }

  async verifyOAuthToken(token: string): Promise<BaseTokenPayload | false> {
    return this.verifyToken<BaseTokenPayload>(token, this.config.oauth.secret);
  }
}
