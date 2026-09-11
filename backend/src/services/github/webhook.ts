import { downloadAndExtractRepo, cleanupRepo } from "@/utils/archive.js";
import { getInstallationOctokit, getAppInfo } from "@/clients/github.js";
import { PRReviewOutput, prReviewResponseSchema } from "@/types/ai.js";
import { resolveCommentFix, resolvePullRequestFixes } from "./fix.js";
import { generateStructuredAIResponse } from "@/clients/ai/client.js";
import { publishReview, setCommitStatus } from "./publisher.js";
import { analyzeBlastRadius } from "@/utils/blast-radius.js";
import { generatePrompt } from "@/clients/ai/prompt.js";
import { createResponse } from "@/utils/response.js";
import parseDiff from "parse-diff";
import {
  Installation,
  InstallationStatus,
  InstallationAccountType,
  User
} from "@/models/index.js";

export interface HandlePullRequestPayload {
  action: "opened" | "synchronize" | "reopened" | "closed" | string;
  number: number;
  pull_request: {
    number: number;
    title: string;
    state: string;
    head: {
      sha: string;
      ref: string;
    };
    base: {
      ref: string;
    };
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    owner: {
      login: string;
    };
  };
  installation?: {
    id: number;
  };
  sender?: {
    login: string;
    type: string;
    id?: number;
  };
}

export interface HandlePullRequestResponse {
  triggered: boolean;
  reason?: string;
  details?: {
    repo: string;
    prNumber: number;
    sha: string;
    installationId?: number;
  };
}

export const handlePullRequest: serviceFunction<
  HandlePullRequestPayload,
  HandlePullRequestResponse
