const express = require("express");
const axios = require("axios");
const { appLogger, logRegistration } = require("../utils/logger");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, image } = req.body;

  // Validate request body
  if (!name || !image) {
    const errorMessage = "Name and image are required";
    appLogger.error(errorMessage);
    logRegistration(name || "unknown", "failed", errorMessage);
    return res.status(400).json({ success: false, message: errorMessage });
  }

  try {
    // Forward the request to the Python face recognition service
    const pythonServiceUrl =
      process.env.PYTHON_SERVICE_URL || "http://localhost:5001";
    const response = await axios.post(
      `${pythonServiceUrl}/register`,
      { name, image },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 10000, // 10 second timeout
      },
    );

    // Log successful registration
    appLogger.info(`User ${name} registered successfully`);
    logRegistration(name, "success");

    // Return the response from the Python service
    return res.status(response.status).json(response.data);
  } catch (error) {
    let errorMessage = "Error during registration";
    let statusCode = 500;

    // Extract more specific error information if available
    if (error.response) {
      // The request was made and the server responded with a status code
      statusCode = error.response.status;
      errorMessage =
        error.response.data?.detail ||
        error.response.data?.message ||
        errorMessage;
      appLogger.error(`Registration error (${statusCode}): ${errorMessage}`);
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage = "No response from recognition service";
      appLogger.error(`Registration error: ${errorMessage}`, {
        error: error.message,
      });
    } else {
      // Something happened in setting up the request
      errorMessage = error.message;
      appLogger.error(`Registration error: ${errorMessage}`);
    }

    // Log failed registration
    logRegistration(name || "unknown", "failed", errorMessage);

    return res
      .status(statusCode)
      .json({ success: false, message: errorMessage });
  }
});

module.exports = router;
