import { createAuthMiddleware } from "./factory.js";
import { userTokens } from "@/utils/jwt/tokens.js";
import { signOut } from "@/services/user/index.js";
import { TOKEN_CONFIG } from "@/configs/env.js";

const TOKEN_CFG = TOKEN_CONFIG.user;
const factory = userTokens;

export const authenticateUser = createAuthMiddleware({
  accessCookie: {
    name: TOKEN_CFG.access.name,
    expiryMs: TOKEN_CFG.access.expiryMs
  },
  refreshCookie: {
    name: TOKEN_CFG.refresh.name,
    expiryMs: TOKEN_CFG.refresh.expiryMs
  },
  attachLocalsConfig: {
    id: "id",
    role: "role"
  },

  verifyAccess: factory.verifyAccessToken.bind(factory),
  verifyRefresh: factory.verifyRefreshToken.bind(factory),
  createAccess: factory.createAccessToken.bind(factory),
  signOut: (req, res) => signOut({ req, res: res as any }),

  messages: {
    noToken: "Please login to continue",
    accessExpired: "Your session expired. Please login again",
    invalidRefresh: "Session invalid. Please login again"
  }
});
