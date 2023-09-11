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

app.use("/userservice", routes);

app.listen(process.env.AUTH_PORT, () => {
  console.log("USERSERVICE API Started on " + process.env.port);
});
