import * as service from "@/services/user/index.js";

export const getProfile: routerFunction = async (_, res) => {
  const userId = res.locals.id;
  const { response, status } = await service.getProfile({ userId });
  return res.status(status).json(response);
};
