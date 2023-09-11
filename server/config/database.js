const mysql = require("mysql");

const dbCon = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USERNAME,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
});
dbCon.connect((err) => {
  if (err) {
    console.log("Error connecting to database" + err);
  } else {
    console.log("Connection Successfull");
  }
});

module.exports = dbCon;
