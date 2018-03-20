/*
Router : /aplectures

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');







// ====== APL강의 목록 ====== //
router.get('/', (req, res, next)=>{
    let usr_idx = req.user.user.tutor_idx; // 유저아이디
    let q =
    `SELECT
        L.lec_idx,
        L.lec_title,
        L.lec_flag,
        date_format(L.lec_startDate, '%Y년 %c월 %d일') as lec_startDate,
        date_format(L.lec_endDate, '%Y년 %c월 %d일') as lec_endDate,
        L.lec_sessionCount, L.lec_personnel
    FROM
        lecture L,
        tutor T
    WHERE
        T.tutor_idx = L.tutor_idx and T.tutor_idx=? `

    var lecParameter = [usr_idx]

    // 쿼리스트링여부 - 강의타입 필터링
    if(req.query.lecType){
        q += " and L.lec_flag=? "
        lecParameter.push(req.query.lecType)
    }

    conn.query(q, lecParameter,(e, rows)=>{
        if (e) {
            console.log(e);
            return res.send(500, {result:e, data:{}});
        }
        res.send(200, {result:'success', data:rows});
    })// conn

});
// ====== APL강의 목록 ====== //











// ====== APL강의 삭제 ====== //
router.delete('/:id', (req, res, next)=>{
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var lec_idx = req.params.id
    var sql = 'DELETE FROM lecture WHERE lec_idx=? and  tutor_idx=?'
    pool.getConnection((er, connection)=>{
        connection.query(sql, [lec_idx, usr_idx], (err, result)=>{
            connection.release()
            if (err) {
                console.log(err);
                return res.send(500, {result: 'error - delete fail'})
            }

            res.send(200, {result:'success'})
        })// connection
    })// pool
})
// ====== APL강의 삭제 ====== //











// ====== 강의상세 ====== //
router.get('/dt/:id', (req, res, next)=>{

    // 파라미터
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var lec_idx = req.params.id // 강의아이디

    // 쿼리
    var q={
        group       : "SELECT * FROM `group` WHERE lec_idx=? ORDER BY group_idx ASC",
        students   : `SELECT * FROM company C , registration R  WHERE R.lec_idx=? and R.com_code=C.com_code`,
        companies : 'SELECT * FROM company_manager CM, company C WHERE CM.lec_idx=? and CM.com_code=C.com_code',
        kpi             : ` SELECT       CC2.cc2_idx, CC2.cc2_name
                                FROM        lecture_kpi LK, capability_category2 CC2
                                WHERE      LK.lec_idx=42 and CC2.cc2_idx=LK.cc2_idx`,

        lecture      : `SELECT
                            L.lec_idx 			      as 	lec_idx,
                        	L.lec_startDate 	  as 	lec_startDate,
                        	L.lec_endDate 		 as 	lec_endDate,
                        	L.lec_title 		       as 	  lec_title,
                        	L.lec_personnel 	 as 	lec_personnel,
                        	L.lec_target		    as 	   lec_target,
                        	L.lec_time		         as 	lec_time,
                        	L.lec_content		   as 	 lec_content,
                        	L.lec_goal			     as 	lec_goal,
                        	L.lec_effect		     as 	lec_effect,
                        	L.lec_file			        as 	  lec_file,
                        	L.lec_flag			       as 	 lec_flag,
                        	L.lec_sessionCount	as	 lec_sessionCount,

                        	LS.ls_idx			    as	    ls_idx,
                            date_format(LS.ls_startDate , '%Y-%m-%d')     as      ls_startDate,
                            date_format(LS.ls_endDate , '%Y-%m-%d')      as      ls_endDate,
                        	LS.ls_title			     as 	 ls_title,
                        	LS.ls_location		 as	     ls_location,
                        	date_format(LS.ls_startTime	, '%H:%i')	as	    ls_startTime,
                        	date_format(LS.ls_endTime, '%H:%i')	   as	   ls_endTime,

                        	LT.lt_idx			      as	 lt_idx,
                        	date_format(LT.lt_startTime	, '%H:%i')			  as	 lt_startTime,
                        	date_format(LT.lt_startTime	, '%H:%i')		     as 	lt_endTime,
                        	LT.lt_title			       as	  lt_title,

                            LM.lm_idx                as   lm_idx,
                            date_format(LM.lm_startTime	, '%H:%i')     as   lm_startTime,
                            date_format(LM.lm_endTime	, '%H:%i')      as   lm_endTime,
                            LM.lm_title              as   lm_title,
                            LM.lm_text              as   lm_text,
                            LM.lm_type              as  lm_type

                        FROM lecture L
                            LEFT JOIN lecture_session LS
                            LEFT JOIN lecture_timetable LT
                            LEFT JOIN lecture_module LM
                            ON LT.lt_idx=LM.lt_idx
                            ON LS.ls_idx=LT.ls_idx
                            ON L.lec_idx=LS.lec_idx
                        WHERE L.lec_idx=? and L.tutor_idx=?  `
    }
    var lecture;
    var sessions = timetables = modules = new Array()
    var tempSessions = tempTimetables = tempModules = {} // 임시저장소 - 푸시할 데이터 임시보관: 중복방지

    var sessionCount        = -1 // 현재 돌고있는 차시의 배열 - 차시가 push될 때 차시의 번지수를 기억함
    var timetableCount    = -1
    var moduleCount       = -1




    pool.getConnection((er, connection)=>{
        connection.query(q.lecture, [lec_idx, usr_idx], (lectureErr, lectureResult)=>{
            if(lectureErr){ // Error
                connection.release()
                console.log(lectureErr);
                return res.status(500).send({result : 'lectureErr'})
            }
            // console.log(lectureResult.length);

            // 결과값이 없는경우 end
            if ( lectureResult.length<1 ) {
                connection.release()
                res.status(200).send({result : 'No content'})
                return
            }// if


            lecture = {
                lec_idx                      : lectureResult[0].lec_idx,
                lec_title                     : lectureResult[0].lec_title,
                lec_startDate            : lectureResult[0].lec_startDate,
                lec_endDate             : lectureResult[0].lec_endDate,
                lec_flag                     : lectureResult[0].lec_flag,
                lec_sessionCount     : lectureResult[0].lec_sessionCount,
                lec_personnel           : lectureResult[0].lec_personnel,
                lec_content               : lectureResult[0].lec_content,
                lec_goal                     : lectureResult[0].lec_goal,
                lec_effect                  : lectureResult[0].lec_effect,
                lec_target                  : lectureResult[0].lec_target,
                sessions : new Array()
            }// lecture


            // 모델 만들기
            for(var ii  in  lectureResult){

                tempSessions = {
                    ls_idx                  : lectureResult[ii].ls_idx,
                    lec_idx                : lectureResult[ii].lec_idx,
                    ls_startDate        : lectureResult[ii].ls_startDate,
                    ls_endDate         : lectureResult[ii].ls_endDate,
                    ls_title                 : lectureResult[ii].ls_title,
                    ls_location          : lectureResult[ii].ls_location,
                    ls_startTime            : lectureResult[ii].ls_startTime,
                    ls_endTime             : lectureResult[ii].ls_endTime,
                    timetables          : []
                }
                tempTimetables = {
                    lt_idx			     :	 lectureResult[ii].lt_idx,
                    lt_startTime    :	 lectureResult[ii].lt_startTime,
                    lt_endTime	   : 	lectureResult[ii].lt_endTime,
                    lt_title			 :	  lectureResult[ii].lt_title,
                    modules         : []
                }
                tempModules = {
                    lm_idx                 : lectureResult[ii].lm_idx,
                    lm_startTime       : lectureResult[ii].lm_startTime,
                    lm_endTime        : lectureResult[ii].lm_endTime,
                    lm_title                : lectureResult[ii].lm_title,
                    lm_text                : lectureResult[ii].lm_text,
                    lm_type               : lectureResult[ii].lm_type
                }

                 // 세션모델
                if( lectureResult[ii].ls_idx != null ){
                    if (ii==0) { // 첫번째 값 확인
                        sessions.push(tempSessions)
                        sessionCount=sessionCount<0? 0 : sessionCount+1
                        // 시간표모델
                        if( lectureResult[ii].lt_idx != null ){
                            sessions[sessionCount].timetables.push(tempTimetables)
                            timetableCount=timetableCount<0? 0 : timetableCount+1
                            // 강의모듈 모델
                            if( lectureResult[ii].lm_idx != null ){
                                sessions[sessionCount].timetables[timetableCount].modules.push(tempModules)
                                moduleCount=moduleCount<0? 0 : moduleCount+1
                            }// 강의모듈 모델

                        }// 시간표모델


                    }else{
                        if ( lectureResult[ii-1].ls_idx  !=  lectureResult[ii].ls_idx ) {// 같은세션 찾기
                            sessions.push(tempSessions)
                            sessionCount=sessionCount<0? 0 : sessionCount+1
                            timetableCount=-1
                        }

                        // 시간표모델
                        if( lectureResult[ii].lt_idx != null ){ // Null이 아닌경우
                            //전 아이디와 다를경우 푸시
                            if( lectureResult[ii].lt_idx != lectureResult[ii-1].lt_idx ){
                                sessions[sessionCount].timetables.push(tempTimetables)
                                timetableCount=timetableCount<0? 0 : timetableCount+1
                            }

                            // 강의모듈 모델
                            if( lectureResult[ii].lm_idx != null ){
                                if( lectureResult[ii].lm_idx !=lectureResult[ii-1].lm_idx ){
                                    sessions[sessionCount].timetables[timetableCount].modules.push(tempModules)
                                }
                            }// 강의모듈 모델

                        }// 시간표모델


                    }// else

                }// 세션모델

            }// for - 모델만들기



            // KPI쿼리
            connection.query(q.kpi, [lec_idx], (kpiErr, kpiResult)=>{
                if(kpiErr){ // Error
                    connection.release()
                    console.log(kpiErr);
                    return res.status(500).send({result : 'kpiErr'})
                }

                // 참여기업
                connection.query(q.companies, [lec_idx], (companiesErr, companiesResult)=>{
                    if(companiesErr){ // Error
                        connection.release()
                        console.log(companiesErr);
                        return res.status(500).send({result : 'companiesErr'})
                    }

                    // 그룹
                    connection.query(q.group, [lec_idx], (groupErr, groupResult)=>{
                        if(groupErr){ // Error
                            connection.release()
                            console.log(groupErr);
                            return res.status(500).send({result : 'groupErr'})
                        }

                        // 수강생
                        connection.query(q.students, [lec_idx], (studentsErr, studentsResult)=>{
                            if(studentsErr){ // Error
                                connection.release()
                                console.log(studentsErr);
                                return res.status(500).send({result : 'studentsErr'})
                            }

                            connection.release()
                            lecture.sessions = sessions
                            res.send(200, {
                                result               :'success',
                                lecture             : lecture,
                                companies      : companiesResult,
                                groups            : groupResult,
                                students         : studentsResult,
                                kpi                  : kpiResult
                            })// send

                        })// 수강생
                    })// 그룹
                })// 참여기업
            })// KPI쿼리


        })// conn
    })// pool


})
// ====== 강의상세 ====== //








// ====== 강의등록 확인 - complete ====== //
router.post('/complete',  (req, res, next)=>{
    // var studentsCount = req.body.completeData.count //학생수
    // var sessionCount = req.body.completeData.sessionCount // 세션수
    var usr_idx = req.user.user.tutor_idx // 강사 아이디
    var lec_idx = req.body.lec_idx // 강의 아이디

    var completeSQL = `UPDATE lecture SET lec_flag='승인대기' WHERE lec_idx=? and tutor_idx=?`

    pool.getConnection((er,connection)=>{
        connection.query(completeSQL, [lec_idx, usr_idx], (completeErr, completeResult)=>{
            connection.release()
            if( completeErr ){
                console.log(completeErr);
                res.send(500, {result:'completeErr'})
                return
            }

            res.send(200, { result : 'success' })
        }) // connection
    }) // pool

})
// ====== 강의등록 확인 - complete ====== //











/*

(O) : 완료
(Dev) : 수정중
(X) : 수정전

*/



