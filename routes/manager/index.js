var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    console.log(req.session.user);
  res.render('manager/index', {
      view: 'main',
      title: '관리자모드'
  });
});







// Tutor
router.get('/tutors', function(req, res, next) {
  res.render('manager/index', {
      view: 'tutor/tutors',
      title: '관리자모드>APL 강사목록'
  });
});
// Tutor
router.get('/tutors/:id', function(req, res, next) {
  res.render('manager/index', {
      view: 'tutor/tutors_'+req.params.id,
      title: '관리자모드>APL 강사목록'
  });
});







// Tutor
router.get('/completes', function(req, res, next) {
  res.render('manager/index', {
      view: 'complete/completes',
      title: '관리자모드>APL수료 관리'
  });
});
// Tutor
router.get('/completes/detail/:id', function(req, res, next) {
  res.render('manager/index', {
      view: 'complete/detail',
      title: '관리자모드>APL수료 관리'
  });
});



// Tutor
router.get('/admins', function(req, res, next) {
  res.render('manager/index', {
      view: 'admins',
      title: '관리자모드>APL수료 관리'
  });
});


// activity
router.get('/activity', function(req, res, next) {
  res.render('manager/index', {
      view: 'activity/activity',
      title: ''
  });
});
// Activity 승인관리
router.get('/activity/:id', function(req, res, next) {
  res.render('manager/index', {view: 'activity/activity_'+req.params.id});
});










module.exports = router;
