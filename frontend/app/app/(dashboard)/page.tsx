"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import Loading from "@/components/loading";
import { toast } from "sonner";
import {
  useUserRepositories,
  useToggleRepoStatus,
  useSyncRepositories,
  useLinkInstallation,
  useUserInstallations
} from "@/hooks/api/github";
import {
  RefreshCw,
  ExternalLink,
  ArrowUpRight,
  GitBranch,
  CheckCircle2,
  PauseCircle
} from "lucide-react";
import {
  GithubIcon,
  ConnectGithubButton
} from "@/components/connect-github-button";

const previewDiffLines = [
  {
    type: "context",
    code: "export async function handlePullRequest(payload) {"
  },
  {
    type: "removed",
    code: "  await reviewDiffOnly(payload.diff);"
  },
  {
    type: "added",
    code: "  const radius = await analyzeBlastRadius(repo, diff);"
  },
  {
    type: "added",
    code: "  await publishReview({ ...review, blastRadius: radius });"
  },
  {
    type: "context",
    code: "}"
  }
] as const;

function DashboardContent() {
  const searchParams = useSearchParams();
  const installationsQuery = useUserInstallations();
  const toggleStatusMutation = useToggleRepoStatus();
  const syncMutation = useSyncRepositories();
  const linkInstallationMutation = useLinkInstallation();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [optimisticOverrides, setOptimisticOverrides] = useState<
    Record<number, boolean>
  >({});

  // Handle post-installation redirect from GitHub: ?installation_id=...&setup_action=install
  useEffect(() => {
    const installationId = searchParams.get("installation_id");
    const errorParam = searchParams.get("error");

    if (installationId) {
      linkInstallationMutation.mutate(Number(installationId), {
        onSuccess: () => {
          toast.success("GitHub App installed and repositories linked!");
          installationsQuery.refetch();
          window.history.replaceState({}, "", window.location.pathname);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to link GitHub installation");
          window.history.replaceState({}, "", window.location.pathname);
        }
      });
    } else if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
      window.history.replaceState({}, "", window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const repositoriesQuery = useUserRepositories({
    search: searchTerm,
    status: filterStatus
  });

  const repositories = useMemo(
    () => repositoriesQuery.data || [],
    [repositoriesQuery.data]
  );

  const stats = useMemo(() => {
    const all = repositoriesQuery.data || [];
    const active = all.filter((r) => r.isActive).length;
    return {
      total: all.length,
      active,
      paused: all.length - active
    };
  }, [repositoriesQuery.data]);

  useEffect(() => {
    if (!repositoriesQuery.data) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOptimisticOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const next = { ...prev };
      let changed = false;
      for (const repo of repositoriesQuery.data) {
        if (repo.repoId in next && next[repo.repoId] === repo.isActive) {
          delete next[repo.repoId];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [repositoriesQuery.data]);

  const handleToggleRepo = (repoId: number, currentActive: boolean) => {
    const nextActive = !currentActive;
    setOptimisticOverrides((prev) => ({ ...prev, [repoId]: nextActive }));

    toggleStatusMutation.mutate(
      { repoId, isActive: nextActive },
      {
        onError: (err) => {
          setOptimisticOverrides((prev) => {
            const { [repoId]: _removed, ...rest } = prev;
            return rest;
          });
          toast.error(
            err.message || "Couldn't update review status — try again"
          );
        }
      }
    );
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Repositories synced with GitHub");
      }
    });
  };

  if (installationsQuery.isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading text="Loading workspace..." />
      </div>
    );
  }

  const installations = installationsQuery.data || [];
  const hasInstallations = installations.length > 0;

  // State A: No GitHub App installation yet (Editorial Split Hero matching Homepage)
  if (!hasInstallations) {
    return (
      <div className="bg-background text-foreground min-h-full">
        <section className="border-border mx-auto grid max-w-7xl border-b lg:grid-cols-[1.2fr_1fr]">
          {/* Left Column */}
          <div className="border-border flex flex-col justify-between border-b p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-14">
            <div>
              <div className="text-muted-foreground mb-6 flex items-center gap-3 font-mono text-xs">
                <span className="bg-border h-px w-8" />
                01 WORKSPACE ONBOARDING
              </div>

              <h1 className="text-4xl leading-[1.05] font-medium tracking-[-0.03em] sm:text-5xl lg:text-6xl">
                Install the PatchMyCode
                <br />
                <span className="text-muted-foreground">GitHub App.</span>
              </h1>

              <p className="text-muted-foreground mt-6 max-w-xl text-sm leading-relaxed sm:text-base">
                Connect your personal GitHub account or organization. Select
                which repositories to monitor, get instant AI pull-request
                reviews with caller tracing, and manage PR review settings in
                one place.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ConnectGithubButton
                  variant="default"
                  showArrow
                  className="px-5 py-2.5 font-mono text-xs"
                  label="Install GitHub App"
                />
              </div>
            </div>

            <div className="border-border mt-14 grid gap-6 border-t pt-8 sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground font-mono text-xs">01</p>
                <h3 className="mt-2 text-sm font-medium">
                  Automated PR Reviews
                </h3>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  AI review and suggestions the moment a pull request is opened.
                </p>
              </div>

              <div>
                <p className="text-muted-foreground font-mono text-xs">02</p>
                <h3 className="mt-2 text-sm font-medium">
                  Blast Radius Tracing
                </h3>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Dependency mapping surfaces side effects across your whole
                  codebase.
                </p>
              </div>

              <div>
                <p className="text-muted-foreground font-mono text-xs">03</p>
                <h3 className="mt-2 text-sm font-medium">Granular Control</h3>
                <p className="text-muted-foreground mt-1 text-xs leading-5">
                  Toggle reviews on or off per repository with a single switch.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Diff Box Preview */}
          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
            <div className="border-border bg-muted/20 w-full overflow-hidden border">
              <div className="border-border flex h-11 items-center justify-between border-b px-4">
                <span className="text-muted-foreground font-mono text-xs">
                  review-engine/pipeline.ts
                </span>
                <span className="text-muted-foreground font-mono text-[11px]">
                  +2 −1
                </span>
              </div>

              <div className="overflow-x-auto p-5 font-mono text-xs leading-7 sm:text-[13px]">
                {previewDiffLines.map((line, idx) => (
                  <div
                    key={`${line.type}-${idx}`}
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
                  <div className="border-border text-warning border-b px-5 py-3.5 font-mono text-[11px] sm:border-r sm:border-b-0">
                    IMPACT
                  </div>
                  <div className="px-5 py-3.5 font-mono text-xs">
                    <p className="font-medium">Continuous PR Review Pipeline</p>
                    <p className="text-muted-foreground mt-1 text-[11px]">
                      Triggered on dev → master · Bot loops prevented
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-border text-muted-foreground flex justify-between border-t px-4 py-2.5 font-mono text-[11px]">
                <span>app: patchmycode</span>
                <span>ready to connect</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // State B: GitHub App is installed
  const primaryInstallation = installations[0];
  const accountCount = installations.length;

  return (
    <div className="bg-background text-foreground min-h-full pb-16">
      {/* 1. Header Bar */}
      <section className="border-border border-b px-6 py-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-3.5">
            {primaryInstallation?.accountAvatarUrl ? (
              <img
                src={primaryInstallation.accountAvatarUrl}
                alt={primaryInstallation.accountLogin}
                className="border-border size-10 border"
              />
            ) : (
              <div className="border-border bg-muted flex size-10 items-center justify-center border">
                <GithubIcon className="size-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-sm font-semibold tracking-tight">
                  @{primaryInstallation?.accountLogin}
                </h1>
                {accountCount > 1 && (
                  <span className="text-muted-foreground font-mono text-xs">
                    (+{accountCount - 1} orgs)
                  </span>
                )}
                <span className="border-border bg-muted/40 text-success border px-2 py-0.5 font-mono text-[10px]">
                  APP INSTALLED
                </span>
              </div>
              <p className="text-muted-foreground mt-0.5 font-mono text-xs">
                {stats.active} active · {stats.paused} paused across{" "}
                {accountCount} GitHub account{accountCount > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="gap-2 font-mono text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />
              <span>Sync Repos</span>
            </Button>

            <ConnectGithubButton
              label="Configure App"
              variant="default"
              size="sm"
              showArrow
              className="px-4 font-mono text-xs"
              oAuthType="configure"
            />
          </div>
        </div>
      </section>

      {/* 2. Stats Bar (3 Columns with Sharp Grid Lines matching Homepage) */}
      <section className="border-border border-b">
        <div className="divide-border mx-auto grid max-w-7xl grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="px-6 py-6 lg:px-8">
            <p className="text-muted-foreground font-mono text-xs">
              01 / TOTAL REPOSITORIES
            </p>
            <p className="mt-2 text-3xl font-medium tracking-tight sm:text-4xl font-mono">
              {stats.total}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[11px]">
              Accessible via GitHub App
            </p>
          </div>

          <div className="px-6 py-6 lg:px-8">
            <p className="text-muted-foreground font-mono text-xs">
              02 / REVIEW ACTIVE
            </p>
            <p className="text-success mt-2 text-3xl font-medium tracking-tight sm:text-4xl font-mono">
              {stats.active}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[11px]">
              Automated AI review enabled
            </p>
          </div>

          <div className="px-6 py-6 lg:px-8">
            <p className="text-muted-foreground font-mono text-xs">
              03 / PAUSED
            </p>
            <p className="text-muted-foreground mt-2 text-3xl font-medium tracking-tight sm:text-4xl font-mono">
              {stats.paused}
            </p>
            <p className="text-muted-foreground mt-1 font-mono text-[11px]">
              Reviews skipped on incoming PRs
            </p>
          </div>
        </div>
      </section>

      {/* 3. Controls Bar: Filter Pills & Search */}
      <section className="mx-auto max-w-7xl px-6 pt-8 pb-4 lg:px-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className={`border px-3.5 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                filterStatus === "all"
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              ALL ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("active")}
              className={`border px-3.5 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                filterStatus === "active"
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              ACTIVE ({stats.active})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus("inactive")}
              className={`border px-3.5 py-1.5 font-mono text-xs transition-colors cursor-pointer ${
                filterStatus === "inactive"
                  ? "border-foreground bg-foreground text-background font-medium"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              PAUSED ({stats.paused})
            </button>
          </div>

          {/* Search */}
          <div className="w-full md:w-72">
            <SearchBar
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchPlaceholder="Filter repositories..."
            />
          </div>
        </div>
      </section>

      {/* 4. Repositories Code-Style Table */}
      <section className="mx-auto max-w-7xl px-6 pt-2 lg:px-8">
        <div className="border-border bg-muted/10 overflow-hidden border">
          {/* Table Header */}
          <div className="border-border bg-muted/30 text-muted-foreground hidden grid-cols-[1.5fr_1fr_100px_120px_100px] items-center border-b px-6 py-3 font-mono text-xs tracking-wider uppercase md:grid">
            <span>Repository</span>
            <span>Account</span>
            <span>Status</span>
            <span>PR Review</span>
            <span className="text-right">Manage</span>
          </div>

          {repositoriesQuery.isLoading ? (
            <div className="py-16 text-center">
              <Loading text="Fetching repositories..." />
            </div>
          ) : repositories.length === 0 ? (
            <div className="space-y-4 px-6 py-16 text-center">
              <div className="border-border bg-muted/40 mx-auto flex size-12 items-center justify-center border">
                <GitBranch className="text-muted-foreground size-5" />
              </div>
              <div>
                <h3 className="text-sm font-medium font-mono">
                  {searchTerm
                    ? "No matching repositories"
                    : "No repositories found"}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {searchTerm
                    ? `No repositories match "${searchTerm}". Try another search term.`
                    : "Configure the PatchMyCode GitHub App to grant access to repositories."}
                </p>
              </div>
              {searchTerm ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="font-mono text-xs"
                >
                  Clear search
                </Button>
              ) : (
                <ConnectGithubButton
                  label="Add Repositories"
                  variant="default"
                  size="sm"
                  showArrow
                  className="mx-auto font-mono text-xs"
                />
              )}
            </div>
          ) : (
            <div className="divide-border divide-y">
              {repositories.map((repo) => {
                const effectiveActive =
                  repo.repoId in optimisticOverrides
                    ? optimisticOverrides[repo.repoId]
                    : repo.isActive;

                return (
                  <div
                    key={`${repo.installationId}-${repo.repoId}`}
                    className="hover:bg-muted/20 flex flex-col justify-between gap-4 p-4 transition-colors sm:px-6 md:grid md:grid-cols-[1.5fr_1fr_100px_120px_100px] md:items-center"
                  >
                    {/* Repository Name & Description */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/app/repo/${repo.repoId}`}
                          className="hover:text-primary truncate font-mono text-sm font-medium hover:underline"
                        >
                          {repo.fullName}
                        </Link>

                        <a
                          href={repo.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Open on GitHub"
                          className="text-muted-foreground hover:text-foreground shrink-0"
                        >
                          <ExternalLink className="size-3 opacity-60 hover:opacity-100" />
                        </a>

                        <span className="border-border text-muted-foreground border px-1.5 py-0.2 font-mono text-[10px]">
                          {repo.private ? "PRIVATE" : "PUBLIC"}
                        </span>
                      </div>

                      {repo.description && (
                        <p className="text-muted-foreground truncate text-xs">
                          {repo.description}
                        </p>
                      )}
                    </div>

                    {/* Account */}
                    <div className="text-muted-foreground hidden items-center gap-2 font-mono text-xs md:flex">
                      <span>@{repo.accountLogin}</span>
                    </div>

                    {/* Status Pill */}
                    <div className="flex items-center font-mono text-xs">
                      {effectiveActive ? (
                        <span className="text-success flex items-center gap-1.5">
                          <span>+</span> ACTIVE
                        </span>
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <span>−</span> PAUSED
                        </span>
                      )}
                    </div>

                    {/* PR Review Toggle */}
                    <div className="flex items-center justify-between gap-3 md:justify-start">
                      <span className="text-muted-foreground font-mono text-xs md:hidden">
                        PR Review:
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="text-muted-foreground font-mono text-[11px]">
                          {effectiveActive ? "ON" : "OFF"}
                        </span>
                        <Switch
                          checked={effectiveActive}
                          onCheckedChange={() =>
                            handleToggleRepo(repo.repoId, effectiveActive)
                          }
                          disabled={toggleStatusMutation.isPending}
                        />
                      </div>
                    </div>

                    {/* Manage Link */}
                    <div className="flex items-center justify-end">
                      <Link
                        href={`/app/repo/${repo.repoId}`}
                        className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/40 flex items-center gap-1 border px-2.5 py-1 font-mono text-xs transition-colors"
                      >
                        <span>View</span>
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 5. Minimalist Bottom Metadata */}
      <footer className="border-border mx-auto mt-16 max-w-7xl border-t px-6 pt-8 lg:px-8">
        <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 font-mono text-xs sm:flex-row">
          <span>patchmycode · review engine</span>
          <span>automated pull-request analysis & caller tracing</span>
        </div>
      </footer>
    </div>
  );
}

export default function UserDashboardPage() {
  return (
    <Suspense fallback={<Loading />}>
      <DashboardContent />
    </Suspense>
  );
}