// ====== (O) 신규강의 - 강의개요 : lecture ====== //
router.post('/create/summary', (req, res, next)=>{
    var da = req.body
    var sql = "INSERT INTO  `lecture` SET ?"
    da.tutor_idx = req.user.user.tutor_idx
    da.lec_title = da.lec_title ? da.lec_title : '[임시저장] 저장시간 : '+new Date()

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        conn.query(sql , [da] , (err, result)=>{
            if ( err ) {
                connection.release()
                console.log(err)
                res.status(500).send({msg:'Error - '})
                return
            }// if

            connection.release()
            res.status(200).send({
                msg : 'success',
                data : result,
                lec_idx : result.insertId
            })
        })// conn

    }) // pool

})


router.put('/create/summary', (req, res, next)=>{
    var lec_id = req.body.lec_idx
    var da = req.body
    var sql = "UPDATE `lecture` SET ? WHERE lec_idx=?"

    da.tutor_idx = req.user.user.tutor_idx
    da.lec_title = (da.lec_title) ? da.lec_title : '[임시저장] 저장시간 : '+new Date()


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        connection.query(sql , [da, lec_id] , (err, result)=>{
            if ( err ) {
                connection.release()
                console.log(err);
                res.status(500).send({msg:'Error - '})

                return
            }// if
            // console.log(result);

            connection.release()
            res.status(200).send({
                msg : 'success',
                data : result
            })
        })// conn

    })

})
// ====== 신규강의 - 강의개요 : lecture ====== //











