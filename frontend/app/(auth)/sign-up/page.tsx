"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { MFAType } from "@/types/domain/credential";
import { Button } from "@/components/ui/button";
import { getZodErrors } from "@/validations";
import { Field } from "@/components/field";
import Loading from "@/components/loading";
import { UserAPI } from "@/api/user";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight } from "lucide-react";
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

  const router = useRouter();
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

    // Auto sign-in and redirect to /app
    const signInRes = await UserAPI.auth.signIn({
      payload: {
        email: payload.details.email,
        password: payload.credentials.password
      },
      forceReturn: true
    });

    if (!signInRes.data.error) {
      router.push("/app");
    } else {
      router.push(signInHref);
    }
  };

  const signInHref = redirectParam
    ? `/sign-in?redirect=${encodeURIComponent(redirectParam)}`
    : "/sign-in";

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-border mx-auto grid max-w-7xl border-b lg:grid-cols-[1.1fr_1fr]">
          {/* Left Column: Editorial Info */}
          <div className="border-border flex flex-col justify-between border-b p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-16">
            <div>
              <div className="text-muted-foreground mb-8 flex items-center gap-3 font-mono text-xs">
                <span className="bg-border h-px w-8" />
                01 REGISTRATION
              </div>

              <h1 className="text-4xl leading-tight font-medium tracking-[-0.03em] sm:text-5xl lg:text-6xl">
                Get started with
                <br />
                <span className="text-muted-foreground">
                  PatchMyCode today.
                </span>
              </h1>

              <p className="text-muted-foreground mt-6 max-w-md text-sm leading-relaxed sm:text-base">
                Create an account to install the GitHub App, connect
                repositories, and activate automated AI pull-request reviews.
              </p>
            </div>

            {/* Feature preview */}
            <div className="border-border bg-muted/20 mt-12 overflow-hidden border lg:mt-20">
              <div className="border-border flex h-10 items-center justify-between border-b px-4">
                <span className="text-muted-foreground font-mono text-xs">
                  setup/pr-review.ts
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  +3 −0
                </span>
              </div>
              <div className="text-muted-foreground p-4 font-mono text-xs leading-6">
                <div>export const reviewPolicy = &#123;</div>
                <div className="bg-success/10 text-success pl-2">
                  + blastRadius: true,
                </div>
                <div className="bg-success/10 text-success pl-2">
                  + autoFixSuggestions: true,
                </div>
                <div className="bg-success/10 text-success pl-2">
                  + loopPrevention: true
                </div>
                <div>&#125;;</div>
              </div>
              <div className="border-border text-muted-foreground flex justify-between border-t px-4 py-2.5 font-mono text-[11px]">
                <span>policy: active</span>
                <span>all checks pass</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign Up Form */}
          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
            <div className="border-border bg-muted/10 w-full max-w-md border p-6 sm:p-8">
              <div className="border-border mb-6 flex items-center justify-between border-b pb-4">
                <span className="font-mono text-xs font-medium tracking-wider uppercase">
                  Create Account
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  /api/auth/sign-up
                </span>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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
                      className="font-mono text-xs"
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
                            ? "Resend"
                            : "Send OTP"}
                    </Button>
                  </div>

                  {otpSent && (
                    <div className="mt-2.5 flex items-center justify-between font-mono text-[11px]">
                      <span className="text-success">
                        ● OTP dispatched to email
                      </span>
                      <span className="text-muted-foreground">
                        Expires in 10m
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
                    placeholder="6-digit code"
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading || !otpSent}
                    className="w-full gap-2 font-mono text-xs"
                  >
                    {isLoading ? "Creating account..." : "Sign Up"}
                    <ArrowRight className="size-3.5" />
                  </Button>

                  {!otpSent && (
                    <p className="text-muted-foreground mt-2 text-center font-mono text-[11px]">
                      Send OTP to verify email before submitting
                    </p>
                  )}
                </div>
              </form>

              <div className="border-border mt-6 flex items-center justify-between border-t pt-4 text-xs">
                <span className="text-muted-foreground">
                  Already have an account?
                </span>
                <Link
                  href={signInHref}
                  className="text-foreground flex items-center gap-1 font-medium hover:underline"
                >
                  Sign in here <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
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
