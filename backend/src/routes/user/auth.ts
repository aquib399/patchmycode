import { Router } from "express";

import * as validation from "@/validations/user/index.js";
import * as controller from "@/controllers/user/auth.js";

const router = Router();

router.post("/sign-up", validation.signUp, controller.signUp);
router.post("/sign-in", validation.signIn, controller.signIn);
router.post("/sign-out", controller.signOut);

export default router;
