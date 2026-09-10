import githubRouter from "./github.js";
import { Router } from "express";

const router = Router();

router.use("/github", githubRouter);

export default router;
