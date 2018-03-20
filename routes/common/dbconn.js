var mysql = require('mysql');
module.exports = {
  connection            : mysql.createConnection(hostinfo()), // 커넥션방식 - 단일 실행만 가능
  connectionPool     : mysql.createPool(hostinfo()) // 풀링방식 - 다중실행 가능
}

function hostinfo() {
    // return {
    //       // host: "mydb.cn8n6s3ok7xe.ap-northeast-2.rds.amazonaws.com",
    //       host: "mydb.cn8n6s3ok7xe.ap-northeast-2.rds.amazonaws.com",
    //       user: "seongh",
    //       password: "fg468938",
    //       database: "acplearn_db",
    //       port: "3306",
    //       multipleStatements: true
    // }

    return {
          host: "acplearn-api.actiongo.co.kr",
          user: "root",
          password: "1234",
          database: "acplearn_base",
          port: "3306",
          multipleStatements: true
    }

    // return {
    //     host: "127.0.0.1",
    //     user: "root",
    //     password: "",
    //     database: "acplearn_base",
    //     port: "3307",
    //     multipleStatements: true
    // }
}
