const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const uuid = require("uuid-by-string");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const {
  executeStoredProcedure,
  generateUserJWTToken,
  generateOTP,
} = require("../utils/utils");

const messageAccessToken =
  "BLURUSH " +
  jwt.sign(
    {
      issuer: "BLURUSH.COM",
      issuedFor: "API Internal communication",
    },
    process.env.JWT_SECRET_KEY,
    { algorithm: "HS512" }
  );

router.post("/createUser", (req, res) => {
  const { name, emailAddress, password, deviceId, userType } = req.body;
  const insertProcedure = "CALL INSERTUSER(?,?,?,?,?,?,?,?,?)";
  const encryptedPassword = bcrypt.hashSync(password, 10);
  const userId = uuid(emailAddress);
  executeStoredProcedure(
    insertProcedure,
    [
      userId,
      new Date(),
      name,
      emailAddress,
      encryptedPassword,
      userType == "Mobile" ? 1 : 0,
      deviceId,
    ],
    (result) => {
      if (result?.err) {
        res.status(400).json({
          error: true,
          errorMessage: result.errorMessage,
        });
      } else {
        var response = {};
        response.error = false;
        response.data = result?.data;
        const generatedOTP = generateOTP();
        const options = {
          method: "POST",
          url: `https://localhost:${process.env.MESSAGE_PORT}/messageservice/sendOTPMail`,
          headers: {
            Authourization: messageAccessToken,
          },
          data: {
            recipient: emailAddress,
            otp: generatedOTP,
          },
        };
        axios
          .request(options)
          .then(function (response) {
            executeStoredProcedure(
              "CALL STORE_OTP(?,?)",
              [emailAddress, generatedOTP],
              (result) => {
                if (!result.err) {
                  res.status(200).json({
                    message: "OTP Message sent successfully",
                    data: response.data,
                  });
                }
              }
            );
          })
          .catch(function (error) {
            res.status(400).json(error?.response.data);
          });
      }
    }
  );
});

router.post("/verifyUserOTP", (req, res) => {
  const { emailAddress, otp } = req.body;
  if (!emailAddress || !otp) {
    res.status(400).json({
      error: true,
      errorMessage: "Email address and OTP is needed to verify the user",
    });
  } else {
  }
});

router.post("/login", (req, res) => {
  const { userId, password } = req.body;
  if (!userId || !password) {
    res.status(400).json({
      error: true,
      message: "Email and password is required",
    });
  } else {
    executeStoredProcedure("Call GETUSER(?)", [userId], (result) => {
      if (!result.err) {
        if (result?.data?.length > 0) {
          if (String(result.data.password).localeCompare(password) == 0) {
            res.status(200).json({
              error: false,
              data: {
                userName: "userId",
                accessToken: generateUserJWTToken(
                  result?.data,
                  3 * 60 * 60 * 1000
                ),
              },
            });
          } else {
            res.status(200).json({
              error: true,
              errorMessage: "Invalid Password",
            });
          }
        } else {
          res.status(200).json({
            error: true,
            errorMessage: "Invalid username",
          });
        }
      } else {
        res.status(200).json({
          error: true,
          errorMessage: "System error try again later",
        });
      }
    });
  }
});

module.exports = router;
