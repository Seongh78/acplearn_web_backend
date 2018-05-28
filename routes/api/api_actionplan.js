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





*/






// ====== 액션플랜 상세보기 ====== // => O
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
            LAC.lap_idx = ?  `

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



















// ============ 각 항목별 ============ //
router.get('/score2/:lec_idx/:classification', (req, res, next)=>{
    var tutor_idx           = req.user.user.tutor_idx; // 강사아이디
    var lec_idx               = req.params.lec_idx // 강의아이디
    var classification      = req.params.classification // 분류 => 부서/직급
    var value                  = req.params.value // 찾을값

    var _kpi          = req.query.kpi // 선택한 KPI
    var params=[] // 추가쿼리
    var temp = '',  tempSQL2=``
    var classificationField = '' // 찾을필드
    var kpiSQL='' // 추가쿼리
    var beforAvgParams = [lec_idx]

    // 쿼리스트링이 있을경우
    if (_kpi !== undefined  &&  _kpi !== null  &&  _kpi !== '') {
        console.log("_kpi : ",_kpi);
        kpiSQL = ` AND LAP.lk_idx = ?`
        tempSQL2 = `INNER JOIN   lecture_action_plan LAP   ON   LAP.ls_idx = LS.ls_idx   AND   LAP.lk_idx = ? `
        params = [  _kpi,  lec_idx]
        beforAvgParams.push(_kpi)
    }else{
        params = [ lec_idx]
    }
    // params.push(lec_idx) // 강의아이디 - 쿼리 파라미터 순서때문에 아래쪽에 작성

    switch (classification) {
        case 'personal': // 개인별 데이터 - 개인별 조회시 그룹바이 필요
            temp  =  `AND R.stu_idx=?`
        break;
        case 'group': // 부서별 데이터
            classificationField = 'group_idx'
            temp =  'AND R.group_idx=?'
        break;
        case 'departments': // 부서별 데이터
            classificationField = 'stu_department'
            temp =  'AND R.stu_department=?'
        break;
        case 'position': // 직급별 데이터
            classificationField = 'stu_position'
            temp =  'AND R.stu_position=?'
        break;
        case 'gender': // 직급별 데이터
            classificationField = 'stu_gender'
            temp =  'AND R.stu_gender=?'
        break;
        default: // 컨텐츠 없음 - 요청에러
            res.send(204, {result: 'success - no contents'})
            return
        break;
    }// switch



    // === 점수표 === //
    var sql =`
        -- 분류별 통계 - 최종
        SELECT
        	R.`+classificationField+` as classification,
        	DATE_FORMAT(LAD.lad_date, '%Y-%m-%d') as originalDate,
        	DATE_FORMAT(LAD.lad_date, '%m/%d') as lad_date,
        	ROUND( -- 자가평가
        		AVG(
                    CASE
                    WHEN LAC.lac_flag = 'self'
                    AND  LAC.lac_score <> 0
                    THEN LAC.lac_score
                    END
                )
        	,1) as avgSelfScore,
        	ROUND( -- 팀원평가
        		AVG(
                    CASE
                    WHEN LAC.lac_flag = 'others'
                    AND  LAC.lac_score <> 0
                    THEN LAC.lac_score
                    END
                )
        	,1) as avgOthersScore

        FROM
        	lecture_session LS
        	INNER JOIN registration R
        	ON  R.lec_idx = LS.lec_idx

        	INNER JOIN lecture_acplearn_day LAD
        	ON  LAD.ls_idx = LS.ls_idx

        	LEFT JOIN lecture_action_plan LAP
        	ON  LAP.ls_idx = LS.ls_idx
        	AND R.stu_idx = LAP.stu_idx
            `+kpiSQL+`

        	LEFT JOIN lecture_acplearn_check LAC
        	ON  LAC.lad_idx = LAD.lad_idx
        	AND LAC.lap_idx = LAP.lap_idx

        WHERE LS.lec_idx = ?
        GROUP BY `+classificationField+`, lad_date
        `

    // === 사전점수 평균 === //
    var beforeAvgSQL = `
            SELECT
                ROUND(AVG(lap_beforeScore), 1) as avgBeforeScore
            FROM
    			lecture_session LS
                LEFT JOIN lecture_action_plan LAP
                ON LS.ls_idx = LAP.ls_idx AND LAP.lap_beforeScore<>0
            WHERE
    			LS.lec_idx = ?
                `+kpiSQL

    // === KPI별 평균 === //
    var kpiAvgSQL = `
        SELECT
        	R.`+classificationField+` as classification,
            CC2.cc2_name,
            LK.lk_idx,
        	ROUND( -- 자가평가
        		AVG(
        			CASE
        			WHEN LAC.lac_score<> 0
                    AND LAC.lac_flag = 'self'
        			THEN LAC.lac_score
        			END
        		)
        	,1) as avgSelfScore,
            ROUND( -- 팀원평가
        		AVG(
        			CASE
        			WHEN LAC.lac_score<> 0
                    AND LAC.lac_flag = 'others'
        			THEN LAC.lac_score
        			END
        		)
        	,1) as avgOthersScore,
            ROUND( -- 사전평균
        		AVG(
        			CASE
        			WHEN LAP.lap_beforeScore <> 0
        			THEN LAP.lap_beforeScore
        			END
        		)
        	,1) as avgBeforeScore

        FROM
        	registration R

        	LEFT JOIN lecture_kpi LK
        	ON R.lec_idx = LK.lec_idx

            INNER JOIN capability_category2 CC2
        	ON LK.cc2_idx = CC2.cc2_idx

        	LEFT JOIN lecture_action_plan LAP
        	ON R.stu_idx = LAP.stu_idx
        	AND LAP.lk_idx = LK.lk_idx

        	LEFT JOIN lecture_acplearn_check LAC
        	ON  LAC.lap_idx = LAP.lap_idx

        WHERE R.lec_idx = ?

        GROUP BY `+classificationField+`, lk_idx `

    // === 참여율 === //
    var participationRateSQL = `
        SELECT
        	ROUND((COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) * 100) / COUNT(*), 1) as participationRate,

        	COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) as participationCount,
            COUNT(*) as acplearnCount

        FROM
        	lecture_session LS
            `+tempSQL2+`

            INNER JOIN registration R
            ON R.lec_idx = LS.lec_idx
            `+temp+`
            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx
            AND LAD.stu_idx = R.stu_idx
            AND LAD.lad_activeFlag<>'휴식'

        WHERE
        	LS.lec_idx = ? `


    // === 사전점수 평균 === //
    var beforeAvgSQL = `
        SELECT
            ROUND(AVG(lap_beforeScore), 1) as avgBeforeScore
        FROM
			lecture_session LS
            LEFT JOIN lecture_action_plan LAP
            ON LS.ls_idx = LAP.ls_idx AND LAP.lap_beforeScore<>0
        WHERE
			LS.lec_idx = ?
            `+kpiSQL


    pool.getConnection((er, connection)=>{
        if (er) {
            console.log(er);
            throw er
            return
        }

        // 분류별 통계
        connection.query(sql, params, (classificationErr, classificationResult)=>{
            if (classificationErr) {
                connection.release()
                console.log(classificationErr);
                res.send(500)
                return
            }

            // KPI별 통계
            connection.query(kpiAvgSQL,  lec_idx, (kpiAvgErr, kpiAvgResult)=>{
                if (kpiAvgErr) {
                    connection.release()
                    console.log(kpiAvgErr);
                    res.send(500, {reuslt:kpiAvgErr})
                    return
                }

                // 사전점수 평균
                connection.query(beforeAvgSQL, beforAvgParams, (beforeAvgErr, beforeAvgResult)=>{
                    if (beforeAvgErr) {
                        connection.release()
                        console.log(beforeAvgErr);
                        res.send(500, {reuslt:beforeAvgErr})
                        return
                    }





                        var classificationArray = [] // 분류별 임시 데이터
                        var classificationKpiArray = [] // kpi 임시 데이터
                        var avgBeforeScore
                        var keys = Object.keys(classificationResult)
                        // 분류 찾기
                        for(var ii   in  keys){
                            classificationKpiArray=[]
                            avgBeforeScore = 0
                            if (ii < 1) {
                                // KPI 평균 찾기
                                for(var jj  in  kpiAvgResult){
                                    if(kpiAvgResult[jj].classification == classificationResult[ii].classification)
                                        classificationKpiArray.push({ // KPI별 통계
                                            cc2_name                : kpiAvgResult[jj].cc2_name,
                                            lk_idx                       : kpiAvgResult[jj].lk_idx,
                                            avgBeforeScore       : kpiAvgResult[jj].avgBeforeScore,
                                            avgSelfScore            : kpiAvgResult[jj].avgSelfScore,
                                            avgOthersScore       : kpiAvgResult[jj].avgOthersScore,
                                        })
                                }
                                // 실 데이터
                                classificationArray.push({
                                    'title' : classificationResult[ii].classification,
                                    avgBeforeScore:0,
                                    kpiAvg: classificationKpiArray,
                                    participationSelfDay:0,
                                    participationOthersDay:0,
                                    participationSelfRate:0,
                                    participationOthersRate:0,
                                    'score' : []
                                })

                                // console.log(classificationArray);
                            }else{
                                if (classificationResult[ii].classification !== classificationArray[classificationArray.length-1].title) {
                                    // KPI 평균 찾기
                                    for(var jj  in  kpiAvgResult){ // KPI별 통계
                                        if(kpiAvgResult[jj].classification == classificationResult[ii].classification)
                                            classificationKpiArray.push({
                                                cc2_name : kpiAvgResult[jj].cc2_name,
                                                lk_idx : kpiAvgResult[jj].lk_idx,
                                                avgBeforeScore : kpiAvgResult[jj].avgBeforeScore,
                                                avgSelfScore : kpiAvgResult[jj].avgSelfScore,
                                                avgOthersScore : kpiAvgResult[jj].avgOthersScore,
                                            })
                                    }
                                    // 실 데이터
                                    classificationArray.push({
                                        'title' : classificationResult[ii].classification,
                                        avgBeforeScore:0,
                                        kpiAvg: classificationKpiArray,
                                        participationSelfDay:0,
                                        participationOthersDay:0,
                                        participationSelfRate:0,
                                        participationOthersRate:0,
                                        'score' : []
                                    })// push
                                }
                            }// else
                        }// for


                        // 점수데이터 삽입
                        var allAvg = 0
                        var participationSelfRate = 0  // 참여율
                        var participationOthersRate = 0  // 참여율
                        var participationDay = 0 // 참여일
                        // var acplearnDay =  // 총 일수


                        for(var ii  in  classificationArray){
                            for(var jj  in  keys){
                                if (classificationArray[ii].title == classificationResult[jj].classification) {

                                    // 자가 - 참여일
                                    if (classificationResult[jj].avgSelfScore != null)
                                        classificationArray[ii].participationSelfDay+=1

                                    // 팀원 - 참여일
                                    if (classificationResult[jj].avgOthersScore != null)
                                        classificationArray[ii].participationOthersDay+=1

                                    classificationArray[ii].score.push({
                                        'lad_date' : classificationResult[jj].lad_date,
                                        'originalDate' : classificationResult[jj].originalDate,
                                        'avgSelfScore' : classificationResult[jj].avgSelfScore,
                                        'avgOthersScore' : classificationResult[jj].avgOthersScore
                                    })


                                }// if
                            }// for
                        }// for


                        // 참여율 구하기
                        for(var ii  in  classificationArray){
                            console.log(classificationArray[ii].score.length);
                            classificationArray[ii].participationSelfRate = Number(((classificationArray[ii].participationSelfDay * 100) / classificationArray[ii].score.length).toFixed(1))
                            classificationArray[ii].participationOthersRate = Number(((classificationArray[ii].participationOthersDay * 100) / classificationArray[ii].score.length).toFixed(1))
                        }



                        connection.release()
                        res.send(200, {
                            // participationRateResult,
                            // participationSelfRate,
                            // participationOthersRate,
                            avgBeforeScore     : beforeAvgResult[0].avgBeforeScore,
                            classificationArray,

                        })





                })// 사전점수 평균
            })// KPI별 통계
        })// 분류별 통계

    }) // pool


})
// ============ 각 항목별 ============ //





















// ====== 그룹/부서/직급/성 별 ====== // => O
router.get('/score/:lec_idx/:classification/:value', (req, res, next)=>{
    var tutor_idx           = req.user.user.tutor_idx; // 강사아이디
    var lec_idx               = req.params.lec_idx // 강의아이디
    var classification      = req.params.classification // 분류 => 부서/직급
    var value                  = req.params.value // 찾을값


    var _kpi          = req.query.kpi // 선택한 KPI
    var params = [] // 추가쿼리
    var temp = '', tempSQL2=``
    var kpiSQL='' // 추가쿼리
    var beforAvgParams = [lec_idx]

    // 쿼리스트링이 있을경우
    if (_kpi !== undefined  &&  _kpi !== null  &&  _kpi !== '') {
        // console.log("_kpi : ",_kpi);
        kpiSQL = ` AND LAP.lk_idx = ?`
        tempSQL2 = `INNER JOIN   lecture_action_plan LAP   ON   LAP.ls_idx = LS.ls_idx   AND   LAP.lk_idx = ? `
        params = [  _kpi, value, lec_idx]
        beforAvgParams.push(_kpi)
    }else{
        params = [ value, lec_idx]
    }
    // params.push(lec_idx) // 강의아이디 - 쿼리 파라미터 순서때문에 아래쪽에 작성



    switch (classification) {
        case 'personal': // 개인별 데이터 - 개인별 조회시 그룹바이 필요
            temp  =  `
            AND R.stu_idx=?
            -- GROUP BY LAP.lap_idx`
        break;
        case 'group': // 부서별 데이터
            temp =  'AND R.group_idx=?'
        break;
        case 'departments': // 부서별 데이터
            temp =  'AND R.stu_department=?'
        break;
        case 'position': // 직급별 데이터
            temp =  'AND R.stu_position=?'
        break;
        case 'gender': // 직급별 데이터
            temp =  'AND R.stu_gender=?'
        break;
        default: // 컨텐츠 없음 - 요청에러
            res.send(204, {result: 'success - no contents'})
            return
        break;
    }// switch


    // 분류별 통계
    var sql =  `
        SELECT
        	DATE_FORMAT(LAD.lad_date, '%Y-%m-%d') as originalDate,
        	DATE_FORMAT(LAD.lad_date, '%m/%d') as lad_date,
            ROUND(AVG(
        		case when LAC.lac_flag = 'self' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgSelfScore,

            ROUND(AVG(
        		case when LAC.lac_flag = 'others' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgOthersScore

        FROM
        	lecture_session LS
            INNER JOIN registration R
            ON R.lec_idx = LS.lec_idx

            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx

            LEFT JOIN lecture_action_plan LAP
            ON LAP.ls_idx = LS.ls_idx
            `+kpiSQL+`
            `+temp+`
            AND R.stu_idx = LAP.stu_idx

            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lad_idx = LAD.lad_idx
            AND LAC.lap_idx = LAP.lap_idx

            WHERE
            LS.lec_idx = ?

            GROUP BY lad_date
                `

    // 사전점수 평균
    var beforeAvgSQL = `
        SELECT
            ROUND(AVG(lap_beforeScore), 1) as avgBeforeScore
        FROM
			lecture_session LS
            LEFT JOIN lecture_action_plan LAP
            ON LS.ls_idx = LAP.ls_idx AND LAP.lap_beforeScore<>0
        WHERE
			LS.lec_idx = ?
            `+kpiSQL


    // KPI별 통계
    /*
    var kpiAvgSQL = `
        SELECT
        	CC2.cc2_idx as cc2_idx ,
        	CC2.cc2_name as cc2_name,
        	LK.lk_idx as lk_idx,
        	(
        		SELECT
        			AVG(LAC.lac_score)
        		FROM
        			registration R,
        			lecture_action_plan LAP,
        			lecture_acplearn_check LAC
        		WHERE
        			LAP.stu_idx = R.stu_idx
        			AND LK.lk_idx = LAP.lk_idx
        			AND LAP.lap_idx = LAC.lap_idx
        			AND LAC.lac_flag = 'self'
                    AND LAC.lac_score <> 0
                     `+temp+`
        	) as avgSelfScore,
        	(
        		SELECT
        			AVG(LAC.lac_score)
        		FROM
        			registration R,
        			lecture_action_plan LAP,
        			lecture_acplearn_check LAC
        		WHERE
        			LAP.stu_idx = R.stu_idx
        			AND LK.lk_idx = LAP.lk_idx
        			AND LAP.lap_idx = LAC.lap_idx
        			AND LAC.lac_flag = 'others'
                    AND LAC.lac_score <> 0
                     `+temp+`
        	) as avgOthersScore

        FROM
        	capability_category2 CC2,
        	lecture_kpi LK

        WHERE
        	LK.lec_idx = ?
        	AND CC2.cc2_idx = LK.cc2_idx`
            */
    var kpiAvgSQL = `
        -- KPI별 통계
        SELECT
        	LK.lk_idx,
            CC2.cc2_name,
            ROUND(
        		AVG(LAP.lap_beforeScore)
            ,1) as avgBeforeScore,
        	ROUND(
        		AVG(
        			CASE
                    WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'self'
                    THEN LAC.lac_score
                    END
                )
            ,1) as avgSelfScore,
            ROUND(
        		AVG(
        			CASE
                    WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'others'
                    THEN LAC.lac_score
                    END
                )
            ,1) as avgOthersScore

        FROM
        	lecture_kpi LK

            INNER JOIN capability_category2 CC2
            ON LK.cc2_idx = CC2.cc2_idx

            LEFT JOIN registration R
            ON R.lec_idx = LK.lec_idx
            `+temp+`

            LEFT JOIN lecture_action_plan LAP
            ON LAP.lk_idx = LK.lk_idx
            AND LAP.stu_idx = R.stu_idx

            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lap_idx = LAP.lap_idx

        WHERE LK.lec_idx = ?

        GROUP BY LK.lk_idx `


    // 참여율
    var participationRateSQL = `
        SELECT
        	ROUND((COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) * 100) / COUNT(*), 1) as participationRate,

        	COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) as participationCount,
            COUNT(*) as acplearnCount

        FROM
        	lecture_session LS

            `+tempSQL2+`

            INNER JOIN registration R
            ON R.lec_idx = LS.lec_idx
            `+temp+`
            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx
            AND LAD.stu_idx = R.stu_idx
            AND LAD.lad_activeFlag<>'휴식'

        WHERE
        	LS.lec_idx = ?`


    // Pool
    pool.getConnection((er,connection)=>{
        if (er) {
            // connection.release()
            throw er
            return
        }

        // 부서/직급 별 액플런 찾기
        connection.query(sql, params, (err , departmentsResult)=>{
            if (err) {
                connection.release()
                console.log(err);
                res.send(500, {reuslt:err})
                return
            }


            // 사전점수 평균
            connection.query(beforeAvgSQL, beforAvgParams, (beforeAvgErr, beforeAvgResult)=>{
                if (beforeAvgErr) {
                    connection.release()
                    console.log(beforeAvgErr);
                    res.send(500, {reuslt:beforeAvgErr})
                    return
                }

                // 참여율
                connection.query(participationRateSQL, params, (participationRateErr, participationRateResult)=>{
                    if (participationRateErr) {
                        connection.release()
                        console.log(participationRateErr);
                        res.send(500, {reuslt:participationRateErr})
                        return
                    }


                    // KPI별 통계
                    connection.query(kpiAvgSQL, [ value, lec_idx], (kpiAvgErr, kpiAvgResult)=>{
                        if (kpiAvgErr) {
                            connection.release()
                            console.log(kpiAvgErr);
                            res.send(500, {reuslt:kpiAvgErr})
                            return
                        }

                        connection.release()
                        res.send(200 , {
                            participationRate   : participationRateResult[0].participationRate, // 참여율()
                            participationDay    : participationRateResult[0].participationCount, // 참여율()
                            acplearnDay           : participationRateResult[0].acplearnCount, // 참여율()
                            avgBeforeScore     : beforeAvgResult[0].avgBeforeScore,
                            kpiAvg                    : kpiAvgResult,
                            score                      : departmentsResult
                        })

                    }) // KPI별 통계
                }) // 참여율
            }) // 사전점수 평균
        })// 부서/직급 별 액플런 찾기
    })// pool

})
// ====== 그룹/부서/직급/성 별 ====== //









































/* ================

전체평균

================ */
router.get('/score/:lec_idx', isAuth, (req, res, next)=>{
    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디
    var _kpi          = req.query.kpi // 선택한 KPI
    var sess = req.query.sess // 선택된 차시

    // 추가쿼리 변수
    var tempSQL='', tempSQL2=`` // 추가쿼리
    var params=[] // 파라미터
    var beforAvgParams = [lec_idx]
    var participationParams = []


    if (_kpi !== undefined  &&  _kpi !== null  &&  _kpi !== '') {
        tempSQL = `AND LAP.lk_idx = ?`
        tempSQL2 = `
            INNER JOIN lecture_action_plan LAP
            ON LAP.ls_idx = LS.ls_idx
            AND LAP.lk_idx = ? `
        params=[_kpi,_kpi]
        beforAvgParams.push(_kpi)
        participationParams.push(_kpi)
    }
    params.push(lec_idx) // 강의아이디 - 쿼리 파라미터 순서때문에 아래쪽에 작성
    participationParams.push(lec_idx) // 강의아이디 - 쿼리 파라미터 순서때문에 아래쪽에 작성



    // 전체 평균 점수데이터
    var sql =`
        SELECT
        	DATE_FORMAT(LAD.lad_date, '%Y-%m-%d') as originalDate,
	        DATE_FORMAT(LAD.lad_date, '%m/%d') as lad_date,
            ROUND(AVG(
        		case when LAC.lac_flag = 'self' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgSelfScore,

            ROUND(AVG(
        		case when LAC.lac_flag = 'others' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgOthersScore

        FROM
        	lecture_session LS
            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx
            `+tempSQL2+`
            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lad_idx = LAD.lad_idx

            WHERE
            LS.lec_idx = ?

            GROUP BY lad_date
            `

    // 사전점수 평균
    var beforeAvgSQL = `
        SELECT
            ROUND(AVG(lap_beforeScore), 1) as avgBeforeScore
        FROM
			lecture_session LS
            LEFT JOIN lecture_action_plan LAP
            ON
                LS.ls_idx = LAP.ls_idx
                AND LAP.lap_beforeScore<>0

        WHERE
			LS.lec_idx = ?
            `+tempSQL


    // KPI별 통계
    var kpiAvgSQL = `
        -- KPI별 통계
        SELECT
        	LK.lk_idx,
            CC2.cc2_name,
            ROUND(
                AVG(LAP.lap_beforeScore)
            ,1) as avgBeforeScore,
        	ROUND(
        		AVG( CASE WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'self' THEN LAC.lac_score END )
            ,1) as avgSelfScore,
            ROUND(
        		AVG( CASE WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'others' THEN LAC.lac_score END )
            ,1) as avgOthersScore

        FROM
        	lecture_kpi LK
            INNER JOIN capability_category2 CC2
            ON LK.cc2_idx = CC2.cc2_idx
            LEFT JOIN lecture_action_plan LAP
            ON LAP.lk_idx = LK.lk_idx
            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lap_idx = LAP.lap_idx

        WHERE LK.lec_idx = ?
        GROUP BY LK.lk_idx `


    // 참여율
    var participationRateSQL = `
        SELECT
        	ROUND((COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) * 100) / COUNT(*), 1) as participationRate,

        	COUNT(
        		case LAD.lad_activeFlag
                when '완료'
                then 1
                end
            ) as participationCount,
            COUNT(*) as acplearnCount

        FROM
        	lecture_session LS

            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx
            AND LAD.lad_activeFlag<>'휴식'

            `+tempSQL2+`

        WHERE
        	LS.lec_idx = ? `


    // Pool
    pool.getConnection((er,connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        // 부서/직급 별 액플런 찾기
        connection.query(sql, participationParams, (err , departmentsResult)=>{
            if (err) {
                connection.release()
                console.log(err);
                res.send(500, {reuslt:err})
                return
            }

            // 사전점수 평균
            connection.query(beforeAvgSQL, beforAvgParams, (beforeAvgErr, beforeAvgResult)=>{
                if (beforeAvgErr) {
                    connection.release()
                    console.log(beforeAvgErr);
                    res.send(500, {reuslt:beforeAvgErr})
                    return
                }

                // KPI별 통계
                connection.query(kpiAvgSQL, [lec_idx], (kpiAvgErr, kpiAvgResult)=>{
                    if (kpiAvgErr) {
                        connection.release()
                        console.log(beforeAvgErr);
                        res.send(500, {reuslt:kpiAvgErr})
                        return
                    }

                    // 참여율
                    connection.query(participationRateSQL, participationParams, (participationRateErr, participationRateResult)=>{
                        if (participationRateErr) {
                            connection.release()
                            console.log(beforeAvgErr);
                            res.send(500, {reuslt:participationRateErr})
                            return
                        }

                        connection.release()
                        res.send(200 , {
                            participationRate   : participationRateResult[0].participationRate, // 참여율()
                            participationDay    : participationRateResult[0].participationCount, // 참여율()
                            acplearnDay           : participationRateResult[0].acplearnCount, // 참여율()
                            avgBeforeScore      : beforeAvgResult[0].avgBeforeScore, // 사전점수
                            kpiAvg                    : kpiAvgResult, // kpi별 점수
                            score                       : departmentsResult, // 점수표
                        })


                    }) // 참여율
                }) // KPI별 통계
            }) // 사전점수 평균
        })// 부서/직급 별 액플런 찾기
    })// pool


})
// ====== 전체평균 ====== //











































// ====== 개별 통계 데이터 ====== //
router.get('/personal/:lec_idx/:stu_idx', (req, res, next)=>{
    var lec_idx = req.params.lec_idx // 강의아이디
    var stu_idx = req.params.stu_idx // 수강생 아이디

    // 누적평균
    var kpiAvgSQL = `
        -- KPI별 통계
        SELECT
        	LK.lk_idx,
            CC2.cc2_name,
            ROUND(
        		AVG(LAP.lap_beforeScore)
            ,1) as avgBeforeScore,
        	ROUND(
        		AVG(
        			CASE
                    WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'self'
                    THEN LAC.lac_score
                    END
                )
            ,1) as avgSelfScore,
            ROUND(
        		AVG(
        			CASE
                    WHEN LAC.lac_score <> 0 AND LAC.lac_flag = 'others'
                    THEN LAC.lac_score
                    END
                )
            ,1) as avgOthersScore

        FROM
        	lecture_kpi LK

            INNER JOIN capability_category2 CC2
            ON LK.cc2_idx = CC2.cc2_idx

            LEFT JOIN registration R
            ON R.lec_idx = LK.lec_idx
            AND R.stu_idx = ?

            LEFT JOIN lecture_action_plan LAP
            ON LAP.lk_idx = LK.lk_idx
        	AND LAP.stu_idx = R.stu_idx

            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lap_idx = LAP.lap_idx

        WHERE LK.lec_idx = ?


        GROUP BY LK.lk_idx  `

    // 개인 전체플랜 평균점수
    var studentAvgSQL = `
        SELECT
        	DATE_FORMAT(LAD.lad_date, '%Y-%m-%d') as originalDate,
        	DATE_FORMAT(LAD.lad_date, '%m/%d') as lad_date,
            ROUND(AVG(
        		case when LAC.lac_flag = 'self' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgSelfScore,

            ROUND(AVG(
        		case when LAC.lac_flag = 'others' and LAC.lac_score <> 0 then LAC.lac_score end
        	),1) as avgOthersScore

        FROM
        	lecture_session LS

            INNER JOIN lecture_acplearn_day LAD
            ON LAD.ls_idx = LS.ls_idx

            LEFT JOIN lecture_action_plan LAP
            ON LAP.ls_idx = LS.ls_idx
            AND LAP.stu_idx = ?

            LEFT JOIN lecture_acplearn_check LAC
            ON LAC.lad_idx = LAD.lad_idx
            AND LAC.lap_idx = LAP.lap_idx

            WHERE
            LS.lec_idx = ?

            GROUP BY lad_date `

    // 개인 플랜별 통계
    var planAvgSQL = `
        -- 개인 플랜별 통계
        SELECT
        	LAP.lap_idx,
            LAP.lap_text,
        	LAD.lad_idx,
            LAD.lad_activeFlag,
            LK.lk_idx,
            CC2.cc2_name as cc2_name,
            DATE_FORMAT(LAD.lad_date, '%m/%d') as lad_date,
            ROUND(
        		AVG(CASE WHEN LAC.lac_score<>0 AND LAC.lac_flag='self' AND LAD.lad_activeFlag<>'휴식' THEN LAC.lac_score END)
            ,1) as avgSelfScore,
            ROUND(
        		AVG(CASE WHEN LAC.lac_score<>0 AND LAC.lac_flag='others' AND LAD.lad_activeFlag<>'휴식' THEN LAC.lac_score END)
            ,1) as avgOthersScore

        FROM
        	lecture_action_plan LAP

        	INNER JOIN lecture_kpi LK
            ON LK.lk_idx = LAP.lk_idx

            INNER JOIN capability_category2 CC2
            ON CC2.cc2_idx = LK.cc2_idx

            INNER JOIN lecture_acplearn_day LAD
            ON LAD.stu_idx = LAP.stu_idx

            LEFT JOIN lecture_acplearn_check LAC
            ON LAD.lad_idx = LAC.lad_idx AND LAP.lap_idx=LAC.lap_idx

        WHERE
        	LAP.stu_idx = ?

        GROUP BY lap_idx, lad_idx, lad_date, lk_idx
            `


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        // 누적 평균점수
        connection.query(kpiAvgSQL , [lec_idx, stu_idx], (kpiAvgErr, kpiAvgResult)=>{
            if (kpiAvgErr) {
                console.log(kpiAvgErr);
                connection.release()
                res.send(500, {result : 'error'})
                return
            }
            // 전체플랜 평균점수
            connection.query(studentAvgSQL , [stu_idx, lec_idx], (studentAvgErr, studentAvgResult)=>{
                if (studentAvgErr) {
                    console.log(studentAvgErr);
                    connection.release()
                    res.send(500, {result : 'error'})
                    return
                }

                // 플랜별 점수
                connection.query(planAvgSQL, [stu_idx], (planAvgErr, planAvgResult)=>{
                    connection.release()
                    if (planAvgErr) {
                        console.log(planAvgErr);
                        res.send(500, {result : 'error'})
                        return
                    }

                    var plans = []
                    for(var ii  in  planAvgResult){
                        if (ii == 0) {
                            plans.push({
                                lap_idx : planAvgResult[ii].lap_idx,
                                lap_text : planAvgResult[ii].lap_text,
                                cc2_name : planAvgResult[ii].cc2_name,
                                score : []
                            })
                        }else{
                            if (planAvgResult[ii-1].lap_idx != planAvgResult[ii].lap_idx) {
                                plans.push({
                                    lap_idx : planAvgResult[ii].lap_idx,
                                    lap_text : planAvgResult[ii].lap_text,
                                    cc2_name : planAvgResult[ii].cc2_name,
                                    score : []
                                })
                            }
                        }// else

                    }// for

                    for(var ii  in  plans){
                        for(var jj  in  planAvgResult){
                            if (plans[ii].lap_idx === planAvgResult[jj].lap_idx) {
                                // 해당 플랜의 점수를 찾아서 푸시
                                plans[ii].score.push({
                                    avgSelfScore        : planAvgResult[jj].avgSelfScore,
                                    avgOthersScore   : planAvgResult[jj].avgOthersScore,
                                    lad_date               : planAvgResult[jj].lad_date
                                })
                            }
                        }// for
                    }// for

                    res.send(200, {
                        kpiAvg : kpiAvgResult,
                        allAvg : studentAvgResult,
                        plans
                    })

                }) // 플랜별 점수
            })// 전체플랜 평균점수
        })// 전체플랜 평균점수
    })// pool


})
// ====== 개별 통계 데이터 ====== //









router.get('/comments/:stu_idx', (req, res, next)=>{
    /*
    /comments/197?lap_idx=20
    stu_idx : 수강생
    */

    var stu_idx = req.params.stu_idx // 수강생아이디
    var lap_idx = req.query.lap_idx // 플랜별로 찾을때 플랜아이디 - 쿼리스트링
    var params = [stu_idx] // 디비 파라미터
    var temp=''


    if (lap_idx != undefined && lap_idx != null) {
        temp = `AND LAP.lap_idx = ?`
        params.push(lap_idx)
    }

    var sql = `
        SELECT * FROM acplearn_cheerup WHERE stu_idx=? `

    pool.getConnection((er, connection)=>{
        if (er) {
            console.log(er);
            throw er
            return
        }

        connection.query(sql, params, (err, result)=>{
            connection.release()
            if (err) {
                // console.log(err);
                res.send(200, { comments:[] }) // 임시 데이터
                // res.send(500, {result:'error'})
                return
            }

            res.send(200, {comments:result})
        })
    })
})


















// ====== 강의별 액션플랜 불러오기 - 테스트 ====== //
router.get('/ap/:lec_idx', (req, res, next)=>{
    var lec_idx = req.params.lec_idx
    var classification = req.query.classification // 분류 : group, departments, position, gender
    var value = req.query.value // 분류의 값
    var temp=``
    var params=[lec_idx]

    if(value!=undefined)
        params.push(value)

    switch (classification) {
        case 'group':
            temp=`AND
            R.group_idx=?`
        break;
        case 'departments':
            temp=`AND
            R.stu_department=?`
        break;
        case 'position':
            temp=`AND
            R.stu_position=?`
        break;
        case 'gender':
            temp=`AND
            R.stu_gender=?`
        break;
    }

    var sql = `
        SELECT
        	R.stu_name ,
        	LAP.lap_text,
        	LAP.ls_idx,
            LK.lk_idx,
        	CC2.cc2_name,
        	(
        		SELECT  AVG(LAC.lac_score)
        		FROM  lecture_acplearn_check LAC
        		WHERE
        			LAP.lap_idx = LAC.lap_idx
        			AND LAC.lac_flag = 'before'
        	) as beforeScore,
        	(
        		SELECT  AVG(LAC.lac_score)
        		FROM  lecture_acplearn_check LAC
        		WHERE
        			LAP.lap_idx = LAC.lap_idx
        			AND LAC.lac_flag = 'self'
        	) as selfScore,
        	(
        		SELECT  AVG(LAC.lac_score)
        		FROM  lecture_acplearn_check LAC
        		WHERE
        			LAP.lap_idx = LAC.lap_idx
        			AND LAC.lac_flag = 'others'
        	) as othersScore

        FROM
        	registration R,
        	lecture_kpi LK,
        	capability_category2 CC2,
        	lecture_action_plan LAP

        WHERE
        	R.lec_idx = ?
        	AND R.stu_idx = LAP.stu_idx
        	AND LAP.lk_idx = LK.lk_idx
        	AND LK.cc2_idx = CC2.cc2_idx
            `+temp


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        // 쿼리실행
        connection.query(sql, params, (err, result)=>{
            if (err) {
                connection.release()
                console.log(err);
                res.send(500, {result:'database error'})
                return
            }

            connection.release()
            res.send(200, {
                plans : result
            })
        }) // 쿼리실행
    })
})
// ====== 강의별 액션플랜 불러오기 - 테스트 ====== //


















// ====== 강의별 액션플랜 불러오기 ====== //
router.get('/:lec_idx', isAuth, (req, res, next)=>{

    var tutor_idx   = req.user.user.tutor_idx; // 강사아이디
    var lec_idx      = req.params.lec_idx // 강의아이디

    var sql = `
        SELECT
            LAP.lap_idx,
            LAP.lap_text,
            LAP.lk_idx,
            LAP.stu_idx,
            R.stu_name,
            LS.ls_idx,
            LS.ls_seq,
            CC2.cc2_name,
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
            registration R,
           	lecture_kpi LK,
           	capability_category2 CC2
        WHERE
	        LS.lec_idx = ?  AND
	        LAP.ls_idx = LS.ls_idx  AND
	        LAP.lk_idx = LK.lk_idx  AND
	        LK.cc2_idx = CC2.cc2_idx AND
            LAP.stu_idx = R.stu_idx
        `


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            console.log(er);
            throw er
            return
        }
        connection.query(sql, [lec_idx], (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(500, {result: 'error' , err})
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
