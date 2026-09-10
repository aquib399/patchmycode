import * as controller from "@/controllers/github/index.js";
import { Router } from "express";

const router = Router();

router.all("/", controller.handleWebhook);

export default router;
