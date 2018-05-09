// 관리자 - 공지사항


var express = require('express');
var router = express.Router();
var conn = require('./../common/dbconn').connection;
var pool = require('./../common/dbconn').connectionPool; // 풀링방식







/* ==========
( GET ) 과정조회 API
 ========== */
router.get('/:code/:lectureCode', (req, res, next)=>{
    var code = req.params.code // 아카스타코드
    var lectureCode = req.params.lectureCode

    var sql = `
        SELECT * FROM lecture WHERE lec_idx=? `

    // 권한검사
    if (code !== 'acastar') {
        res.send(403, {
            status: 403,
            message : '권한없음'
        })
    }

    pool.getConnection((er, connection)=>{
        if (er) {
            throw er
            return
        }

        connection.query(sql, [lectureCode], (err, rs)=>{
            connection.release()
            if (err) {
                res.send(503, { message: 'query error' })
                return
            }

            // 데이터가 없는경우
            if (rs.length<1) {
                res.send(204, {
                    status: 204,
                    message : 'success - no content'
                })
                return
            }

            // 데이터가 있는경우
            res.send(200, {
                status : 200,
                message: 'success',
                data: rs
            })
        })
    })

    res.send(200, {
        response: 'sucess'
    })
})



/* ==========
( POST ) 신규과정 API
 ========== */
router.post('/', (req, res, next)=>{
    var lms =
    {
        code : req.body.code, // LMS 과정코드
        title : req.body.title, // 과정명
        sessions : req.body.sessions, // 집체교육 일정 - 가변길이 - 배열
        reqStudents : req.body.studens // 수강생목록
    }

    try {
        if (lms.code !== 'acastar') {
            res.send(403, {
                status: 403,
                message : '권한없음'
            })
        }

        res.send(200, {
            status: 403,
            message: 'success',
            inputData: lms
        })
    } catch (e) {
        res.send(503, {
            status: 403,
            message: 'server error'
        })
    }

})







module.exports = router;
