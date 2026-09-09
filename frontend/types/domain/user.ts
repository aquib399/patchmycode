import { BaseEntity } from "@/types/base-entity";
import { MFAType } from "./credential";

export enum UserStatus {
  Active = "active",
  Suspended = "suspended"
}

export interface IUser extends BaseEntity {
  name: string;
  email: string;
  status: UserStatus;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
}

export interface SignUpDetails {
  name: string;
  email: string;
  otpRequestId: string;
  otpCode: string;
}

export interface SignUpCredentials {
  password: string;
  mfaType?: MFAType;
}

export interface SignUpPayload {
  details: SignUpDetails;
  credentials: SignUpCredentials;
}

export interface SignUpResponse {
  user: IUser;
}

export type SignOutPayload = Record<string, never>;
export type SignOutResponse = Record<string, never>;
