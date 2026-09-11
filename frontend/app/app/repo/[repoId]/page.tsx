/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Loading from "@/components/loading";
import { Switch } from "@/components/ui/switch";
import {
  useRepositoryDetails,
  useToggleRepoStatus,
  useUpdateRepoBranches,
  useFixIssue
} from "@/hooks/api/github";
import { PullRequestItem, PullRequestIssue } from "@/types/domain/github";
import {
  ArrowLeft,
  ExternalLink,
  GitBranch,
  GitPullRequest,
  RefreshCw,
  Search
} from "lucide-react";

function RepoDetailContent() {
  const params = useParams();
  const router = useRouter();
  const repoId = Number(params?.repoId);

  const {
    data: repo,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useRepositoryDetails(repoId);

  const toggleStatusMutation = useToggleRepoStatus();
  const updateBranchesMutation = useUpdateRepoBranches();
  const fixIssueMutation = useFixIssue();

  // Branch selection state
  const [isAllBranches, setIsAllBranches] = useState<boolean>(true);
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branchSearch, setBranchSearch] = useState<string>("");
  const [fixingIssueId, setFixingIssueId] = useState<number | null>(null);

  // PR filtering and collapse state
  const [prFilter, setPrFilter] = useState<"all" | "issues" | "clean">("all");
  const [collapsedPrs, setCollapsedPrs] = useState<Record<number, boolean>>({});

  const togglePrCollapse = (prNumber: number) => {
    setCollapsedPrs((prev) => ({
      ...prev,
      [prNumber]: !prev[prNumber]
    }));
  };

  const handleExpandAllPrs = (prs: PullRequestItem[]) => {
    const next: Record<number, boolean> = {};
    prs.forEach((p) => {
      next[p.number] = false;
    });
    setCollapsedPrs(next);
  };

  const handleCollapseAllPrs = (prs: PullRequestItem[]) => {
    const next: Record<number, boolean> = {};
    prs.forEach((p) => {
      next[p.number] = true;
    });
    setCollapsedPrs(next);
  };

  // Sync state with repository data
  useEffect(() => {
    if (repo) {
      if (!repo.targetBranches || repo.targetBranches.length === 0) {
        setIsAllBranches(true);
        setSelectedBranches([]);
      } else {
        setIsAllBranches(false);
        setSelectedBranches(repo.targetBranches);
      }
    }
  }, [repo]);

  // Determine if branch configuration has unsaved changes
  const isBranchDirty = useMemo(() => {
    if (!repo) return false;
    const currentSaved = repo.targetBranches || [];
    if (isAllBranches) {
      return currentSaved.length > 0;
    }
    if (selectedBranches.length !== currentSaved.length) return true;
    const currentSet = new Set(currentSaved);
    return !selectedBranches.every((b) => currentSet.has(b));
  }, [repo, isAllBranches, selectedBranches]);

  const handleToggleBranch = (branch: string) => {
    setSelectedBranches((prev) =>
      prev.includes(branch)
        ? prev.filter((b) => b !== branch)
        : [...prev, branch]
    );
  };

  const handleSaveBranches = () => {
    const branchesToSave = isAllBranches ? [] : selectedBranches;
    updateBranchesMutation.mutate({ repoId, targetBranches: branchesToSave });
  };

  const handleResetBranches = () => {
    if (!repo) return;
    if (!repo.targetBranches || repo.targetBranches.length === 0) {
      setIsAllBranches(true);
      setSelectedBranches([]);
    } else {
      setIsAllBranches(false);
      setSelectedBranches(repo.targetBranches);
    }
  };

  const handleToggleRepoActive = (checked: boolean) => {
    toggleStatusMutation.mutate({ repoId, isActive: checked }, {});
  };

  const handleFixIssue = (pr: PullRequestItem, issue: PullRequestIssue) => {
    if (!issue.suggestion) {
      return;
    }

    const issueKey = issue.id || issue.commentId;
    setFixingIssueId(issueKey);

    fixIssueMutation.mutate(
      {
        repoId,
        pullNumber: pr.number,
        path: issue.path,
        suggestion: issue.suggestion,
        targetLine: issue.line,
        startLine: issue.startLine,
        commentId: issue.commentId
      },
      {
        onSuccess: (data) => {
          const shaShort = data?.commitSha
            ? data.commitSha.substring(0, 7)
            : "";

          setFixingIssueId(null);
          refetch();
        }
      }
    );
  };

  const allPrs = useMemo(() => repo?.pullRequests || [], [repo?.pullRequests]);
  const prsWithIssues = useMemo(
    () => allPrs.filter((p) => (p.issues || []).length > 0),
    [allPrs]
  );
  const cleanPrs = useMemo(
    () => allPrs.filter((p) => (p.issues || []).length === 0),
    [allPrs]
  );

  const displayedPrs = useMemo(() => {
    if (prFilter === "issues") return prsWithIssues;
    if (prFilter === "clean") return cleanPrs;
    return allPrs;
  }, [prFilter, allPrs, prsWithIssues, cleanPrs]);

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loading text="Loading repository..." />
      </div>
    );
  }

  if (error || !repo) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-24 text-center">
        <p className="text-muted-foreground font-mono text-xs">ERROR 404</p>
        <h2 className="mt-3 font-mono text-2xl font-medium tracking-tight">
          Repository Not Found
        </h2>
        <p className="text-muted-foreground mt-2 font-mono text-xs">
          The requested repository could not be located or is not associated
          with your account.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            href="/app"
            className="border-border hover:bg-muted/30 flex items-center gap-2 border px-4 py-2 font-mono text-xs transition-colors"
          >
            <ArrowLeft className="size-3" />
            Back to Repositories
          </Link>
          <button
            onClick={() => refetch()}
            className="border-foreground bg-foreground text-background hover:bg-foreground/90 flex items-center gap-2 border px-4 py-2 font-mono text-xs transition-colors"
          >
            <RefreshCw className="size-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const allAvailableBranches = repo.branches || [];
  const filteredBranches = allAvailableBranches.filter((b) =>
    b.toLowerCase().includes(branchSearch.toLowerCase())
  );

  return (
    <div className="bg-background text-foreground min-h-screen">
      {/* 1. Breadcrumbs Header */}
      <section className="border-border border-b px-6 py-4 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/app"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <span>← REPOSITORIES</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-muted-foreground">@{repo.accountLogin}</span>
            <span className="text-border">/</span>
            <span className="text-foreground font-semibold">{repo.name}</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="border-border hover:bg-muted/30 flex cursor-pointer items-center gap-2 border px-3 py-1.5 font-mono text-xs transition-colors"
            >
              <RefreshCw
                className={`size-3 ${isRefetching ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </button>

            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border hover:bg-muted/30 flex items-center gap-2 border px-3 py-1.5 font-mono text-xs transition-colors"
            >
              <span>GitHub</span>
              <ExternalLink className="size-3 opacity-60" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. Editorial Split Hero Header (Homepage DNA) */}
      <section className="border-border border-b">
        <div className="mx-auto grid max-w-7xl lg:grid-cols-[1.3fr_1fr]">
          {/* Left Column: Repo Identity */}
          <div className="border-border border-b p-6 sm:p-10 lg:border-r lg:border-b-0 lg:p-12">
            <div className="text-muted-foreground mb-4 flex items-center gap-3 font-mono text-xs">
              <span className="bg-border h-px w-8" />
              REPOSITORY CONFIGURATION
            </div>

            <h1 className="font-mono text-3xl font-medium tracking-tight sm:text-4xl lg:text-5xl">
              {repo.fullName}
            </h1>

            <p className="text-muted-foreground mt-4 max-w-lg text-sm leading-relaxed">
              {repo.description ||
                "Continuous PR review pipeline with AST blast-radius caller tracing."}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <span className="border-border text-muted-foreground border px-2.5 py-1">
                {repo.private ? "PRIVATE" : "PUBLIC"}
              </span>
              {repo.language && (
                <span className="border-border text-muted-foreground border px-2.5 py-1">
                  {repo.language}
                </span>
              )}
              <span className="border-border text-muted-foreground border px-2.5 py-1">
                ★ {repo.starsCount}
              </span>
              <span className="border-border text-muted-foreground border px-2.5 py-1">
                ⑂ {repo.forksCount}
              </span>
              <span className="border-border text-muted-foreground border px-2.5 py-1">
                ⊙ {repo.openIssuesCount} issues
              </span>
            </div>
          </div>

          {/* Right Column: Engine Review Status Control Panel */}
          <div className="bg-muted/10 flex flex-col justify-between p-6 sm:p-10 lg:p-12">
            <div>
              <div className="text-muted-foreground mb-4 flex items-center justify-between font-mono text-xs">
                <span>PIPELINE STATUS</span>
                <span
                  className={
                    repo.isActive
                      ? "text-success font-semibold"
                      : "text-muted-foreground"
                  }
                >
                  {repo.isActive ? "+ ACTIVE" : "− PAUSED"}
                </span>
              </div>

              <h2 className="font-mono text-xl font-medium">
                {repo.isActive
                  ? "Automated PR Review Enabled"
                  : "Review Pipeline Paused"}
              </h2>

              <p className="text-muted-foreground mt-2 font-mono text-xs leading-relaxed">
                {repo.isActive
                  ? "Incoming pull requests targeting monitored branches trigger automatic analysis, call-graph tracing, and suggestions."
                  : "Reviews are currently paused. Incoming GitHub webhooks will be skipped without initiating LLM review jobs."}
              </p>
            </div>

            <div className="border-border mt-8 flex items-center justify-between border-t pt-6">
              <span className="text-muted-foreground font-mono text-xs">
                PR Review Engine:
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs font-medium">
                  {repo.isActive ? "ON" : "OFF"}
                </span>
                <Switch
                  checked={repo.isActive}
                  onCheckedChange={handleToggleRepoActive}
                  disabled={toggleStatusMutation.isPending}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Stats Bar (3 Structural Columns directly from Homepage) */}
      <section className="border-border border-b">
        <div className="divide-border mx-auto grid max-w-7xl grid-cols-1 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-muted-foreground font-mono text-xs">
              01 / DEFAULT BRANCH
            </p>
            <p className="text-foreground mt-3 font-mono text-3xl font-medium tracking-tight sm:text-4xl">
              {repo.defaultBranch}
            </p>
            <p className="text-muted-foreground mt-2 font-mono text-[11px]">
              Primary production target branch
            </p>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-muted-foreground font-mono text-xs">
              02 / REVIEW BRANCHES
            </p>
            <p className="text-foreground mt-3 truncate font-mono text-3xl font-medium tracking-tight sm:text-4xl">
              {repo.targetBranches && repo.targetBranches.length > 0
                ? `${repo.targetBranches.length} BRANCHES`
                : "ALL BRANCHES"}
            </p>
            <p className="text-muted-foreground mt-2 truncate font-mono text-[11px]">
              {repo.targetBranches && repo.targetBranches.length > 0
                ? repo.targetBranches.join(", ")
                : "Reviews trigger on any base branch"}
            </p>
          </div>

          <div className="p-6 sm:p-8 lg:p-10">
            <p className="text-muted-foreground font-mono text-xs">
              03 / OPEN PULL REQUESTS
            </p>
            <p className="text-foreground mt-3 font-mono text-3xl font-medium tracking-tight sm:text-4xl">
              {repo.pullRequests?.length ?? 0}
            </p>
            <p className="text-muted-foreground mt-2 font-mono text-[11px]">
              {repo.pullRequests && repo.pullRequests.length > 0
                ? `${repo.pullRequests.reduce((acc, p) => acc + (p.issues?.length || 0), 0)} review issue(s) detected`
                : "Clean review backlog"}
            </p>
          </div>
        </div>
      </section>

      {/* 4. Automated Review Branch Filter Rules */}
      <section className="border-border border-b">
        <div className="mx-auto max-w-7xl p-6 sm:p-10 lg:p-12">
          <div className="border-border flex flex-col justify-between gap-6 border-b pb-8 sm:flex-row sm:items-end">
            <div>
              <div className="text-muted-foreground mb-3 flex items-center gap-3 font-mono text-xs">
                <span className="bg-border h-px w-8" />
                01 BRANCH FILTER RULES
              </div>
              <h2 className="font-mono text-2xl font-medium tracking-tight sm:text-3xl">
                Target Base Branches
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-xs sm:text-sm">
                Define which base branches trigger automated reviews. When a PR
                is opened targeting these branches, PatchMyCode analyzes the
                diff and traces callers.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              {isBranchDirty && (
                <button
                  type="button"
                  onClick={handleResetBranches}
                  className="border-border hover:bg-muted/30 cursor-pointer border px-4 py-2 font-mono text-xs transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={handleSaveBranches}
                disabled={!isBranchDirty || updateBranchesMutation.isPending}
                className="border-foreground bg-foreground text-background hover:bg-foreground/90 flex cursor-pointer items-center gap-2 border px-5 py-2 font-mono text-xs font-medium transition-colors disabled:opacity-40"
              >
                {updateBranchesMutation.isPending && (
                  <RefreshCw className="size-3 animate-spin" />
                )}
                Save Branch Rules →
              </button>
            </div>
          </div>

          {/* Mode Selector */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div
              onClick={() => setIsAllBranches(true)}
              className={`cursor-pointer border p-6 transition-colors ${
                isAllBranches
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-muted/10"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs font-semibold">
                <span>ALL BRANCHES (RECOMMENDED)</span>
                <span className="text-muted-foreground">
                  {isAllBranches ? "[X]" : "[ ]"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 font-mono text-xs leading-relaxed">
                Reviews every pull request regardless of the base branch
                (master, main, dev, staging).
              </p>
            </div>

            <div
              onClick={() => {
                setIsAllBranches(false);
                if (selectedBranches.length === 0 && repo.defaultBranch) {
                  setSelectedBranches([repo.defaultBranch]);
                }
              }}
              className={`cursor-pointer border p-6 transition-colors ${
                !isAllBranches
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:bg-muted/10"
              }`}
            >
              <div className="flex items-center justify-between font-mono text-xs font-semibold">
                <span>SPECIFIC TARGETS ONLY</span>
                <span className="text-muted-foreground">
                  {!isAllBranches ? "[X]" : "[ ]"}
                </span>
              </div>
              <p className="text-muted-foreground mt-2 font-mono text-xs leading-relaxed">
                Only review pull requests targeting selected base branches. All
                other branches will be skipped.
              </p>
            </div>
          </div>

          {/* Branch Matrix Table (shown when Specific Targets is active) */}
          {!isAllBranches && (
            <div className="border-border mt-8 overflow-hidden border">
              <div className="border-border bg-muted/20 flex flex-col justify-between gap-3 border-b p-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="font-semibold">AVAILABLE BRANCHES:</span>
                  <span className="text-muted-foreground">
                    ({selectedBranches.length} of {allAvailableBranches.length}{" "}
                    selected)
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      repo.defaultBranch &&
                      setSelectedBranches([repo.defaultBranch])
                    }
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  >
                    Default only ({repo.defaultBranch})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedBranches([...allAvailableBranches])
                    }
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedBranches([])}
                    className="border-border text-muted-foreground hover:text-foreground hover:bg-muted/30 cursor-pointer border px-2.5 py-1 font-mono text-[11px] transition-colors"
                  >
                    Clear all
                  </button>
                </div>
              </div>

              {allAvailableBranches.length > 6 && (
                <div className="border-border bg-muted/5 flex items-center gap-2 border-b p-3">
                  <Search className="text-muted-foreground size-3.5" />
                  <input
                    type="text"
                    value={branchSearch}
                    onChange={(e) => setBranchSearch(e.target.value)}
                    placeholder="Filter branches..."
                    className="text-foreground w-full bg-transparent font-mono text-xs outline-none"
                  />
                </div>
              )}

              {/* Technical Branch Rows */}
              <div className="divide-border divide-y font-mono text-xs">
                {filteredBranches.map((branch) => {
                  const isSelected = selectedBranches.includes(branch);
                  const isDefault = branch === repo.defaultBranch;

                  return (
                    <div
                      key={branch}
                      onClick={() => handleToggleBranch(branch)}
                      className={`flex cursor-pointer items-center justify-between p-3.5 transition-colors ${
                        isSelected ? "bg-muted/20" : "hover:bg-muted/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground select-none">
                          {isSelected ? "[X]" : "[ ]"}
                        </span>
                        <div className="flex items-center gap-2">
                          <GitBranch className="text-muted-foreground size-3.5" />
                          <span
                            className={
                              isSelected
                                ? "text-foreground font-semibold"
                                : "text-muted-foreground"
                            }
                          >
                            {branch}
                          </span>
                        </div>
                        {isDefault && (
                          <span className="border-border py-0.2 text-muted-foreground border px-1.5 text-[10px]">
                            DEFAULT
                          </span>
                        )}
                      </div>

                      <span
                        className={`text-[11px] ${isSelected ? "text-success" : "text-muted-foreground"}`}
                      >
                        {isSelected ? "MONITORED" : "SKIPPED"}
                      </span>
                    </div>
                  );
                })}

                {filteredBranches.length === 0 && (
                  <div className="text-muted-foreground p-6 text-center font-mono text-xs">
                    No branches match &quot;{branchSearch}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Pull Requests & AI Review Diffs Section (Exact Homepage Diff Layout) */}
      <section className="border-border border-b">
        <div className="mx-auto max-w-7xl p-6 sm:p-10 lg:p-12">
          {/* Section Header with Controls */}
          <div className="border-border flex flex-col justify-between gap-4 border-b pb-8 sm:flex-row sm:items-end">
            <div>
              <div className="text-muted-foreground mb-3 flex items-center gap-3 font-mono text-xs">
                <span className="bg-border h-px w-8" />
                02 PULL REQUESTS & REVIEWS
              </div>
              <h2 className="font-mono text-2xl font-medium tracking-tight sm:text-3xl">
                Open Pull Requests ({allPrs.length})
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl text-xs sm:text-sm">
                Continuous code review findings and caller tracing. Each pull
                request is tracked independently below with 1-click patch
                commits.
              </p>
            </div>

            {allPrs.length > 0 && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleExpandAllPrs(allPrs)}
                  className="border-border hover:bg-muted/30 cursor-pointer border px-3 py-1.5 font-mono text-xs transition-colors"
                >
                  Expand All
                </button>
                <button
                  type="button"
                  onClick={() => handleCollapseAllPrs(allPrs)}
                  className="border-border hover:bg-muted/30 cursor-pointer border px-3 py-1.5 font-mono text-xs transition-colors"
                >
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* PR Backlog Index Table (Shown when PRs exist) */}
          {allPrs.length > 0 && (
            <div className="border-border bg-muted/10 mt-8 mb-12 overflow-hidden border">
              <div className="border-border bg-muted/30 text-muted-foreground flex flex-col justify-between gap-2 border-b px-4 py-3 font-mono text-xs sm:flex-row sm:items-center">
                <span className="text-foreground font-semibold tracking-wider uppercase">
                  PULL REQUEST BACKLOG INDEX ({allPrs.length})
                </span>
                <span className="text-[11px]">
                  {prsWithIssues.length} with actionable findings ·{" "}
                  {cleanPrs.length} clean reviews
                </span>
              </div>

              {/* Filter Pills Bar inside Backlog */}
              <div className="border-border bg-muted/5 flex flex-wrap items-center gap-2 border-b p-3 font-mono text-xs">
                <span className="text-muted-foreground mr-1 text-[11px]">
                  FILTER:
                </span>
                <button
                  type="button"
                  onClick={() => setPrFilter("all")}
                  className={`cursor-pointer border px-2.5 py-1 text-[11px] transition-colors ${
                    prFilter === "all"
                      ? "border-foreground bg-foreground text-background font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  ALL ({allPrs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPrFilter("issues")}
                  className={`cursor-pointer border px-2.5 py-1 text-[11px] transition-colors ${
                    prFilter === "issues"
                      ? "border-foreground bg-foreground text-background font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  WITH ISSUES ({prsWithIssues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPrFilter("clean")}
                  className={`cursor-pointer border px-2.5 py-1 text-[11px] transition-colors ${
                    prFilter === "clean"
                      ? "border-foreground bg-foreground text-background font-semibold"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  CLEAN ({cleanPrs.length})
                </button>
              </div>

              {/* Table Rows */}
              <div className="divide-border divide-y font-mono text-xs">
                {displayedPrs.map((p, idx) => {
                  const count = (p.issues || []).length;
                  return (
                    <div
                      key={p.number}
                      className="hover:bg-muted/20 flex flex-col justify-between gap-3 p-3.5 transition-colors sm:flex-row sm:items-center sm:px-5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="border-border text-muted-foreground py-0.2 border px-1.5 text-[10px]">
                          PR {String(idx + 1).padStart(2, "0")}
                        </span>
                        <a
                          href={`#pr-${p.number}`}
                          onClick={() => {
                            setCollapsedPrs((prev) => ({
                              ...prev,
                              [p.number]: false
                            }));
                          }}
                          className="text-foreground max-w-sm truncate font-semibold hover:underline sm:max-w-md"
                        >
                          #{p.number} {p.title}
                        </a>
                        <span className="text-muted-foreground text-[11px]">
                          ({p.head.ref} → {p.base.ref})
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          by @{p.author.login}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-4">
                        {count > 0 ? (
                          <span className="text-warning text-[11px] font-semibold">
                            ● {count} ISSUE{count > 1 ? "S" : ""}
                          </span>
                        ) : (
                          <span className="text-success text-[11px] font-semibold">
                            ✓ CLEAN
                          </span>
                        )}

                        <a
                          href={`#pr-${p.number}`}
                          onClick={() => {
                            setCollapsedPrs((prev) => ({
                              ...prev,
                              [p.number]: false
                            }));
                          }}
                          className="border-border hover:border-foreground text-muted-foreground hover:text-foreground border px-2.5 py-1 text-[11px] transition-colors"
                        >
                          Inspect PR ↓
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {allPrs.length === 0 ? (
            <div className="text-muted-foreground space-y-2 py-20 text-center font-mono text-xs">
              <p>No open pull requests found for this repository.</p>
              <p className="text-[11px]">
                Open a pull request on GitHub to trigger continuous automated
                review.
              </p>
            </div>
          ) : displayedPrs.length === 0 ? (
            <div className="text-muted-foreground py-16 text-center font-mono text-xs">
              No pull requests match the &apos;{prFilter}&apos; filter.
            </div>
          ) : (
            /* Individual Distinct PR Containers */
            <div className="mt-8 space-y-16">
              {displayedPrs.map((pr, index) => {
                const issues = pr.issues || [];
                const hasIssues = issues.length > 0;
                const isCollapsed = collapsedPrs[pr.number] ?? false;

                return (
                  <div
                    key={pr.number}
                    id={`pr-${pr.number}`}
                    className="border-border bg-background overflow-hidden border-2"
                  >
                    {/* Master PR Box Header */}
                    <div className="border-border bg-muted/30 flex flex-col justify-between gap-4 border-b p-5 font-mono text-xs md:flex-row md:items-center">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="border-foreground bg-foreground text-background border px-2.5 py-1 text-xs font-bold">
                          PR {String(index + 1).padStart(2, "0")} /{" "}
                          {String(displayedPrs.length).padStart(2, "0")}
                        </span>

                        <a
                          href={pr.htmlUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-foreground flex items-center gap-1.5 text-sm font-bold hover:underline"
                        >
                          <span>
                            #{pr.number} {pr.title}
                          </span>
                          <ExternalLink className="size-3 opacity-60" />
                        </a>

                        <span className="text-muted-foreground">·</span>

                        <span className="border-border bg-muted/40 text-foreground border px-2 py-0.5 text-[11px] font-medium">
                          {pr.head.ref} → {pr.base.ref}
                        </span>

                        <span className="text-muted-foreground text-[11px]">
                          by @{pr.author.login}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {hasIssues ? (
                          <span className="text-warning border-warning/40 bg-warning/10 border px-3 py-1 font-mono text-[11px] font-semibold">
                            {issues.length} ISSUE{issues.length > 1 ? "S" : ""}{" "}
                            FOUND
                          </span>
                        ) : (
                          <span className="text-success border-success/40 bg-success/10 border px-3 py-1 font-mono text-[11px] font-semibold">
                            + CLEAN REVIEW
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => togglePrCollapse(pr.number)}
                          className="border-border hover:bg-muted/40 cursor-pointer border px-3 py-1 font-mono text-[11px] transition-colors"
                        >
                          {isCollapsed
                            ? `+ EXPAND (${issues.length} findings)`
                            : "− COLLAPSE"}
                        </button>
                      </div>
                    </div>

                    {/* PR Body (Shown when not collapsed) */}
                    {!isCollapsed && (
                      <div className="bg-muted/5 space-y-8 p-6 sm:p-8">
                        {hasIssues ? (
                          <>
                            <div className="text-muted-foreground border-border flex items-center justify-between border-b pb-3 font-mono text-xs">
                              <span>
                                REVIEW FINDINGS FOR #{pr.number} (
                                {issues.length} DETECTED):
                              </span>
                              <span className="text-[11px]">
                                base: {pr.base.ref} · head: {pr.head.ref}
                              </span>
                            </div>

                            <div className="space-y-8">
                              {issues.map((issue, issueIdx) => {
                                const isFixing =
                                  fixingIssueId ===
                                  (issue.id || issue.commentId);

                                return (
                                  <div
                                    key={issue.id || issue.commentId}
                                    className="border-border bg-muted/20 overflow-hidden border"
                                  >
                                    {/* Diff Header */}
                                    <div className="border-border bg-muted/20 flex h-11 items-center justify-between border-b px-4 font-mono text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="border-border py-0.2 bg-background text-muted-foreground border px-1.5 text-[10px]">
                                          FINDING{" "}
                                          {String(issueIdx + 1).padStart(
                                            2,
                                            "0"
                                          )}
                                        </span>
                                        <span className="text-foreground font-semibold">
                                          {issue.path}
                                          {issue.line ? `:L${issue.line}` : ""}
                                        </span>
                                      </div>
                                      <span className="text-warning font-mono text-[11px]">
                                        SUGGESTION
                                      </span>
                                    </div>

                                    {/* Diff Body */}
                                    {issue.suggestion ? (
                                      <div className="bg-background overflow-x-auto p-5 font-mono text-xs leading-7 sm:text-[13px]">
                                        <pre className="text-foreground">
                                          <code>{issue.suggestion}</code>
                                        </pre>
                                      </div>
                                    ) : (
                                      <div className="text-muted-foreground bg-background p-5 font-mono text-xs">
                                        {issue.body}
                                      </div>
                                    )}

                                    {/* Impact / Action Grid Footer */}
                                    <div className="border-border border-t">
                                      <div className="grid sm:grid-cols-[auto_1fr_auto]">
                                        <div className="border-border text-warning flex items-center border-b px-5 py-4 font-mono text-[11px] sm:border-r sm:border-b-0">
                                          ISSUE
                                        </div>

                                        <div className="flex items-center px-5 py-4 font-mono text-xs">
                                          <p className="text-foreground text-xs leading-5">
                                            {issue.body.split("```")[0].trim()}
                                          </p>
                                        </div>

                                        {issue.suggestion && (
                                          <div className="border-border bg-muted/10 flex items-center border-t p-3 sm:border-t-0 sm:border-l">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                handleFixIssue(pr, issue)
                                              }
                                              disabled={
                                                isFixing ||
                                                fixIssueMutation.isPending
                                              }
                                              className="group border-foreground bg-foreground text-background hover:bg-foreground/90 flex cursor-pointer items-center gap-2 border px-4 py-2.5 font-mono text-xs font-medium transition-colors disabled:opacity-40"
                                            >
                                              {isFixing ? (
                                                <>
                                                  <RefreshCw className="size-3 animate-spin" />
                                                  <span>Committing fix...</span>
                                                </>
                                              ) : (
                                                <>
                                                  <span>
                                                    Commit Fix to {pr.head.ref}
                                                  </span>
                                                  <span className="transition-transform group-hover:translate-x-1">
                                                    →
                                                  </span>
                                                </>
                                              )}
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Technical Metadata Footer */}
                                    <div className="border-border text-muted-foreground bg-muted/10 flex justify-between border-t px-4 py-2 font-mono text-[11px]">
                                      <span>author: {issue.user}</span>
                                      <span>
                                        commit will tag [patchmycode-autofix]
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        ) : (
                          <div className="border-border bg-background text-muted-foreground border p-8 text-center font-mono text-xs">
                            <span className="text-success font-semibold">
                              ✓ CLEAN REVIEW
                            </span>{" "}
                            — No AST or caller anomalies found in pull request #
                            {pr.number}.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* 6. Editorial Footer */}
      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-7xl items-center justify-between px-6 py-8 font-mono text-xs lg:px-8">
          <span>patchmycode</span>
          <span>review · trace · ship</span>
        </div>
      </footer>
    </div>
  );
}

export default function RepoDetailPage() {
  return (
    <Suspense fallback={<Loading />}>
      <RepoDetailContent />
    </Suspense>
  );
}
