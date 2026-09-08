import express from "express";
import http from "http";

export const app = express();
export const server = http.createServer(app);
