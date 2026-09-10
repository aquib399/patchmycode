"use client";

import { signInSchema, SignInPayload } from "@/validations/user/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { redirectUserToHome } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IS_PRODUCTION } from "@/lib/constant";
import { getZodErrors } from "@/validations";
import { Field } from "@/components/field";
import Loading from "@/components/loading";
import { ConnectGithubButton } from "@/components/connect-github-button";
import { useState, Suspense } from "react";
import { UserAPI } from "@/api/user";
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

function SignInForm() {
  const [formData, setFormData] = useState<SignInPayload>({
    email: "",
    password: ""
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev: SignInPayload) => ({ ...prev, [name]: value }));
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
    setIsLoading(false);
    if (apiResult.data.error) return;

    redirectUserToHome(router);
  };

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const result = signInSchema.safeParse(formData);
    if (!result.success) {
      setErrors(getZodErrors(result.error));
      return;
    }
    signIn(result.data);
  };

  const handleQuickSignIn = (email: string, password: string) => {
    setFormData({ email, password });
    void signIn({ email, password });
  };

  const signUpHref = redirectParam
    ? `/sign-up?redirect=${encodeURIComponent(redirectParam)}`
    : "/sign-up";

  return (
    <div className="bg-background flex min-h-[90vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-border bg-card/60 text-card-foreground w-full max-w-md space-y-6 rounded-2xl border p-8 shadow-sm backdrop-blur-sm">
        <div className="text-center">
          <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
            Welcome Back
          </h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Sign in to your account to continue
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <ConnectGithubButton
            action="signin"
            label="Continue with GitHub"
            className="w-full justify-center"
          />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="border-border w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card text-muted-foreground px-2">
                Or continue with email
              </span>
            </div>
          </div>
        </div>

        <form className="mt-4 space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">
            <Field
              id="email"
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              autoComplete="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              required
            />
            <Field
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
            />
          </div>

          <div className="space-y-4 pt-2">
            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              Don't have an account?{" "}
              <Link href={signUpHref} className="text-primary hover:underline">
                Sign up here
              </Link>
            </p>
          </div>
        </form>

        {!IS_PRODUCTION && (
          <div className="border-border space-y-2 border-t pt-4">
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

export default function UserSignInPage() {
  return (
    <Suspense fallback={<Loading />}>
      <SignInForm />
    </Suspense>
  );
}
