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





// ====== 점수추가 ====== //
router.put('/score', (req, res, next)=>{

    /*
    req.body.table이 테이블 명
    */

    var usr_idx = req.user.user.tutor_idx
    var table = req.body.table // 테이블
    var idx = req.body.id // 변경될 값의 아이디
    var score = Number(req.body.score) // 변경될 값

    var sql =
    (table=='group') ?
        "UPDATE `group` SET group_score=group_score+? WHERE group_idx=?" :
        "UPDATE `registration` SET stu_score=stu_score+? WHERE stu_idx=?" ;

    pool.getConnection((er, connection)=>{
        connection.query(sql , [score, idx] , (err, result)=>{
            connection.release()
            if(err){
                console.log(err)
                res.status(500).send({result:"failed"})
                return
            }// if

            res.status(200).send({result:"success" , da: result})
        })// connection
    })// pool


})
// ====== 점수추가 ====== //










// ====== 수강생의  - 부서찾기 ====== //
router.get('/departments/:lec_idx', (req, res, next)=>{

    var sql = `
    SELECT
        R.stu_department
    FROM
        registration R
    WHERE
        R.lec_idx = ? GROUP BY R.stu_department`

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, [14], (err, departmentsResult)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result:err})
                return
            }

            res.send(200 , { departments : departmentsResult })
        }) // connection
    }) // pool

})
// ====== 수강생의  - 부서찾기 ====== //











module.exports = router;
