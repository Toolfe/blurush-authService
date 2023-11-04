const { createLogger, format, transports } = require("winston");
const { combine, timestamp, simple, colorize } = format;

const logger = createLogger({
  format: combine(timestamp(), colorize(), simple()),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: "combined.log",
    }),
  ],
});

module.exports = { logger };
