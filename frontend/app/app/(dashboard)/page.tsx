"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { SearchBar } from "@/components/search-bar";
import { useUserProfile } from "@/hooks/api/user";
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
  useDisconnectGithub,
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
  const profileQuery = useUserProfile({});
  const installationsQuery = useUserInstallations();
  const toggleStatusMutation = useToggleRepoStatus();
  const syncMutation = useSyncRepositories();
  const linkInstallationMutation = useLinkInstallation();
  const disconnectMutation = useDisconnectGithub();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");

  const user = profileQuery.data;
  const isGithubConnected = Boolean(user?.github?.id);

  // Handle post-installation redirect or OAuth callbacks from URL
  useEffect(() => {
    const installationId = searchParams.get("installation_id");
    const githubParam = searchParams.get("github");
    const errorParam = searchParams.get("error");

    if (installationId) {
      linkInstallationMutation.mutate(Number(installationId), {
        onSuccess: () => {
          toast.success("GitHub App installed and repositories linked!");
          profileQuery.refetch();
          window.history.replaceState({}, "", window.location.pathname);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to link GitHub installation");
          window.history.replaceState({}, "", window.location.pathname);
        }
      });
    } else if (githubParam === "connected") {
      toast.success("GitHub account connected successfully!");
      profileQuery.refetch();
      window.history.replaceState({}, "", window.location.pathname);
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

  const handleToggleRepo = (repoId: number, currentActive: boolean) => {
    toggleStatusMutation.mutate({
      repoId,
      isActive: !currentActive
    });
  };

  const handleSync = () => {
    syncMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("Repositories synced with GitHub");
      }
    });
  };

  const handleDisconnect = () => {
    if (confirm("Are you sure you want to disconnect your GitHub account?")) {
      disconnectMutation.mutate(undefined, {
        onSuccess: () => {
          toast.success("GitHub account disconnected");
        }
      });
    }
  };

  // State 1: User has not connected GitHub yet
  if (!isGithubConnected && !profileQuery.isLoading) {
    return (
      <div className="mx-auto max-w-7xl space-y-8 p-6">
        <div className="border-border/80 from-card/80 via-card/40 to-background relative overflow-hidden rounded-3xl border bg-linear-to-b p-8 shadow-sm backdrop-blur-sm md:p-12">
          <div className="max-w-2xl space-y-4">
            <div className="border-primary/20 bg-primary/10 text-primary inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
              <Sparkles className="size-3.5" />
              <span>AI Code Review Platform</span>
            </div>
            <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
              Connect GitHub to start reviewing your Pull Requests
            </h1>
            <p className="text-muted-foreground text-base leading-relaxed">
              Link your GitHub account to install the PatchMyCode GitHub App.
              Choose which repositories to monitor, analyze pull requests with
              AI, and catch potential bugs before they merge.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-4">
              <ConnectGithubButton
                action="connect"
                label="Connect GitHub Account"
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
                Receive instant AI-powered code reviews and suggestions as soon
                as a pull request is opened.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                <ShieldCheck className="text-primary size-4" />
                <span>Blast Radius Detection</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Smart dependency mapping to detect unforeseen side effects
                across your entire codebase.
              </p>
            </div>
            <div className="space-y-2">
              <div className="text-foreground flex items-center gap-2 text-sm font-medium">
                <Layers className="text-primary size-4" />
                <span>Granular Control</span>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Selectively enable or pause code reviews per repository with a
                single click.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // State 2: GitHub is connected, but no App installation or repositories found
  const hasInstallations = (installationsQuery.data || []).length > 0;
  if (isGithubConnected && !hasInstallations && !installationsQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-7xl space-y-8 p-6">
        {/* Connected Account Chip */}
        <div className="border-border/80 bg-card/60 flex items-center justify-between rounded-xl border p-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {user?.github?.avatarUrl ? (
              <img
                src={user.github.avatarUrl}
                alt={user.github.login}
                className="ring-border size-10 rounded-full ring-2"
              />
            ) : (
              <div className="bg-muted flex size-10 items-center justify-center rounded-full">
                <GithubIcon className="text-foreground size-5" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground text-sm font-semibold">
                  {user?.github?.name || user?.github?.login}
                </span>
                <span className="text-muted-foreground text-xs">
                  @{user?.github?.login}
                </span>
                <Badge
                  variant="outline"
                  className="border-green-500/30 py-0 text-[10px] text-green-600"
                >
                  Connected
                </Badge>
              </div>
              <p className="text-muted-foreground text-xs">
                GitHub account linked
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="text-muted-foreground hover:text-destructive text-xs"
          >
            Disconnect
          </Button>
        </div>

        {/* Install GitHub App Hero */}
        <div className="border-border/80 from-card/80 to-background space-y-6 rounded-3xl border bg-linear-to-b p-8 text-center shadow-sm md:p-12">
          <div className="bg-primary/10 text-primary mx-auto flex size-16 items-center justify-center rounded-2xl">
            <GitBranch className="size-8" />
          </div>

          <div className="mx-auto max-w-md space-y-2">
            <h2 className="text-foreground text-2xl font-bold">
              Install the PatchMyCode GitHub App
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              To allow PatchMyCode to analyze pull requests, install our GitHub
              App on your personal account or organizations. You can select all
              repositories or only specific ones.
            </p>
          </div>

          <div className="flex justify-center pt-2">
            <ConnectGithubButton
              action="install"
              label="Install GitHub App & Select Repositories"
              variant="default"
              className="gap-2 px-6 py-2.5 text-base"
            />
          </div>
        </div>
      </div>
    );
  }

  // State 3: Repositories and Installations Active (Full Management Dashboard)
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
      {/* Top Header & Account Status */}
      <div className="border-border/80 bg-card/60 flex flex-col justify-between gap-4 rounded-2xl border p-5 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3.5">
          {user?.github?.avatarUrl ? (
            <img
              src={user.github.avatarUrl}
              alt={user.github.login}
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
                {user?.github?.name || user?.github?.login}
              </h2>
              <span className="text-muted-foreground text-xs">
                @{user?.github?.login}
              </span>
              <Badge
                variant="outline"
                className="border-green-500/30 py-0 text-[10px] text-green-600"
              >
                Connected
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Managing repositories across{" "}
              {installationsQuery.data?.length || 0} GitHub{" "}
              {installationsQuery.data?.length === 1 ? "account" : "accounts"}
            </p>
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
            action="install"
            label="Configure Repositories"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
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
                action="install"
                label="Add Repositories"
                variant="default"
                size="sm"
                className="mt-2 text-xs"
              />
            )}
          </div>
        ) : (
          repositories.map((repo) => (
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

                  {repo.isActive ? (
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
                    {repo.isActive ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <Switch
                  checked={repo.isActive}
                  onCheckedChange={() =>
                    handleToggleRepo(repo.repoId, repo.isActive)
                  }
                  // disabled={toggleStatusMutation.isPending}
                />
              </div>
            </div>
          ))
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
