import * as service from "@/services/github/index.js";

export const handleWebhook: routerFunction<any> = async (req, res) => {
  const event = req.headers["x-github-event"] as string;
  const body = req.body;

  res.status(200).json({
    error: false,
    message: "Webhook processed successfully",
    data: {}
  });
  try {
    switch (event) {
      case "pull_request": {
        service.handlePullRequest(body);
        break;
      }
      case "issue_comment": {
        service.handleIssueComment(body);
        break;
      }
      case "pull_request_review_comment": {
        service.handlePullRequestReviewComment(body);

        break;
      }
      case "installation": {
        service.handleInstallation(body);
        break;
      }
      case "installation_repositories": {
        service.handleInstallationRepositories(body);
        break;
      }
      default: {
        console.warn(`Unhandled GitHub event: ${event}`);
        break;
      }
    }
  } catch (error) {
    console.error(`Error processing GitHub webhook: ${error}`);
  }

  return {} as any;
};
