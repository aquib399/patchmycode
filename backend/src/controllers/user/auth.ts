import * as validation from "@/validations/user/index.js";
import * as service from "@/services/user/index.js";

export const signUp: routerFunction<validation.SignUpPayload> = async (
  req,
  res
) => {
  const body = req.body;
  const { response, status } = await service.signUp(body);

  return res.status(status).json(response);
};

export const signIn: routerFunction<validation.SignInPayload> = async (
  req,
  res
) => {
  const body = req.body;
  const { response, status } = await service.signIn({ body, req, res });

  return res.status(status).json(response);
};
export const signOut: routerFunction = async (req, res) => {
  const { response, status } = await service.signOut({ req, res });
  return res.status(status).json(response);
};

export const sendSignUpOtp: routerFunction<
  validation.SendSignupOtpPayload
> = async (req, res) => {
  const body = req.body;
  const { response, status } = await service.sendSignupOtp(body);
  return res.status(status).json(response);
};
