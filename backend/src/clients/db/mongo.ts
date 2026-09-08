import { DATABASE_CONFIG } from "@/configs/env.js";
import mongoose from "mongoose";

const dbName = DATABASE_CONFIG.NAME;

const url = new URL(DATABASE_CONFIG.URL);

mongoose.connection.on("connected", () => {
  console.log(`MongoDB connected: ${url.host}:${dbName}`);
});

mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB error:", err);
});

export async function connectDB() {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(url.href, {
      dbName,
      serverSelectionTimeoutMS: 5000
    });
  } catch (err) {
    console.error("MongoDB connection failed:", err);

    setTimeout(connectDB, 5000);
  }
}

connectDB();
