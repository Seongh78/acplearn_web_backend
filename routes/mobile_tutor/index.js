var express = require('express');
var router = express.Router();

// 메인페이지 - 진행강의
router.get('/', function(req, res, next) {
  res.render('mobile_tutor/index', { tab: '진행강의', view:'main' });
});


//  종료강의
router.get('/end', function(req, res, next) {
  res.render('mobile_tutor/index', { tab: '종료강의', view:'endLecture' });
});


//  강의일정
router.get('/schedule', function(req, res, next) {
  res.render('mobile_tutor/index', { tab: '강의일정', view:'schedule' });
});

//  강의상세
router.get('/schedule/detail', function(req, res, next) {
  res.render('mobile_tutor/index', { tab: '강의일정', view:'schedule/detail' });
});

module.exports = router;
