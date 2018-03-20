/*
Router : /aplectures

*/
var express = require('express');
var router = express.Router();
var conn = require('./common/dbconn').connection;




// 내강의
router.get('/', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/lectures', page:'/lectures' });
});
// 현황
router.get('/status', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/lectures', page:'/status' });
});
// 승인중
router.get('/waiting', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/lectures_waiting', page:'/waiting' });
});
// 개설중
router.get('/open', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/lectures_open', page:'/open' });
});
// 템플릿 - 강의안
router.get('/template', function(req, res, next) {
  res.render('index', { title:'강의안관리' , view: 'apl/lecture/template', page:'/lectures/template' });
});
// 템플릿 - 시간표
router.get('/template_timetable', function(req, res, next) {
  res.render('index', { title:'강의안관리' , view: 'apl/lecture/template_timetable', page:'/lectures/template' });
});
// 강의안상세
router.get('/template/:id', function(req, res, next) {
  res.render('index', { title:'강의안상세' , view: 'apl/lecture/template_detail', page:'/lectures/template' });
});
// 시간표상세
router.get('/template_timetable/:id', function(req, res, next) {
  res.render('index', { title:'강의안상세' , view: 'apl/lecture/template_timetable_detail', page:'/lectures/template' });
});


//
router.get('/company/:id', function(req, res, next) {
    // var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/company_detail', page:'/company' });
});
// 강의등록
router.get('/new/:id', function(req, res, next) {
    var id = req.params.id;
    // console.log(id);
    res.render('apl/lecture/new', { title:'강의상세' , selector:id });
});
// 강의상세
router.get('/detail/:id', function(req, res, next) {
    var id = req.params.id;
  res.render('index', { title:'강의상세' , view: 'apl/lecture/detail', page:'/status' });
});


module.exports = router;
