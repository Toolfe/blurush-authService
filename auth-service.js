const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const app = express();

app.use(cors());

app.use(bodyParser.json());

const routes = require("./server/routes/routes");
const { logger } = require("./server/utils/winston");

const requestAuthorization = (req, res, next) => {
  const applicationId = req.headers["app-id"];
  if (!applicationId) {
    res.status(403).json({
      error: true,
      errorMessage: "Not authourized",
    });
  } else if (applicationId !== process.env.APPID) {
    res.status(403).json({
      error: true,
      errorMessage: "Invalid app-id",
    });
  } else {
    next();
  }
};

app.use("/userservice", requestAuthorization, routes);

app.listen(process.env.AUTH_PORT, () => {
  logger.info("USERSERVICE API Started on " + process.env.AUTH_PORT);
});
