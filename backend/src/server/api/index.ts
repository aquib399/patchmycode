import adminsRouter from "@/routes/admin/index.js";
import userRouter from "@/routes/user/index.js";
import * as base from "@/controllers/base.js";
import { Role } from "@/types/role.js";
import { Router } from "express";

const router = Router();

router.all("/health", base.healthCheck);

router.use(`/${Role.Admin}/v1`, adminsRouter);
router.use(`/${Role.User}/v1`, userRouter);

export default router;
