/*
Router : /companies

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var passport = require('passport');

var LocalStrategy = require('passport-local').Strategy;
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');






// ====== 관리자 로그인 ====== //
router.post('/login', function(req, res, next) {
    passport.authenticate('adminLogin', function(err, user, info) {
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
                    message : 'success'
            });
            return;
        });
    })(req, res, next);
});
// ====== 관리자 로그인 ====== //













module.exports = router;
