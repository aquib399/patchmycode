import { createResponse } from "@/utils/response.js";
import { User, type IUser } from "@/models/index.js";

export interface GetProfileProps {
  userId: string;
}

export const getProfile: serviceFunction<GetProfileProps, IUser> = async ({
  userId
}) => {
  const user = await User.findById(userId);
  if (!user) {
    return {
      status: 404,
      response: await createResponse("error", "User not found", null)
    };
  }

  return {
    status: 200,
    response: await createResponse<IUser>(
      "success",
      "User profile fetched successfully",
      user.toObject()
    )
  };
};
