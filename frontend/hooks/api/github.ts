import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildApiFunctionProps } from ".";
import { UserAPI } from "@/api/user";
import { RepositoryItem } from "@/types/domain/github";

export const useUserInstallations = () => {
  return useQuery({
    queryKey: ["user", "github", "installations"],
    queryFn: async () => {
      const res = await UserAPI.github.getInstallations({
        forceReturn: false,
        toastConfig: { error: { enabled: false } }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to fetch installations");
      }
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });
};

export interface UseUserRepositoriesFilters {
  search?: string;
  status?: "all" | "active" | "inactive";
}

export const useUserRepositories = (filters?: UseUserRepositoriesFilters) => {
  return useQuery({
    queryKey: [
      "user",
      "github",
      "repositories",
      filters?.search,
      filters?.status
    ],
    queryFn: async () => {
      const res = await UserAPI.github.getRepositories({
        queryParams: {
          search: filters?.search || "",
          status: filters?.status || "all"
        },
        forceReturn: false,
        toastConfig: { error: { enabled: false } }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to fetch repositories");
      }
      return res.data.data || [];
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false
  });
};

export const useToggleRepoStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      repoId,
      isActive
    }: {
      repoId: number;
      isActive: boolean;
    }) => {
      const res = await UserAPI.github.toggleRepoStatus(repoId, {
        payload: { isActive },
        forceReturn: false,
        toastConfig: {
          success: { enabled: true },
          error: { enabled: true }
        }
      });
      if (res.data.error) {
        throw new Error(
          res.data.message || "Failed to toggle repository status"
        );
      }
      return res.data.data;
    },
    onMutate: async ({ repoId, isActive }) => {
      await queryClient.cancelQueries({
        queryKey: ["user", "github", "repositories"]
      });

      const previousQueries = queryClient.getQueriesData<RepositoryItem[]>({
        queryKey: ["user", "github", "repositories"]
      });

      queryClient.setQueriesData<RepositoryItem[]>(
        { queryKey: ["user", "github", "repositories"] },
        (old) => {
          if (!old) return [];
          return old.map((r) => (r.repoId === repoId ? { ...r, isActive } : r));
        }
      );

      return { previousQueries };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousQueries) {
        for (const [key, data] of context.previousQueries) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["user", "github", "repositories"]
      });
    }
  });
};

export const useSyncRepositories = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await UserAPI.github.syncRepositories({
        forceReturn: false,
        toastConfig: {
          success: { enabled: true },
          error: { enabled: true }
        }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to sync repositories");
      }
      return res.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueriesData(
        { queryKey: ["user", "github", "repositories"] },
        data
      );
      queryClient.invalidateQueries({
        queryKey: ["user", "github", "installations"]
      });
    }
  });
};

export const useLinkInstallation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (installationId: number) => {
      const res = await UserAPI.github.linkInstallation({
        payload: { installationId },
        forceReturn: false,
        toastConfig: {
          success: { enabled: true },
          error: { enabled: true }
        }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to link installation");
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user", "github"]
      });
    }
  });
};

export const useDisconnectGithub = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await UserAPI.github.disconnect({
        forceReturn: false,
        toastConfig: {
          success: { enabled: true },
          error: { enabled: true }
        }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to disconnect GitHub");
      }
      return res.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["user", "profile"]
      });
      queryClient.invalidateQueries({
        queryKey: ["user", "github"]
      });
    }
  });
};