// ====== (O) 신규강의 - APL기간 : lecture_session ====== //

// 신규
router.post('/create/aplterm', (req, res, next)=>{
    var tutor_idx = req.user.user.tutor_idx
    var lec_idx = req.body.lec_idx
    var da = req.body.terms
    var deleteSQL = "DELETE FROM lecture_session WHERE lec_idx=?" // 임시 정보 생성쿼리
    var lectureSummarySQL = "INSERT INTO  `lecture` SET lec_title=?, tutor_idx=?, lec_flag='임시저장'" // 임시 정보 생성쿼리
    var lectureSessionSQL = "INSERT INTO  lecture_session( lec_idx, ls_startDate, ls_endDate, ls_location) VALUES ?"


    var tempSessions = [] // 세션
    var time; // 세션강의시간




    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }


    if (lec_idx<0) {
        var temp = "[임시저장] 저장시간 : "+ new Date()

        connection.query(lectureSummarySQL, [temp, tutor_idx],(er, summaryResult)=>{
            if (er) {
                connection.release()
                console.log(er);
                res.status(500).send({ msg : 'Error'  })
                return
            }// return

            // 다중저장 형식
            for(var ii in da.sessionDetail){
                // ls_time 저장형식
                tempSessions.push([
                    summaryResult.insertId,
                    da.sessionDetail[ii].ls_startDate,
                    da.sessionDetail[ii].ls_endDate,
                    da.sessionDetail[ii].ls_location,
                    // time
                ])
            }//for



            connection.query(lectureSessionSQL , [tempSessions] , (err, result)=>{
                if ( err ) {
                    connection.release()
                    console.log(err);
                    res.status(500).send({msg:'Error - '})

                    return
                }// if
                connection.release()
                res.status(200).send({
                    msg : 'success',
                    sessions_idx : result.insertId
                })
            })// conn

        })// conn



    }else{
        // 다중저장 형식
        for(var ii in da.sessionDetail){
            tempSessions.push([
                lec_idx,
                da.sessionDetail[ii].ls_startDate,
                da.sessionDetail[ii].ls_endDate,
                da.sessionDetail[ii].ls_location,
                // time
            ])
        }//for


        connection.query(deleteSQL, lec_idx, (deleteErr , deleteResult)=>{
            connection.query(lectureSessionSQL , [tempSessions] , (err, result)=>{
                if ( err ) {
                    connection.release()
                    console.log(err);
                    res.status(500).send({msg:'Error - '})
                    return
                }// if

                connection.release()
                res.status(200).send({
                    msg : 'success',
                    session_idx : result.insertId
                })

            })// connection
        })// conn

    }// else


    })// pool

})
// ====== 신규강의 - APL기간 : lecture_session ====== //












