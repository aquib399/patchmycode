import Link from "next/link";

import { PaletteSelector } from "@/components/palette-toggle";
import { ToggleTheme } from "@/components/theme-toggle";
import Image from "next/image";

const diffLines = [
  {
    type: "context",
    code: "async function issueRefund(orderId: string) {"
  },
  {
    type: "removed",
    code: "  await charge.reverse(orderId);"
  },
  {
    type: "added",
    code: "  await charge.reverse(orderId, { idempotent: true });"
  },
  {
    type: "context",
    code: "}"
  }
] as const;

export default function HomePage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <header className="border-border mx-auto flex h-20 max-w-7xl items-center justify-between border-b px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm font-medium tracking-tight"
        >
          <Image
            src="/logo.png"
            alt="PatchMyCode"
            width={0}
            sizes="100vw"
            height={0}
            priority
            className="size-6 object-contain"
          />

          <span>PATCH MY CODE</span>
        </Link>

        <div className="flex items-center gap-1">
          <ToggleTheme />
          <PaletteSelector />
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pt-24 pb-24 lg:px-8 lg:pt-32 lg:pb-32">
        <div className="max-w-4xl">
          <div className="text-muted-foreground mb-7 flex items-center gap-3 font-mono text-xs">
            <span className="bg-border h-px w-8" />
            AI CODE REVIEW
          </div>

          <h1 className="max-w-4xl text-5xl leading-[0.98] font-medium tracking-[-0.04em] sm:text-6xl lg:text-8xl">
            Your diff is only
            <br />
            <span className="text-muted-foreground">part of the change.</span>
          </h1>

          <div className="mt-10 flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="text-muted-foreground max-w-xl text-base leading-7 sm:text-lg">
              PatchMyCode reviews the code behind your diff — tracing callers,
              dependencies, and affected paths to find problems that ordinary PR
              reviews miss.
            </p>

            <Link
              href="/sign-in"
              className="group border-foreground flex w-fit shrink-0 items-center gap-3 border-b pb-2 text-sm font-medium"
            >
              Connect a repository
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="border-border border-y">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1fr_1.35fr]">
          <div className="border-border border-b p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">
            <p className="text-muted-foreground font-mono text-xs">
              /review/142
            </p>

            <div className="mt-24 lg:mt-40">
              <p className="text-sm font-medium">Dependency-aware review</p>

              <p className="text-muted-foreground mt-3 max-w-sm text-sm leading-6">
                A small signature change can have a large blast radius.
                PatchMyCode follows the dependency graph instead of stopping at
                the files in your PR.
              </p>
            </div>
          </div>

          <div className="min-w-0 p-4 sm:p-8 lg:p-12">
            <div className="border-border bg-muted/20 overflow-hidden border">
              <div className="border-border flex h-11 items-center justify-between border-b px-4">
                <span className="text-muted-foreground font-mono text-xs">
                  refunds.ts
                </span>

                <span className="text-muted-foreground font-mono text-[11px]">
                  +1 −1
                </span>
              </div>

              <div className="overflow-x-auto p-5 font-mono text-xs leading-7 sm:text-[13px]">
                {diffLines.map((line, index) => (
                  <div
                    key={`${line.type}-${index}`}
                    className={
                      line.type === "removed"
                        ? "bg-destructive/10 text-destructive"
                        : line.type === "added"
                          ? "bg-success/10 text-success"
                          : "text-muted-foreground"
                    }
                  >
                    <span className="mr-3 inline-block w-3 text-center opacity-50 select-none">
                      {line.type === "removed"
                        ? "−"
                        : line.type === "added"
                          ? "+"
                          : ""}
                    </span>

                    {line.code}
                  </div>
                ))}
              </div>

              <div className="border-border border-t">
                <div className="grid sm:grid-cols-[auto_1fr]">
                  <div className="border-border text-warning border-b px-5 py-4 font-mono text-[11px] sm:border-r sm:border-b-0">
                    IMPACT
                  </div>

                  <div className="px-5 py-4">
                    <p className="text-sm font-medium">
                      3 callers use the previous signature
                    </p>

                    <p className="text-muted-foreground mt-1 font-mono text-xs leading-5">
                      webhooks/stripe.ts
                      <br />
                      jobs/refunds.ts
                      <br />
                      api/orders/[id]/refund.ts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-muted-foreground mt-5 flex items-center justify-between font-mono text-[11px]">
              <span>analysis complete</span>
              <span>2 hops · 3 affected paths</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-6 py-24 sm:px-10 lg:grid-cols-3 lg:px-8 lg:py-32">
        <div>
          <p className="text-muted-foreground font-mono text-xs">01</p>
          <h2 className="mt-5 text-xl font-medium">Understand the change</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Reviews the actual behavior being changed, not just the lines that
            moved.
          </p>
        </div>

        <div>
          <p className="text-muted-foreground font-mono text-xs">02</p>
          <h2 className="mt-5 text-xl font-medium">Trace the blast radius</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Finds callers and dependent code that can be affected outside the
            visible diff.
          </p>
        </div>

        <div>
          <p className="text-muted-foreground font-mono text-xs">03</p>
          <h2 className="mt-5 text-xl font-medium">Ship with context</h2>
          <p className="text-muted-foreground mt-3 text-sm leading-6">
            Get actionable findings with enough context to understand why the
            change matters.
          </p>
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl items-center justify-between px-6 py-8 font-mono text-xs lg:px-8">
          <span>patchmycode</span>
          <span>review · trace · ship</span>
        </div>
      </footer>
    </main>
  );
}
