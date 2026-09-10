import {
  Installation,
  InstallationStatus,
  InstallationAccountType,
  User,
  Credential,
  UserStatus,
  type IUser,
  type IInstallation
} from "@/models/index.js";
import {
  getAppInfo,
  getInstallation,
  listInstallationRepositories,
  exchangeOAuthCode,
  getGithubUser
} from "@/clients/github.js";
import {
  APP_URL,
  BASE_URL,
  TOKEN_CONFIG,
  GITHUB_CONFIG
} from "@/configs/env.js";
import { clearAuthCookies, setAuthCookies } from "@/services/index.js";
import { createResponse } from "@/utils/response.js";
import { userTokens } from "@/utils/jwt/tokens.js";
import { hashString } from "@/utils/hash.js";
import { MFAType } from "@/models/mongo/system/credential.js";
import { Role } from "@/types/role.js";
import { Types } from "mongoose";
import jwt from "jsonwebtoken";

const OAUTH_SECRET = TOKEN_CONFIG.user.oauth.secret;

export interface OAuthStatePayload {
  userId?: string;
  action?: "connect" | "signin";
  timestamp: number;
}

export function getRedirectUri(): string {
  return (
    GITHUB_CONFIG.GITHUB_APP_REDIRECT_URI ||
    `${BASE_URL}/api/user/auth/callback/github`
  );
}

// 1. Generate OAuth URL
export interface GetOAuthUrlProps {
  userId?: string;
  action?: "connect" | "signin";
}

export interface GetOAuthUrlResponse {
  url: string;
}

export const getOAuthUrl: serviceFunction<
  GetOAuthUrlProps,
  GetOAuthUrlResponse
