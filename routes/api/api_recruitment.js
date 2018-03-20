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



// APL강의
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

router.get('/application/:pid/list', isAuthenticatedAdmin, (req, res, next)=>{
    var pid = req.params.pid;
    var q = "select * from tutor T, apl_application A where A.rec_idx=? and A.tutor_idx=T.tutor_idx";
    conn.query(q, pid, (e, rows)=>{
        if (e) {
            console.log(e);
            return res.send(500, {result:e});
        }
        res.send(200, {result:rows})
    });
});

router.get('/tutor/:tid', (req, res, next)=> {
    let tid = req.params.tid;
    let q = "select * from tutor where tutor_idx=?"

    conn.query(q, tid, function(e, row) {
        if (e) {
            console.log(e)
            res.send(500, {result:"error", message:e})
            return;
        }
        console.log(row[0]);
        // if (row[0]==undefined) {
        //     res.send(203, { result:'success', data:{} })
        //     return;
        // }
        res.send(200, {result:'success', data: row[0]})
    })//conn
});







// APL강의 수강신청
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
        tutor_idx)
    VALUES(now(), '대기', '미결제', ?, ?)`



    pool.getConnection((er, connection)=>{
        connection.query(updateSQL, [tutor_body, tutor_idx], (updateErr, updateResult)=>{
            if (updateErr) {
                connection.release()
                console.log(updateErr);
                res.send(500, {result: 'error - update'})
                return
            }

            // 강의아이디 가져와야함!!
            connection.query(insertSQL,  [tutor_idx, rec_idx], (insertErr, insertResult)=>{
                if (insertErr) {
                    connection.release()
                    console.log(insertErr);
                    res.send(500, {result: 'error - insert'})
                    return
                }
                connection.release()
                res.send(200, { result: 'success' })
            })// insert
        })// update
    })// pool

}) // APL강의 수강신청








// 수강신청여부 확인
router.get('/check/:id', function(req, res, next) {
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var rec_idx = req.params.id;
    var sql = `
    SELECT *
    FROM tutor_application
    WHERE rec_idx=? and tutor_idx=?`;

    pool.getConnection((er, conn)=>{
        conn.query(sql, [rec_idx, tutor_idx], function(e, result) {
            conn.release()
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
        }) // conn
    }) // pool
});








// 수강신청 취소
router.delete('/application/:id', (req, res, next)=>{
    var tutor_idx = req.user.user.tutor_idx // 강사아이디
    var rec_idx = req.params.id;

    var sql = 'DELETE FROM tutor_application WHERE rec_idx=? and tutor_idx=?'

    pool.getConnection((er, conn)=>{
        conn.query(sql, [rec_idx, tutor_idx], (e, result)=>{
            conn.release()
            if (e) {
                console.log(e);
                res.send(500, {result:e, data:{}});
                return
            }

            res.send(200, {result:'suucess'})
        }) // conn
    }) // pool
})









// 신청내역 목록
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
        console.log("rows : ");
        console.log(rows);
        res.send(200, {
            result : 'success',
            records : rows
        });
    }); // conn
});




// 신청내역 상세
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
        console.log("rows : ");
        console.log(rows);
        res.send(200, {
            result : 'success',
            record : rows[0]
        });
    }); // conn
});








// APL강의상세보기
router.get('/:id', function(req, res, next) {
    var rec_id = req.params.id;
    var q = "select * from tutor_recruitment where rec_idx=?";
    conn.query(q, rec_id, function(e, row) {
        if (e) {
            console.log(e);
            res.send(500, {result:e, data:{}});
            return
        }
        res.send(200, {result:'success', data:row[0]});
    });
});





module.exports = router;
