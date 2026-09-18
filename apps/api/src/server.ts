import http from "node:http";

import { env } from "./config/env.js";
import { connectDatabase } from "./database/mongodb.js";
import { connectRedis } from "./database/redis.js";
import { connectUpstash } from "./database/upstash.js";
import { app } from "./app.js";
import { initializeSocketServer } from "./socket/socket.server.js";

async function startServer(): Promise<void> {
  if (
    env.NODE_ENV === "production" &&
    env.FRONTEND_URL.includes("localhost")
  ) {
    console.warn(
      "[config] FRONTEND_URL still points at localhost in production — CORS and sockets will reject the deployed frontend. Set FRONTEND_URL to the deployed web URL.",
    );
  }

  await connectDatabase();
  await connectRedis();
  await connectUpstash();

  const httpServer = http.createServer(app);

  initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`API server running on port ${env.PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API server", error);
  process.exit(1);
});