> = async ({ userId, action = "connect" }) => {
  const statePayload: OAuthStatePayload = {
    userId,
    action,
    timestamp: Date.now()
  };

  const state = jwt.sign(statePayload, OAUTH_SECRET, { expiresIn: "15m" });
  const redirectUri = getRedirectUri();
  const clientId = GITHUB_CONFIG.GITHUB_APP_CLIENT_ID;

  const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&scope=read:user,user:email&state=${encodeURIComponent(state)}`;

  return {
    status: 200,
    response: await createResponse<GetOAuthUrlResponse>(
      "success",
      "OAuth URL generated successfully",
      { url }
    )
  };
};

// 2. Handle OAuth Callback
export interface HandleOAuthCallbackProps {
  code: string;
  state?: string;
  req: routerRequest;
  res: routerResponse;
}

export interface HandleOAuthCallbackResponse {
  redirectUrl: string;
}

export const handleOAuthCallback: serviceFunction<
  HandleOAuthCallbackProps,
  HandleOAuthCallbackResponse
> = async ({ code, state, req, res }) => {
  let statePayload: OAuthStatePayload | null = null;

  if (state) {
    try {
      statePayload = jwt.verify(state, OAUTH_SECRET) as OAuthStatePayload;
    } catch (err) {
      console.warn("[GitHub OAuth] Invalid state token:", err);
    }
  }

  const redirectUri = getRedirectUri();
  const accessToken = await exchangeOAuthCode(code, redirectUri);
  const ghUser = await getGithubUser(accessToken);

  const userIdFromState = statePayload?.userId;

  if (userIdFromState) {
    // Authenticated user connecting GitHub
    const user = await User.findById(userIdFromState);
    if (!user) {
      return {
        status: 404,
        response: await createResponse<HandleOAuthCallbackResponse>(
          "error",
          "User account not found",
          { redirectUrl: `${APP_URL}/app?error=UserNotFound` }
        )
      };
    }

    user.github = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name,
      email: ghUser.email,
      avatarUrl: ghUser.avatarUrl,
      connectedAt: new Date()
    };
    await user.save();

    // Auto-link any existing installations for this account
    await Installation.updateMany(
      {
        $or: [{ accountId: ghUser.id }, { accountLogin: ghUser.login }],
        status: { $ne: InstallationStatus.Deleted }
      },
      { $set: { userId: user._id } }
    );

    return {
      status: 200,
      response: await createResponse<HandleOAuthCallbackResponse>(
        "success",
        "GitHub connected successfully",
        { redirectUrl: `${APP_URL}/app?github=connected` }
      )
    };
  }

  // Unauthenticated user: Sign in or Sign up with GitHub
  let user = await User.findOne({ "github.id": ghUser.id });

  if (!user && ghUser.email) {
    user = await User.findOne({ email: ghUser.email.toLowerCase() });
  }

  if (!user) {
    // Create new user
    user = await User.create({
      name: ghUser.name || ghUser.login,
      email: ghUser.email || `${ghUser.login}@github.placeholder`,
      status: UserStatus.Active,
      github: {
        id: ghUser.id,
        login: ghUser.login,
        name: ghUser.name,
        email: ghUser.email,
        avatarUrl: ghUser.avatarUrl,
        connectedAt: new Date()
      }
    });

    const randomPassword = await hashString(crypto.randomUUID());
    await Credential.create({
      targetId: user._id,
      target: Role.User,
      mfaType: MFAType.None,
      passwordHash: randomPassword
    });
  } else if (!user.github || !user.github.id) {
    user.github = {
      id: ghUser.id,
      login: ghUser.login,
      name: ghUser.name,
      email: ghUser.email,
      avatarUrl: ghUser.avatarUrl,
      connectedAt: new Date()
    };
    await user.save();
  }

  // Link any matching installations
  await Installation.updateMany(
    {
      $or: [{ accountId: ghUser.id }, { accountLogin: ghUser.login }],
      status: { $ne: InstallationStatus.Deleted }
    },
    { $set: { userId: user._id } }
  );

  const id = user._id.toString();
  const [access, refresh] = await Promise.all([
    userTokens.createAccessToken({ id }),
    userTokens.createRefreshToken({ id }, req)
  ]);

  setAuthCookies({
    res,
    role: Role.User,
    tokenConfig: TOKEN_CONFIG.user,
    tokens: { accessToken: access, refreshToken: refresh }
  });

  return {
    status: 200,
    response: await createResponse<HandleOAuthCallbackResponse>(
      "success",
      "Signed in via GitHub successfully",
      { redirectUrl: `${APP_URL}/app` }
    )
  };
};

// 3. Disconnect GitHub
export interface DisconnectGitHubProps {
  userId: string;
}

export const disconnectGitHub: serviceFunction<
  DisconnectGitHubProps,
  { disconnected: boolean }
> = async ({ userId }) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      response: await createResponse("error", "User not found", null)
    };
  }

  user.github = undefined;
  await user.save();

  return {
    status: 200,
    response: await createResponse(
      "success",
      "GitHub disconnected successfully",
      {
        disconnected: true
      }
    )
  };
};

// 4. Get GitHub App Installation URL
export interface GetInstallUrlProps {
  userId: string;
}

export interface GetInstallUrlResponse {
  url: string;
}

export const getInstallUrl: serviceFunction<
  GetInstallUrlProps,
  GetInstallUrlResponse
> = async ({ userId }) => {
  const appInfo = await getAppInfo();
  const state = jwt.sign({ userId, timestamp: Date.now() }, OAUTH_SECRET, {
    expiresIn: "30m"
  });

  const url = `https://github.com/apps/${appInfo.slug}/installations/new?state=${encodeURIComponent(
    state
  )}`;

  return {
    status: 200,
    response: await createResponse<GetInstallUrlResponse>(
      "success",
      "Installation URL generated successfully",
      { url }
    )
  };
};

// 5. Link Installation to User
export interface LinkInstallationProps {
  userId: string;
  installationId: number;
}

export const linkInstallation: serviceFunction<
  LinkInstallationProps,
  IInstallation
> = async ({ userId, installationId }) => {
  let installation = await Installation.findOne({ installationId });

  const ghInstallation = await getInstallation(installationId);
  const ghRepos = await listInstallationRepositories(installationId);

  const existingActiveMap = new Map<number, boolean>();
  if (installation && installation.repositories) {
    for (const r of installation.repositories) {
      existingActiveMap.set(r.repoId, r.isActive);
    }
  }

  const formattedRepos = (ghRepos || []).map((r: any) => ({
    repoId: r.id,
    name: r.name,
    fullName: r.full_name,
    private: Boolean(r.private),
    isActive: existingActiveMap.has(r.id) ? existingActiveMap.get(r.id)! : true,
    htmlUrl: r.html_url,
    description: r.description || ""
  }));

  const account = ghInstallation.account as any;

  installation = await Installation.findOneAndUpdate(
    { installationId },
    {
      installationId,
      userId: new Types.ObjectId(userId),
      accountLogin: account?.login || "unknown",
      accountId: account?.id ?? 0,
      accountType:
        (account?.type as InstallationAccountType) ||
        InstallationAccountType.User,
      accountAvatarUrl: account?.avatar_url,
      status: InstallationStatus.Active,
      repositories: formattedRepos
    },
    { upsert: true, returnDocument: "after" }
  );

  return {
    status: 200,
    response: await createResponse<IInstallation>(
      "success",
      "Installation linked and repositories synchronized",
      installation!.toObject()
    )
  };
};

// 6. Get User Installations
export interface GetUserInstallationsProps {
  userId: string;
}

export const getUserInstallations: serviceFunction<
  GetUserInstallationsProps,
  IInstallation[]
> = async ({ userId }) => {
  const installations = await Installation.find({
    userId: new Types.ObjectId(userId),
    status: { $ne: InstallationStatus.Deleted }
  }).sort({ createdAt: -1 });

  return {
    status: 200,
    response: await createResponse<IInstallation[]>(
      "success",
      "User installations fetched successfully",
      installations.map((i) => i.toObject())
    )
  };
};

// 7. Get User Repositories (Flattened across installations)
export interface RepositoryViewItem {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl: string;
  description: string;
  installationId: number;
  accountLogin: string;
  accountType: InstallationAccountType;
  accountAvatarUrl?: string;
}

export interface GetUserRepositoriesProps {
  userId: string;
  search?: string;
  status?: "all" | "active" | "inactive";
}

export const getUserRepositories: serviceFunction<
  GetUserRepositoriesProps,
  RepositoryViewItem[]
> = async ({ userId, search, status = "all" }) => {
  const installations = await Installation.find({
    userId: new Types.ObjectId(userId),
    status: { $ne: InstallationStatus.Deleted }
  });

  let repositories: RepositoryViewItem[] = [];

  for (const inst of installations) {
    for (const r of inst.repositories) {
      repositories.push({
        repoId: r.repoId,
        name: r.name,
        fullName: r.fullName,
        private: r.private,
        isActive: r.isActive,
        htmlUrl: r.htmlUrl || `https://github.com/${r.fullName}`,
        description: r.description || "",
        installationId: inst.installationId,
        accountLogin: inst.accountLogin,
        accountType: inst.accountType,
        accountAvatarUrl: inst.accountAvatarUrl
      });
    }
  }

  if (status === "active") {
    repositories = repositories.filter((r) => r.isActive);
  } else if (status === "inactive") {
    repositories = repositories.filter((r) => !r.isActive);
  }

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    repositories = repositories.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.accountLogin.toLowerCase().includes(q)
    );
  }

  repositories.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return {
    status: 200,
    response: await createResponse<RepositoryViewItem[]>(
      "success",
      "Repositories fetched successfully",
      repositories
    )
  };
};

