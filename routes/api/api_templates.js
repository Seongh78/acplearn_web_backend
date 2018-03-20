/*
Router : /companies

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');




// ====== 템플릿 강의 목록 ====== //
router.get('/', (req, res, next)=>{
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var sql = "SELECT * FROM template_lecture WHERE tutor_idx=?"

    pool.getConnection((er, connection)=>{
        connection.query(sql , [usr_idx], (templatesErr, templatesResult)=>{
            connection.release()
            if(templatesErr){
                console.log(templatesErr);
                res.send(500, {result:'error'})
                return
            }

            res.send(200, {
                result:'success',
                templates : templatesResult
            })

        })//conn
    })// pool


})
// ====== 템플릿 강의 목록 ====== //

















module.exports = router;
