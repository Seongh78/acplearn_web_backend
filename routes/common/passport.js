
module.exports = {
        ensureAuthenticated: function(req, res, next) {
            // 현재 이 유효한 세션인가?
            if (req.isAuthenticated()) {
                return next();
            }
            // 유효하지 않은 경우
            // res.status(401);
            res.redirect('/login');
        },
        iis: function(req, res, next){
            if (req.isAuthenticated()) {
                return next();
            }
            // 유효하지 않은 경우
            res.send(204, {});
        },
        isAuth: function(req, res, next){
            if (req.isAuthenticated()) {
                return next();
            }
            // 유효하지 않은 경우
            res.send(401, { status:401, message: '권한이 필요합니다'});
        },
        isAdmin: function(req, res, next) {
            var u = req.session.passport;
            console.log("U: ",req.session.passport);
            if (u.user.admin_idx != undefined) {
                console.log('admin');
                return next();
            }
            res.redirect('/');
        },

        // 관리자 권한검사
        isAuthenticatedAdmin: function(req, res, next) {
            var u = req.session.passport;
            // console.log("U: ",req.session.passport);
            if (u!==undefined && u.user.tutor_id==='admin') {
                console.log('admin');
                return next();
            }
            // 유효하지 않은 경우
            res.send(401, {});
        }

};

// function ensureAuthenticated(req, res, next) {
//     // 현재 이 유효한 세션인가?
//     if (req.isAuthenticated()) {
//         return next();
//     }
//     // 유효하지 않은 경우
//     res.status(401);
//     res.json({});
// }
