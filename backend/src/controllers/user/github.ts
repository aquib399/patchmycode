import type * as validation from "@/validations/user/index.js";
import * as service from "@/services/user/index.js";
import { APP_URL } from "@/configs/env.js";

export const getOAuthUrl: routerFunction<
  RouterParams<any, { action?: "connect" | "signin" }>
> = async (req, res) => {
  const userId = res.locals?.id;
  const action = req.query?.action || (userId ? "connect" : "signin");
  const { response, status } = await service.getOAuthUrl({ userId, action });
  return res.status(status).json(response);
};

export const githubOAuthRedirect: routerFunction<
  RouterParams<any, { action?: "connect" | "signin" }>
> = async (req, res) => {
  const userId = res.locals?.id;
  const action = req.query?.action || (userId ? "connect" : "signin");
  const { response, status } = await service.getOAuthUrl({ userId, action });
  if (response.data?.url) {
    return res.redirect(response.data.url) as any;
  }
  return res.status(status).json(response);
};

export const githubOAuthCallback: routerFunction<
  RouterParams<any, { code?: string; state?: string }>
> = async (req, res) => {
  const code = req.query?.code;
  const state = req.query?.state;

  if (!code) {
    return res.redirect(
      `${APP_URL}/app?error=${encodeURIComponent("Missing GitHub authorization code")}`
    ) as any;
  }

  try {
    const { response } = await service.handleOAuthCallback({
      code,
      state,
      req,
      res
    });

    return res.redirect(response.data?.redirectUrl || `${APP_URL}/app`) as any;
  } catch (err: any) {
    console.error("[GitHub OAuth Callback Error]:", err);
    return res.redirect(
      `${APP_URL}/app?error=${encodeURIComponent(
        err.message || "Failed to process GitHub OAuth callback"
      )}`
    ) as any;
  }
};

export const disconnectGitHub: routerFunction = async (_, res) => {
  const userId = res.locals.id;
  const { response, status } = await service.disconnectGitHub({ userId });
  return res.status(status).json(response);
};

export const getInstallUrl: routerFunction = async (_, res) => {
  const userId = res.locals.id;
  const { response, status } = await service.getInstallUrl({ userId });
  return res.status(status).json(response);
};

export const linkInstallation: routerFunction<
  validation.LinkInstallationPayload
> = async (req, res) => {
  const userId = res.locals.id;
  const installationId = req.body.installationId;
  const { response, status } = await service.linkInstallation({
    userId,
    installationId
  });
  return res.status(status).json(response);
};

export const getUserInstallations: routerFunction = async (_, res) => {
  const userId = res.locals.id;
  const { response, status } = await service.getUserInstallations({ userId });
  return res.status(status).json(response);
};

export const getUserRepositories: routerFunction<
  RouterParams<any, { search?: string; status?: "all" | "active" | "inactive" }>
> = async (req, res) => {
  const userId = res.locals.id;
  const search = req.query?.search;
  const filterStatus = req.query?.status;

  const { response, status } = await service.getUserRepositories({
    userId,
    search,
    status: filterStatus
  });
  return res.status(status).json(response);
};

export const syncUserRepositories: routerFunction = async (_, res) => {
  const userId = res.locals.id;
  const { response, status } = await service.syncUserRepositories({ userId });
  return res.status(status).json(response);
};

export const toggleRepositoryStatus: routerFunction<
  validation.ToggleRepoStatusPayload
> = async (req, res) => {
  const userId = res.locals.id;
  const repoId = Number(req.params.repoId);
  const isActive = req.body.isActive;

  const { response, status } = await service.toggleRepositoryStatus({
    userId,
    repoId,
    isActive
  });
  return res.status(status).json(response);
};

export const getRepositoryDetails: routerFunction<
  validation.GetRepoDetailsPayload
> = async (req, res) => {
  const userId = res.locals.id;
  const repoId = Number(req.params.repoId);
  const { response, status } = await service.getRepositoryDetails({
    userId,
    repoId
  });
  return res.status(status).json(response);
};

export const updateRepositoryBranches: routerFunction<
  validation.UpdateRepoBranchesPayload
> = async (req, res) => {
  const userId = res.locals.id;
  const repoId = Number(req.params.repoId);
  const targetBranches = req.body.targetBranches;

  const { response, status } = await service.updateRepositoryBranches({
    userId,
    repoId,
    targetBranches
  });
  return res.status(status).json(response);
};

export const fixRepositoryIssue: routerFunction<
  validation.FixRepoIssuePayload
> = async (req, res) => {
  const userId = res.locals.id;
  const repoId = Number(req.params.repoId);
  const { pullNumber, path, suggestion, targetLine, startLine, commentId } =
    req.body;

  const { response, status } = await service.fixRepositoryIssue({
    userId,
    repoId,
    pullNumber,
    path,
    suggestion,
    targetLine,
    startLine,
    commentId
  });
  return res.status(status).json(response);
};
