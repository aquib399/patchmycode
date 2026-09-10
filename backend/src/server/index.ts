import { APP_NAME, deployedAt, IS_PRODUCTION } from "@/lib/constant.js";
import { errorHandler } from "@/middlewares/error-handler.js";
import { getDateTime, logger } from "@/middlewares/logger.js";
import { app, server } from "@/clients/express-http.js";
import { corsConfig } from "@/middlewares/cors.js";
import webhookRouter from "./webhook/index.js";
import { PORT } from "@/configs/env.js";
import apiRouter from "./api/index.js";
import express from "express";
import "@/clients/index.js";

Error.stackTraceLimit = 1;

app.set("trust proxy", 1);
app.use(corsConfig, express.json({ limit: "5mb" }), logger);

app.get("/", (_, res) => {
  return res.status(200).json({
    error: false,
    message: "Server running 🚀",
    data: { appName: APP_NAME, deployedAt: getDateTime(deployedAt) }
  });
});

app.use("/api", apiRouter);
app.use("/webhook", webhookRouter);

import { swaggerSpec } from "@/docs/index.js";
app.get("/docs.json", (_, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

import { docsHtml } from "@/docs/html.js";
app.get("/docs", (_, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(docsHtml);
});

app.use(errorHandler);

app.use((_, res) => {
  return res.status(404).json({
    error: true,
    message: "Route not found"
  });
});

function startServer() {
  server.listen(PORT, () => {
    console.log(
      `\x1b[36m${
        IS_PRODUCTION ? "Production" : "Development"
      } Server listening at \x1b[33mhttp://localhost:${PORT}\x1b[0m`
    );
  });
}

startServer();
