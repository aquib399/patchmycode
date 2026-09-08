// controllers/index.ts

import { createResponse } from "@/utils/response.js";
import { User, Admin } from "@/models/index.js";
import { Role } from "@/types/role.js";

export const healthCheck: routerFunction = async (_, res) => {
  const resp = await createResponse("success", "OK", null);
  return res.status(200).json(resp);
};

export const verifyToken: routerFunction = async (_, res) => {
  const id = res.locals.id;
  const role = res.locals.role;
  const exp = res.locals.exp;

  if (!role || !id) {
    const resp = await createResponse("error", "Invalid token", null);
    return res.status(401).json(resp);
  }

  let data: AttachedLocals = { id, role, exp };
  let resp: ResponseData<AttachedLocals> = await createResponse(
    "success",
    "Token is valid",
    data
  );

  switch (role) {
    case Role.Admin: {
      const item = await Admin.exists({ _id: id });
      if (!item) {
        // TODO: logout here
        resp = await createResponse("error", "Admin not found", null);
      }
      break;
    }
    case Role.User: {
      const item = await User.exists({ _id: id });
      if (!item) {
        // TODO: logout here
        resp = await createResponse("error", "User not found", null);
      }
      break;
    }
    default: {
      resp = await createResponse("error", `Invalid role: ${role}`, null);
      break;
    }
  }

  return res.status(resp.error ? 400 : 200).json(resp);
};
