import { GITHUB_CONFIG } from "@/configs/env.js";
import { Octokit } from "@octokit/rest";
import { App } from "@octokit/app";

export const githubApp = new App({
  appId: GITHUB_CONFIG.GITHUB_APP_ID,
  privateKey: GITHUB_CONFIG.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  Octokit: Octokit
});

export async function getInstallationOctokit(installationId: number) {
  return await githubApp.getInstallationOctokit(installationId);
}

let cachedAppInfo: { slug: string; name: string; htmlUrl: string } | null =
  null;

export async function getAppInfo() {
  if (cachedAppInfo) return cachedAppInfo;
  const fallbackSlug = process.env.GITHUB_APP_SLUG || "patchmycode";
  try {
    const { data } = await githubApp.octokit.request("GET /app");
    const appData = data as any;
    cachedAppInfo = {
      slug: process.env.GITHUB_APP_SLUG || appData?.slug || "patchmycode",
      name: appData?.name || "PatchMyCode",
      htmlUrl: appData?.html_url || `https://github.com/apps/${fallbackSlug}`
    };
    return cachedAppInfo;
  } catch (error) {
    console.error("[GitHub App] Failed to fetch app info:", error);
    return {
      slug: fallbackSlug,
      name: "PatchMyCode",
      htmlUrl: `https://github.com/apps/${fallbackSlug}`
    };
  }
}

export async function getInstallation(installationId: number) {
  const { data } = await githubApp.octokit.request(
    "GET /app/installations/{installation_id}",
    {
      installation_id: installationId
    }
  );
  return data;
}

export async function listInstallationRepositories(installationId: number) {
  const octokit = await getInstallationOctokit(installationId);
  const { data } = await octokit.rest.apps.listReposAccessibleToInstallation({
    per_page: 100
  });
  return data.repositories;
}

export async function exchangeOAuthCode(code: string, redirectUri: string) {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      client_id: GITHUB_CONFIG.GITHUB_APP_CLIENT_ID,
      client_secret: GITHUB_CONFIG.GITHUB_APP_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri
    })
  });

  const data = (await response.json()) as {
    access_token?: string;
    token_type?: string;
    scope?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        "Failed to exchange GitHub OAuth code"
    );
  }

  return data.access_token;
}

export interface GithubUserProfile {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
  htmlUrl?: string;
}

export async function getGithubUser(
  accessToken: string
): Promise<GithubUserProfile> {
  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "PatchMyCode-App"
    }
  });

  if (!userRes.ok) {
    throw new Error(`Failed to fetch GitHub user: ${userRes.statusText}`);
  }

  const user = (await userRes.json()) as any;

  let email = user.email;
  if (!email) {
    try {
      const emailRes = await fetch("https://api.github.com/user/emails", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "PatchMyCode-App"
        }
      });
      if (emailRes.ok) {
        const emails = (await emailRes.json()) as Array<{
          email: string;
          primary: boolean;
          verified: boolean;
        }>;
        const primary =
          emails.find((e) => e.primary && e.verified) || emails[0];
        if (primary) email = primary.email;
      }
    } catch {
      // Ignore failure to fetch private emails
    }
  }

  return {
    id: user.id,
    login: user.login,
    name: user.name || user.login,
    email: email || undefined,
    avatarUrl: user.avatar_url,
    htmlUrl: user.html_url
  };
}
