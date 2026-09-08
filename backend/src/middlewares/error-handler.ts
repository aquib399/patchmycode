import { createResponse } from "@/utils/response.js";

export const errorHandler = async (
  err: any,
  req: routerRequest,
  res: routerResponse,
  next: routerNext
) => {
  console.error("\x1b[31m", err, "\x1b[0m");
  if (err?.type === "entity.parse.failed") {
    const resp = await createResponse(
      "error",
      "Invalid JSON in request body",
      null
    );
    return res.status(400).json(resp);
  }

  const resp = await createResponse("error", "Internal server error", null);

  return res.status(500).json(resp);
};
