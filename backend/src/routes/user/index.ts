import authRoutes from "./auth.js";
import * as base from "@/controllers/base.js";
import { Router } from "express";

const router = Router();

/*  /api/user/health */
router.all("/health", base.healthCheck);

/*  /api/user/auth/* */
router.use("/auth", authRoutes);

export default router;
