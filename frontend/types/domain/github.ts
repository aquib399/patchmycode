export interface IInstallationRepository {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl?: string;
  description?: string;
  defaultBranch?: string;
  targetBranches?: string[];
}

export interface IInstallation {
  _id: string;
  installationId: number;
  accountLogin: string;
  accountId: number;
  accountType: "User" | "Organization";
  accountAvatarUrl?: string;
  repositories: IInstallationRepository[];
  status: "active" | "suspended" | "deleted";
  createdAt: string;
}

export interface RepositoryItem {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl: string;
  description: string;
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  accountAvatarUrl?: string;
  defaultBranch?: string;
  targetBranches?: string[];
}

export interface ToggleRepoPayload {
  repoId: number;
  isActive: boolean;
}

export interface LinkInstallationPayload {
  installationId: number;
}

export interface PullRequestIssue {
  id: number;
  commentId: number;
  path: string;
  line?: number;
  startLine?: number;
  body: string;
  suggestion?: string;
  user: string;
}

export interface PullRequestItem {
  number: number;
  title: string;
  state: string;
  htmlUrl: string;
  author: {
    login: string;
    avatarUrl: string;
  };
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
  };
  createdAt: string;
  updatedAt: string;
  issues: PullRequestIssue[];
}

export interface RepositoryDetailView {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl: string;
  description: string;
  defaultBranch: string;
  targetBranches: string[];
  installationId: number;
  accountLogin: string;
  accountType: "User" | "Organization";
  accountAvatarUrl?: string;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  language: string | null;
  branches: string[];
  pullRequests: PullRequestItem[];
}

export interface UpdateRepoBranchesPayload {
  targetBranches: string[];
}

export interface FixIssuePayload {
  pullNumber: number;
  path: string;
  suggestion: string;
  targetLine?: number;
  startLine?: number;
  commentId?: number;
}
