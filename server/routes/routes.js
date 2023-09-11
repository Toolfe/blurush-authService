const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { executeStoredProcedure } = require("../utils/utils");

router.post("/authenticate", (req, res, next) => {
  const { subject, activeStatus, userType, deviceType, username } = req.body;
  let date = new Date();
  const getUserQuery = "CALL GETUSER(?)";
  const insertUserQuery = "CALL INSERTDATA(?,?,?,?,?,?,?)";
  const updateLastVisitedQuery = "CALL UPDATELASTVISITED(?,?)";

  executeStoredProcedure(getUserQuery, [subject], (result) => {
    if (result?.err) {
      res.send("System Error Try again later");
    } else {
      if (!result.data) {
        executeStoredProcedure(
          insertUserQuery,
          [subject, userType, deviceType, activeStatus, date, date, username],
          (result) => {
            if (result.err) {
              res.status(400).json({ message: "System Error" });
            } else {
              res.status(200).json(generateUserToken(req.body));
            }
          }
        );
      } else {
        executeStoredProcedure(
          updateLastVisitedQuery,
          [date, subject],
          (result) => {
            if (result.err) {
              res.status(400).json({ message: "System Error" });
            } else {
              res.status(200).json(generateUserToken(req.body));
            }
          }
        );
      }
    }
  });

  const generateUserToken = (req) => {
    return {
      status: 200,
      accessToken: jwt.sign(req, process.env.JWT_SECRET_KEY, {
        expiresIn: 60 * 60 * 1000,
      }),
    };
  };
});

module.exports = router;
