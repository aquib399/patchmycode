"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { useSearchParams } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Zap,
  Lock,
  Globe,
  Layers,
  Sparkles,
  GitBranch,
  RefreshCw,
  ShieldCheck,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import {
  GithubIcon,
  ConnectGithubButton
} from "@/components/connect-github-button";

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
      <div className="mx-auto flex max-w-7xl items-center justify-center p-6 py-24">
        <Loading />
      </div>
    );
  }

  const installations = installationsQuery.data || [];
  const hasInstallations = installations.length > 0;

  // State A: No GitHub App installation yet
  if (!hasInstallations) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="border-border/80 from-card/80 via-card/40 to-background relative overflow-hidden rounded-3xl border bg-linear-to-b p-8 shadow-sm backdrop-blur-sm md:p-12">
          <div className="max-w-2xl space-y-4">
            <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" />
              <span>AI Code Review Platform</span>
            </div>
            <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
              Install the PatchMyCode GitHub App
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Install the PatchMyCode GitHub App on your personal GitHub account
              or organization. Choose which repositories to monitor, get instant
              AI-powered pull request reviews, and manage your review settings
              in one place.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <ConnectGithubButton
                variant="default"
                className="px-6 py-2.5 text-base font-medium shadow-sm"
              />
            </div>
          </div>

          <div className="border-border/60 mt-10 grid gap-4 border-t pt-8 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Zap className="text-primary size-4" />
                <span>Automated PR Reviews</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Get an AI-powered review and suggestions the moment a pull
                request is opened.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="text-primary size-4" />
                <span>Blast Radius Detection</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Smart dependency mapping surfaces side effects across your whole
                codebase, not just the diff.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Layers className="text-primary size-4" />
                <span>Granular Control</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Turn reviews on or off per repository, any time, with a single
                click.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State B: GitHub App is installed (>= 1 installation)
  const primaryInstallation = installations[0];
  const accountCount = installations.length;
  const statusLine =
    stats.active > 0
      ? `${stats.active} ${stats.active === 1 ? "repository is" : "repositories are"} under active review across ${accountCount} GitHub ${accountCount === 1 ? "account" : "accounts"}`
      : `Installed on ${accountCount} GitHub ${accountCount === 1 ? "account" : "accounts"} — turn on review for a repository below to get started`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-3 md:p-4 lg:p-6">
      {/* Top Header & Account Status */}
      <div className="border-border/80 bg-card/60 flex flex-col justify-between gap-4 rounded-2xl border p-5 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          {primaryInstallation?.accountAvatarUrl ? (
            <img
              src={primaryInstallation.accountAvatarUrl}
              alt={primaryInstallation.accountLogin}
              className="ring-border size-11 rounded-full ring-2"
            />
          ) : (
            <div className="bg-muted flex size-11 items-center justify-center rounded-full">
              <GithubIcon className="text-foreground size-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-foreground text-base font-bold">
                @{primaryInstallation?.accountLogin}
                {accountCount > 1 && (
                  <span className="text-muted-foreground ml-1 text-xs font-normal">
                    (+{accountCount - 1} more)
                  </span>
                )}
              </h2>
              <Badge
                variant="outline"
                className="border-green-500/30 py-0 text-[10px] text-green-600"
              >
                App Installed
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">{statusLine}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            className="gap-2 text-xs"
          >
            <RefreshCw
              className={`size-3.5 ${syncMutation.isPending ? "animate-spin" : ""}`}
            />
            <span>Sync with GitHub</span>
          </Button>

          <ConnectGithubButton
            label="Add Repositories / Configure App"
            variant="default"
            size="sm"
            className="gap-1.5 text-xs"
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col justify-between gap-4 pt-2 md:flex-row md:items-center">
        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            All Repositories ({stats.total})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("active")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === "active"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span className="size-1.5 rounded-full bg-green-500" />
            <span>Review Active ({stats.active})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus("inactive")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filterStatus === "inactive"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Paused ({stats.paused})
          </button>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <SearchBar
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchPlaceholder="Search repositories..."
          />
        </div>
      </div>

      {/* Repositories List */}
      <div className="border-border bg-card/40 divide-border divide-y overflow-hidden rounded-2xl border">
        {repositoriesQuery.isLoading ? (
          <div className="py-16">
            <Loading />
          </div>
        ) : repositories.length === 0 ? (
          <div className="space-y-3 px-4 py-16 text-center">
            <div className="bg-muted text-muted-foreground mx-auto flex size-12 items-center justify-center rounded-full">
              <GitBranch className="size-6" />
            </div>
            <h3 className="text-foreground text-base font-semibold">
              {searchTerm
                ? "No matching repositories"
                : "No repositories found"}
            </h3>
            <p className="text-muted-foreground mx-auto max-w-sm text-xs">
              {searchTerm
                ? `No repositories found matching "${searchTerm}". Try adjusting your search term.`
                : "You haven't granted the PatchMyCode GitHub App access to any repositories yet."}
            </p>
            {searchTerm ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchTerm("")}
                className="mt-2 text-xs"
              >
                Clear Search
              </Button>
            ) : (
              <ConnectGithubButton
                label="Add Repositories"
                variant="default"
                size="sm"
                className="mt-2 text-xs"
              />
            )}
          </div>
        ) : (
          repositories.map((repo) => {
            const effectiveActive =
              repo.repoId in optimisticOverrides
                ? optimisticOverrides[repo.repoId]
                : repo.isActive;

            return (
              <div
                key={`${repo.installationId}-${repo.repoId}`}
                className="hover:bg-card/80 flex flex-col justify-between gap-4 p-4 transition-colors sm:flex-row sm:items-center md:px-6"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-foreground hover:text-primary flex items-center gap-1.5 truncate text-sm font-semibold transition-colors"
                    >
                      <span>{repo.fullName}</span>
                      <ExternalLink className="text-muted-foreground size-3 shrink-0 opacity-70" />
                    </a>

                    {repo.private ? (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground gap-1 py-0 text-[10px]"
                      >
                        <Lock className="size-2.5" />
                        <span>Private</span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-muted-foreground gap-1 py-0 text-[10px]"
                      >
                        <Globe className="size-2.5" />
                        <span>Public</span>
                      </Badge>
                    )}

                    <Badge variant="secondary" className="py-0 text-[10px]">
                      @{repo.accountLogin}
                    </Badge>

                    {effectiveActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 dark:text-green-400">
                        <CheckCircle2 className="size-3" />
                        <span>Review Active</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground inline-flex items-center gap-1 text-[11px] font-medium">
                        <span className="bg-muted-foreground/50 size-2 rounded-full" />
                        <span>Paused</span>
                      </span>
                    )}
                  </div>

                  {repo.description && (
                    <p className="text-muted-foreground max-w-xl truncate text-xs">
                      {repo.description}
                    </p>
                  )}
                </div>

                {/* Toggle Switch */}
                <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                  <div className="text-right">
                    <span className="text-foreground block text-xs font-medium">
                      PR Review
                    </span>
                    <span className="text-muted-foreground block text-[10px]">
                      {effectiveActive ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                  <Switch
                    checked={effectiveActive}
                    onCheckedChange={() =>
                      handleToggleRepo(repo.repoId, effectiveActive)
                    }
                    disabled={toggleStatusMutation.isPending}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
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
