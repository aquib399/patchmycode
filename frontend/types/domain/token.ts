import { Role } from "./role";
export interface VerifyTokenResponse {
  id: string;
  role: Role;
  exp: number;
}