// ====== (Dev)신규강의 - 상세시간표 : lecture_timetable ====== //
router.post('/create/timetable', (req, res, next)=>{
    var lec_idx    = req.body.lec_idx
    var ls_idx    = req.body.ls_idx
    var timetableFlag    = req.body.timetableFlag
    var da = req.body

    // console.log('Lectur id : ', lec_idx);
    // console.log('timetableFlag : ', timetableFlag);

    // 입력 전 삭제
    var deleteTimetableSQL = "DELETE LT FROM lecture_timetable as LT, lecture_session as LS WHERE LS.lec_idx=? and LS.ls_idx=LT.ls_idx"

    // 신규 시간표
    var insertTimetableSQL = "INSERT INTO  lecture_timetable( lt_startTime, lt_endTime, lt_title, ls_idx ) VALUES ?"

    // 신규 모듈
    var insertModuleSQL = "INSERT INTO  lecture_module( lm_title, lm_text, lm_startTime, lm_endTime, lm_type, lt_idx ) VALUES ?"

    // 세션정보 업데이트(제목, 시간)
    var updateSessionSQL = "UPDATE lecture_session SET ls_title=?, ls_startTime=?, ls_endTime=?  WHERE ls_idx=?; "


    var tempSessions        = new Array() // 업데이트 데이터
    var tempTimetables    = new Array() // 신규 데이터
    var tempModules        = new Array() // 신규 데이터
    var startTime = endTime =''// 시간

    var sessionsQ=''


    // 데이터 모델 만들기
    var sessions //임시저장 세션
    var timetables // 임시저장 시간표
    var modules // 임시저장 모듈

    for(var ii in da.sessionDetail){
        sessions = da.sessionDetail[ii]
        // 시간설정
        startTime = sessions.ls_startTime
        endTime  = sessions.ls_endTime


        // 업데이트 데이터 - 일괄쿼리
        sessionsQ += mysql.format(updateSessionSQL, [
            sessions.ls_title,     // 세션제목
            startTime ? startTime : '',              // 시작시간
            endTime ? endTime : '',               // 종료시간
            sessions.ls_idx       // 세션아이디
        ])


            // 시간표목록 반복
            for(var jj in sessions.timetables){
                timetables = sessions.timetables[jj]
                tempTimetables.push([
                    timetables.lt_startTime,
                    timetables.lt_endTime,
                    timetables.lt_title,
                    sessions.ls_idx
                ])
            }// 시간표목록 반복


        ls_idx++

    }// for



    // 쿼리
    pool.getConnection((err, connection)=>{
        if (err) {
            connection.release()
            throw er
            return
        }

        // UPDATE 쿼리
        connection.query(sessionsQ , (updateErr, updateResult)=>{
            if(updateErr){
                connection.release()
                console.log(updateErr)
                res.status(500).send({msg:'Error - '})
                return
            }// if

        })// UPDATE 쿼리



        // DELETE 쿼리
        connection.query(deleteTimetableSQL, [lec_idx], (deleteErr, deleteResult)=>{
            if ( deleteErr ) {
                connection.release()
                console.log(deleteErr);
                res.status(500).send({msg:'Error - '})
                return
            }// if

            // 시간표가 있을경우 쿼리 실행 or timetableFlag가 참일경우만
            if(tempTimetables.length < 1  ||  tempTimetables == undefined || timetableFlag==false){
                console.log('endendendendend');
                connection.release()
                res.status(200).send({ msg : 'success'})
                return

            }else{
                // INSERT 쿼리
                connection.query(insertTimetableSQL , [tempTimetables] , (insertTimetablesErr, insertTimetablesResult)=>{
                    if ( insertTimetablesErr ) {
                        connection.release()
                        console.log(insertTimetablesErr);
                        res.status(500).send({msg:'Error - '})
                        return
                    }// if

                    console.log('insertTimetablesResult.insertId : ' ,insertTimetablesResult.insertId);


                    // 강의모듈 만들기
                    for(var ii  in  da.sessionDetail){ // #1
                        for(var jj  in  da.sessionDetail[ii].timetables){ // #2
                            for(var kk  in  da.sessionDetail[ii].timetables[jj].modules){// #3
                                modules = da.sessionDetail[ii].timetables[jj].modules[kk]
                                console.log(modules);
                                tempModules.push([
                                    modules.lm_title,
                                    modules.lm_text,
                                    modules.lm_startTime,
                                    modules.lm_endTime,
                                    modules.lm_type =='lecture'? '강의' : (modules.lm_type=='debate' ? '토론' : '미션'),
                                    insertTimetablesResult.insertId
                                ])
                            }// for #3
                            insertTimetablesResult.insertId++
                        }// for #2
                    }// for #1

                    // console.log(modules);


                    // 강의모듈이 없는경우 종료
                    if(tempModules.length < 1  ||  tempModules == undefined){
                        connection.release()
                        res.status(200).send({ msg : 'success'})
                        return
                    }

                    connection.query(insertModuleSQL, [tempModules], (insertModuleErr, insertModuleResult)=>{
                        connection.release()
                        if(insertModuleErr){
                            console.log(insertModuleErr);
                            res.send(500, {result: 'insertModule - failed'})
                            return
                        }

                        res.status(200).send({ msg: 'success' ,  insertId: insertTimetablesResult.insertId })
                    })// conn

                })// conn
            }// else

        })// conn

    })

})
// ====== 신규강의 - 상세시간표 : lecture_timetable ====== //











