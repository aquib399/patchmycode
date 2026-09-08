const createErrorResponse = (
  message: string,
  data: any = null
): { error: true; message: string; data: any } => {
  return { error: true, message, data };
};

const createSuccessResponse = <T>(
  message: string,
  data: T
): { error: false; message: string; data: T } => {
  return { error: false, message, data };
};

export async function createResponse<T>(
  type: "success",
  message: string,
  data: T
): Promise<ResponseData<T>>;

export async function createResponse<T = any>(
  type: "error",
  message: string,
  data?: any
): Promise<ResponseData<T>>;

export async function createResponse<T = any>(
  type: "success" | "error",
  message: string,
  data?: any
): Promise<ResponseData<T>> {
  let response: ResponseData<T>;
  switch (type) {
    case "success": {
      response = createSuccessResponse<T>(message, data);
      break;
    }
    case "error": {
      response = createErrorResponse(message, data);
      break;
    }
  }
  return response;
}
