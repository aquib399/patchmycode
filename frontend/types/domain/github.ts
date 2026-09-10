export interface IInstallationRepository {
  repoId: number;
  name: string;
  fullName: string;
  private: boolean;
  isActive: boolean;
  htmlUrl?: string;
  description?: string;
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
}

export interface ToggleRepoPayload {
  repoId: number;
  isActive: boolean;
}

export interface LinkInstallationPayload {
  installationId: number;
}
