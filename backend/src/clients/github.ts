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
