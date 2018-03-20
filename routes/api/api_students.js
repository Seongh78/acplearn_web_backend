/*
Router : /students

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







// ====== (O)출석체크 ====== //
router.put('/attendance', (req, res, next)=>{

    var usr_idx = req.user.user.tutor_idx
    var lec_idx = req.body.lec_idx
    var stu_idx = req.body.stu_idx
    var attendance = typeof(req.body.attendance)=="string" ? req.body.attendance : JSON.stringify(req.body.attendance)

    var sql = "UPDATE registration SET stu_attendance=? WHERE stu_idx=?"

    pool.getConnection((er, connection)=>{
        connection.query(sql , [attendance, stu_idx] , (err, result)=>{
            if(err){
                connection.release()
                console.log(err)
                res.status(500).send({result:"failed"})
                return
            }// if
            connection.release()
            res.status(200).send({result:"success" })
        })// connection
    })// pool


})
// ====== (O)출석체크 ====== //













module.exports = router;
