import { PRReviewOutput } from "@/types/ai.js";
import { Octokit } from "@octokit/rest";

interface CommitStatusParams {
  octokit: Octokit;
  owner: string;
  repo: string;
  sha: string;
  state: "pending" | "success" | "failure" | "error";
  description: string;
}

export async function setCommitStatus({
  octokit,
  owner,
  repo,
  sha,
  state,
  description
}: CommitStatusParams) {
  await octokit.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state,
    context: "patchmycode/review",
    description
  });
}

interface PublishReviewParams {
  octokit: Octokit;
  owner: string;
  repo: string;
  pullNumber: number;
  sha: string;
  review: PRReviewOutput;
}

export async function publishReview({
  octokit,
  owner,
  repo,
  pullNumber,
  sha,
  review
}: PublishReviewParams) {
  // 1. Build top-level review body (overall summary + file summaries)
  const fileSummaryList = review.fileSummaries
    .map((f) => `- **\`${f.path}\`**: ${f.summary}`)
    .join("\n");

  const body = `## Automated Code Review

${review.overallSummary}

### Changed Files Overview
${fileSummaryList || "_No file summaries provided._"}
`;

  // 2. Format inline comments and interactive suggestion blocks
  const comments = review.issues.map((issue) => {
    let commentBody = `**[${issue.severity}]** ${issue.comment}`;
    if (issue.suggestion) {
      commentBody += `\n\n\`\`\`suggestion\n${issue.suggestion}\n\`\`\``;
    }

    return {
      path: issue.path,
      line: issue.line,
      body: commentBody
    };
  });

  // 3. Submit review to PR
  const event = review.verdict === "APPROVE" ? "APPROVE" : "COMMENT";

  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: pullNumber,
    commit_id: sha,
    event,
    body,
    comments
  });

  // 4. Update commit status
  const hasCritical = review.issues.some((i) => i.severity === "CRITICAL");
  await setCommitStatus({
    octokit,
    owner,
    repo,
    sha,
    state: hasCritical ? "failure" : "success",
    description: hasCritical
      ? "Review completed with critical issues."
      : "Review completed successfully."
  });
}
