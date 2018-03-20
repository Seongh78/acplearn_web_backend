// 관리자 - APL강의


var express = require('express');
var router = express.Router();
var conn = require('./../common/dbconn').connection;



// APL강의 목록
router.get('/', function(req, res, next) {
    var q = "select * from apl_recruitment order by rec_date desc";
    conn.query(q, function(e, rows) {
        res.render('manager/index', {
            view: 'aplecture/aplectures',
            title: '관리자모드>APL 강의',
            rec: rows
        });
    });
});




// APL강의 개설
router.get('/new', function(req, res, next) {
  res.render('manager/index', {
      view: 'aplecture/new',
      title: '관리자모드>APL 강의'
  });
});
// APL강의 개설
router.post('/new', function(req, res, next) {
    var q = "insert into apl_recruitment set ?";
    conn.query(q, req.body, function(err) {
        if (err) {
            console.log(err);
            return res.send(500, {result:err});
        }
        res.send(200, {result:req.body});
    })//conn
});



// APL강의 상세
router.get('/:id', function(req, res, next) {
    var rec_id = req.params.id;
    var q = "select * from apl_recruitment where rec_idx=?";

    conn.query(q, rec_id, function(e, row) {
        if (e) {
            console.log(e);
            return res.send(500, {result:e});
        }

        res.render('manager/index', {
            view: 'aplecture/detail',
            title: '관리자모드>APL 강의상세보기',
            apl: row[0]
        });
    });//conn

});









module.exports = router;
