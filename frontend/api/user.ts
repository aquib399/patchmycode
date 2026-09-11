import { VerifyTokenResponse } from "@/types/domain/token";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import * as githubTypes from "@/types/domain/github";
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
    }),
  github: {
    getOAuthUrl: (props?: ApiFunctionProps) =>
      request<{ url: string }>({
        method: "GET",
        endpoint: endpoints.github.oauthUrl,
        ...(props || {})
      }),
    disconnect: (props?: ApiFunctionProps) =>
      request<{ disconnected: boolean }>({
        method: "DELETE",
        endpoint: endpoints.github.disconnect,
        ...(props || {})
      }),
    getInstallUrl: (props?: ApiFunctionProps) =>
      request<{ url: string }>({
        method: "GET",
        endpoint: endpoints.github.installUrl,
        ...(props || {})
      }),
    linkInstallation: (
      props: ApiFunctionProps<githubTypes.LinkInstallationPayload>
    ) =>
      request<githubTypes.IInstallation>({
        method: "POST",
        endpoint: endpoints.github.linkInstallation,
        ...props
      }),
    getInstallations: (props?: ApiFunctionProps) =>
      request<githubTypes.IInstallation[]>({
        method: "GET",
        endpoint: endpoints.github.installations,
        ...(props || {})
      }),
    getRepositories: (props?: ApiFunctionProps) =>
      request<githubTypes.RepositoryItem[]>({
        method: "GET",
        endpoint: endpoints.github.repositories,
        ...(props || {})
      }),
    syncRepositories: (props?: ApiFunctionProps) =>
      request<githubTypes.RepositoryItem[]>({
        method: "POST",
        endpoint: endpoints.github.sync,
        ...(props || {})
      }),
    toggleRepoStatus: (
      repoId: number,
      props: ApiFunctionProps<{ isActive: boolean }>
    ) =>
      request<{ repoId: number; isActive: boolean }>({
        method: "PATCH",
        endpoint: endpoints.github.toggleRepoStatus(repoId),
        ...props
      }),
    getRepositoryDetails: (repoId: number, props?: ApiFunctionProps) =>
      request<githubTypes.RepositoryDetailView>({
        method: "GET",
        endpoint: endpoints.github.repositoryDetails(repoId),
        ...(props || {})
      }),
    updateRepoBranches: (
      repoId: number,
      props: ApiFunctionProps<githubTypes.UpdateRepoBranchesPayload>
    ) =>
      request<{ repoId: number; targetBranches: string[] }>({
        method: "PATCH",
        endpoint: endpoints.github.updateRepoBranches(repoId),
        ...props
      }),
    fixIssue: (
      repoId: number,
      props: ApiFunctionProps<githubTypes.FixIssuePayload>
    ) =>
      request<{ success: boolean; commitSha: string; commitUrl: string }>({
        method: "POST",
        endpoint: endpoints.github.fixIssue(repoId),
        ...props
      })
  }
};
