import { VerifyTokenResponse } from "@/types/domain/token";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import * as userTypes from "@/types/domain/user";
import { ApiFunctionProps } from "@/types/api";
import { request } from ".";

const endpoints = API_ENDPOINTS.user;

export const UserAPI = {
  auth: {
    verifyToken: (props: ApiFunctionProps) =>
      request<VerifyTokenResponse>({
        method: "POST",
        endpoint: endpoints.auth.verifyToken,
        ...props
      }),
    signIn: (props: ApiFunctionProps<userTypes.SignInPayload>) =>
      request<userTypes.SignInResponse>({
        method: "POST",
        endpoint: endpoints.auth.signIn,
        ...props
      }),
    signUpSendOtp: (props: ApiFunctionProps<{ email: string }>) =>
      request<{ otpRequestId: string }>({
        method: "POST",
        endpoint: endpoints.auth.signUpSendOtp,
        ...props
      }),
    signUp: (props: ApiFunctionProps<userTypes.SignUpPayload>) =>
      request<userTypes.SignUpResponse>({
        method: "POST",
        endpoint: endpoints.auth.signUp,
        ...props
      }),
    signOut: (props: ApiFunctionProps<userTypes.SignOutPayload>) =>
      request<userTypes.SignOutResponse>({
        method: "POST",
        endpoint: endpoints.auth.signOut,
        ...props
      })
  },
  profile: (props?: ApiFunctionProps) =>
    request<userTypes.IUser>({
      method: "GET",
      endpoint: endpoints.profile,
      ...(props || {})
    })
};
