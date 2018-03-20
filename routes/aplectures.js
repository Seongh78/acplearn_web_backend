/*
Router : /aplectures

*/

var express = require('express');
var router = express.Router();
var conn = require('./common/dbconn').connection;


// 강의
router.get('/', function(req, res, next) {
  res.render('index', { title:'수강신청' , view: 'apl/aplecture/aplectures', page:'/aplectures' });
});
// 수강신청내역
router.get('/application', function(req, res, next) {
  res.render('index', { title:'수강신청' , view: 'apl/aplecture/aplectures', page:'/application' });
});
// 수료내역
router.get('/complete', function(req, res, next) {
  res.render('index', { title:'수강신청' , view: 'apl/aplecture/aplectures', page:'/complete' });
});
// 강의상세보기
router.get('/detail/:id', function(req, res, next) {
    var id = req.params.id;
    res.render('index', { title:'강의상세' , view: 'apl/aplecture/detail', page:'/application' });
});


router.get('/:page/:id', function(req, res, next) {
    var page = req.params.page;
    var id = req.params.id;
    res.render('home_aplecture_'+page, { title:'수강신청' , view: 'home_aplecture_application', page:'/application', selector:page });
});



module.exports = router;
