import { clearAuthCookies, setAuthCookies } from "@/services/index.js";
import type * as validation from "@/validations/user/index.js";
import { APP_DOMAIN, TOKEN_CONFIG } from "@/configs/env.js";
import { hashString, verifyHash } from "@/utils/hash.js";
import { APP_NAME, IS_PRODUCTION } from "@/lib/index.js";
import { createResponse } from "@/utils/response.js";
import { userTokens } from "@/utils/jwt/tokens.js";
import { emailClient } from "@/clients/email.js";
import { getCookies } from "@/utils/cookies.js";
import { otpClient } from "@/clients/otp.js";
import { Role } from "@/types/role.js";
import { Types } from "mongoose";
import {
  User,
  Token,
  OtpType,
  TokenType,
  UserStatus,
  Credential,
  type IUser
} from "@/models/index.js";

const TOKEN_CFG = TOKEN_CONFIG.user;
const factory = userTokens;

const invalidCredentials = async () => ({
  status: 401,
  response: await createResponse(
    "error",
    "Invalid credentials. Please check your details and try again.",
    null
  )
});

interface SendSignupOtpResponse {
  otpRequestId: string;
}
export const sendSignupOtp: serviceFunction<
  validation.SendSignupOtpPayload["body"],
  SendSignupOtpResponse
> = async ({ email, phone, country }) => {
  const conditions: Record<string, unknown>[] = [
    { phone, countryCode: country }
  ];

  if (email) {
    conditions.push({ email: email.toLowerCase() });
  }

  const exists = await User.exists({ $or: conditions });
  if (exists)
    return {
      status: 409,
      response: await createResponse(
        "error",
        "An account already exists with these details",
        null
      )
    };

  const targetId = new Types.ObjectId();
  const { otpCode, otpRequestId } = await otpClient.create({
    targetId,
    type: OtpType.USER_SIGNUP
  });

  const { sendEmail } = emailClient.init();
  sendEmail({
    from: `noreply@${APP_DOMAIN}`,
    to: [email],
    subject: `Verify your email – ${APP_NAME}`,
    html: `<p>Your verification code is <strong>${otpCode}</strong>. It expires in 10 minutes.</p>`
  }).catch((err) =>
    console.error("Failed to send user signup OTP email:", err)
  );

  return {
    status: 200,
    response: await createResponse<SendSignupOtpResponse>(
      "success",
      "OTP sent to your email successfully",
      { otpRequestId }
    )
  };
};

interface SignInResponse {
  accessToken: string;
  refreshToken: string;
}
export const signIn: serviceFunction<
  {
    body: validation.SignInPayload["body"];
    req: routerRequest;
    res: routerResponse;
  },
  SignInResponse
> = async ({ body, req, res }) => {
  const user = await User.findOne({ email: body.email.toLowerCase() });
  if (!user) return invalidCredentials();

  const credential = await Credential.findOne({
    targetId: user._id,
    target: Role.User
  })
    .select("+passwordHash")
    .lean();
  if (!credential) return invalidCredentials();

  const isMatch = await verifyHash(body.password, credential.passwordHash);
  if (!isMatch) return invalidCredentials();

  if (user.status === UserStatus.Suspended) {
    return {
      status: 403,
      response: await createResponse(
        "error",
        "Your account is suspended. Please contact your administrator.",
        null
      )
    };
  }

  const id = user._id.toString();
  const [accessToken, refreshToken] = await Promise.all([
    factory.createAccessToken({ id }),
    factory.createRefreshToken({ id }, req)
  ]);

  setAuthCookies({
    res,
    role: Role.User,
    tokenConfig: TOKEN_CFG,
    tokens: { accessToken, refreshToken }
  });

  return {
    status: 200,
    response: await createResponse<SignInResponse>(
      "success",
      "Signed in successfully",
      {
        accessToken,
        refreshToken
      }
    )
  };
};

interface SignUpResponse {
  user: IUser;
}
export const signUp: serviceFunction<
  validation.SignUpPayload["body"],
  SignUpResponse
> = async (props) => {
  const { details, credentials } = props;

  const otpResult = await otpClient.verifyById({
    otpRequestId: details.otpRequestId,
    type: OtpType.USER_SIGNUP,
    otp: details.otpCode
  });
  if (!otpResult.valid) {
    return {
      status: 400,
      response: await createResponse("error", otpResult.error!, null)
    };
  }

  const exists = await User.exists({
    email: details.email.toLowerCase()
  });
  if (exists) {
    return {
      status: 409,
      response: await createResponse(
        "error",
        "An account already exists with these details",
        null
      )
    };
  }

  const { otpRequestId, otpCode, ...userDetails } = details;
  const user = await User.create({
    ...userDetails,
    email: details.email
  });

  const passwordHash = await hashString(credentials.password);
  await Credential.create({
    targetId: user._id,
    target: Role.User,
    mfaType: credentials.mfaType,
    passwordHash
  });

  return {
    status: 201,
    response: await createResponse<SignUpResponse>(
      "success",
      "User account created successfully",
      {
        user: user.toObject()
      }
    )
  };
};

interface SignOutValue {
  req: routerRequest;
  res: routerResponse;
}
interface SignOutResponse {}
export const signOut: serviceFunction<SignOutValue, SignOutResponse> = async ({
  req,
  res
}) => {
  const cookies = getCookies(req.headers.cookie);
  const refreshToken = cookies[TOKEN_CFG.refresh.name];
  if (refreshToken) {
    await Token.findOneAndUpdate(
      {
        token: refreshToken,
        target: Role.User,
        type: TokenType.Refresh
      },
      { isActive: false }
    );
  }

  clearAuthCookies({ res, tokenConfig: TOKEN_CFG, role: Role.User });

  return {
    status: 200,
    response: await createResponse<SignOutResponse>(
      "success",
      "Signed out successfully",
      {}
    )
  };
};