// ====== (O)신규강의 - KPI : lecture_kpi ====== //
router.post('/create/kpi', (req, res, next)=>{
    var flag = req.body.flag // 신규/수정 여부확인용 플래그
    var lec_idx    = req.body.lec_idx
    var da = req.body.kpi

    var deleteSQL = "DELETE FROM lecture_kpi WHERE lec_idx=?"
    var insertSQL = "INSERT INTO lecture_kpi(cc2_idx, lec_idx) VALUES ?"

    /*
     * 일단보류 - update시 로직 생각해야함
    */


    var tempKpi=[]
    for(var ii in da){
        tempKpi.push([ da[ii].cc2_idx  ,  lec_idx ])
    }// for

    console.log(tempKpi);

    pool.getConnection((err, connection)=>{
        connection.query(deleteSQL, lec_idx, (err)=>{
            connection.query(insertSQL, [tempKpi], (sqlErr, result)=>{
                if(sqlErr){
                    console.log(sqlErr);
                    res.status(500).send({result:'Error - '})
                }// if
                else{
                    res.status(200).send({result:'success'})
                }// else

            })
        })

        connection.release()
    })// pool




})// ====== 신규강의 - KPI : lecture_kpi ====== //












// ====== (O) 신규강의 - 매니저&참여기업 : company_manager ====== //
router.post('/create/manager', (req, res, next)=>{
    //  lec_idx, com_code, mg_name, mg_phone, mg_position //
    var deleteSQL = "DELETE FROM company_manager WHERE lec_idx=?"
    var insertSQL  = "INSERT INTO  `company_manager` (mg_name, mg_phone, com_code, lec_idx) VALUES ?"
    var studentsDeleteSQL = `DELETE FROM registration WHERE lec_idx=?`
    var studentsSQL = `INSERT INTO  registration(
        stu_name,
        stu_phone,
        stu_department,
        stu_position,
        stu_attendance,
        com_code,
        lec_idx
    ) VALUES ?`

    var lec_idx                 = req.body.lec_idx // 강의아이디
    var da                        = req.body.companies // 업체정보
    var students              = req.body.students // 업체정보
    var sessionCount      = req.body.sessionCount // 차시 카운트 - 출석부만들기 위해서 필요


    var tempManager = new Array()
    var tempStudents = new Array()
    var tempAttendance=''


    // 매니저정보
    for(var ii in da){
        tempManager.push([
            da[ii].com_managerName,
            da[ii].com_managerPhone,
            da[ii].com_code,
            lec_idx
        ])
    }// for - 매니저정보


    // 출석카운트 만들기
    tempAttendance='['
    for(var ii=0;   ii<sessionCount;   ii++){
        if(ii != 0)
            tempAttendance+= ','
        tempAttendance+= '0'
    }
    tempAttendance+=']'


    // 수강생
    for(var ii in students){
        tempStudents.push([
            students[ii].stu_name,
            students[ii].stu_phone,
            students[ii].stu_department==undefined ? '' : students[ii].stu_department,
            students[ii].stu_position==undefined ? '' : students[ii].stu_position,
            tempAttendance,
            students[ii].com_code,
            lec_idx
        ])
    }// 수강생

    // console.log(tempManager);

    pool.getConnection((er, connection)=>{
        if (er) {
            throw er
            return
        }
        // 삭제쿼리
        connection.query(deleteSQL, lec_idx, (deleteErr, deleteResult)=>{
            if ( deleteErr ) {
                console.log(deleteErr);
                res.status(500).send({msg:'Error - '})
                return
            }// if

            // 삽입쿼리
            connection.query(insertSQL , [tempManager] , (err, result)=>{
                if ( err ) {
                    console.log(err);
                    res.status(500).send({msg:'Error - '})
                    return
                }// if


                //수강생 삭제쿼리
                connection.query(studentsDeleteSQL, [lec_idx], (stdDeleteErr, stdDeleteResult)=>{

                    // 수강생 입력쿼리
                    connection.query(studentsSQL, [tempStudents], (stdErr, studentsResult)=>{
                        if ( stdErr ) {
                            console.log(stdErr);
                            res.status(500).send({msg:'Error - '})
                            return
                        }

                        // 응답코드
                        res.status(200).send({
                            msg : 'success',
                            managerIdx : result.insertId,
                            studentsIdx: studentsResult.insertId
                        })

                    })// 학생 입력쿼리

                })//수강생 삭제쿼리

            })// 삽입쿼리

        })// 삭제쿼리

        connection.release()
    }) // pool


})
// ====== 신규강의 - 매니저&참여기업 : company_manager ====== //












