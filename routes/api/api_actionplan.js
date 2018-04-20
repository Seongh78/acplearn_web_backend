/*
Router : /api/plans/

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var isAuth     = require('../common/passport').isAuth;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');





/*

Route : "/api/plans/"


API 목록

[액션플랜 상세보기]
/detail/:lap_idx

[진행데이터 - (점수, 피드 등)]
/score/:lec_idx?_filter=

[강의별 액션플랜]
/:lec_idx

[개별 플랜목록]
/:lec_idx/:stu_idx




*/






// ====== 액션플랜 상세보기 ====== //
router.get('/detail/:lap_idx', isAuth, (req,res,next)=>{
    var lap_idx = req.params.lap_idx

    // 액션플랜 상세보기 - lap_grader : 평가인원
    var sql = `
    SELECT *
    FROM lecture_action_plan LAP

   	LEFT JOIN lecture_kpi LK
	ON LAP.lk_idx=LK.lk_idx

	LEFT JOIN capability_category2 CC2
	ON LK.cc2_idx=CC2.cc2_idx

	WHERE LAP.lap_idx=?
    `
    var lacSQL = `
    SELECT
        LAC.lac_score,
        LAC.lac_flag,
        LAC.lac_date
    FROM
        lecture_acplearn_check LAC
    WHERE
        LAC.lap_idx = ?
    `

    pool.getConnection((er, connection)=>{
        connection.query(sql, [lap_idx], (sqlErr, sqlResult)=>{
            if ( sqlErr ) {
                connection.release()
                console.log(sqlErr);
                res.send(500, {result:'error'})
                return
            }

            connection.query(lacSQL, [lap_idx], (lacErr, lacResult)=>{
                if ( lacErr ) {
                    connection.release()
                    console.log(lacErr);
                    res.send(500, {result:'error'})
                    return
                }

                connection.release()
                res.send(200, {
                    result: 'success',
                    plan : sqlResult[0],
                    scores : lacResult
                }) // res

            }) //lac - conn
        })// lap - conn
    }) // pool
})
// ====== 액션플랜 상세보기 ====== //












// ====== 부서별 ====== //
router.get('/score/departments/:lec_idx/:value', (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var value         = req.params.value // 찾을값


    var sql =  `
        SELECT
        	DATE_FORMAT(LAD1.lad_date, '%m-%d') as lad_date ,
            (
        		SELECT
        			AVG(LAC.lac_score)

        		FROM
        			lecture_acplearn_check LAC,
        			lecture_action_plan LAP,
        			lecture_session LS,
        			lecture_acplearn_day LAD,
        			registration R

        		WHERE
        			LS.lec_idx = LS1.lec_idx AND
        			LS.lec_idx = R.lec_idx AND
        			LS.ls_idx = LAD.ls_idx AND
        			R.stu_idx = LAD.stu_idx AND
        			R.stu_department = ? AND
        			LAD.lad_idx = LAC.lad_idx AND
        			LAP.lap_idx = LAC.lap_idx AND
        			LAC.lac_date=LAD1.lad_date AND
        			LAC.lac_flag = 'self'
        	) as avgSelfScore,
        	(
        		SELECT
        			AVG(LAC.lac_score)

        		FROM
        			lecture_acplearn_check LAC,
        			lecture_action_plan LAP,
        			lecture_session LS,
        			lecture_acplearn_day LAD,
        			registration R

        		WHERE
        			LS.lec_idx = LS1.lec_idx AND
        			LS.lec_idx = R.lec_idx AND
        			LS.ls_idx = LAD.ls_idx AND
        			R.stu_idx = LAD.stu_idx AND
        			R.stu_department = ? AND
        			LAD.lad_idx = LAC.lad_idx AND
        			LAP.lap_idx = LAC.lap_idx AND
        			LAC.lac_date=LAD1.lad_date AND
        			LAC.lac_flag = 'others'
        	) as avgOthersScore

        FROM
        	lecture_session LS1,
        	lecture_acplearn_day LAD1

        WHERE
        	LS1.lec_idx = ? AND
        	LS1.ls_idx = LAD1.ls_idx

        GROUP BY LAD1.lad_date
    `

    pool.getConnection((er,connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, [value, value, lec_idx], (err , departmentsResult)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {reuslt:err})
                return
            }
            res.send(200 , { score:departmentsResult })
        })
    })// pool

})
// ====== 부서별 ====== //










