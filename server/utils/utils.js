const dbCon = require("../config/database");
const jwt = require("jsonwebtoken");

const executeStoredProcedure = (sql, data, callback) => {
  dbCon.query(sql, data, (err, rows) => {
    let result = {};
    if (err) {
      result = {
        err: true,
        errNo: err.errno,
        errMessage: err.message,
      };
    } else if (rows) {
      result = {
        err: false,
        data: rows?.[0]?.[0],
      };
    } else {
      console.log("Err");
    }
    callback(result);
  });
};

const generateUserJWTToken = (user, expiryTime) => {
  return jwt.sign(user, process.env.JWT_SECRET_KEY, {
    algorithm: "HS512",
    expiresIn: expiryTime,
  });
};

const generateOTP = () => {
  return Number(Math.random() * 9000 + 1000).toFixed(0);
};

module.exports = { executeStoredProcedure, generateUserJWTToken, generateOTP };
