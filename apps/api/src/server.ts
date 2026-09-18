import http from "node:http";

import { env } from "./config/env.js";
import { connectDatabase } from "./database/mongodb.js";
import { app } from "./app.js";
import { initializeSocketServer } from "./socket/socket.server.js";

async function startServer(): Promise<void> {
  await connectDatabase();

  const httpServer = http.createServer(app);

  initializeSocketServer(httpServer);

  httpServer.listen(env.PORT, () => {
    console.log(`API server running on port ${env.PORT}`);
  });
}

startServer();