> = async (props) => {
  const allowedActions = ["opened", "synchronize", "reopened"];

  if (!allowedActions.includes(props.action)) {
    return {
      status: 200,
      response: await createResponse<HandlePullRequestResponse>(
        "success",
        `Ignored action: ${props.action}`,
        { triggered: false, reason: `Action ${props.action} not handled` }
      )
    };
  }

  const installationId = props.installation?.id;
  if (!installationId) {
    return {
      status: 400,
      response: await createResponse<HandlePullRequestResponse>(
        "error",
        "Missing installation ID",
        { triggered: false, reason: "No installation ID provided" }
      )
    };
  }

  // 1. Verify installation and repository review enablement
  const installation = await Installation.findOne({
    installationId,
    status: InstallationStatus.Active
  });

  if (!installation) {
    return {
      status: 200,
      response: await createResponse<HandlePullRequestResponse>(
        "success",
        "Installation not found or inactive; skipping PR review",
        { triggered: false, reason: "Installation not found or inactive" }
      )
    };
  }

  const repoConfig = installation.repositories?.find(
    (r) =>
      r.repoId === props.repository.id ||
      r.fullName.toLowerCase() === props.repository.full_name.toLowerCase()
  );

  if (!repoConfig || !repoConfig.isActive) {
    return {
      status: 200,
      response: await createResponse<HandlePullRequestResponse>(
        "success",
        `PR review is disabled for repository ${props.repository.full_name}`,
        { triggered: false, reason: "Repository PR review is disabled" }
      )
    };
  }

  // Check if specific target branches are configured for review
  if (repoConfig.targetBranches && repoConfig.targetBranches.length > 0) {
    const baseRef = props.pull_request.base.ref;
    const isTargetBranch = repoConfig.targetBranches.includes(baseRef);
    if (!isTargetBranch) {
      return {
        status: 200,
        response: await createResponse<HandlePullRequestResponse>(
          "success",
          `PR review skipped: base branch "${baseRef}" is not in configured branches [${repoConfig.targetBranches.join(", ")}]`,
          {
            triggered: false,
            reason: `Base branch ${baseRef} is not in configured target branches`
          }
        )
      };
    }
  }

  const [owner, repo] = props.repository.full_name.split("/");
  const pullNumber = props.pull_request.number;
  const headSha = props.pull_request.head.sha;

  const octokit = await getInstallationOctokit(installationId);
  const appInfo = await getAppInfo();
  const botSlug = (appInfo.slug || "patchmycode").toLowerCase();
  const senderLogin = (props.sender?.login || "").toLowerCase();

  // 2. Prevent review loops: skip commits authored by PatchMyCode bot itself
  const isBotSender =
    props.sender?.type === "Bot" &&
    (senderLogin === `${botSlug}[bot]` ||
      senderLogin.includes(botSlug) ||
      senderLogin.includes("[bot]"));

  let isBotCommit = isBotSender;

  if (!isBotCommit) {
    try {
      const { data: commitData } = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: headSha
      });

      const commitMsg = commitData.commit.message || "";
      const authorLogin = (commitData.author?.login || "").toLowerCase();
      const committerLogin = (commitData.committer?.login || "").toLowerCase();
      const authorName = (commitData.commit.author?.name || "").toLowerCase();

      if (
        commitMsg.includes("[patchmycode-autofix]") ||
        commitMsg.includes("[skip-review]") ||
        authorLogin === `${botSlug}[bot]` ||
        committerLogin === `${botSlug}[bot]` ||
        authorName.includes(botSlug)
      ) {
        isBotCommit = true;
      }
    } catch (err) {
      console.warn("[PR Loop Check] Failed to fetch commit details:", err);
    }
  }

  if (isBotCommit) {
    console.log(
      `[PR Review Skipped] Commit ${headSha} on ${props.repository.full_name} was authored by PatchMyCode bot.`
    );
    return {
      status: 200,
      response: await createResponse<HandlePullRequestResponse>(
        "success",
        "Skipping review: commit was authored by PatchMyCode bot itself",
        {
          triggered: false,
          reason: "Commit authored by bot itself"
        }
      )
    };
  }

  // 3. User / Developer commit on enabled repo: initiate AI review
  await setCommitStatus({
    octokit,
    owner,
    repo,
    sha: headSha,
    state: "pending",
    description: "Running PR analysis & AI review..."
  });

  try {
    let repoDir: string | null = null;

    try {
      const { data: rawDiff } = (await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
        mediaType: { format: "diff" }
      })) as unknown as { data: string };

      const parsedDiff = parseDiff(rawDiff);
      repoDir = await downloadAndExtractRepo(octokit, owner, repo, headSha);
      const blastRadius = await analyzeBlastRadius(repoDir, parsedDiff);

      const prompt = generatePrompt({
        blastRadius,
        prTitle: props.pull_request.title,
        prRefBranch: props.pull_request.base.ref,
        prHeadBranch: props.pull_request.head.ref,
        diff: rawDiff
      });

      const review = await generateStructuredAIResponse<PRReviewOutput>({
        prompt,
        schema: prReviewResponseSchema
      });

      await publishReview({
        octokit,
        owner,
        repo,
        pullNumber,
        sha: headSha,
        review
      });
    } finally {
      if (repoDir) {
        await cleanupRepo(repoDir);
      }
    }

    return {
      status: 200,
      response: await createResponse<HandlePullRequestResponse>(
        "success",
        "PR reviewed and published successfully",
        {
          triggered: true,
          details: {
            repo: props.repository.full_name,
            prNumber: pullNumber,
            sha: headSha,
            installationId
          }
        }
      )
    };
  } catch (error: any) {
    console.error("[PR Pipeline Failed]:", error);

    await setCommitStatus({
      octokit,
      owner,
      repo,
      sha: headSha,
      state: "error",
      description: "Automated code review failed."
    });

    return {
      status: 500,
      response: await createResponse<HandlePullRequestResponse>(
        "error",
        error.message || "Failed to process PR review",
        { triggered: false }
      )
    };
  }
};

