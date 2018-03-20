// 관리자 - 공지사항


var express = require('express');
var router = express.Router();
var conn = require('./../common/dbconn').connection;
var pool = require('./../common/dbconn').connectionPool; // 풀링방식



// 공지관리
router.get('/', function(req, res, next) {
    var sql = "select * from notice order by notice_date desc LIMIT ?, ?";
    var limitStart = req.query.start   == undefined ? 0 : Number(req.query.start)
    var limitEnd = req.query.end     == undefined ? 10 : Number(req.query.end)

    console.log("limitStart : ", limitStart);

    conn.query(sql, [ limitStart, limitEnd ], function(err, rows) {
        if (err) {
            console.log(err);
            res.json(500, {"result":500});
            return;
        }
        console.log(rows);
        res.render('manager/index', {
              view: 'notice/notices',
              title: '관리자모드>공지관리',
              notices: rows
        });
    })//conn

});

// 공지등록
router.get('/new', function(req, res, next) {
  res.render('manager/index', {
      view: 'notice/new',
      title: '신규 공지등록'
  });
});


router.post('/new', function(req, res, next) {
    var da = {
        notice_title: req.body.title,
        notice_text: req.body.text,
        admin_idx : 1
    };
    var sql = "insert into notice set ?";
    conn.query(sql, da, function(err, rs) {
        if (err) {
            console.log(err);
            res.json(500, {"result":500});
            return;
        }

        res.json(200, {"result":200});
    });

});


// 공지수정
router.get('/edit/:id', function(req, res, next) {
    var nid = req.params.id;
    var sql = "select * from notice where notice_idx=?";
    conn.query(sql, nid, function(err, row) {
        if (err) {
            res.json(500, {"result":500});
            return;
        }
        res.render('manager/index', {
            view: 'notice/edit',
            title: '공지사항 수정',
            notice: row[0]
        });
    })//conn
});

// 공지수정
router.post('/edit/:id', function(req, res, next) {
    var nid = req.params.id;
    var da = [
            req.body.title,
            req.body.text,
            nid
    ];
    var sql = "update notice set notice_title=?, notice_text=? where notice_idx=?";
    conn.query(sql, da, function(err, row) {
        if (err) {
            res.json(500, {"result":500});
            return;
        }
        res.json(200, {"result":200});
    })//conn
});


// 공지상세
router.get('/:id', function(req, res, next) {
    var nid = req.params.id;
    var sql = "select * from notice where notice_idx=?";
    conn.query(sql, nid, function(err, row) {
        if (err) {
            res.json(500, {"result":500});
            return;
        }

        res.render('manager/index', {
            view: 'notice/detail',
            title: '관리자모드>공지상세',
            notice: row[0]
        });
    })//conn

});


// 공지상세
router.delete('/:id', function(req, res, next) {
    var nid = req.params.id;
    var sql = "delete from notice where notice_idx=?";
    conn.query(sql, nid, function(err, row) {
        if (err) {
            res.json(500, {"result":500});
            return;
        }

        res.json(200, {"result":200});
    })//conn

});








module.exports = router;
