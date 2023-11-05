const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
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
  const insertProcedure = "CALL INSERTUSER(?,?,?,?,?)";
  const encryptedPassword = bcrypt.hashSync(password, 10);
  executeStoredProcedure(
    insertProcedure,
    [
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
          errorMessage: result,
        });
      } else {
        var response = {};
        response.error = false;
        response.data = result?.data;
        const generatedOTP = generateOTP();
        const options = {
          method: "POST",
          url: `http://localhost:${process.env.MESSAGE_PORT}/messageservice/sendOTPMail`,
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
            if (!response.data.error) {
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
            } else {
              res.status(200).json({
                message: "Cannot Send Message Try again later",
                data: response.data,
              });
            }
          })
          .catch(function (error) {
            res.status(400).json(error);
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
    executeStoredProcedure("CALL GET_OTP(?)", [emailAddress], (result) => {
      if (!result.err) {
        if (result.data.length > 0) {
          if (result.data[0]?.OTP == otp) {
            executeStoredProcedure(
              "CALL UPDATEUSERSTATUS(?,?)",
              [emailAddress, 1],
              (result) => {
                if (!result.err) {
                  res.status(200).json({
                    error: false,
                    accessToken: jwt.sign(
                      { userId: emailAddress },
                      process.env.JWT_SECRET_KEY,
                      { algorithm: "HS512", expiresIn: 24 * 60 * 60 * 1000 }
                    ),
                  });
                } else {
                  res.status(400).json({
                    error: true,
                    errorMessage: "No data found for given emailaddress",
                  });
                }
              }
            );
          } else {
            res.status(400).json({
              error: true,
              errorMessage: "Invalid OTP",
            });
          }
        } else {
          res.status(400).json({
            error: true,
            errorMessage: result,
          });
        }
      } else {
        res.status(400).json({
          error: true,
          errorMessage: result,
        });
      }
    });
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
          if (bcrypt.compareSync(password, result.data[0].password)) {
            if (result.data[0].is_user_verified == 1) {
              res.status(200).json({
                error: false,
                data: {
                  userName: userId,
                  accessToken: generateUserJWTToken(
                    { ...result?.data[0] },
                    3 * 60 * 60 * 1000
                  ),
                },
              });
            } else {
              res.status(400).json({
                error: true,
                errroMessage: "User Not verified",
              });
            }
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

router.post("/resendOTP", (req, res) => {
  const { emailAddress } = req.body;
  const generatedOTP = generateOTP();
  const options = {
    method: "POST",
    url: `http://localhost:${process.env.MESSAGE_PORT}/messageservice/sendOTPMail`,
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
      if (!response.data.error) {
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
      } else {
        res.status(200).json({
          message: "Cannot Send Message Try again later",
          data: response.data,
        });
      }
    })
    .catch(function (error) {
      res.status(400).json(error);
    });
});

module.exports = router;
