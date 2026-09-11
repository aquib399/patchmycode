import { getAppInfo, getInstallationOctokit } from "@/clients/github.js";
import { Installation, InstallationStatus } from "@/models/index.js";
import { Octokit } from "@octokit/rest";

export const SUGGESTION_REGEX = /```suggestion\r?\n([\s\S]*?)\r?\n```/;

export interface ApplyFixProps {
  octokit: Octokit;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  suggestion: string;
  targetLine?: number;
  startLine?: number;
}

export async function applyFixToBranch({
  octokit,
  owner,
  repo,
  branch,
  path,
  suggestion,
  targetLine,
  startLine
}: ApplyFixProps): Promise<{ commitSha: string; path: string }> {
  // 1. Fetch current file content from branch
  const { data: fileData } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
    ref: branch
  });

  if (Array.isArray(fileData) || !("content" in fileData)) {
    throw new Error(`Target path "${path}" is a directory or does not exist`);
  }

  const originalContent = Buffer.from(fileData.content, "base64").toString(
    "utf-8"
  );
  const isCrlf = originalContent.includes("\r\n");
  const eol = isCrlf ? "\r\n" : "\n";
  const lines = originalContent.split(/\r?\n/);

  const cleanSuggestion = suggestion.replace(/\r\n/g, "\n");
  const suggestionLines = cleanSuggestion.split("\n");

  let updatedContent: string;

  if (targetLine && targetLine > 0 && targetLine <= lines.length) {
    const start =
      startLine && startLine > 0 && startLine <= targetLine
        ? startLine - 1
        : targetLine - 1;
    const deleteCount = targetLine - start;

    lines.splice(start, deleteCount, ...suggestionLines);
    updatedContent = lines.join(eol);
  } else {
    // If no specific line, replace entire content
    updatedContent = cleanSuggestion;
  }

  const appInfo = await getAppInfo();
  const botSlug = appInfo.slug || "patchmycode";

  // 2. Commit updated content directly to head branch
  const commitRes = await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `fix: auto-resolve review issue in ${path} [patchmycode-autofix]`,
    content: Buffer.from(updatedContent, "utf-8").toString("base64"),
    sha: fileData.sha,
    branch,
    committer: {
      name: `${botSlug}[bot]`,
      email: `${botSlug}[bot]@users.noreply.github.com`
    },
    author: {
      name: `${botSlug}[bot]`,
      email: `${botSlug}[bot]@users.noreply.github.com`
    }
  });

  return {
    commitSha: commitRes.data.commit.sha!,
    path
  };
}

export interface ResolveCommentFixProps {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commentId: number;
  inReplyToId?: number;
  commentBody: string;
  commentPath?: string;
  commentLine?: number;
  commentStartLine?: number;
}

export async function resolveCommentFix({
  installationId,
  owner,
  repo,
  pullNumber,
  commentId,
  inReplyToId,
  commentBody,
  commentPath,
  commentLine,
  commentStartLine
}: ResolveCommentFixProps): Promise<{
  success: boolean;
  message: string;
  commitSha?: string;
}> {
  const octokit = await getInstallationOctokit(installationId);

  // 1. Verify repository is active in Installation
  const installation = await Installation.findOne({
    installationId,
    status: InstallationStatus.Active
  });

  const repoConfig = installation?.repositories?.find(
    (r) =>
      r.fullName.toLowerCase() === `${owner}/${repo}`.toLowerCase() ||
      r.name.toLowerCase() === repo.toLowerCase()
  );

  if (!repoConfig || !repoConfig.isActive) {
    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: inReplyToId || commentId,
      body: "⚠️ PatchMyCode PR reviews are currently paused for this repository. Enable review in the dashboard to apply fixes."
    });

    return {
      success: false,
      message: "Repository PR review is paused"
    };
  }

  // 2. Identify suggestion and target file/lines
  let suggestion: string | null = null;
  let filePath = commentPath;
  let targetLine = commentLine;
  let startLine = commentStartLine;

  if (inReplyToId) {
    // Fetches the original review comment that contains the suggestion
    const parentComment = await octokit.rest.pulls.getReviewComment({
      owner,
      repo,
      comment_id: inReplyToId
    });

    const match = SUGGESTION_REGEX.exec(parentComment.data.body);
    if (match) {
      suggestion = match[1];
    }
    filePath = filePath || parentComment.data.path;
    targetLine =
      targetLine ||
      parentComment.data.line ||
      parentComment.data.original_line ||
      undefined;
    startLine =
      startLine ||
      parentComment.data.start_line ||
      parentComment.data.original_start_line ||
      targetLine;
  } else {
    const match = SUGGESTION_REGEX.exec(commentBody);
    if (match) {
      suggestion = match[1];
    }
  }

  if (!suggestion || !filePath) {
    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: inReplyToId || commentId,
      body: "⚠️ Could not detect a valid code suggestion block to apply for this comment."
    });

    return {
      success: false,
      message: "No valid suggestion block found"
    };
  }

  // 3. Fetch PR head branch
  const prRes = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });
  const branch = prRes.data.head.ref;

  // 4. Apply fix and commit
  try {
    const { commitSha } = await applyFixToBranch({
      octokit,
      owner,
      repo,
      branch,
      path: filePath,
      suggestion,
      targetLine,
      startLine
    });

    const commitUrl = `https://github.com/${owner}/${repo}/commit/${commitSha}`;
    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: inReplyToId || commentId,
      body: `✅ **PatchMyCode applied fix to \`${filePath}\`**\n\nCommitted to \`${branch}\` in [\`${commitSha.slice(0, 7)}\`](${commitUrl}).`
    });

    return {
      success: true,
      message: "Fix applied and committed successfully",
      commitSha
    };
  } catch (error: any) {
    console.error("[Auto-Fix Failed]:", error);

    await octokit.rest.pulls.createReplyForReviewComment({
      owner,
      repo,
      pull_number: pullNumber,
      comment_id: inReplyToId || commentId,
      body: `❌ Failed to apply fix: ${error.message || "Unknown error occurred"}`
    });

    return {
      success: false,
      message: error.message || "Failed to apply fix"
    };
  }
}

