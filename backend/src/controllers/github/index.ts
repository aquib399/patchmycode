import * as service from "@/services/github/index.js";

export const handleWebhook: routerFunction<any> = async (req, res) => {
  const event = req.headers["x-github-event"] as string;
  const body = req.body;

  res.status(200).json({
    error: false,
    message: "Webhook processed successfully",
    data: {}
  });

  switch (event) {
    case "pull_request": {
      service.handlePullRequest(body).catch((err) => {
        console.error("[Webhook] Error in handlePullRequest:", err);
      });
      break;
    }
    case "issue_comment": {
      service.handleIssueComment(body).catch((err) => {
        console.error("[Webhook] Error in handleIssueComment:", err);
      });
      break;
    }
    case "pull_request_review_comment": {
      service.handlePullRequestReviewComment(body).catch((err) => {
        console.error(
          "[Webhook] Error in handlePullRequestReviewComment:",
          err
        );
      });
      break;
    }
    case "installation": {
      service.handleInstallation(body).catch((err) => {
        console.error("[Webhook] Error in handleInstallation:", err);
      });
      break;
    }
    case "installation_repositories": {
      service.handleInstallationRepositories(body).catch((err) => {
        console.error(
          "[Webhook] Error in handleInstallationRepositories:",
          err
        );
      });
      break;
    }
    default: {
      console.log(`Unhandled GitHub event: ${event}`);
      break;
    }
  }

  return {} as any;
};