// 8. Sync Repositories with GitHub
export interface SyncUserRepositoriesProps {
  userId: string;
}

export const syncUserRepositories: serviceFunction<
  SyncUserRepositoriesProps,
  RepositoryViewItem[]
> = async ({ userId }) => {
  const installations = await Installation.find({
    userId: new Types.ObjectId(userId),
    status: { $ne: InstallationStatus.Deleted }
  });

  for (const inst of installations) {
    try {
      const ghRepos = await listInstallationRepositories(inst.installationId);
      const existingMap = new Map(
        inst.repositories.map((r) => [r.repoId, r.isActive])
      );

      const updatedRepos = (ghRepos || []).map((r: any) => ({
        repoId: r.id,
        name: r.name,
        fullName: r.full_name,
        private: Boolean(r.private),
        isActive: existingMap.has(r.id) ? existingMap.get(r.id)! : true,
        htmlUrl: r.html_url,
        description: r.description || ""
      }));

      inst.repositories = updatedRepos;
      await inst.save();
    } catch (err) {
      console.error(
        `[Sync Repos] Failed to sync installation ${inst.installationId}:`,
        err
      );
    }
  }

  const { response } = await getUserRepositories({ userId });
  return {
    status: 200,
    response: await createResponse<RepositoryViewItem[]>(
      "success",
      "Repositories synchronized successfully",
      response.data
    )
  };
};

// 9. Toggle Repository PR Review Status
export interface ToggleRepositoryStatusProps {
  userId: string;
  repoId: number;
  isActive: boolean;
}

export interface ToggleRepositoryStatusResponse {
  repoId: number;
  isActive: boolean;
}

export const toggleRepositoryStatus: serviceFunction<
  ToggleRepositoryStatusProps,
  ToggleRepositoryStatusResponse
> = async ({ userId, repoId, isActive }) => {
  const updatedInstallation = await Installation.findOneAndUpdate(
    {
      userId: new Types.ObjectId(userId),
      "repositories.repoId": repoId
    },
    {
      $set: { "repositories.$.isActive": isActive }
    },
    { returnDocument: "after" }
  );

  if (!updatedInstallation) {
    return {
      status: 404,
      response: await createResponse(
        "error",
        "Repository not found or does not belong to your account",
        null
      )
    };
  }

  return {
    status: 200,
    response: await createResponse<ToggleRepositoryStatusResponse>(
      "success",
      `PR reviews ${isActive ? "enabled" : "paused"} for repository`,
      { repoId, isActive }
    )
  };
};
