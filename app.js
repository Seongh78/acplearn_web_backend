var express              = require('express');
var path                   = require('path');
var favicon               = require('serve-favicon');
var logger                = require('morgan');
var cookieParser      = require('cookie-parser');
var bodyParser         = require('body-parser');
var session               = require('express-session');
var cors                     = require('cors');
var conn                   = require('./routes/common/dbconn').connection;
var pool                    = require('./routes/common/dbconn').connectionPool; // 풀링방식
var fileUpload           = require('express-fileupload');

// Passport
var passport                         = require('passport');
var LocalStrategy                 = require('passport-local').Strategy;
var ensureAuthenticated     = require('./routes/common/passport').ensureAuthenticated;
var isAdmin     = require('./routes/common/passport').isAdmin;
var isAuth     = require('./routes/common/passport').isAuth;

// 소셜로그인 - 패스포트
var KakaoStrategy       = require('passport-kakao').Strategy;
var NaverStrategy        = require('passport-naver').Strategy;
var FacebookStrategy  = require('passport-facebook').Strategy;






// API Router
var index          = require('./routes/index');
var labs            = require('./routes/api/test/testApi'); // 테스트

var api_notices          = require('./routes/api/api_notices');
var api_recruitment          = require('./routes/api/api_recruitment');
var api_companies         = require('./routes/api/api_companies');
var api_lectures              = require('./routes/api/api_lectures');
var api_users                  = require('./routes/api/api_users');
var api_templates          = require('./routes/api/api_templates');
var api_students            = require('./routes/api/api_students');
var api_administrator    = require('./routes/api/api_administrator');
var api_actionplan    = require('./routes/api/api_actionplan');
var api_comments    = require('./routes/api/api_comments');




// Express
var app = express();



// view engine setup
app.engine('ejs', require('express-ejs-extend'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// 크로스도메인 처리
app.use(cors({
    origin:[ // 허용할 도메인
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3333',
        'http://www.actiongo.co.kr/',
        'http://www.actiongo.co.kr/login'
    ],
    methods:["GET","POST","PUT", "DELETE"], // 허용 메소드
    credentials: true // enable set cookie
  }));

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('(ip) :remote-addr   (method) :method    (date) :date    (url) :url'), function(req,res,next) { next(); });

// app.use(logger('common'), function(req,res,next) { next(); }); //# 로깅
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(fileUpload());
app.use(express.static(path.join(__dirname, 'public')));





// Passport middleware
app.use(session({
    secret: 'seongh_@wkascmlkxmlkxcx;',
    key:'acce',
    resave: false,
    saveUninitialized: true,//저장 시 초기화 여부
    // store:store,//세션저장할곳
    cookie:{
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly:true
    }
}));
app.use(passport.initialize());
app.use(passport.session());

app.use(function(req, res, next) {
    res.locals.user = req.session.passport;
    next();
});







// Web ver

// app.use('/users',           users);
// app.use('/notices',        notices);
// app.use('/aplectures',   aplectures);
// app.use('/lectures',       ensureAuthenticated, lectures);
// app.use('/company',     ensureAuthenticated, company);


// Manager module
// app.use('/manager',                          isAdmin, manager);
// app.use('/manager/notices',             isAdmin, manager_notices);
// app.use('/manager/aplectures',        isAdmin, manager_aplectures);


// Mobile ver
// app.use('/m/tutor',       mobile_tutor);
// app.use('/m/user',        mobile_user);


// API
app.use('/api/notices',                  api_notices) //

app.use('/api/recruitment',          api_recruitment) //
app.use('/api/companies',           isAuth,   api_companies) // 기업 api
app.use('/api/templates',             isAuth,   api_templates) // 템플릿 api
app.use('/api/students',               isAuth,   api_students) // 수강생 api
app.use('/api/admin',                   api_administrator) // 수강생 api

app.use('/api/lectures',                isAuth, api_lectures)
app.use('/api/users',                    api_users)
app.use('/api/plans',                    api_actionplan)
app.use('/api/comments',           api_comments) // 피드백/코멘트 관리

app.use('/labs',                    labs)
app.use('/',                    index)



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});



// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  // console.log("res.locals.mm");
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};


// next()

  // render the error page
  res.status(err.status || 500);
  res.render('error', {page:'error'});
});



/*
# Passport Setting
*/

// Passport - Login - 관리자
passport.use('adminLogin', new LocalStrategy({ // "login"이라는 LocalStrategy를 생성
        usernameField : 'id',
        passwordField : 'pw',
        passReqToCallback : true, // 콜백 함수에 req 객체를 넘길지 여부
    },
    function(req, id, password, done) {
        // console.log("ID: ", id);
        // console.log("PW: ", password);
        var sql = "select * from admin where admin_id=? and admin_pw=?";
        pool.getConnection((er, connection)=>{
            connection.query(sql, [id, password], function(err, row) {
                connection.release()
                if (err) {
                    console.log(err);
                    return done(null, false);
                }
                // console.log(row[0]);
                userInfo = row[0];
                return done(null, userInfo);
            }) // connection
        })// pool
    }
));