export interface HandleIssueCommentPayload {
  action: "created" | "edited" | "deleted" | string;
  issue: {
    number: number;
    pull_request?: {
      url: string;
      html_url: string;
    };
  };
  comment: {
    id: number;
    body: string;
    user: {
      login: string;
    };
  };
  repository: {
    full_name: string;
  };
  installation?: {
    id: number;
  };
}

export interface HandleIssueCommentResponse {
  triggered: boolean;
  command?: string;
}

export const handleIssueComment: serviceFunction<
  HandleIssueCommentPayload,
  HandleIssueCommentResponse
> = async (props) => {
  // Only process new comments on PRs
  if (props.action !== "created" || !props.issue.pull_request) {
    return {
      status: 200,
      response: await createResponse<HandleIssueCommentResponse>(
        "success",
        "Ignored non-PR comment",
        { triggered: false }
      )
    };
  }

  const commentText = props.comment.body.trim();
  const isFixCommand = commentText.startsWith("/fix");

  if (!isFixCommand) {
    return {
      status: 200,
      response: await createResponse<HandleIssueCommentResponse>(
        "success",
        "No executable command found",
        { triggered: false }
      )
    };
  }

  const installationId = props.installation?.id;
  if (!installationId) {
    return {
      status: 400,
      response: await createResponse<HandleIssueCommentResponse>(
        "error",
        "Missing installation ID",
        { triggered: false }
      )
    };
  }

  const [owner, repo] = props.repository.full_name.split("/");

  console.log(
    `[Auto-Fix Triggered] /fix command on ${props.repository.full_name} #${props.issue.number}`
  );

  const fixResult = await resolvePullRequestFixes({
    installationId,
    owner,
    repo,
    pullNumber: props.issue.number,
    commandText: commentText
  });

  return {
    status: 200,
    response: await createResponse<HandleIssueCommentResponse>(
      "success",
      fixResult.message,
      { triggered: fixResult.success, command: "/fix" }
    )
  };
};

export interface HandlePullRequestReviewCommentPayload {
  action: "created" | "edited" | "deleted" | string;
  pull_request: {
    number: number;
  };
  comment: {
    id: number;
    body: string;
    path: string;
    line?: number;
    start_line?: number;
    original_line?: number;
    original_start_line?: number;
    in_reply_to_id?: number;
    user?: {
      login: string;
      type: string;
    };
  };
  repository: {
    id: number;
    full_name: string;
  };
  installation?: {
    id: number;
  };
}

export interface HandlePullRequestReviewCommentResponse {
  handled: boolean;
}

export const handlePullRequestReviewComment: serviceFunction<
  HandlePullRequestReviewCommentPayload,
  HandlePullRequestReviewCommentResponse
> = async (props) => {
  if (props.action !== "created") {
    return {
      status: 200,
      response: await createResponse<HandlePullRequestReviewCommentResponse>(
        "success",
        "Ignored non-create review comment",
        { handled: false }
      )
    };
  }

  const commentText = props.comment.body.trim();
  const isFixCommand = commentText.startsWith("/fix");

  if (isFixCommand) {
    const installationId = props.installation?.id;
    if (!installationId) {
      return {
        status: 400,
        response: await createResponse<HandlePullRequestReviewCommentResponse>(
          "error",
          "Missing installation ID",
          { handled: false }
        )
      };
    }

    const [owner, repo] = props.repository.full_name.split("/");

    console.log(
      `[Inline Auto-Fix Triggered] ${props.repository.full_name} PR #${props.pull_request.number} on file ${props.comment.path}`
    );

    const fixResult = await resolveCommentFix({
      installationId,
      owner,
      repo,
      pullNumber: props.pull_request.number,
      commentId: props.comment.id,
      inReplyToId: props.comment.in_reply_to_id,
      commentBody: commentText,
      commentPath: props.comment.path,
      commentLine: props.comment.line,
      commentStartLine: props.comment.start_line
    });

    return {
      status: 200,
      response: await createResponse<HandlePullRequestReviewCommentResponse>(
        "success",
        fixResult.message,
        { handled: fixResult.success }
      )
    };
  }

  console.log(
    `[Inline Comment] ${props.repository.full_name} PR #${props.pull_request.number} on file ${props.comment.path}`
  );

  return {
    status: 200,
    response: await createResponse<HandlePullRequestReviewCommentResponse>(
      "success",
      "Review comment processed",
      { handled: true }
    )
  };
};