// ====== (O)신규강의 - 그룹 등록 : group ====== //
router.post('/create/group', (req, res, next)=>{
    var lec_idx    = req.body.lec_idx
    var da = req.body

    var deleteSQL = "DELETE FROM `group` WHERE lec_idx=?"
    var insertSQL = "INSERT INTO  `group`( group_name, group_text, lec_idx ) VALUES ?"
    var updateInitSQL = `UPDATE  registration SET group_idx=NULL WHERE lec_idx = ?`



    var tempGroups = [] //강의 내 팀
    for( var ii in da.teams ) {
        tempGroups.push([
            da.teams[ii].name,
            da.teams[ii].description,
            lec_idx
        ])
    }// for


    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }
        // 수강생 그룹아이디 초기화 쿼리
        connection.query(updateInitSQL, [lec_idx], (updateInitErr)=>{
            if ( updateInitErr ) {
                console.log(updateInitErr);
                connection.release()
                res.status(500).send({msg:'Error - updateInitSQL'})
                return
            }// if


            // 그룹삭제 쿼리
            connection.query(deleteSQL, [lec_idx], (deleteErr, deleteResult)=>{
                if ( deleteErr ) {
                    console.log(deleteErr);
                    connection.release()
                    res.status(500).send({msg:'Error - deleteErr'})
                    return
                }// if


                // 생성된 그룹이 없을경우
                if(tempGroups.length < 1){
                    connection.release()
                    res.status(200).send({result:'success'})
                    return
                }


                // INSERT
                connection.query(insertSQL , [tempGroups] , (err, groupResult)=>{
                    if ( err ) {
                        console.log(err);
                        connection.release()
                        res.status(500).send({msg:'Error - '})
                        return
                    }// if

                    var groupIdx = groupResult.insertId // 그룹 INSERT 아이디
                    var stdUpdate = '';
                    for(var ii  in  da.teams){
                        if(da.teams[ii].students != undefined && da.teams[ii].students != null){
                            for(var jj  in  da.teams[ii].students){ // 그룹아이디 맵핑
                                // DB포맷 맞추기
                                stdUpdate += mysql.format('UPDATE registration SET group_idx=? WHERE stu_idx=?; ', [
                                    groupIdx,
                                    da.teams[ii].students[jj].stu_idx
                                ])
                            }// for
                        }// if
                        groupIdx++
                    }// for



                    // 그룹아이디 맵핑 쿼리
                    connection.query(stdUpdate, (stdUpdateErr, stdUpdateResult)=>{
                        if ( stdUpdateErr ) {
                            console.log(stdUpdateErr);
                            connection.release()
                            res.status(500).send({msg:'Error - stdUpdateErr'})
                            return
                        }// if

                        // 응답코드
                        connection.release()
                        res.status(200).send({ msg : 'success', data : groupResult, insertIdx: groupIdx })

                    })// 그룹아이디 맵핑 쿼리

                })// conn
            })// 그룹삭제 쿼리

        })// 수강생 그룹아이디 초기화 쿼리

    })// pool


})// ====== 신규강의 - 그룹 등록 : group ====== //









