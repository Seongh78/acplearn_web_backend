var express = require('express');
var router = express.Router();

// 메인페이지
router.get('/', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'MY PLAN', view:'main' });
});

// 인트로
router.get('/intro', function(req, res, next) {
  res.render('mobile_user/intro', { tab: '진행강의', view:'main' });
});

// 회원가입
router.get('/join', function(req, res, next) {
  res.render('mobile_user/join', { tab: '진행강의', view:'main' });
});
// 추가정보
router.get('/join_add', function(req, res, next) {
  res.render('mobile_user/join_add', { tab: '진행강의', view:'main' });
});
// 인증
router.get('/auth', function(req, res, next) {
  res.render('mobile_user/auth', { tab: '진행강의', view:'main' });
});

// 로그인
router.get('/login', function(req, res, next) {
  res.render('mobile_user/login', { tab: '진행강의', view:'main' });
});


// myplan detail
router.get('/myplan/detail', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'MY PLAN', view:'myplan/detail' });
});
// self detail
router.get('/myplan/detail_self', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'MY PLAN', view:'myplan/detail_self' });
});

// planchee
router.get('/planchee', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'PLANCHEE', view:'planchee/planchee' });
});
// planchee - detail
router.get('/planchee/detail', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'PLANCHEE', view:'planchee/detail' });
});
// planchee - detail
router.get('/planchee/detail/:id', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'PLANCHEE', view:'planchee/detail2' });
});



// 액션러닝
router.get('/actionplan', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'ACTION PLAN', view:'actionplan/actionplan' });
});
// 액션러닝 - 설계
router.get('/actionplan/design/:id', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'ACTION PLAN', view:'actionplan/design/'+req.params.id });
});



// 액션트레이닝
router.get('/training', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'TRAINING', view:'training/training' });
});
// 액션트레이닝 - 상세
router.get('/training/detail', function(req, res, next) {
  res.render('mobile_user/index', { tab: 'TRAINING', view:'training/detail' });
});



module.exports = router;