// ====== 직급별 ====== //
router.get('/score/position/:lec_idx/:value', (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var value         = req.params.value // 찾을값


    var sql =  `
        SELECT
        	DATE_FORMAT(LAD1.lad_date, '%m-%d') as lad_date ,
            (
        		SELECT
        			AVG(LAC.lac_score)

        		FROM
        			lecture_acplearn_check LAC,
        			lecture_action_plan LAP,
        			lecture_session LS,
        			lecture_acplearn_day LAD,
        			registration R

        		WHERE
        			LS.lec_idx = LS1.lec_idx AND
        			LS.lec_idx = R.lec_idx AND
        			LS.ls_idx = LAD.ls_idx AND
        			R.stu_idx = LAD.stu_idx AND
        			R.stu_position = ? AND
        			LAD.lad_idx = LAC.lad_idx AND
        			LAP.lap_idx = LAC.lap_idx AND
        			LAC.lac_date=LAD1.lad_date AND
        			LAC.lac_flag = 'self'
        	) as avgSelfScore,
        	(
        		SELECT
        			AVG(LAC.lac_score)

        		FROM
        			lecture_acplearn_check LAC,
        			lecture_action_plan LAP,
        			lecture_session LS,
        			lecture_acplearn_day LAD,
        			registration R

        		WHERE
        			LS.lec_idx = LS1.lec_idx AND
        			LS.lec_idx = R.lec_idx AND
        			LS.ls_idx = LAD.ls_idx AND
        			R.stu_idx = LAD.stu_idx AND
        			R.stu_position = ? AND
        			LAD.lad_idx = LAC.lad_idx AND
        			LAP.lap_idx = LAC.lap_idx AND
        			LAC.lac_date=LAD1.lad_date AND
        			LAC.lac_flag = 'others'
        	) as avgOthersScore

        FROM
        	lecture_session LS1,
        	lecture_acplearn_day LAD1

        WHERE
        	LS1.lec_idx = ? AND
        	LS1.ls_idx = LAD1.ls_idx

        GROUP BY LAD1.lad_date
    `

    pool.getConnection((er,connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql, [value, value, lec_idx], (err , departmentsResult)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {reuslt:err})
                return
            }
            res.send(200 , { score:departmentsResult })
        })
    })// pool

})
// ====== 직급별 ====== //












// ====== 진행데이터 ====== //
router.get('/score/:lec_idx', isAuth, (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var _filter      = req.query._filter // 분류
    var _value      = req.query._value // 분류

    // 전체 평균 점수데이터
    var avgAllSQL = `
        SELECT
        	date_format(LAD.lad_date , '%m-%d') as lad_date,
        	(
        		SELECT AVG(LAC.lac_score)
        		FROM lecture_acplearn_check LAC
        		WHERE LAC.lac_flag='self' AND LAC.lac_date = LAD.lad_date
        	) as avgSelfScore,
        	(
        		SELECT AVG(LAC.lac_score)
        		FROM lecture_acplearn_check LAC
        		WHERE LAC.lac_flag='others' AND LAC.lac_date = LAD.lad_date
        	) as avgOthersScore

        FROM
        	lecture_session LS,
        	lecture_acplearn_day LAD

        WHERE
        	LS.lec_idx = ?  AND
        	LS.ls_idx = LAD.ls_idx

    	GROUP BY LAD.lad_date `

    // KPI별 통계 -  파라미터 : [ lec_idx , lk_idx , flag ]
    var kpiSQL  = `
        SELECT
            date_format(LAC.lac_date , '%m-%d') as date,
            AVG(LAC.lac_score) as score

            FROM
            	lecture_kpi LK,  	lecture_action_plan LAP, 	lecture_acplearn_check LAC

            WHERE
            	LK.lec_idx = ?  AND
            	LK.lk_idx = ?  AND

            	LK.lk_idx = LAP.lk_idx AND
            	LAP.lap_idx = LAC.lap_idx AND
            	LAC.lac_flag=?

        	GROUP BY lac_date`

    // 그룹별 통계
    var groupSQL = `
    SELECT
    	date_format(LAD.lad_date , '%m-%d') as lad_date,
    	AVG(LAC.lac_score) as avgSelfScore

    FROM
    	\`group\` G,
    	registration R,
    	lecture_acplearn_day LAD

    	LEFT JOIN lecture_acplearn_check LAC
    	ON LAD.lad_idx = LAC.lad_idx

    WHERE
    	G.lec_idx = ? AND
    	G.group_idx=? AND
    	G.group_idx = R.group_idx AND
    	R.stu_idx = LAD.stu_idx AND
    	LAC.lac_flag=?

    	GROUP BY  LAD.lad_date`


    // 부서별 통계
    var departmentSQL = `
    SELECT
    	DATE_FORMAT(LAD1.lad_date, '%m-%d') as lad_date ,
    	(
    		SELECT
    			AVG(LAC.lac_score)

    		FROM
    			lecture_acplearn_check LAC,
    			lecture_action_plan LAP,
    			lecture_session LS,
    			lecture_acplearn_day LAD,
    			registration R

    		WHERE
    			LS.lec_idx = LS1.lec_idx AND
    			LS.lec_idx = R.lec_idx AND
    			LS.ls_idx = LAD.ls_idx AND
    			R.stu_idx = LAD.stu_idx AND
    			R.stu_position = '사원' AND
    			LAD.lad_idx = LAC.lad_idx AND
    			LAP.lap_idx = LAC.lap_idx AND
    			LAC.lac_date=LAD1.lad_date AND
    			LAC.lac_flag = 'self'
    	) as avgOthersScore

    FROM
    	lecture_session LS1,
    	lecture_acplearn_day LAD1

    WHERE
    	LS1.lec_idx = 18 AND
    	LS1.ls_idx = LAD1.ls_idx

    GROUP BY LAD1.lad_date
`

    // 최종 실행 쿼리, 파라미터
    var query='', params=[]


    // 점수데이터 - 배열로 표시
    var selfScore = []
    var otherScore = []
    var gapScore = []


    switch (_filter) {
        case 'kpi':
            params = [lec_idx, _value, 'self']
            query = kpiSQL
            break;
        case 'group':
            params = [lec_idx, _value, 'self']
            query = groupSQL
            break;
        case 'department':
            params = [lec_idx, _value, 'self']
            query = groupSQL
            break;
        default:
            query= avgAllSQL
            params.push(lec_idx)
    }


    // Connection Pool
    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }// er


        connection.query(query, params, (err1, result1)=>{
            if (err1) {
                connection.release()
                console.log(err1);
                res.send(500, {result: 'error'})
                return
            }

            if(_filter === 'kpi' || _filter === 'group' || _filter==='department'){ // kpi인경우
                params[params.length-1] = 'others'
                connection.query(query, params, (err2, result2)=>{
                    connection.release()
                    if (err1) {
                        console.log(err1);
                        res.send(500, {result: 'error'})
                        return
                    }

                    // 응답모델
                    var score =[]
                    for(var rid  in  result1){
                        score.push({
                            lad_date : result1[rid].date,
                            avgSelfScore : result1[rid].score,
                            avgOthersScore : result2[rid].score
                        })
                    }// for

                    res.send(200, { score }) // 응답
                })

            }// if
            else{
                connection.release()
                res.send(200, { score: result1 }) // 응답
            }

        })// 전체 평균점수

    }) // Connection Pool



})
// ====== 진행데이터 ====== //


















