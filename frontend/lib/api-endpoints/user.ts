export const USER_ENDPOINTS = () => {
  const base = `/api/user`;
  const auth = `${base}/auth`;
  return {
    base,
    auth: {
      signIn: `${auth}/sign-in`,
      signUpSendOtp: `${auth}/sign-up/send-otp`,
      signUp: `${auth}/sign-up`,
      signOut: `${auth}/sign-out`,
      verifyToken: `${auth}/verify-token`
    },
    profile: `${base}/profile`,
    github: {
      oauthUrl: `${base}/github/oauth-url`,
      disconnect: `${base}/github/disconnect`,
      installUrl: `${base}/github/install-url`,
      linkInstallation: `${base}/github/installations/link`,
      installations: `${base}/github/installations`,
      repositories: `${base}/github/repositories`,
      sync: `${base}/github/sync`,
      toggleRepoStatus: (repoId: number) =>
        `${base}/github/repositories/${repoId}/status`
    }
  };
};
