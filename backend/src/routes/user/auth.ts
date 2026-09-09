import { authenticateUser } from "@/middlewares/authenticate/user.js";
import * as validation from "@/validations/user/index.js";
import * as controller from "@/controllers/user/auth.js";
import * as base from "@/controllers/base.js";
import { Router } from "express";

const router = Router();

router.post("/sign-in", validation.signIn, controller.signIn);
router.post("/sign-up", validation.signUp, controller.signUp);
router.post(
  "/sign-up/send-otp",
  validation.sendSignupOtp,
  controller.sendSignUpOtp
);
router.post("/sign-out", controller.signOut);
router.all("/verify-token", authenticateUser, base.verifyToken);

export default router;
