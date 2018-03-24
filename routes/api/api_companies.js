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




// ====== 기업목록 ====== //
router.get('/', (req, res, next)=>{
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var param = req.query.apply


    var q1 = `
    SELECT
        C.com_code          as com_code,
        C.com_category    as com_category,
        C.com_name         as com_name,
        C.com_location     as com_location
    FROM
        company C,
        company_manager CM,
        lecture L
    WHERE
        C.com_code = CM.com_code and
        CM.lec_idx=L.lec_idx and
        L.tutor_idx=?
    GROUP BY C.com_code ASC
    `
    var q2 = `SELECT * FROM company ORDER BY com_code ASC`

    // apply가 있을경우 로그인 한 강사의 참여이력이 있는 기업만 검색
    // var q   = param == true ?  mysql.format(q1, usr_idx) : q2
    var q   =  param=='all' ? q2 : mysql.format(q1, usr_idx)
    pool.getConnection((er, connection)=>{
        connection.query(q, [usr_idx, usr_idx], (err, rows)=>{
            connection.release()
            if (err) {
                res.status(500)
                return
            }
            res.status(200).send({
                result: "success",
                status: 200,
                companies : rows
            })
        }) // connection
    })// pool

})





// ====== 기업등록 ====== //
router.post('/', (req, res, next)=>{
    var companyData = req.body;
    console.log(companyData);
    var q = "select * from company where com_code=?"
    conn.query(q, companyData.com_code, (err, row)=>{
        if(err){
            res.status(500).send({
                result:'Error'
            })
            return
        }//if
        if (row.length>0) {
            res.status(203).send({
                result:'failed',
                msg: '기업코드 중복'
            })
            return
        }// if

        q = "INSERT INTO company SET ?"
        conn.query(q, companyData, (err,rs)=>{
            res.status(200).send({ result:'success' })
        })
    })//conn
})







// ====== 기업 상세 ====== //
router.get('/:id', (req,res,next)=>{
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var cid = req.params.id

    // 기업정보
    var companyInfoSQL = `
    SELECT
        C.com_code              as com_code,
        C.com_category        as com_category,
        C.com_name             as com_name,
        C.com_location         as com_location,
        (select count(*) from registration R where R.com_code=C.com_code) as com_registrationCount
    FROM company C
    WHERE C.com_code=?`

    // 참여기업 목록
    var relationLecturesSQL = `
    SELECT
        L.lec_idx  as  lec_idx,
        L.lec_title  as  lec_title,
        date_format(L.lec_startDate, '%Y년 %m월 %d일') as lec_startDate,
        date_format(L.lec_endDate, '%Y년 %m월 %d일') as lec_endDate,
        (select count(*) from registration R where L.lec_idx=R.lec_idx) as lec_studentCount,

        CM.mg_idx               as mg_idx,
        CM.mg_name           as mg_name,
        CM.mg_phone          as mg_phone,

        C.com_code              as com_code
    FROM
        company_manager CM , company C , lecture L
    WHERE
        CM.lec_idx=L.lec_idx and
        CM.com_code=C.com_code and
        C.com_code=? and
        L.tutor_idx=?`


    pool.getConnection((er, connection)=>{
        // 기업정보 쿼리
        connection.query(companyInfoSQL, [cid], (err, companyResult)=>{
            if(err){
                connection.release()
                console.log(err)
                res.status(500).send({result: 'sql error'})
                return
            }

            // 관련 수업목록 조회
            connection.query(relationLecturesSQL, [cid, usr_idx], (relationLecturesErr, relationLecturesResult)=>{
                if(relationLecturesErr){
                    connection.release()
                    console.log(relationLecturesErr)
                    res.status(500).send({result: 'sql relationLecturesErr'})
                    return
                }

                connection.release()
                res.status(200).send({
                    result          : 'success',
                    company    : companyResult[0],
                    lectures      : relationLecturesResult
                })

            })// 관련 수업목록 조회
        }) // connection
    }) // pool

});
















module.exports = router;
