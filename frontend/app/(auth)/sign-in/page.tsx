"use client";

import { signInSchema, SignInPayload } from "@/validations/user/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { redirectUserToHome } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { IS_PRODUCTION } from "@/lib/constant";
import { getZodErrors } from "@/validations";
import { Field } from "@/components/field";
import Loading from "@/components/loading";
import { useState, Suspense } from "react";
import { UserAPI } from "@/api/user";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight } from "lucide-react";

const DEV_CREDS: { label: string; email: string; password: string }[] = [
  {
    label: "User A",
    email: "aquibalam399@gmail.com",
    password: "1234567890"
  },
  {
    label: "User B",
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
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-border mx-auto grid max-w-7xl border-b lg:grid-cols-[1.1fr_1fr]">
          {/* Left Column: Editorial Info */}
          <div className="border-border flex flex-col justify-between border-b p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-16">
            <div>
              <div className="text-muted-foreground mb-8 flex items-center gap-3 font-mono text-xs">
                <span className="bg-border h-px w-8" />
                01 AUTHENTICATION
              </div>

              <h1 className="text-4xl leading-tight font-medium tracking-[-0.03em] sm:text-5xl lg:text-6xl">
                Sign in to your
                <br />
                <span className="text-muted-foreground">
                  PatchMyCode workspace.
                </span>
              </h1>

              <p className="text-muted-foreground mt-6 max-w-md text-sm leading-relaxed sm:text-base">
                Manage your connected GitHub repositories, configure automated
                PR code reviews, and track dependency blast radius.
              </p>
            </div>

            {/* Diff Preview Card */}
            <div className="border-border bg-muted/20 mt-12 overflow-hidden border lg:mt-20">
              <div className="border-border flex h-10 items-center justify-between border-b px-4">
                <span className="text-muted-foreground font-mono text-xs">
                  auth/session.ts
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  +1 −1
                </span>
              </div>
              <div className="text-muted-foreground p-4 font-mono text-xs leading-6">
                <div>async function verifySession() &#123;</div>
                <div className="bg-success/10 text-success pl-2">
                  + await validateToken(token);
                </div>
                <div>&#125;</div>
              </div>
              <div className="border-border text-muted-foreground flex justify-between border-t px-4 py-2.5 font-mono text-[11px]">
                <span>status: ready</span>
                <span>session-guard: active</span>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Form */}
          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-16">
            <div className="border-border bg-muted/10 w-full max-w-md border p-6 sm:p-8">
              <div className="border-border mb-6 flex items-center justify-between border-b pb-4">
                <span className="font-mono text-xs font-medium tracking-wider uppercase">
                  Sign In
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  /api/auth/sign-in
                </span>
              </div>

              <form className="space-y-4" onSubmit={handleSubmit} noValidate>
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

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full gap-2 font-mono text-xs"
                  >
                    {isLoading ? "Authenticating..." : "Sign In"}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </form>

              <div className="border-border mt-6 flex items-center justify-between border-t pt-4 text-xs">
                <span className="text-muted-foreground">No account yet?</span>
                <Link
                  href={signUpHref}
                  className="text-foreground flex items-center gap-1 font-medium hover:underline"
                >
                  Create an account <span aria-hidden="true">→</span>
                </Link>
              </div>

              {!IS_PRODUCTION && (
                <div className="border-border mt-6 border-t pt-4">
                  <p className="text-muted-foreground mb-2 font-mono text-[11px] tracking-wider uppercase">
                    Dev Test Credentials
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {DEV_CREDS.map((t) => (
                      <button
                        key={t.email}
                        type="button"
                        disabled={isLoading}
                        onClick={() => handleQuickSignIn(t.email, t.password)}
                        className="border-border hover:bg-muted text-muted-foreground hover:text-foreground border px-2.5 py-1 font-mono text-[11px] transition-colors"
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
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
