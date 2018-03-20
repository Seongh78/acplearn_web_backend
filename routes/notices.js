/*
Router : /notices

*/

var express = require('express');
var router = express.Router();
var conn = require('./common/dbconn').connection;

// 공지사항
router.get('/', function(req, res, next) {
    var sql = "select * from notice order by notice_date desc LIMIT 0, 10";
    conn.query(sql, function(err, rows) {
        if (err) {
            res.json(500, {"result":500});
            return;
        }

        res.render('index', { title:'공지사항', view: 'apl/notice/notices', page:'/notices', notices: rows });
    })//conn

});
// 공지사항 상세
router.get('/:id', function(req, res, next) {
    var id = req.params.id;
  res.render('index', { title:'공지사항', view: 'apl/notice/detail', page:'/notices' });
});

module.exports = router;
