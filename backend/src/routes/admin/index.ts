import * as base from "@/controllers/base.js";
import { Router } from "express";

const router = Router();

/*  /api/admin/health */
router.all("/health", base.healthCheck);

export default router;
