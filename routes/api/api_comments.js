/*
Router : /companies

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var isAuth     = require('../common/passport').isAuth;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');





/*

Route : "/api/plans/"


API 목록

01. 강의활동 목록조회
/detail/:lap_idx


02. 모듈별 강의피드 목록조회
/modules/:lm_idx


*/






// ====== 01. 강의활동 목록조회 ====== //
router.get('/feedback/:lec_idx', isAuth, (req,res,next)=>{
    var lec_idx = req.params.lec_idx // 기준 id (부모아이디)
    var commentSQL = `
    SELECT *
    FROM
    	lecture_comment LC

    	LEFT JOIN registration R
    	ON R.stu_idx=LC.stu_idx

    	LEFT JOIN lecture_module LM
    	ON LM.lm_idx=LC.lm_idx

    WHERE
    	R.lec_idx=?
    `


    pool.getConnection((er, connection)=>{
        connection.query( commentSQL , [ lec_idx ] , (commentErr, commentResult)=>{
            connection.release()
            if ( commentErr ) {
                console.log(commentErr);
                res.send(500, {result:'error'})
                return
            }

            console.log(commentResult)
            res.send(200, {
                result: 'success',
                comments : commentResult
            }) // res

        })// commentSQL - conn
    }) // pool
})
// ====== 01. 강의활동 목록조회 ====== //










// ====== 02. 모듈별 강의피드 목록조회 ====== //
router.get('/modules/:lm_idx', isAuth, (req,res,next)=>{
    var lm_idx = req.params.lm_idx // 기준 id (부모아이디)
    var commentSQL = `
    SELECT *
    FROM
    	lecture_comment LC,
        registration R
    WHERE
    	LC.lm_idx=? and R.stu_idx=LC.stu_idx
    `


    pool.getConnection((er, connection)=>{
        connection.query( commentSQL , [ lm_idx ] , (commentErr, commentResult)=>{
            connection.release()
            if ( commentErr ) {
                console.log(commentErr);
                res.send(500, {result:'error'})
                return
            }

            // console.log(commentResult)
            res.send(200, {
                result: 'success',
                comments : commentResult
            }) // res

        })// commentSQL - conn
    }) // pool
})
// ====== 02. 모듈별 강의피드 목록조회 ====== //























module.exports = router;
