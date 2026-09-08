import { TokenService } from "./factory.js";
import { Role } from "@/types/role.js";

export const userTokens = new TokenService({
  role: Role.User,
  target: Role.User
});

export const adminTokens = new TokenService({
  role: Role.Admin,
  target: Role.Admin
});