// ====== (O)신규강의 - 수강생 등록 : registration ====== //
router.post('/create/aplterm', (req, res, next)=>{
    var flag = req.body.flag // 신규/수정 여부확인용 플래그
    var lec_idx    = req.body.lec_idx
    var da = req.body
    var sql = "INSERT INTO  registration( stu_department, stu_position, stu_name, stu_attendance, stu_score, com_code, lec_idx, group_idx ) VALUES ?"


    var tempStudents = []

    // 팀이 있는 수강생
    for( var ii in da.team.teams ) {
        for( var jj in da.team.teams[ii].students ) {
            tempStudents.push([
                // da.team.teams[ii].students[jj].company,
                da.team.teams[ii].students[jj].department,
                da.team.teams[ii].students[jj].position,
                da.team.teams[ii].students[jj].name,
                '[]', // 출석표
                da.team.teams[ii].students[jj].companyCode,
                lec_idx,
                groupId
            ])
        }// for
        groupId++
    }// for


    conn.query(sql , [tempSessions] , (err, result)=>{
        if ( err ) {
            res.status(500).send({msg:'Error - '})
            return
        }// if

        res.status(200).send({ msg : 'success', data : result })
    })// conn

})// ====== 신규강의 - 수강생 등록 : registration ====== //





























// ====== (O)임시저장강의 목록 ====== //
router.get('/temp', (req, res, next)=>{
    let tid = req.user.user.tutor_idx;
    let q   = `
    SELECT
        lec_idx,
        lec_title,
        lec_sessionCount,
        lec_personnel,
        date_format(lec_startDate, '%Y년 %c월 %d일') as lec_startDate
    FROM
        lecture
    WHERE
        tutor_idx=? and lec_flag='임시저장'`;
    conn.query(q, tid, (e, rows)=>{
        if (e) {
            console.log(e);
            return res.send(500, {result:'error'});
        }
        console.log(rows);
        res.send(200, {result:'success', tempLectures:rows})
        return;
    });
})
// ====== 임시저장강의 목록 ====== //