// ====== 강의별 액션플랜 불러오기 ====== //
router.get('/:lec_idx', isAuth, (req, res, next)=>{

    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디

    var sql = `
        SELECT
            LAP.lap_idx   as   lap_idx,
            LAP.lap_text   as   lap_text,
            LAP.lk_idx   as   lk_idx,
            LAP.stu_idx   as   stu_idx,
            LS.ls_idx   as   ls_idx,
            LS.ls_seq   as   ls_seq,
            CC2.cc2_name as cc2_name,
            (
            	SELECT AVG(LAC.lac_score)
            	FROM lecture_acplearn_check LAC
            	WHERE LAC.lap_idx = LAP.lap_idx AND LAC.lac_flag='self'
            ) as avgSelfScore,
            (
            	SELECT AVG(LAC.lac_score)
            	FROM lecture_acplearn_check LAC
            	WHERE LAC.lap_idx = LAP.lap_idx AND LAC.lac_flag='others'
            ) as avgSelfScore
        FROM
            lecture_action_plan LAP,
            lecture_session LS,
           	lecture_kpi LK,
           	capability_category2 CC2
        WHERE
	        LS.lec_idx = ?  AND
	        LAP.ls_idx = LS.ls_idx  AND
	        LAP.lk_idx = LK.lk_idx  AND
	        LK.cc2_idx = CC2.cc2_idx
        `


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }
        connection.query(sql, [lec_idx], (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result: 'error'})
                return
            }
            res.status(200).send({ status : 200, plans: result })//response
        })// connection
    })// pool
})
// ====== 강의별 액션플랜 불러오기 ====== //









// ====== 개별 플랜목록 ====== //
router.get('/:lec_idx/:stu_idx',  isAuth, (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var stu_idx      = req.params.stu_idx // 수강생아이디

    // 개별 플랜목록 조회 쿼리
    var sql = `
        SELECT *
        FROM
        lecture_action_plan as LAP

        JOIN registration as R
            ON R.stu_idx = LAP.stu_idx

        LEFT JOIN lecture_kpi as LK
            ON LK.lk_idx = LAP.lk_idx

        LEFT JOIN capability_category2 as CC2
            ON CC2.cc2_idx=LK.cc2_idx

        LEFT JOIN lecture_session as LS
            ON LAP.ls_idx = LS.ls_idx and LS.lec_idx=?

        WHERE LAP.stu_idx=?
        `

    pool.getConnection((er, connection)=>{
        connection.query(sql, [lec_idx, stu_idx], (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result: 'error'})
                return
            }
            // console.log(result);
            res.send(200, {plans:result})
        })// connection
    })// pool
})
// ====== 개별 플랜목록 ====== //
























module.exports = router;
