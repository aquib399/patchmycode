import { useQuery } from "@tanstack/react-query";
import { buildApiFunctionProps } from ".";
import { HookProps } from "@/types/api";
import { UserAPI } from "@/api/user";

export const useUserVerifyToken = (
  props: HookProps<typeof UserAPI.auth.verifyToken>
) => {
  return useQuery({
    queryKey: ["user", "verifyToken"],
    queryFn: async () => {
      const res = await UserAPI.auth.verifyToken({
        ...buildApiFunctionProps({ props: props || {} }),
        forceReturn: false,
        toastConfig: { error: { enabled: false } }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Unauthorized");
      }
      return res.data.data;
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false
  });
};

export const useUserProfile = (
  props?: HookProps<typeof UserAPI.profile>
) => {
  return useQuery({
    queryKey: ["user", "profile"],
    queryFn: async () => {
      const res = await UserAPI.profile({
        ...buildApiFunctionProps({ props: props || {} }),
        forceReturn: false,
        toastConfig: { error: { enabled: false } }
      });
      if (res.data.error) {
        throw new Error(res.data.message || "Failed to fetch profile");
      }
      return res.data.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });
};
