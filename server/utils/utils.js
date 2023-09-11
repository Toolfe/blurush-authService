const dbCon = require("../config/database");

const executeStoredProcedure = (sql, data, callback) => {
  dbCon.query(sql, data, (err, rows, field) => {
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

module.exports = { executeStoredProcedure };
