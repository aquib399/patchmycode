import { CORS_ORIGINS } from "@/lib/constant.js";
import cors from "cors";

console.log("ORIGINS:", CORS_ORIGINS);

export const corsConfig = cors({
  origin: CORS_ORIGINS,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "x-refresh-token"
  ]
});
