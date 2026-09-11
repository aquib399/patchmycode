import { authenticateUser } from "@/middlewares/authenticate/user.js";
import * as validation from "@/validations/user/index.js";
import * as controller from "@/controllers/user/github.js";
import { Router } from "express";

const router = Router();

// OAuth URL generation (can be called with or without auth)
router.get("/oauth-url", controller.getOAuthUrl);

// Authenticated GitHub endpoints
router.use(authenticateUser);

router.delete("/disconnect", controller.disconnectGitHub);
router.get("/install-url", controller.getInstallUrl);
router.post(
  "/installations/link",
  validation.linkInstallation,
  controller.linkInstallation
);
router.get("/installations", controller.getUserInstallations);
router.get("/repositories", controller.getUserRepositories);
router.post("/sync", controller.syncUserRepositories);
router.patch(
  "/repositories/:repoId/status",
  validation.toggleRepoStatus,
  controller.toggleRepositoryStatus
);
router.get(
  "/repositories/:repoId",
  validation.getRepoDetails,
  controller.getRepositoryDetails
);
router.patch(
  "/repositories/:repoId/branches",
  validation.updateRepoBranches,
  controller.updateRepositoryBranches
);
router.post(
  "/repositories/:repoId/fix",
  validation.fixRepoIssue,
  controller.fixRepositoryIssue
);

export default router;
