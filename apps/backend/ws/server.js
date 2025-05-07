const WebSocket = require("ws");
const { appLogger } = require("../utils/logger");

// Create WebSocket server
const createWSServer = (server) => {
  const wss = new WebSocket.Server({ server, path: "/ws" });

  // Client connections store
  const clients = new Map();

  // WebSocket connection handler
  wss.on("connection", (ws, req) => {
    const clientId = generateClientId();
    const clientIp = req.socket.remoteAddress;

    // Store client connection
    clients.set(clientId, {
      ws,
      ip: clientIp,
      connectedAt: new Date().toISOString(),
      isAlive: true,
    });

    appLogger.info(
      `WebSocket client connected: ID=${clientId}, IP=${clientIp}`,
    );

    // Send initial welcome message
    ws.send(
      JSON.stringify({
        type: "connection",
        message: "Connected to Face Recognition WebSocket Server",
        clientId,
      }),
    );

    // Set up heartbeat
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
      const client = clients.get(clientId);
      if (client) {
        client.isAlive = true;
      }
    });

    // Handle incoming messages
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);
        appLogger.debug(`Received message from client ${clientId}:`, data);

        // Handle different message types here in the future
        // For now, just acknowledge receipt
        ws.send(
          JSON.stringify({
            type: "acknowledge",
            message: "Message received",
          }),
        );
      } catch (e) {
        appLogger.error(
          `Error processing message from client ${clientId}: ${e.message}`,
        );
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          }),
        );
      }
    });

    // Handle disconnections
    ws.on("close", () => {
      appLogger.info(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });

    // Handle errors
    ws.on("error", (error) => {
      appLogger.error(`WebSocket client error (${clientId}): ${error.message}`);
      clients.delete(clientId);
    });
  });

  // Heartbeat interval
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds

  // Clean up on server close
  wss.on("close", () => {
    clearInterval(interval);
    appLogger.info("WebSocket server closed");
  });

  // Broadcast to all connected clients
  const broadcast = (message) => {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  };

  // Get client count
  const getClientCount = () => {
    return wss.clients.size;
  };

  // Utility function to generate a client ID
  function generateClientId() {
    return `client_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  }

  appLogger.info("WebSocket server initialized");

  return {
    wss,
    clients,
    broadcast,
    getClientCount,
  };
};

module.exports = createWSServer;
