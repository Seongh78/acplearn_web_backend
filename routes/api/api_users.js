var express = require('express');
var router = express.Router();
var passport = require('passport');
var request = require('request');

var LocalStrategy = require('passport-local').Strategy;
var conn = require('../common/dbconn').connection;
var ensureAuthenticated = require('../common/passport').ensureAuthenticated;
var isAuth = require('../common/passport').isAuth;


// Redirect to Front-end
var toFrontUrl = "http://localhost:8080"

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/logout', function(req, res, next) {
    req.logout();
    res.status(200).send({
        result:'success',
        status:200
    })
});


// Id Check
router.get('/confirm/:id', function(req, res, next) {
    var id = req.params.id;
    // console.log("id: ", id);
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
        req.body.email,
        req.body.gender,
        req.body.birthday,
        req.body.company,
        req.body.position,
        req.body.category,
        req.body.career
    ];

    res.send(inputData)
    return

    var sql = "INSERT INTO `tutor`(tutor_id, tutor_pw, tutor_name, tutor_phone, tutor_email,) SET tutor_id=?, tutor_pw=?, tutor_name=?, tutor_phone=?, tutor_gender=?";
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
// router.get('/session', isAuth, function(req, res, next) {
    // deserializeUser에서 추가로 저장한 정보까지 전달 받음
    var userInfo = req.user;
    delete userInfo.user.tutor_pw

    res.json({
        type : 'info',
        message : 'session OK!',
        admin : userInfo
    });
});


router.get('/sess',  function(req, res, next) {

    passport.authenticate('login', function(err, user, info) {
        if (err) {
            console.log(err);
            next(err);
        }
        if (!user) {
            res.status(500).json({
                type : 'info',
                message : 'fail'
            });
            return;
        }
        req.logIn(user, function(err) {
            if (err) { next(err); }

            console.log(user);
            res.status(200).json({
                    type : 'info',
                    message : 'success'
            });
            return;
        });
    })(req, res, next);
});


router.post('/login', function(req, res, next) {
    passport.authenticate('login', function(err, user, info) {
        if (err) {
            console.log(err);
            next(err);
        }
        if (!user) {
            res.status(500).json({
                type : 'info',
                message : 'fail'
            });
            return;
        }
        req.logIn(user, function(err2) {
            if (err) {
                console.log(err2);
                next(err);
            }

            res.status(200).json({
                    type : 'info',
                    message : 'success',
                    user
            });
            return;
        });
    })(req, res, next);
});







// 카카오 로그인
router.get('/auth/kakao', passport.authenticate('kakao', {
    successRedirect: '/api/users/login/kakao',
    failureRedirect: toFrontUrl+'/login'
}));
// 카카오 콜백
router.get('/login/kakao', passport.authenticate('kakao', {
    successRedirect: toFrontUrl+'/',
    failureRedirect: toFrontUrl+'/login'
}));



// 페이스북 로그인
router.get('/auth/facebook', passport.authenticate('facebook', {
    successRedirect: '/api/users/login/facebook',
    failureRedirect: toFrontUrl+'/login'
}));
// 페이스북 콜백
router.get('/login/facebook', passport.authenticate('facebook', {
    successRedirect: toFrontUrl+'/',
    failureRedirect: toFrontUrl+'/login'
}));



// 네이버 로그인
router.get('/auth/naver', passport.authenticate('naver', {
    successRedirect: '/api/users/login/naver',
    failureRedirect: toFrontUrl+'/login'
}));
// 네이버 콜백
router.get('/login/naver', passport.authenticate('naver', {
    successRedirect: toFrontUrl+'/',
    failureRedirect: toFrontUrl+'/login'
}));




// 자동로그인
router.get('/autologin', (req,res,next)=>{
    request.post('http://localhost:3000/api/users/login', {id:'admin',pw:'123123'}, ()=>{
        res.send(200, {a:1})
    })

});








module.exports = router;
