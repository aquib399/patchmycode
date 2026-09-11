"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useLinkInstallation } from "@/hooks/api/github";
import { useEffect, Suspense } from "react";
import Loading from "@/components/loading";
import { toast } from "sonner";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const linkInstallationMutation = useLinkInstallation();

  useEffect(() => {
    const installationId = searchParams.get("installation_id");
    const error = searchParams.get("error");
    const github = searchParams.get("github");

    if (error) {
      toast.error(decodeURIComponent(error));
      router.replace("/app");
      return;
    }

    if (installationId) {
      linkInstallationMutation.mutate(Number(installationId), {
        onSuccess: () => {
          router.replace("/app");
        },
        onError: (err) => {
          router.replace("/app");
        }
      });
      return;
    }

    if (github === "connected") {
      toast.success("GitHub account connected!");
    }

    router.replace("/app");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, router]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4">
      <Loading />
      <p className="text-muted-foreground text-sm">
        Finalizing GitHub connection...
      </p>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={<Loading />}>
      <CallbackContent />
    </Suspense>
  );
}