// --- Installation (App installed/uninstalled) ---
export interface HandleInstallationPayload {
  action: "created" | "deleted" | "suspend" | "unsuspend" | string;
  installation: {
    id: number;
    account: {
      login: string;
      type: string;
    };
  };
  repositories?: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
}

export interface HandleInstallationResponse {
  installationId: number;
  status: string;
}

export const handleInstallation: serviceFunction<
  HandleInstallationPayload,
  HandleInstallationResponse
> = async (props) => {
  const { action, installation, repositories } = props;
  const { id: installationId, account } = installation;

  if (action === "created") {
    const formattedRepos = (repositories || []).map((repo) => ({
      repoId: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      private: false,
      isActive: true
    }));

    const matchingUser = await User.findOne({
      $or: [
        { "github.id": (account as any).id },
        { "github.login": account.login }
      ]
    });

    const updateDoc: any = {
      installationId,
      accountLogin: account.login,
      accountId: (account as any).id ?? 0,
      accountType: account.type as InstallationAccountType,
      status: InstallationStatus.Active,
      repositories: formattedRepos
    };

    if (matchingUser) {
      updateDoc.userId = matchingUser._id;
    }

    await Installation.findOneAndUpdate({ installationId }, updateDoc, {
      upsert: true,
      returnDocument: "after"
    });
  } else if (action === "deleted") {
    await Installation.findOneAndUpdate(
      { installationId },
      { status: InstallationStatus.Deleted }
    );
  } else if (action === "suspend") {
    await Installation.findOneAndUpdate(
      { installationId },
      { status: InstallationStatus.Suspended }
    );
  } else if (action === "unsuspend") {
    await Installation.findOneAndUpdate(
      { installationId },
      { status: InstallationStatus.Active }
    );
  }

  return {
    status: 200,
    response: await createResponse<HandleInstallationResponse>(
      "success",
      `Installation ${action} synced`,
      { installationId, status: action }
    )
  };
};

// --- Installation Repositories (Repos added/removed) ---
export interface HandleInstallationRepositoriesPayload {
  action: "added" | "removed" | string;
  installation: {
    id: number;
    account: {
      login: string;
    };
  };
  repositories_added: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
  repositories_removed: Array<{
    id: number;
    name: string;
    full_name: string;
  }>;
}

export interface HandleInstallationRepositoriesResponse {
  installationId: number;
  addedCount: number;
  removedCount: number;
}

export const handleInstallationRepositories: serviceFunction<
  HandleInstallationRepositoriesPayload,
  HandleInstallationRepositoriesResponse
> = async (props) => {
  const { installation, repositories_added, repositories_removed } = props;
  const installationId = installation.id;

  const added = repositories_added || [];
  const removed = repositories_removed || [];

  const addedRepos = added.map((repo) => ({
    repoId: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    private: false,
    isActive: true
  }));

  const removedRepoIds = removed.map((repo) => repo.id);

  // Remove de-selected repos and append newly selected repos
  await Installation.findOneAndUpdate(
    { installationId },
    {
      $pull: { repositories: { repoId: { $in: removedRepoIds } } }
    }
  );

  if (addedRepos.length > 0) {
    await Installation.findOneAndUpdate(
      { installationId },
      {
        $push: { repositories: { $each: addedRepos } }
      }
    );
  }

  return {
    status: 200,
    response: await createResponse<HandleInstallationRepositoriesResponse>(
      "success",
      "Installation repositories updated",
      {
        installationId,
        addedCount: added.length,
        removedCount: removed.length
      }
    )
  };
};
