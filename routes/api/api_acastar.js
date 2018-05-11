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
        SELECT
        	L.lec_idx,
        	DATE_FORMAT(lec_startDate, '%Y-%m-%d') as lec_startDate,
        	DATE_FORMAT(lec_endDate, '%Y-%m-%d') as lec_endDate,
        	L.lec_title,
        	L.lec_personnel,
        	L.lec_target,
        	L.lec_time,
        	L.lec_content,
        	L.lec_goal,
        	L.lec_effect,
        	L.lec_file,
        	L.lec_flag,
        	L.lec_sessionCount,
        	L.lec_serialNo,

        	LS.ls_idx,
        	LS.ls_title,
        	LS.ls_location,
        	LS.ls_seq,
        	date_format(LS.ls_aplDate, '%Y-%m-%d') as ls_aplDate,
        	date_format(LS.ls_startDate, '%Y-%m-%d')  as  ls_startDate,
        	date_format(LS.ls_endDate,   '%Y-%m-%d')  as  ls_endDate


        FROM
        	lecture L
        	LEFT JOIN lecture_session LS
        	ON L.lec_idx = LS.lec_idx

        WHERE
        	L.lec_externalCode=? `

    // 권한검사
    if (code !== 'acastar') {
        res.send(403, {
            status: 403,
            message : '권한없음'
        })
        return
    }

    pool.getConnection((er, connection)=>{
        if (er) {
            throw er
            return
        }

        connection.query(sql, [lectureCode], (err, rs)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(503, { message: 'query error' })
                return
            }

            // 데이터가 없는경우
            if (rs.length<1) {
                res.send(200, {
                    status: 200,
                    message : 'success - no content'
                })
                return
            }



            var keys = Object.keys(rs)
            var lecture={
                "lec_title": rs[0].lec_title,
                "lec_startDate": rs[0].lec_startDate,
                "lec_endDate": rs[0].lec_endDate,
                "lec_flag": rs[0].lec_flag,
                sessions: []
            }
            for(var ii  in  keys){
                if (rs[ii].ls_idx) {
                    lecture.sessions.push({
                        ls_seq: rs[ii].ls_seq+'차',
                        ls_startDate: rs[ii].ls_startDate,
                        ls_endDate: rs[ii].ls_endDate,
                    })
                }
            }



            // 데이터가 있는경우
            res.send(200, {
                status : 200,
                message: 'success',
                lecture,
                attendance:[
                    {
                        seq: 1,
                        percentage: 50
                    },
                    {
                        seq: 2,
                        percentage: 80
                    }
                ],
                participation: 75
            })
        })
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

    console.log(lms);

    try {
        if (lms.code !== 'acastar') {
            res.send(403, {
                status: 403,
                message : '권한없음'
            })
        }

        res.send(200, {
            status: 200,
            message: 'success - 주의해주시죠!',
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
