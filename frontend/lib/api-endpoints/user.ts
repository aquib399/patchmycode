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
    profile: `${base}/profile`
  };
};
