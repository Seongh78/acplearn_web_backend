/*
Router : /notices

*/

var express = require('express');
var router = express.Router();
var conn = require('./common/dbconn').connection;

// 기업관리
router.get('/', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'기업목록' , view: 'apl/lecture/company', page:'/company' });
});

router.get('/new', function(req, res, next) {
    res.render('index', {title:'신규 기업등록', view: 'apl/lecture/company_new', page: '/company'})
});

// 기업관리 상세
router.get('/:id', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'기업 상세정보' , view: 'apl/lecture/company_detail', page:'/company' });
});
module.exports = router;
