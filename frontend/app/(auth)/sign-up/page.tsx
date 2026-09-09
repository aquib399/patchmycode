"use client";

import { signUpSchema, SignUpPayload } from "@/validations/v1/user/auth";
import { MFAType } from "@/types/domain/credential";
import { Button } from "@/components/ui/button";
import { getZodErrors } from "@/validations";
import { useRouter } from "next/navigation";
import { UserAPI } from "@/api/user";
import { useState } from "react";
import Link from "next/link";
import { Field } from "@/components/field";

export default function UserSignUpPage() {
  const [formData, setFormData] = useState<SignUpPayload>({
    credentials: { mfaType: MFAType.None, password: "" },
    details: { email: "", name: "", otpRequestId: "", otpCode: "" }
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();
  const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      details: { ...prev.details, [name]: value }
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`details.${name}`];
      return next;
    });
    if (name === "email") setOtpSent(false);
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setOtpInput(value);
    setErrors((prev) => {
      const next = { ...prev };
      delete next["details.otpCode"];
      return next;
    });
  };

  const handleCredentialsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
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
    if (!formData.details.email) {
      setErrors((prev) => ({
        ...prev,
        "details.email": "Enter your email before requesting an OTP"
      }));
      return;
    }
    setIsSendingOtp(true);
    const result = await UserAPI.auth.signUpSendOtp({
      payload: { email: formData.details.email },
      forceReturn: true,
      toastConfig: { success: { enabled: true }, error: { enabled: true } }
    });
    setIsSendingOtp(false);
    if (!result.data.error && result.data.data?.otpRequestId) {
      setFormData((prev) => ({
        ...prev,
        details: {
          ...prev.details,
          otpRequestId: result.data.data!.otpRequestId
        }
      }));
      setOtpSent(true);
      setOtpInput("");
    }
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      details: {
        ...formData.details,
        otpCode: otpInput
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
    if (!apiResult.data.error) {
      router.push("/user/sign-in");
      return;
    }
    setIsLoading(false);
  };

  return (
    <div className="bg-background flex min-h-[90vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <h2 className="text-foreground mt-6 text-center text-3xl font-extrabold">
          Create an Account
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field
              id="name"
              name="name"
              label="Full Name"
              value={formData.details.name}
              onChange={handleDetailsChange}
              error={errors["details.name"]}
            />
            <div className="flex items-end gap-2">
              <Field
                id="email"
                name="email"
                type="email"
                label="Email Address"
                value={formData.details.email}
                onChange={handleDetailsChange}
                error={errors["details.email"]}
                wrapperClassName="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                size={"lg"}
                disabled={isSendingOtp || !formData.details.email}
              >
                {isSendingOtp ? "Sending…" : otpSent ? "Resend" : "Send OTP"}
              </Button>
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
              />
            )}

            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              value={formData.credentials.password}
              onChange={handleCredentialsChange}
              error={errors["credentials.password"]}
            />
          </div>
          <div className="space-y-4">
            <Button
              type="submit"
              disabled={isLoading || !otpSent}
              className="w-full"
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
            {!otpSent && (
              <p className="text-muted-foreground text-center text-sm">
                Enter your email and click "Send OTP" to verify before signing
                up.
              </p>
            )}
            <p className="text-muted-foreground text-center text-sm">
              Already have an account?{" "}
              <Link
                href="/user/sign-in"
                className="text-primary hover:underline"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
