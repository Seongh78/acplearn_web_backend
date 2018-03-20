var express = require('express');
var router = express.Router();
var passport = require('passport');

var LocalStrategy = require('passport-local').Strategy;
var conn = require('./common/dbconn').connection;
var ensureAuthenticated = require('./common/passport').ensureAuthenticated;
var isAuth = require('./common/passport').isAuth;
var request = require('request');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/logout', function(req, res, next) {
    req.logout();
    res.redirect('/');
});


// Id Check
router.get('/confirm/:id', function(req, res, next) {
    var id = req.params.id;
    var sql = "select count(*) as count from tutor where tutor_id=?";

    conn.query(sql, id, function(err, row) {
        if (err) {
            res.status(500).send({
                result: "Error",
                msg: err
            });
            console.log(err);
            return;
        }
        if (row[0].count > 0) {
            res.status(200).send({result: 200});
        }else{
            res.status(200).send({result: 204});
        }

    });
});

// New tutor
router.post('/new', function(req, res, next) {
    var inputData = [
        req.body.id,
        req.body.pw,
        req.body.name,
        req.body.phone,
        req.body.gender
    ];

    var sql = "INSERT INTO `tutor` SET tutor_id=?, tutor_pw=?, tutor_name=?, tutor_phone=?, tutor_gender=?";
    conn.query(sql, inputData, function(err, rs) {
        if (err) {
            res.status(500).send({
                result: "Error",
                msg: err
            });
            return;
        }
        res.status(200).send({
            result: "Success"
        });
    });
});



router.get('/session', isAuth, function(req, res, next) {
    // deserializeUser에서 추가로 저장한 정보까지 전달 받음
    var userInfo = req.user;
    // console.log(req.session.passport);
    res.json({
        type : 'info',
        message : 'session OK!',
        admin : userInfo
    });
});


router.post('/login', function(req, res, next) {
    // "login" LocalStrategy
    passport.authenticate('login', function(err, user, info) {
        if (err) { next(err); }

        if (!user) {
            res.json({
                type : 'info',
                message : 'fail'
            });
            return;
        }
        req.logIn(user, function(err) {
            if (err) { next(err); }

            // res.status(200);
            res.json({
                    type : 'info',
                    message : 'success'
            });
            return;
        });
    })(req, res, next);
});







// 카카오 로그인
router.get('/auth/kakao', passport.authenticate('kakao', {
    successRedirect: '/users/login/kakao',
    failureRedirect: '/login'
}));
// 카카오 콜백
router.get('/login/kakao', passport.authenticate('kakao', {
    successRedirect: '/',
    failureRedirect: '/login'
}));



// 페이스북 로그인
router.get('/auth/facebook', passport.authenticate('facebook', {
    successRedirect: '/users/login/facebook',
    failureRedirect: '/login'
}));
// 페이스북 콜백
router.get('/login/facebook', passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/login'
}));



// 네이버 로그인
router.get('/auth/naver', passport.authenticate('naver', {
    successRedirect: '/users/login/naver',
    failureRedirect: '/login'
}));
// 네이버 콜백
router.get('/login/naver', passport.authenticate('naver', {
    successRedirect: '/',
    failureRedirect: '/login'
}));




// 네이버 콜백
router.get('/get', (req,res,next)=>{
    res.status(200).send({data:1})
});








module.exports = router;
