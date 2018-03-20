var express = require('express');
var router = express.Router();
var LocalStrategy = require('passport-local').Strategy;
var conn = require('./common/dbconn').connection;
// var ensureAuthenticated = require('./common/passport').ensureAuthenticated;


// 메인
router.get('/', function(req, res, next) {
    res.send(200, {result: 'success', message:'Hello World~'})
});


// Vue Router Test
router.get('/vue', function(req, res, next) {
  res.render('vueRouter', { title:'Acplean' });
});

//
//
//
// // 메인
// router.get('/home', function(req, res, next) {
//     if (!req.isAuthenticated()) {
//         res.redirect('/');
//         return;
//     }
//   res.render('home2', { title:'Acplean', view: 'apl/main', page:'home2'  });
// });
// // 메인 - 수강목록
// router.get('/home_aplecture', function(req, res, next) {
//   res.render('home_aplecture', { title:'Acplean', view: 'apl/main', page:'home_aplecture'  });
// });
// // 메인 - 수강목록 - 상세
// router.get('/home_aplecture_detail', function(req, res, next) {
//   res.render('home_aplecture_detail', { title:'Acplean', view: 'apl/main', page:'home_aplecture_detail'  });
// });
//
//
// // 로그인
// router.get('/login', function(req, res, next) {
//   res.render('login', { title:'Acplean', view: 'apl/main', page:''  });
// });
// // 서비스소개
// router.get('/intro', function(req, res, next) {
//   res.render('intro', { title:'Acplean', view: 'guide', page:''  });
// });
// // 이용안내
// router.get('/guide', function(req, res, next) {
//   res.render('guide', { title:'Acplean', view: 'guide', page:''  });
// });
// // 회원가입_약관
// router.get('/join_agree', function(req, res, next) {
//   res.render('join_agree', { title:'Acplean', view: 'apl/main', page:''  });
// });
// // 회원가입
// router.get('/join', function(req, res, next) {
//   res.render('join', { title:'Acplean', view: 'apl/main', page:''  });
// });
// // 내정보
// router.get('/profile', function(req, res, next) {
//   res.render('index', { title:'Acplean', view: 'apl/profile', page:''  });
// });
//
//
// // // 대시보드
// // router.get('/dashboard', function(req, res, next) {
// //     // var id = req.params.id;
// //   res.render('index', { title:'강의상세' , view: 'apl/dashboard' });
// // });
// //
//
//
// // 대시보드
// router.get('/dashboard_non', function(req, res, next) {
//   res.render('index', { title:'공지사항', view: 'apl/dashboard_non', page:'/dashboard_non' });
// });
// // 수강내역
// router.get('/application_non', function(req, res, next) {
//   res.render('index', { title:'공지사항', view: 'apl/application_non', page:'/dashboard_non' });
// });
// // 수강신청 상세
// router.get('/detail_non/:id', function(req, res, next) {
//   res.render('index', { title:'공지사항', view: 'apl/aplecture/detail_non', page:'/detail_non' });
// });
// // 대시보드
// router.get('/dashboard', function(req, res, next) {
//   res.render('index', { title:'공지사항', view: 'apl/dashboard', page:'/dashboard' });
// });
//
//
//
//
//
// router.get('/test', function(req,res,next) {
//         res.render('test/vue', {
//             view: 'test/vue',
//             title: '관리자모드>APL 강의'
//         });
// })













module.exports = router;
