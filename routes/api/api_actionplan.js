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

01. 액션플랜 상세보기
/detail/:lap_idx

02. 강의별 액션플랜
/:lec_idx

03. 개별 플랜목록
/:lec_idx/:stu_idx


*/






// ====== 01. 액션플랜 상세보기 ====== //
router.get('/detail/:lap_idx', isAuth, (req,res,next)=>{
    var lap_idx = req.params.lap_idx

    // 액션플랜 상세보기 - lap_grader : 평가인원
    var sql = `
    SELECT *
    FROM lecture_action_plan LAP

   	LEFT JOIN lecture_kpi LK
	ON LAP.lk_idx=LK.lk_idx

	LEFT JOIN capability_category2 CC2
	ON LK.cc2_idx=CC2.cc2_idx

	WHERE LAP.lap_idx=?
    `
    var lacSQL = `
    SELECT
        LAC.lac_score,
        LAC.lac_flag,
        LAC.lac_date
    FROM
        lecture_acplearn_check LAC
    WHERE
        LAC.lap_idx = ?
    `

    pool.getConnection((er, connection)=>{
        connection.query(sql, [lap_idx], (sqlErr, sqlResult)=>{
            if ( sqlErr ) {
                connection.release()
                console.log(sqlErr);
                res.send(500, {result:'error'})
                return
            }

            connection.query(lacSQL, [lap_idx], (lacErr, lacResult)=>{
                if ( lacErr ) {
                    connection.release()
                    console.log(lacErr);
                    res.send(500, {result:'error'})
                    return
                }

                connection.release()
                res.send(200, {
                    result: 'success',
                    plan : sqlResult[0],
                    scores : lacResult
                }) // res

            }) //lac - conn
        })// lap - conn
    }) // pool
})
// ====== 01. 액션플랜 상세보기 ====== //









// ====== 02. 강의별 액션플랜 불러오기 ====== //
router.get('/:lec_idx', isAuth, (req, res, next)=>{

    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디

    var sql = `
        SELECT
            *
        FROM
            lecture_action_plan LAP, lecture_session LS
        WHERE
            LS.lec_idx=? and LAP.ls_idx=LS.ls_idx
        `


    pool.getConnection((er, connection)=>{
        connection.query(sql, (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result: 'error'})
                return
            }
            res.status(200).send({ status : 200, plans: result })//response
        })// connection
    })// pool
})
// ====== 02. 강의별 액션플랜 불러오기 ====== //









// ====== 03. 개별 플랜목록 ====== //
router.get('/:lec_idx/:stu_idx',  isAuth, (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var stu_idx      = req.params.stu_idx // 수강생아이디

    // 개별 플랜목록 조회 쿼리
    var sql = `
        SELECT *
        FROM
        lecture_action_plan as LAP

        JOIN registration as R
            ON R.stu_idx = LAP.stu_idx

        LEFT JOIN lecture_kpi as LK
            ON LK.lk_idx = LAP.lk_idx

        LEFT JOIN capability_category2 as CC2
            ON CC2.cc2_idx=LK.cc2_idx

        LEFT JOIN lecture_session as LS
            ON LAP.ls_idx = LS.ls_idx and LS.lec_idx=?

        WHERE LAP.stu_idx=?
        `

    pool.getConnection((er, connection)=>{
        connection.query(sql, [lec_idx, stu_idx], (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result: 'error'})
                return
            }
            // console.log(result);
            res.send(200, {plans:result})
        })// connection
    })// pool
})
// ====== 03. 개별 플랜목록 ====== //
























module.exports = router;