// Passport - Login - 일반유저
passport.use('login', new LocalStrategy({ // "login"이라는 LocalStrategy를 생성
        usernameField : 'id',
        passwordField : 'pw',
        passReqToCallback : true, // 콜백 함수에 req 객체를 넘길지 여부
    },
    function(req, id, password, done) {
        // console.log("ID: ", id);
        // console.log("PW: ", password);
        var sql = "select * from tutor where tutor_id=? and tutor_pw=PASSWORD(?)";

        pool.getConnection((er, connection)=>{
            connection.query(sql, [id, password], function(err, row) {
                connection.release()
                if (err) {
                    console.log(err);
                    return done(null, false);
                }
                // console.log(row[0]);
                userInfo = row[0];
                return done(null, userInfo);
            }) // connection
        })// pool
    }
));





// Passport - kakao
passport.use('kakao', new KakaoStrategy({
        clientID: '0a81168a495db9feef652c1d18f43307',
        clientSecret:'2LvEwuPzq5kj2sDxgfC1BP51qzDREl5x',
        callbackURL: '/api/users/login/kakao'
    },
    function(accessToken, refreshToken, profile, done){
        console.log('REF::: ',refreshToken);
        var sql = "select * from tutor where tutor_id=?"; // 유저확인 쿼리
        var usr = [ // 프로필
            profile._json.kaccount_email,
            profile.username,
            profile._json.kaccount_email,
            'kakao'
        ];

        //기존 유저 확인
        pool.getConnection((er, connection)=>{
            connection.query(sql, usr[0], function(err, row) {
                if (err) {
                    connection.release()
                    return err;
                }

                // 신규유저
                if (row[0]===undefined) {
                    // console.log("신규!");
                    // console.log(usr);
                    sql = "insert into tutor set tutor_id=?, tutor_pw='', tutor_name=?, tutor_email=?, tutor_type=?";
                    connection.query(sql, usr, function(err2) {
                        connection.release()
                        if (err2) {
                            console.log(err2);
                            return err2;
                        }
                    });//conn

                    return done(null, {
                        tutor_id: usr[0],
                        tutor_name: usr[1],
                        tutor_type: usr[3]
                    });
                }//if

                return done(null, row[0]);
            });//conn
        })// pool


    }
));

// Passport - naver
passport.use('naver', new NaverStrategy({
        clientID: 'JZ_cnvqSBdi9Vjg5AEwH',
        clientSecret: 'lTWD8w1Xii',
        callbackURL: '/api/users/login/naver'
    },function(accessToken, refreshToken, profile, done) {
        console.log('NAVER!!');
        var sql = "select * from tutor where tutor_id=?"; // 유저확인 쿼리
        var usr = [ // 프로필
            profile.id,
            profile.displayName,
            profile._json.email,
            profile._json.profile_image,
            'naver'
        ];

        //기존 유저 확인
        pool.getConnection((er, connection)=>{
            connection.query(sql, usr[0], function(err, row) {
                if (err) {
                    connection.release()
                    return err;
                }
                // 신규유저
                if (row[0]===undefined) {
                    // console.log("신규!");
                    sql = "insert into tutor set tutor_id=?, tutor_pw='', tutor_name=?, tutor_email=?, tutor_img=?, tutor_type=?";
                    connection.query(sql, usr, function(err2) {
                        connection.release()
                        if (err2) {
                            console.log(err2);
                            return err2;
                        }

                    });//connection
                    return done(null, {
                        tutor_id: usr[0],
                        tutor_name: usr[1],
                        tutor_img: usr[3],
                        tutor_type: usr[4]
                    });
                }//if
                return done(null, row[0]);
            });//connection
        })// pool

    }
));

// Passport - facebook
passport.use('facebook', new FacebookStrategy({
        clientID: '206951953184440',
        clientSecret: '06e36f053103507bd2693b7fd1d7a3a9',
        callbackURL: '/api/users/login/facebook'
    },function(accessToken, refreshToken, profile, cb) {
        var sql = "select * from tutor where tutor_id=?"; // 유저확인 쿼리
        var usr = [ // 프로필
            profile.id,
            profile._json.name,
            'facebook'
        ];

        //기존 유저 확인
        pool.getConnection((er, connection)=>{
            connection.query(sql, usr[0], function(err, row) {
                if (err) {
                    connection.release()
                    return err;
                }
                // 신규유저
                if (row[0]===undefined) {
                    // console.log("신규!");
                    sql = "insert into tutor set tutor_id=?, tutor_pw='', tutor_name=?,  tutor_type=?";
                    connection.query(sql, usr, function(err2) {
                        connection.release()
                        if (err2) {
                            console.log(err2);
                            return err2;
                        }

                    });//connection
                    return cb(null, {
                        tutor_id: usr[0],
                        tutor_name: usr[1],
                        tutor_type: usr[2]
                    });
                }//if
                return cb(null, row[0]);
            });//connection
        })// pool
    }
));



passport.serializeUser(function(user, done) {
    // LocalStrategy에서 받은 userInfo 정보를 session에 정보 저장
    done(null, user);
});
passport.deserializeUser(function(user, done) {
    // 세션에 따라 많은 정보가 필요한 경우
    // serializeUser에서 중요 정보만 session에 저장 후
    // deserializeUser에서 DB 등에서 정보를 요청하여 추가 정보를 전달 하도록 함
    const userInfo = {
            user, // serializeUser에서 session에 저장한 정보
            info : 'test message' // deserializeUser에서 추가로 저장한 정보
        };
    done(null, userInfo);
});

//passport





module.exports = app;
