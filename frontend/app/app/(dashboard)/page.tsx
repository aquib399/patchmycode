"use client";

import { ConnectGithubButton } from "@/components/connect-github-button";

export default function UserDashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p>Welcome to your dashboard!</p>
      <ConnectGithubButton />
    </div>
  );
}
