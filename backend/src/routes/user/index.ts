import { authenticateUser } from "@/middlewares/authenticate/user.js";
import * as userController from "@/controllers/user/index.js";
import githubRoutes from "./github.js";
import authRoutes from "./auth.js";
import * as base from "@/controllers/base.js";
import { Router } from "express";

const router = Router();

/*  /api/user/health */
router.all("/health", base.healthCheck);

/*  /api/user/profile */
router.get("/profile", authenticateUser, userController.getProfile);

/*  /api/user/auth/* */
router.use("/auth", authRoutes);

/*  /api/user/github/* */
router.use("/github", githubRoutes);

export default router;
