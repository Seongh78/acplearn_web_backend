// 관리자 - 공지사항


var express = require('express');
var router = express.Router();
var conn = require('./../common/dbconn').connection;
var pool = require('./../common/dbconn').connectionPool; // 풀링방식




// ========== 공지목록 ========== // => O
router.get('/', function(req, res, next) {
    var sql =
    `select
        notice_idx,
        notice_title,
        notice_count,
        date_format(notice_date, '%Y년 %m월 %d일') as notice_date
    from notice order by notice_date desc LIMIT ?, ?`;
    var limitStart = req.query.start   == undefined ? 0 : Number(req.query.start)
    var limitEnd = req.query.end     == undefined ? 10 : Number(req.query.end)

    // console.log("limitStart : ", limitStart);

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, [ limitStart, limitEnd ], function(err, rows) {
            connection.release()
            if (err) {
                console.log(err);
                res.json(500, {"result":500});
                return;
            }

            res.send(200, {
                  notices: rows
            });
        })//connection
    })

});
// ========== 공지목록 ========== //













// ========== 공지 등록 ========== // => O
router.post('/', function(req, res, next) {
    var insertTime = new Date()
    var admin_idx = 1 // 변경예정
    var da = {
        notice_title    : req.body.notice.title,
        notice_text    : String(req.body.notice.content),
        admin_idx     : admin_idx
    }

    console.log(typeof da[1]);
    var sql = `INSERT INTO notice SET ?`;


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }


        connection.query(sql, [da], (err, rs)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.json(500, {"result":500});
                return;
            }
            res.send(200, {"result":200});
        }) // connection
    }) // pool

});
// ========== 공지 등록 ========== //



















// ========== 공지수정 ========== //
router.get('/edit/:id', function(req, res, next) {
    var nid = req.params.id;
    var sql = "select * from notice where notice_idx=?";
    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, nid, function(err, row) {
            connection.release()
            if (err) {
                res.json(500, {"result":500});
                return;
            }
            res.render('manager/index', {
                view: 'notice/edit',
                title: '공지사항 수정',
                notice: row[0]
            });
        })//connection
    })// pool
});
// ========== 공지수정 ========== //











// ========== 공지수정 ========== //
router.post('/edit/:id', function(req, res, next) {
    var nid = req.params.id;
    var da = [
            req.body.title,
            req.body.text,
            nid
    ];
    var sql = "update notice set notice_title=?, notice_text=? where notice_idx=?";
    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }
        connection.query(sql, da, function(err, row) {
            connection.release()
            if (err) {
                res.json(500, {"result":500});
                return;
            }
            res.json(200, {"result":200});
        })//conn
    })// pool
});
// ========== 공지수정 ========== //









// ========== 공지상세 ========== //
router.get('/:id', function(req, res, next) {
    var nid = req.params.id;
    console.log("nid : ", nid);
    var sql = `
    SELECT
        notice_idx,
        notice_title,
        notice_text,
        notice_count,
        date_format(notice_date, '%Y년 %m월 %d일') as notice_date
    FROM notice
    WHERE notice_idx=?`;

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, nid, function(err, result) {
            connection.release()
            if (err) {
                res.json(500, {"result":500});
                return;
            }

            if (result.length < 1) {
                res.send(204, {result : 'no content'})
                return
            }
            res.send(200, {
                result : 'success',
                notice: result[0]
            });
        }) // conn
    }) // pool

});
// ========== 공지상세 ========== //













// ========== 공지삭제 ========== //
router.delete('/:id', function(req, res, next) {
    var nid = req.params.id;
    var sql = "delete from notice where notice_idx=?";

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }
        connection.query(sql, nid, function(err, row) {
            connection.release()
            if (err) {
                res.json(500, {"result":500});
                return;
            }
            res.json(200, {"result":200});
        }) // conn
    }) // pool

});
// ========== 공지삭제 ========== //







module.exports = router;
