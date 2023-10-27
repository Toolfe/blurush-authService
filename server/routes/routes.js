const express = require("express");
const router = express.Router();
const cryptoJS = require("crypto-js");
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
  const { name, emailAddress, password, isUserVerified, deviceId, userType } =
    req.body;
  Object.keys(req.body).forEach((key) => {
    if (key !== "deviceId") {
      if (
        req.body[key] == "" ||
        req.body[key] == null ||
        req.body[key] == undefined
      ) {
        res.status(400).json({
          error: true,
          errorField: key,
          errorMessage: `${key.toUpperCase()} is a Required value`,
        });
      } else if (key == "name") {
        var errorMessage =
          name?.length < 3
            ? `${key.toUpperCase()} should have atleast 3 letters`
            : !name?.match(/^[A-Za-z]+$/)
            ? `${key.toUpperCase()} can only have alphabets`
            : "";
        if (errorMessage) {
          res.status(400).json({
            error: true,
            errorField: key,
            errorMessage: errorMessage,
          });
        }
      } else if (key === "password") {
        if (
          !password?.match(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/)
        ) {
          res.status(400).json({
            error: true,
            errorField: key,
            errorMessage: "Password policy violation",
          });
        }
      } else if (key == "emailAddress") {
        if (
          !emailAddress.match(
            /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
          )
        ) {
          res.status(400).json({
            error: true,
            errorField: key,
            errorMessage: "Invalid email address",
          });
        }
      }
    }
  });
  const insertProcedure = "CALL INSERTUSER(?,?,?,?,?,?,?,?,?)";
  const encryptedPassword = cryptoJS.AES.encrypt(
    password,
    process.env.PASSWORD_ENCRPTION_KEY_DATABASE
  );
  const userId = uuid(emailAddress);
  executeStoredProcedure(
    insertProcedure,
    [
      userId,
      new Date(),
      name,
      emailAddress,
      encryptedPassword,
      isUserVerified ? 1 : 0,
      userType == "Mobile" ? 1 : 0,
      userType,
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
        if (isUserVerified) {
          response.message = "User Created Successfully";
          response.authenticationToken = generateUserJWTToken(
            {
              name: name,
              userId: userId,
              emailAddress: emailAddress,
              userType: userType,
            },
            userType == "WEB" ? 2 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000
          );
        } else {
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
              res.json(response?.data);
            })
            .catch(function (error) {
              res.json(error?.response.data);
            });
          response.message = "User verification otp sent successfully";
          res.status(200).json(data);
        }
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
        res.status(400).json({
          error: true,
          errorMessage: "System error try again later",
        });
      }
    });
  }
});

module.exports = router;
