"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { MFAType } from "@/types/domain/credential";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getZodErrors } from "@/validations";
import { Field } from "@/components/field";
import Loading from "@/components/loading";
import { UserAPI } from "@/api/user";
import Link from "next/link";
import {
  signUpSchema,
  SignUpPayload,
  sendSignupOtpSchema
} from "@/validations/user/auth";

function SignUpForm() {
  const [formData, setFormData] = useState<SignUpPayload>({
    credentials: { mfaType: MFAType.None, password: "" },
    details: { email: "", name: "", otpRequestId: "", otpCode: "" }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: SignUpPayload) => ({
      ...prev,
      details: { ...prev.details, [name]: value }
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`details.${name}`];
      return next;
    });
    if (name === "email") {
      setOtpSent(false);
      setResendCooldown(0);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtpInput(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next["details.otpCode"];
      return next;
    });
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: SignUpPayload) => ({
      ...prev,
      credentials: { ...prev.credentials, [name]: value }
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`credentials.${name}`];
      return next;
    });
  };

  const handleSendOtp = async () => {
    const emailToValidate = formData.details.email.trim();
    const emailResult = sendSignupOtpSchema.safeParse({
      email: emailToValidate
    });
    if (!emailResult.success) {
      setErrors((prev) => ({
        ...prev,
        "details.email": "Please enter a valid email address"
      }));
      return;
    }

    setIsSendingOtp(true);
    const result = await UserAPI.auth.signUpSendOtp({
      payload: { email: emailToValidate },
      forceReturn: true,
      toastConfig: { success: { enabled: true }, error: { enabled: true } }
    });
    setIsSendingOtp(false);

    if (result.data.error) return;
    setFormData((prev: SignUpPayload) => ({
      ...prev,
      details: {
        ...prev.details,
        email: emailToValidate,
        otpRequestId: result.data.data!.otpRequestId
      }
    }));
    setOtpSent(true);
    setResendCooldown(60);
    setOtpInput("");
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!otpSent) {
      setErrors((prev) => ({
        ...prev,
        "details.email": "Please request and verify your OTP first"
      }));
      return;
    }

    const payload: SignUpPayload = {
      ...formData,
      details: {
        ...formData.details,
        email: formData.details.email.trim(),
        otpCode: otpInput.trim()
      }
    };

    const result = signUpSchema.safeParse(payload);
    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return;
    }

    setIsLoading(true);
    const apiResult = await UserAPI.auth.signUp({
      payload: result.data,
      forceReturn: true,
      toastConfig: {
        success: { enabled: true },
        error: { enabled: true }
      }
    });

    setIsLoading(false);
    if (apiResult.data.error) return;
  };

  const signInHref = redirectParam
    ? `/sign-in?redirect=${encodeURIComponent(redirectParam)}`
    : "/sign-in";

  return (
    <div className="bg-background flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-border bg-card/60 text-card-foreground w-full max-w-md space-y-6 rounded-2xl border p-8 shadow-sm backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Create an Account
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Join us to start managing your code and projects
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <Field
              id="name"
              name="name"
              label="Full Name"
              placeholder="John Doe"
              autoComplete="name"
              value={formData.details.name}
              onChange={handleDetailsChange}
              error={errors["details.name"]}
              required
            />

            <div>
              <div className="flex items-end gap-2">
                <Field
                  id="email"
                  name="email"
                  type="email"
                  label="Email Address"
                  placeholder="you@example.com"
                  autoComplete="email"
                  value={formData.details.email}
                  onChange={handleDetailsChange}
                  error={errors["details.email"]}
                  wrapperClassName="flex-1"
                  required
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendOtp}
                  disabled={
                    isSendingOtp ||
                    !formData.details.email ||
                    resendCooldown > 0
                  }
                >
                  {isSendingOtp
                    ? "Sending…"
                    : resendCooldown > 0
                      ? `Resend (${resendCooldown}s)`
                      : otpSent
                        ? "Resend OTP"
                        : "Send OTP"}
                </Button>
              </div>

              {otpSent && (
                <div className="mt-2 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-green-500/30 text-green-600 dark:text-green-400"
                  >
                    OTP sent to email
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    Code expires in 10 minutes
                  </span>
                </div>
              )}
            </div>

            {otpSent && (
              <Field
                id="otpInput"
                name="otpInput"
                label="Verification Code"
                value={otpInput}
                onChange={handleOtpChange}
                inputMode="numeric"
                maxLength={6}
                placeholder="6-digit verification code"
                error={errors["details.otpCode"]}
                required
              />
            )}

            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="Min. 8 characters"
              autoComplete="new-password"
              value={formData.credentials.password}
              onChange={handleCredentialsChange}
              error={errors["credentials.password"]}
              required
            />
          </div>

          <div className="space-y-4 pt-2">
            <Button
              type="submit"
              disabled={isLoading || !otpSent}
              className="w-full"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>

            {!otpSent && (
              <p className="text-muted-foreground text-center text-xs">
                Enter your email and click "Send OTP" to verify your email
                before signing up.
              </p>
            )}

            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <Link href={signInHref} className="text-primary hover:underline">
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UserSignUpPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignUpForm />
    </Suspense>
  );
}
