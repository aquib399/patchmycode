"use client";

import { signInSchema, SignInPayload } from "@/validations/v1/user/auth";
import { IS_PRODUCTION } from "@/lib/constant";
import { Button } from "@/components/ui/button";
import { getZodErrors } from "@/validations";
import { useRouter } from "next/navigation";
import { Field } from "@/components/field";
import { UserAPI } from "@/api/user";
import { redirectUserToHome } from "@/lib/utils";
import { useState } from "react";
import Link from "next/link";

const DEV_CREDS: { label: string; email: string; password: string }[] = [
  {
    label: "First User",
    email: "aquibalam399@gmail.com",
    password: "1234567890"
  },
  {
    label: "Second User",
    email: "aquibalamk99@gmail.com",
    password: "1234567890"
  }
];

export default function UserSignInPage() {
  const [formData, setFormData] = useState<SignInPayload>({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const signIn = async (payload: SignInPayload) => {
    setIsLoading(true);
    const apiResult = await UserAPI.auth.signIn({
      payload,
      forceReturn: true,
      toastConfig: {
        success: { enabled: true },
        error: { enabled: true }
      }
    });
    if (!apiResult.data.error) {
      redirectUserToHome(router);
      return;
    }
    setIsLoading(false);
  };

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    const result = signInSchema.safeParse(formData);
    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return;
    }
    await signIn(result.data);
  };

  const handleQuickSignIn = (email: string, password: string) => {
    setFormData({ email, password });
    void signIn({ email, password });
  };

  return (
    <div className="bg-background flex min-h-[90vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <h2 className="text-foreground mt-6 text-center text-3xl font-extrabold">
          Welcome Back
        </h2>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Field
              id="email"
              name="email"
              type="email"
              label="Email Address"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
            />
            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
            />
          </div>
          <div className="space-y-4">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an account?{" "}
              <Link
                href="/user/sign-up"
                className="text-primary hover:underline"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </form>

        {!IS_PRODUCTION && (
          <div className="border-border space-y-2 border-t pt-6">
            <p className="text-muted-foreground text-center text-xs">
              Dev only — Test accounts
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {DEV_CREDS.map((t) => (
                <Button
                  key={t.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  onClick={() => handleQuickSignIn(t.email, t.password)}
                >
                  {t.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
