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

export default router;