// ====== (O)저장된 강의 불러오기 ====== //
router.get('/temp/:lid', (req, res, next)=>{
    let tutor_id = req.user.user.tutor_idx;
    let lecture_id = req.params.lid;
    let q   = "select * from lecture where tutor_idx=? and lec_idx=?";

    conn.query(q, [tutor_id, lecture_id], (e, row)=>{
        if (e) {
            console.log(e);
            return res.send(500, {result:'error'});
        }
        res.send(200, {result:'success', data:row[0]})
        return;
    });
})
// ====== (O)저장된 강의 불러오기 ====== //












// ====== (O) KPI 불러오기 ====== //
router.get('/kpi', (req, res, next)=>{
    var sql = `
    SELECT *
    FROM capability_category2 CC2, capability_category1 CC1
    WHERE CC1.cc1_idx = CC2.cc1_idx
    ORDER BY CC2.cc1_idx ASC`

    var sss = `select * from capability_category2`

    var mainCategory=[];    // 대분류
    var category=[];            // 카테고리
    var temp=[];


    conn.query(sql, (err, result)=>{
        if (err) {
            console.log(err);
            res.status(500).send({ result: 'Error' })
            return
        }

        console.log(result);
        // 대분류 카테고리 만들기
        for ( var ii in result ) {
            if(ii>0){
                if (result[ii-1].cc1_idx != result[ii].cc1_idx ) {
                    mainCategory.push(result[ii])
                }
            }else{
                mainCategory.push(result[ii])
            }
        }

        // 소분류넣기
        var ddd;
        for(var i in mainCategory){
            mainCategory[i].list = new Array()
            for(var j in result){
                ddd = JSON.stringify(result[j])
                if (mainCategory[i].cc1_idx == result[j].cc1_idx) {
                    mainCategory[i].list.push(JSON.parse(ddd))
                }// if
            }
        }



        res.status(200).send({
            status : 200,
            msg : 'success',
            mainCategory: mainCategory,
            category: result
        })//response
    })// conn
})




// Excel => JSON변환
router.post('/xlsToJson/:sheetNumber', (req,res,next)=>{

    let data = req.body;                                                // 바디
    let fi = req.files.file;                                                // 파일원본
    let fileName = fi.name;                                          // 파일명
    let excelData = null;                                               // 엑셀데이터
    let sheetNumber = req.params.sheetNumber;     // 선택한 시트
    let fileExtension = fileName.substring( fileName.lastIndexOf('.')+1 ); // 확장자
    // console.log("확장자: ", fileExtension);

    if (fileExtension != "xlsx" && fileExtension != "xls" ) {
        res.status(204).send({
            result:204, // 지원하지 않는 요청
            message: "File extention is not excel"
        })
        return
    }
    obj = xlsx.parse(fi.data);  // 엑셀 파싱


    res.status(200).send({
        result:200,
        message: "success",
        data:{
            obj: obj[sheetNumber]
        }
    });
});




















// TEST
router.get('/call/test', (req,res,next)=>{

    res.status(200).send({
        result:200,
        message: "success"
    });
});










module.exports = router;
