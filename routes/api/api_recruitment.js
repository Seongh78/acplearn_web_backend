/*
Router : /aplectures
APL강의 관련 데이터
*/

var express = require('express');
var router = express.Router();
var conn = require('../common/dbconn').connection;
var pool = require('./../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var isAuth = require('../common/passport').isAuth;




/*

Route : "/ api / aplectures / "


API 목록

01.
name : 모집중인 APL강의 목록
path  : /

02.
name : 수강신청- 등록
path  : /application/:pid

03.
name : 수강생 목록
path  : /application/:pid/list

04.
name : 튜터정보 조회
path  : /tutor/:tid

05.
name : APL강의 수강신청
path  : /application

06.
name : 수강신청여부 확인
path  : /check/:id

07.
name : 수강신청 취소
path  : /application/:id

08.
name : 신청내역 목록
path  : /records

09.
name : 신청내역 상세
path  : /records/:id

10.
name : APL강의상세보기
path  : /:id




*/





// ====== 01. 모집중인 APL강의 목록 ====== //
router.get('/', function(req, res, next) {
    var q = `
    select
        rec_idx ,
        rec_location,
        rec_status,
        rec_time,
        rec_count,
        rec_price,
        rec_title
    from tutor_recruitment
    order by rec_date desc`;
    conn.query(q, function(e, rows) {
        if (e) {
            console.log(e);
            return res.send(500, {result:e, data:{}});
        }
        res.send(200, {result:'success', data:rows});
    });

});
// ====== 01. 모집중인 APL강의 목록 ====== //









// ====== 02. 수강신청- 등록 ====== //
router.post('/application/:pid', function(req, res, next) {
    var application={
        rec_idx: req.params.pid,
        tutor_idx: req.user.user.tutor_idx
    }

    var q = "insert into apl_application set ?"
    conn.query(q, application, function(e) {
        if (e) {
            console.log(e);
            return res.send(500, {result:'db error', message:e});
        }
        res.send(200, {result:'success'});
    });

});
// ====== 02. 수강신청- 등록 ====== //










// ====== 03. 수강생 목록 ====== //
router.get('/application/:pid/list', isAuthenticatedAdmin, (req, res, next)=>{
    var pid = req.params.pid;
    var q = "select * from tutor T, tutor_application A where A.rec_idx=? and A.tutor_idx=T.tutor_idx";
    conn.query(q, pid, (e, rows)=>{
        if (e) {
            console.log(e);
            return res.send(500, {result:e});
        }
        res.send(200, {result:rows})
    });
});
// ====== 03. 수강생 목록 ====== //







// ====== 04. 튜터정보 조회 ====== //
router.get('/tutor/:tid', (req, res, next)=> {
    let tid = req.params.tid;
    let q = "select * from tutor where tutor_idx=?"

    conn.query(q, [tid], function(e, row) {
        if (e) {
            console.log(e)
            res.send(500, {result:"error", message:e})
            return;
        }
        console.log(row[0]);
        res.send(200, {result:'success', data: row[0]})
    })//conn
});
// ====== 04. 튜터정보 조회 ====== //













// ====== 05. APL강의 수강신청 ====== //
router.post('/application', isAuth, (req, res, next)=>{
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var tutor_body = req.body.tutor // 수정할 정보
    var rec_idx = req.body.rec_idx // 강의 아이디

    delete tutor_body.tutor_idx
    delete tutor_body.tutor_id
    delete tutor_body.tutor_type
    delete tutor_body.tutor_email

    // 업데이트 쿼리
    var updateSQL = `
    UPDATE tutor
    SET ?
    WHERE tutor_idx=?`

    var insertSQL = `
    INSERT INTO tutor_application(
        app_date,
        app_status,
        app_payment,
        rec_idx,
        tutor_idx

    ) VALUES (
        now(),
        '대기',
        '미결제',
        ?,
        ?
    )`



    pool.getConnection((er, connection)=>{
        connection.query(updateSQL, [tutor_body, tutor_idx], (updateErr, updateResult)=>{
            if (updateErr) {
                connection.release()
                console.log(updateErr);
                res.send(500, {result: 'error - update'})
                return
            }

            // 강의아이디 가져와야함!!
            connection.query(insertSQL,  [rec_idx, tutor_idx], (insertErr, insertResult)=>{
                connection.release()
                if (insertErr) {
                    console.log(insertErr);
                    res.send(500, {result: 'error - insert'})
                    return
                }

                res.send(200, { result: 'success', insertId: insertResult.insertId })
            })// insert
        })// update
    })// pool

})
// ====== 05. APL강의 수강신청 ====== //









// ====== 06. 수강신청여부 확인 ====== //
router.get('/check/:id', function(req, res, next) {
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var rec_idx = req.params.id;
    var sql = `
    SELECT *
    FROM tutor_application
    WHERE rec_idx=? and tutor_idx=?`;

    pool.getConnection((er, connection)=>{
        connection.query(sql, [rec_idx, tutor_idx], function(e, result) {
            connection.release()
            if (e) {
                console.log(e);
                res.send(500,{result:'error'});
                return
            }

            if (result.length > 0) {
                res.send({reulst: '이미 등록되었음', status : 208})
                return
            }else{
                res.send({reulst: '등록가능', status:200})
                return
            }// else
        }) // connection
    }) // pool
});
// ====== 06. 수강신청여부 확인 ====== //










// ====== 07. 수강신청 취소 ====== //
router.delete('/application/:id', (req, res, next)=>{
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var rec_idx = req.params.id;

    var sql = 'DELETE FROM tutor_application WHERE rec_idx=? and tutor_idx=?'

    pool.getConnection((er, connection)=>{
        connection.query(sql, [rec_idx, tutor_idx], (e, result)=>{
            connection.release()
            if (e) {
                console.log(e);
                res.send(500, {result:e, data:{}});
                return
            }

            res.send(200, {result:'suucess'})
        }) // connection
    }) // pool
})
// ====== 07. 수강신청 취소 ====== //









// ====== 08. 신청내역 목록 ====== //
router.get('/records', function(req, res, next) {
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var q = `
    SELECT *
    FROM tutor_application TA, tutor_recruitment TR
    WHERE TA.tutor_idx=? and TR.rec_idx=TA.rec_idx
    ORDER BY app_date DESC`;

    conn.query(q, [tutor_idx], function(e, rows) {
        if (e) {
            console.log(e);
            res.send(500, {result:'error'});
            return
        }
        // console.log("rows : ");
        // console.log(rows);
        res.send(200, {
            result : 'success',
            records : rows
        });
    }); // conn
});
// ====== 08. 신청내역 목록 ====== //








// ====== 09. 신청내역 상세 ====== //
router.get('/records/:id', function(req, res, next) {
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var app_idx = req.params.id;
    var q = `
    SELECT *
    FROM tutor_application TA, tutor_recruitment TR
    WHERE TA.tutor_idx=? and TA.app_idx=? and TR.rec_idx=TA.rec_idx
    ORDER BY app_date DESC`;

    conn.query(q, [tutor_idx, app_idx], function(e, rows) {
        if (e) {
            console.log(e);
            res.send(500, {result:'error'});
            return
        }
        // console.log("rows : ");
        // console.log(rows);
        res.send(200, {
            result : 'success',
            record : rows[0]
        });
    }); // conn
});
// ====== 09. 신청내역 상세 ====== //









// ====== 10. APL강의상세보기 ====== //
router.get('/:id', function(req, res, next) {
    var rec_idx = req.params.id;

    // 강의 상세정보
    var q = `
    SELECT *
    FROM tutor_recruitment
    WHERE rec_idx=?
    `

    // 수강생 목록
    var studentsSQL = `
    SELECT
        *
    FROM
        tutor_application TA,
        tutor T
    WHERE
        TA.rec_idx=? and
        TA.tutor_idx=T.tutor_idx
    `

    pool.getConnection((er, connection)=>{

        // APL강의 상세정보
        connection.query(q, rec_idx, function(e, recResult) {
            if (e) {
                connection.release()
                console.log(e);
                res.send(500, {result:e, data:{}});
                return
            }

            // 수강생목록
            connection.query(studentsSQL, [rec_idx], (e2, studentsResult)=>{
                if (e2) {
                    connection.release()
                    console.log(e2);
                    res.send(500, {result:e2, data:{}});
                    return
                }
                    console.log(studentsResult);

                res.send(200, {
                    result : 'success',
                    rec : recResult[0],
                    students : studentsResult
                })
            }) // 수강생목록

        }) // APL강의 상세정보
    }) // pool

});
// ====== 10. APL강의상세보기 ====== //




module.exports = router;