export interface ResolvePullRequestFixesProps {
  installationId: number;
  owner: string;
  repo: string;
  pullNumber: number;
  commandText: string;
}

export async function resolvePullRequestFixes({
  installationId,
  owner,
  repo,
  pullNumber,
  commandText
}: ResolvePullRequestFixesProps): Promise<{
  success: boolean;
  message: string;
  fixedCount: number;
}> {
  const octokit = await getInstallationOctokit(installationId);

  // 1. Check repository active status
  const installation = await Installation.findOne({
    installationId,
    status: InstallationStatus.Active
  });

  const repoConfig = installation?.repositories?.find(
    (r) =>
      r.fullName.toLowerCase() === `${owner}/${repo}`.toLowerCase() ||
      r.name.toLowerCase() === repo.toLowerCase()
  );

  if (!repoConfig || !repoConfig.isActive) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: "⚠️ PatchMyCode PR reviews are currently paused for this repository. Enable review in the dashboard to apply fixes."
    });

    return {
      success: false,
      message: "Repository PR review is paused",
      fixedCount: 0
    };
  }

  // 2. Fetch PR head branch
  const prRes = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: pullNumber
  });
  const branch = prRes.data.head.ref;

  // 3. Fetch all review comments
  const commentsRes = await octokit.rest.pulls.listReviewComments({
    owner,
    repo,
    pull_number: pullNumber,
    per_page: 100
  });

  const appInfo = await getAppInfo();
  const botSlug = appInfo.slug.toLowerCase();

  // Filter bot comments with suggestions
  const suggestionComments = commentsRes.data.filter((c) => {
    const isBot =
      c.user?.type === "Bot" ||
      c.user?.login?.toLowerCase() === `${botSlug}[bot]` ||
      c.user?.login?.toLowerCase().includes("[bot]");
    return isBot && SUGGESTION_REGEX.test(c.body);
  });

  if (suggestionComments.length === 0) {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: "ℹ️ No pending code suggestions from PatchMyCode were found on this PR."
    });

    return {
      success: true,
      message: "No pending suggestions found",
      fixedCount: 0
    };
  }

  let fixedCount = 0;
  const commitShas: string[] = [];

  for (const comment of suggestionComments) {
    const match = SUGGESTION_REGEX.exec(comment.body);
    if (!match) continue;

    const suggestion = match[1];
    const targetLine = comment.line || comment.original_line || undefined;
    const startLine =
      comment.start_line ||
      comment.original_start_line ||
      targetLine ||
      undefined;

    try {
      const { commitSha } = await applyFixToBranch({
        octokit,
        owner,
        repo,
        branch,
        path: comment.path,
        suggestion,
        targetLine,
        startLine
      });

      commitShas.push(commitSha);
      fixedCount++;
    } catch (err) {
      console.warn(`[Auto-Fix] Could not apply fix for ${comment.path}:`, err);
    }
  }

  if (fixedCount > 0) {
    const latestSha = commitShas[commitShas.length - 1];
    const commitUrl = `https://github.com/${owner}/${repo}/commit/${latestSha}`;
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: `✅ **PatchMyCode applied auto-fixes!**\n\nResolved ${fixedCount} issue(s) and committed changes to \`${branch}\` (latest commit: [\`${latestSha.slice(0, 7)}\`](${commitUrl})).`
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pullNumber,
      body: "⚠️ Unable to apply pending suggestions automatically. Please review suggestions inline or check branch permissions."
    });
  }

  return {
    success: fixedCount > 0,
    message: `Applied ${fixedCount} fix(es)`,
    fixedCount
  };
}
