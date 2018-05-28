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



// conn.connect()




/*

(O) : 완료
(Dev) : 수정중
(X) : 수정전

*/




// ====== (O) APL강의 목록 ====== //
router.get('/', (req, res, next)=>{
    let usr_idx = req.user.user.tutor_idx; // 유저아이디
    let q =`
    SELECT
        L.lec_idx,
        L.lec_title,
        L.lec_flag,
        date_format(L.lec_startDate, '%Y-%m-%d') as lec_startDate,
        date_format(L.lec_endDate, '%Y-%m-%d') as lec_endDate,
        (select count(*) from lecture_session LS where LS.lec_idx=L.lec_idx) as lec_sessionCount,
		(select count(*) from registration R where R.lec_idx=L.lec_idx) as lec_personnel
    FROM
        lecture L,
        tutor T
    WHERE
        T.tutor_idx = L.tutor_idx and T.tutor_idx=?
    `

    var lecParameter = [usr_idx]
    // console.log('req.query.lecType : ',req.query.lecType);

    // 쿼리스트링여부 - 강의타입 필터링
    if(req.query.lecType){
        // 강의전 , 진행중은 하나로 표기
        if (req.query.lecType==='진행중' || req.query.lecType==='진행중') {
            console.log('111111111');
            q += " and (L.lec_flag='강의전' or L.lec_flag=?)"
        }else{
            q += " and (L.lec_flag=?) "
        }
        lecParameter.push(req.query.lecType)
    }

    // console.log();

    pool.getConnection((er, connection)=>{
        connection.query(q, lecParameter,(e, rows)=>{
            connection.release()
            if (e) {
                console.log(e);
                return res.send(500, {result:e, data:{}});
            }
            // console.log(rows);
            res.send(200, {result:'success', data:rows});
        })// conn
    }) // pool

});
// ====== (O) APL강의 목록 ====== //











// ====== (O) APL강의 삭제 ====== //
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
// ====== (O) APL강의 삭제 ====== //











// ====== (Dev) 강의상세 - 신규 TEST ====== //
router.get('/detail/:id', (req, res, next)=>{

    // 파라미터
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var lec_idx = req.params.id // 강의아이디
    var type = req.query.type==undefined ? `%Y년 %m월 %d일` : '%Y-%m-%d'

    // 쿼리
    var q={
        group : "SELECT * FROM `group` WHERE lec_idx=? ORDER BY group_idx ASC",

        students : `
            SELECT *
            FROM
                company C ,
                registration R
            WHERE
            R.lec_idx=? and R.com_code=C.com_code`,

        companies : `
            SELECT *
            FROM
                company_manager CM,
                company C
            WHERE
                CM.lec_idx=? and CM.com_code=C.com_code`,

        departments: `
            SELECT
                R.stu_department
            FROM
                registration R
            WHERE
                R.lec_idx = ? GROUP BY R.stu_department`,

        position: `
            SELECT
                stu_position
            FROM
                registration
            WHERE
                lec_idx = ? GROUP BY stu_position`,

        kpi : `
            SELECT
                LK.lk_idx,
                CC2.cc2_idx,
                CC2.cc2_name
            FROM
                lecture_kpi LK,
                capability_category2 CC2
            WHERE
                LK.lec_idx=? and CC2.cc2_idx=LK.cc2_idx`,

        lecture      : `
            SELECT
            	L.lec_idx,
            	date_format(L.lec_startDate, '`+type+`') as lec_startDate,
            	date_format(L.lec_endDate, '`+type+`') as lec_endDate,
            	L.lec_title,
            	L.lec_personnel,
            	L.lec_target,
            	L.lec_time,
            	L.lec_content,
            	L.lec_goal,
            	L.lec_effect,
            	L.lec_file,
            	L.lec_flag,
            	L.lec_sessionCount,
            	L.lec_serialNo,

            	LS.ls_idx,
            	LS.ls_title,
            	LS.ls_location,
            	LS.ls_seq,
            	LS.ls_timetableFlag,
                date_format(LS.ls_aplDate, '%Y-%m-%d') as ls_aplDate,
                date_format(LS.ls_startDate, '%Y-%m-%d')  as  ls_startDate,
                date_format(LS.ls_endDate,   '%Y-%m-%d')  as  ls_endDate,
            	date_format(LS.ls_startTime, '%H:%i')  as  ls_startTime,
            	date_format(LS.ls_endTime, 	 '%H:%i')  as  ls_endTime,

            	LSC.lsc_idx,
            	LSC.lsc_title,
                date_format(LSC.lsc_date, '%Y-%m-%d')  as  lsc_date,

            	LT.lt_idx,
            	LT.lt_title,
            	date_format(LT.lt_startTime	, '%H:%i')  as  lt_startTime,
            	date_format(LT.lt_startTime	, '%H:%i')  as  lt_endTime,

            	LM.lm_idx,
            	LM.lm_title,
                LM.lm_text,
                LM.lm_type,
                LM.lm_teacher,
                date_format(LM.lm_startTime, '%H:%i')  as  lm_startTime,
                date_format(LM.lm_endTime, 	 '%H:%i')  as  lm_endTime,
                (
					SELECT COUNT(*)
                    FROM lecture_comment LC
                    WHERE LM.lm_idx = LC.lm_idx AND LC.lc_img <> ''
                ) as lm_textCount,
                (
					SELECT COUNT(*)
                    FROM lecture_comment LC
                    WHERE LM.lm_idx = LC.lm_idx AND LC.lc_text <> ''
                ) as lm_imgCount,

                LC.lc_idx,
                LC.stu_idx,
                LC.lc_flag,
                LC.lc_date,
                LC.lc_text,
                LC.lc_img,
                R.stu_name

            FROM
                lecture L
                LEFT JOIN lecture_session LS
                    ON L.lec_idx = LS.lec_idx
                LEFT JOIN lecture_session_class LSC
                    ON LS.ls_idx = LSC.ls_idx
                LEFT JOIN lecture_timetable LT
                    ON LSC.lsc_idx =LT.lsc_idx
                LEFT JOIN lecture_module LM
                    ON LT.lt_idx = LM.lt_idx
                LEFT JOIN lecture_comment LC
                	ON LM.lm_idx=LC.lm_idx
            	LEFT join registration R
            		ON LC.stu_idx = R.stu_idx
            WHERE
                L.lec_idx=? and L.tutor_idx=? `
    }// q

    var lecture;
    var sessions = []
    var sessionClass = []
    var timetables = []
    var modules = []

    // 임시저장소 - 푸시할 데이터 임시보관: 중복방지
    var tempSessions = []
    var tempClass = []
    var tempTimetables = []
    var tempModules = []
    var tempComments = []

     // 현재 돌고있는 차시의 배열 - 차시가 push될 때 차시의 번지수를 기억함
    var sessionCount            = -1,
          sessionClassCount    = -1,
          timetableCount        = -1,
          moduleCount           = -1




    pool.getConnection((er, connection)=>{
        connection.query(q.lecture, [lec_idx, usr_idx], (lectureErr, lectureResult)=>{
            if(lectureErr){ // Error
                connection.release()
                console.log(lectureErr);
                return res.status(500).send({result : 'lectureErr'})
            }


            // 결과값이 없는경우 end
            if ( lectureResult.length<1 ) {
                console.log(lectureResult);
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
                lec_serialNo               : lectureResult[0].lec_serialNo,
                sessions : []
            }// lecture




            // 모델 만들기
            var keys = Object.keys(lectureResult)
            var leng = lectureResult.length-1

            console.log("lectureResult : ", lectureResult.length);
            for(var ii  in  lectureResult){

                // 회차
                if(lectureResult[ii].ls_idx != null){
                    var ddd = {
                        ls_idx                  : lectureResult[ii].ls_idx,
                        ls_startDate        : lectureResult[ii].ls_startDate,
                        ls_endDate         : lectureResult[ii].ls_endDate,
                        ls_aplDate          : lectureResult[ii].ls_aplDate,
                        ls_title                 : lectureResult[ii].ls_title,
                        ls_location          : lectureResult[ii].ls_location,
                        ls_seq                 : lectureResult[ii].ls_seq,
                        ls_timetableFlag : lectureResult[ii].ls_timetableFlag,
                        ls_startTime        : lectureResult[ii].ls_startTime,
                        ls_endTime         : lectureResult[ii].ls_endTime,
                        sessionClass        : []
                    }
                    if (tempSessions.length<1) {
                        tempSessions.push(ddd)
                    }else{
                        if (lectureResult[ii-1].ls_idx  != lectureResult[ii].ls_idx)
                            tempSessions.push(ddd)
                    }

                }

                // 집합교육
                if(lectureResult[ii].lsc_idx != null){
                    var lsc = {
                        ls_idx         : lectureResult[ii].ls_idx,
                        lsc_idx         : lectureResult[ii].lsc_idx,
                        lsc_title        : lectureResult[ii].lsc_title,
                        lsc_date       : lectureResult[ii].lsc_date,
                        timetables    : []
                    }
                    if (tempClass.length<1) {
                        tempClass.push(lsc)
                    }else{
                        if (lectureResult[ii-1].lsc_idx  != lectureResult[ii].lsc_idx)
                            tempClass.push(lsc)
                    }

                }

                // 시간표
                if(lectureResult[ii].lt_idx != null){
                    var lt = {
                        lsc_idx			     :	 lectureResult[ii].lsc_idx,
                        lt_idx			     :	 lectureResult[ii].lt_idx,
                        lt_startTime    :	 lectureResult[ii].lt_startTime,
                        lt_endTime	   : 	lectureResult[ii].lt_endTime,
                        lt_title			 :	  lectureResult[ii].lt_title,
                        modules         : []
                    }

                    if (tempTimetables.length<1) {
                        tempTimetables.push(lt)
                    }else{
                        if (lectureResult[ii-1].lt_idx  != lectureResult[ii].lt_idx)
                            tempTimetables.push(lt)
                    }
                }

                // 강의모듈
                if(lectureResult[ii].lm_idx != null){
                    var lm = {
                        lt_idx                   : lectureResult[ii].lt_idx,
                        lm_idx                 : lectureResult[ii].lm_idx,
                        lm_startTime       : lectureResult[ii].lm_startTime,
                        lm_endTime        : lectureResult[ii].lm_endTime,
                        lm_title                : lectureResult[ii].lm_title,
                        lm_text                : lectureResult[ii].lm_text,
                        lm_teacher          : lectureResult[ii].lm_teacher,
                        lm_textCount      : lectureResult[ii].lm_textCount,
                        lm_imgCount      : lectureResult[ii].lm_imgCount,
                        lm_type                : lectureResult[ii].lm_type,
                        comments            : []
                    }
                    if (tempModules.length<1) {
                        tempModules.push(lm)
                    }else{
                        if (lectureResult[ii-1].lm_idx  != lectureResult[ii].lm_idx)
                            tempModules.push(lm)
                    }
                }

                // 강의코멘트
                if(lectureResult[ii].lc_idx != null){
                    var lc = {
                        lm_idx          : lectureResult[ii].lm_idx,
                        lc_idx            : lectureResult[ii].lc_idx,
                        stu_idx          : lectureResult[ii].stu_idx,
                        lc_flag           : lectureResult[ii].lc_flag,
                        lc_date          : lectureResult[ii].lc_date,
                        lc_text           : lectureResult[ii].lc_text,
                        lc_img           : lectureResult[ii].lc_img,
                    }
                    if (tempComments.length<1) {
                        tempComments.push(lc)
                    }else{
                        if (lectureResult[ii-1].lc_idx  != lectureResult[ii].lc_idx)
                            tempComments.push(lc)
                    }
                }

            }// for - 모델만들기




            // res.send({
            //     tempSessions,
            //     tempClass,
            //     tempTimetables,
            //     tempModules,
            // })
            // return






            var sleng, cleng, tleng, mleng, cmleng;
            for(var sid  in  tempSessions){ // tempSessions

                for(var cid  in tempClass){ // tempClass
                    if (tempSessions[sid].ls_idx  ===  tempClass[cid].ls_idx){
                        tempSessions[sid].sessionClass.push(tempClass[cid])

                        cleng = tempSessions[sid].sessionClass.length-1
                        for(var tid  in  tempTimetables){ // tempTimetables
                            if (tempSessions[sid].sessionClass[cleng].lsc_idx  ===  tempTimetables[tid].lsc_idx){
                                tempSessions[sid].sessionClass[cleng].timetables.push(tempTimetables[tid])

                                tleng = tempSessions[sid].sessionClass[cleng].timetables.length-1
                                for(var mid  in  tempModules){ // tempModules
                                    if (tempSessions[sid].sessionClass[cleng].timetables[tleng].lt_idx  ===  tempModules[mid].lt_idx){
                                        tempSessions[sid].sessionClass[cleng].timetables[tleng].modules.push(tempModules[mid])

                                        mleng = tempSessions[sid].sessionClass[cleng].timetables[tleng].modules.length-1
                                        for(var cmid  in  tempComments){ // tempModules
                                            if (tempSessions[sid].sessionClass[cleng].timetables[tleng].modules[mleng].lm_idx  ===  tempComments[cmid].lm_idx){
                                                console.log(tempComments[cmid]);
                                                tempSessions[sid].sessionClass[cleng].timetables[tleng].modules[mleng].comments.push(tempComments[cmid])
                                            }
                                        } // tempModules

                                    }
                                } // tempModules

                            }
                        } // tempTimetables

                    }
                } // tempClass

            } // tempSessions


            lecture.sessions=tempSessions



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

                    // 수강생의 부서찾기
                    connection.query(q.departments, [lec_idx], (departmentsErr, departmentsResult)=>{
                        if(departmentsErr){ // Error
                            connection.release()
                            console.log(departmentsErr);
                            return res.status(500).send({result : 'departmentsErr'})
                        }


                    // 직급
                    connection.query(q.position, [lec_idx], (positionErr, positionResult)=>{
                        if(positionErr){ // Error
                            connection.release()
                            console.log(positionErr);
                            return res.status(500).send({result : 'positionErr'})
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
                                res.send(200, {
                                    result               :'success',
                                    lecture             : lecture,
                                    companies      : companiesResult,
                                    departments   : departmentsResult,
                                    position           : positionResult,
                                    groups            : groupResult,
                                    students         : studentsResult,
                                    kpi                  : kpiResult
                                })// send

                            })// 수강생
                        })// 그룹
                    })// 직급
                    })// 수강생의 부서찾기
                })// 참여기업
            })// KPI쿼리


        })// conn

    })// pool


})
// ====== (Dev) 강의상세 - 신규 TEST ====== //















// ====== (O) 강의상세 - 신규 ====== //
router.get('/dt/:id', (req, res, next)=>{

    // 파라미터
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var lec_idx = req.params.id // 강의아이디

    // 쿼리
    var q={
        group           : "SELECT * FROM `group` WHERE lec_idx=? ORDER BY group_idx ASC",

        students       : `
            SELECT *
            FROM company C , registration R
            WHERE R.lec_idx=? and R.com_code=C.com_code `,

        companies   : `
            SELECT *
            FROM        company_manager CM, company C
            WHERE     CM.lec_idx=? and CM.com_code=C.com_code `,

        kpi : `
            SELECT      CC2.cc2_idx, CC2.cc2_name
            FROM        lecture_kpi LK, capability_category2 CC2
            WHERE      LK.lec_idx=? and CC2.cc2_idx=LK.cc2_idx `,
        lecture      : `
            SELECT
            	L.lec_idx 			          as 	 lec_idx,
            	L.lec_startDate 	      as 	 lec_startDate,
            	L.lec_endDate		     as 	lec_endDate,
            	L.lec_title 		           as 	  lec_title,
            	L.lec_personnel 	     as 	lec_personnel,
            	L.lec_target		        as 	   lec_target,
            	L.lec_time		             as 	lec_time,
            	L.lec_content		      as 	 lec_content,
            	L.lec_goal			         as 	lec_goal,
            	L.lec_effect		         as 	lec_effect,
            	L.lec_file			            as 	   lec_file,
            	L.lec_flag			          as 	  lec_flag,
            	L.lec_sessionCount	  as	  lec_sessionCount,

            	LS.ls_idx			           as	ls_idx,
            	LS.ls_title			            as 	ls_title,
            	LS.ls_aplDate			   as 	ls_aplDate,
            	LS.ls_location		        as	ls_location,
                date_format(LS.ls_startDate, '%Y-%m-%d')   	 as  ls_startDate,
                date_format(LS.ls_endDate,   '%Y-%m-%d')    as  ls_endDate,
            	date_format(LS.ls_startTime, '%H:%i')		        as	ls_startTime,
            	date_format(LS.ls_endTime, 	 '%H:%i')	   	       as  ls_endTime,

            	LSC.lsc_idx 		as 	lsc_idx,
            	LSC.lsc_title		as	lsc_title,
                date_format(LSC.lsc_date, '%Y-%m-%d')   	as  lsc_date,

            	LT.lt_idx			as	lt_idx,
            	LT.lt_title			as	lt_title,
            	date_format(LT.lt_startTime	, '%H:%i')		as	lt_startTime,
            	date_format(LT.lt_startTime	, '%H:%i')		as 	lt_endTime,

            	LM.lm_idx           as  lm_idx,
            	LM.lm_title         as  lm_title,
                LM.lm_text          as  lm_text,
                LM.lm_type          as  lm_type,
                date_format(LM.lm_startTime, '%H:%i')     	as  lm_startTime,
                date_format(LM.lm_endTime, 	 '%H:%i')       as  lm_endTime


            FROM lecture L
                LEFT    JOIN lecture_session LS
                ON      L.lec_idx = LS.lec_idx

                LEFT    JOIN lecture_session_class LSC
                ON      LS.ls_idx = LSC.ls_idx

                LEFT    JOIN lecture_timetable LT
                ON      LSC.lsc_idx =LT.lsc_idx

                LEFT    JOIN lecture_module LM
                ON      LT.lt_idx = LM.lt_idx


            WHERE
                L.lec_idx=? and L.tutor_idx=?     `
    }// q

    var lecture;
    var sessions = []
    var sessionClass = []
    var timetables = []
    var modules = []

    // 임시저장소 - 푸시할 데이터 임시보관: 중복방지
    var tempSessions = {}
    var tempClass = {}
    var tempTimetables = {}
    var tempModules = {}

     // 현재 돌고있는 차시의 배열 - 차시가 push될 때 차시의 번지수를 기억함
    var sessionCount            = -1,
          sessionClassCount    = -1,
          timetableCount        = -1,
          moduleCount           = -1




    pool.getConnection((er, connection)=>{
        connection.query(q.lecture, [lec_idx, usr_idx], (lectureErr, lectureResult)=>{
            if(lectureErr){ // Error
                connection.release()
                console.log(lectureErr);
                return res.status(500).send({result : 'lectureErr'})
            }


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
                sessions : []
            }// lecture


//  TEST code
            // for(var i  in  lectureResult){
            //     console.log("lectureResult.length :  ", lectureResult.length);
            //     console.log("lectureResult[ii].lt_idx : ", lectureResult[i].lt_idx);
            // }
//  TEST code


            // 모델 만들기
            for(var ii  in  lectureResult){
                // 회차
                tempSessions = {
                    ls_idx                  : lectureResult[ii].ls_idx,
                    lec_idx                : lectureResult[ii].lec_idx,
                    ls_startDate        : lectureResult[ii].ls_startDate,
                    ls_endDate         : lectureResult[ii].ls_endDate,
                    ls_aplDate          : lectureResult[ii].ls_aplDate,
                    ls_title                 : lectureResult[ii].ls_title,
                    ls_location          : lectureResult[ii].ls_location,
                    ls_startTime        : lectureResult[ii].ls_startTime,
                    ls_endTime         : lectureResult[ii].ls_endTime,
                    sessionClass        : []
                }
                // 집합교육
                tempClass = {
                    lsc_idx         : lectureResult[ii].lsc_idx,
                    lsc_title        : lectureResult[ii].lsc_title,
                    lsc_date       : lectureResult[ii].lsc_date,
                    timetables    : []
                }
                // 시간표
                tempTimetables = {
                    lt_idx			     :	 lectureResult[ii].lt_idx,
                    lt_startTime    :	 lectureResult[ii].lt_startTime,
                    lt_endTime	   : 	lectureResult[ii].lt_endTime,
                    lt_title			 :	  lectureResult[ii].lt_title,
                    modules         : []
                }
                // 강의모듈
                tempModules = {
                    lm_idx                 : lectureResult[ii].lm_idx,
                    lm_startTime       : lectureResult[ii].lm_startTime,
                    lm_endTime        : lectureResult[ii].lm_endTime,
                    lm_title                : lectureResult[ii].lm_title,
                    lm_text                : lectureResult[ii].lm_text,
                    lm_type               : lectureResult[ii].lm_type
                }
                // console.log(tempModules);


                 // 세션모델
                if( lectureResult[ii].ls_idx != null ){
                    if (ii==0) { // 첫번째 값 확인
                        sessions.push(tempSessions)
                        sessionCount = 0

                        // 집합교육모델
                        if ( lectureResult[ii].lsc_idx != null ) {
                            sessions[sessionCount].sessionClass.push(tempClass)
                            sessionClassCount = 0

                            // 시간표모델
                            if( lectureResult[ii].lt_idx != null ){
                                sessions[sessionCount].sessionClass[sessionClassCount].timetables.push(tempTimetables)
                                timetableCount= 0

                                // 강의모듈 모델
                                if( lectureResult[ii].lm_idx != null && lectureResult[ii].lm_idx != undefined ){
                                    // console.log(sessions[sessionCount].sessionClass[sessionClassCount]);
                                    sessions[sessionCount].sessionClass[sessionClassCount].timetables[timetableCount].modules.push(tempModules)
                                    moduleCount= 0
                                }// 강의모듈 모델

                            }// 시간표모델

                        } // 집합교육모델


                    }else{
                        if ( lectureResult[ii-1].ls_idx  !=  lectureResult[ii].ls_idx ) {// 같은세션 찾기
                            sessions.push(tempSessions)
                            sessionCount= (sessionCount < 0) ? 0 : sessionCount+1
                            sessionClassCount=-1
                            timetableCount=-1
                        }

                        // 집합교육모델
                        if( lectureResult[ii].lsc_idx != null ){ // Null이 아닌경우
                            //전 아이디와 다를경우 푸시
                            if( lectureResult[ii].lsc_idx != lectureResult[ii-1].lsc_idx ){
                                sessions[sessionCount].sessionClass.push(tempClass)
                                sessionClassCount=sessionClassCount<0? 0 : sessionClassCount+1
                            }

                            // 시간표모델
                            if( lectureResult[ii].lt_idx != null ){ // Null이 아닌경우
                                // console.log(" lectureResult[ii].lt_idx : ", lectureResult[ii].lt_idx);
                                //전 아이디와 다를경우 푸시
                                if( lectureResult[ii].lt_idx != lectureResult[ii-1].lt_idx ){
                                    sessions[sessionCount].sessionClass[sessionClassCount].timetables.push(tempTimetables)
                                    timetableCount=timetableCount<0? 0 : timetableCount+1
                                }

                                // 강의모듈 모델
                                if( lectureResult[ii].lm_idx != null ){
                                    if( lectureResult[ii].lm_idx != lectureResult[ii-1].lm_idx ){
                                        sessions[sessionCount].sessionClass[sessionClassCount].timetables[timetableCount].modules.push(tempModules)
                                    }
                                }// 강의모듈 모델

                            }// 시간표모델

                        } // 집합교육모델


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

                // 수강생의 부서찾기
                connection.query(q.departments, [lec_idx], (departmentsErr, departmentsResult)=>{
                    if(departmentsErr){ // Error
                        connection.release()
                        console.log(departmentsErr);
                        return res.status(500).send({result : 'departmentsErr'})
                    }
                    // console.log(departmentsResult);

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
                                    departments   : departmentsResult,
                                    groups            : groupResult,
                                    students         : studentsResult,
                                    kpi                  : kpiResult
                                })// send

                            })// 수강생
                        })// 그룹
                    })// 참여기업
                })// 수강생의 부서찾기
            })// KPI쿼리


        })// conn
    })// pool


})
// ====== (O) 강의상세 - 신규 ====== //






















// ====== (Dev) 강의등록 확인 - complete ====== //
router.post('/complete',  (req, res, next)=>{

    var tutor_idx = req.user.user.tutor_idx // 강사 아이디
    var lec_idx = req.body.lec_idx // 강의 아이디
    var sessions = req.body.sessions // 회차정보

    var student_count       = req.body.student_count //학생수
    var session_count        = req.body.session_count // 세션수
    var classCount             = req.body.class_count // 오프라인 강의 카운트 - 출석부만들기 위해서 필요
    var tempAttendance   = []

    // 플래그변경 쿼리
    var completeSQL = `
        UPDATE  lecture  SET  lec_flag='승인대기'  WHERE lec_idx=? and tutor_idx=?`

    // 수강생 출석데이터 생성
    var attendanceSQL = `
        UPDATE registration SET stu_attendance = ? WHERE lec_idx = ? `

    // 수강생정보 찾기
    var studentsSQL = `
        SELECT stu_idx FROM registration WHERE lec_idx = ?`

    // 액플런데이 추가 쿼리
    var acplearnDaySQL = `
        INSERT INTO lecture_acplearn_day(lad_date, ls_idx, stu_idx) VALUES ?`

    // 기존 데이터 초기화 쿼리
    var ladDeleteSQL = `
        DELETE
            LAD
        FROM
        	lecture L,
        	lecture_session LS,
        	lecture_acplearn_day as LAD
        WHERE
        	L.lec_idx = ? and L.lec_idx = LS.lec_idx and LS.ls_idx = LAD.ls_idx`

    // 액플런데이 변수
    var sdt , edt , dateDiff;  //  시작, 종료, 차이
    var tempLAD = [] // 데이터모델
    var tempDate; // 임시저장 날짜
    var tempString=''



    // 출석카운트 만들기
    for(var ii=0;   ii<classCount;   ii++){
        tempAttendance.push(1)
    }
    tempAttendance = String(tempAttendance) // 문자열로 저장
    console.log(tempAttendance);



    // pool
    pool.getConnection((er,connection)=>{
        if (er) {
            console.log(er);
            throw er
            return
        }

        // 강의플래그 변경 쿼리
        connection.query(completeSQL, [lec_idx, tutor_idx], (completeErr, completeResult)=>{
            if( completeErr ){
                connection.release()
                console.log(completeErr);
                res.send(500, {result:'completeErr'})
                return
            }

            // 기존 액플런데이 삭제
            connection.query(ladDeleteSQL, [lec_idx], (ladDeleteErr, ladDeleteResult)=>{
                if( ladDeleteErr ){
                    connection.release()
                    console.log(ladDeleteErr);
                    res.send(500, {result:'ladDeleteErr'})
                    return
                }


                // attendanceSQL
                connection.query(attendanceSQL, [tempAttendance, lec_idx], (attendanceErr, attendanceResult)=>{
                    if( attendanceErr ){
                        connection.release()
                        console.log(attendanceErr);
                        res.send(500, {result:'attendanceErr'})
                        return
                    }
                    // 수강생찾기 쿼리
                    connection.query(studentsSQL, [lec_idx], (studentsErr, studentsResult)=>{
                        if( studentsErr ){
                            connection.release()
                            console.log(studentsErr);
                            res.send(500, {result:'studentsErr'})
                            return
                        }

                        // 수강생이 있을경우 수강생 수만큼 액플런데이 생성
                        if(studentsResult.length>0){

                            try {
                                // 액플런데이 일수 구하기
                                var stdKeys = Object.keys(studentsResult) // 수강생 키
                                var keys = Object.keys(sessions) // 회차 키

                                for(var rid  in  stdKeys){// #0
                                    for(var sid  in  keys){ // #1
                                        sdt = new Date(sessions[sid].ls_aplDate);  // 시작일
                                        edt = new Date(sessions[sid].ls_endDate); // 종료일
                                        dateDiff = Math.ceil((edt.getTime()-sdt.getTime())/(1000*3600*24)); // 차일

                                        // 차시별 액플런데이 만들기
                                        for(var ii=0;  ii <= dateDiff;  ii++){ // #2
                                            // 증감연산
                                            tempDate = new Date(sdt)
                                            tempDate.setDate(sdt.getDate()+ii)

                                            // 날짜포맷 만들기
                                            tempString     = tempDate.getFullYear()+"-"
                                            tempString   += (tempDate.getMonth()+1) + "-"
                                            tempString   += tempDate.getDate()

                                            // 데이터 푸시
                                            tempLAD.push([
                                                tempString, // 날짜
                                                sessions[sid].ls_idx, // 회차 아이디
                                                studentsResult[rid].stu_idx // 수강생 아이디
                                            ])
                                        }// #2
                                    }// #1
                                }// # 0

                            } catch (e) {
                                console.log(e);
                                res.send(500, { result : 'Error' })
                                return
                            }

                            // 액플런데이 쿼리
                            connection.query(acplearnDaySQL, [tempLAD], (aplearnDayErr, acplearnDayResult)=>{
                                connection.release()
                                if( aplearnDayErr ){
                                    console.log(aplearnDayErr);
                                    res.send(500, {result:'aplearnDayErr'})
                                    return
                                }

                                res.send(200, { result : 'success' })
                            }) // 액플런데이 쿼리

                        }else{
                            connection.release()
                            res.send(200, { result : 'success' })
                            return
                        }// else

                    })// 수강생찾기 쿼리
                })// attendanceSQL

            })// 기존 액플런데이 삭제

        }) // 강의플래그 변경 쿼리

    }) // pool

})
// ====== (Dev) 강의등록 확인 - complete ====== //


















// ====== (O) 신규강의 - 강의개요 : lecture ====== //
router.post('/create/summary', (req, res, next)=>{
    var da = req.body
    var sql = "INSERT INTO  `lecture` SET ?"
    da.tutor_idx = req.user.user.tutor_idx
    da.lec_title = da.lec_title ? da.lec_title : '[임시저장] 저장시간 : '+new Date()

    console.log(da);

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












// ====== (Dev) 신규강의 - 일정/시간표 : lecture_session ====== //
router.post('/create/sessions', (req, res, next)=>{

    var tutor_idx           = req.user.user.tutor_idx  //  튜터아이디
    var lec_idx              = req.body.lec_idx // 강의아이디
    var sessions            = req.body.sessions  // 일정데이터
    var lec_startDate    = new Date(req.body.lec_startDate)  // 강의기간 - 시작
    var lec_endDate     = new Date(req.body.lec_endDate)   // 강의기간 - 종료



    // 강의등록
    var SQLlectureInsert = `
        INSERT INTO lecture(
            lec_idx,
            lec_title,
            lec_startDate,
            lec_endDate,
            tutor_idx
        ) VALUES(?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE lec_idx=?, lec_startDate=?, lec_endDate=?`

    // 회차등록
    var SQLsessionInsert = `
        INSERT INTO lecture_session(
            ls_title,
            ls_location,
            ls_startDate,
            ls_endDate,
            ls_aplDate,
            ls_timetableFlag,
            ls_seq,
            lec_idx
        ) VALUES ?`

    // 교육등록
    var SQLclassInsert = `
        INSERT INTO lecture_session_class(
            lsc_title,
            lsc_date,
            lsc_seq,
            ls_idx
        ) VALUES ?`

    // 시간표등록
    var SQLtimetableInsert = `
        INSERT INTO lecture_timetable(
            lt_title,
            lt_startTime,
            lt_endTime,
            lt_seq,
            lsc_idx
        ) VALUES ?`

    // 모듈등록
    var SQLmoduleInsert = `
        INSERT INTO lecture_module(
            lm_type,
            lm_title,
            lm_text,
            lm_startTime,
            lm_endTime,
            lm_teacher,
            lm_seq,
            lt_idx
        ) VALUES ?`

    // 일괄삭제
    var SQLsessionDelete = `DELETE FROM lecture_session WHERE lec_idx=?`


    // 쿼리전용 모델
    var tempLecture          =[]
          tempSessions        =[],
          tempClass             =[],
          tempTimetables   =[],
          tempModules       =[]

    var tempTitle = "[임시저장] 저장시간 : "+ new Date()

    // DB포맷 맞추기
    var lectureFormat=''
    if (lec_idx<0) { // 신규
        lec_idx=null
    }



    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }

        // 날짜포맷 - 시작일
        var tempDateStart = String(lec_startDate.getFullYear())+'-'
                tempDateStart    += ((lec_startDate.getMonth() + 1) < 10 ? '0' : '') + String(lec_startDate.getMonth()+1)
                tempDateStart    += '-'
                tempDateStart    += (lec_startDate.getDate() < 10 ? '0' : '') + String(lec_startDate.getDate())

        // 날짜포맷 - 종료일
        var tempDateEnd = String(lec_endDate.getFullYear())+'-'
                tempDateEnd    += ((lec_endDate.getMonth() + 1 < 10) ? '0' : '') + String(lec_endDate.getMonth()+1)
                tempDateEnd    += '-'
                tempDateEnd    += (lec_endDate.getDate() < 10 ? '0' : '') + String(lec_endDate.getDate())


        // 강의 등록 or 업뎃
        connection.query(SQLlectureInsert, [
            lec_idx,
            tempTitle,
            tempDateStart,
            tempDateEnd,
            tutor_idx,
            lec_idx,
            tempDateStart,
            tempDateEnd,
        ], (ERRlectureInsert, RSlectureInsert)=>{
            if (ERRlectureInsert) {
                connection.release()
                console.log(ERRlectureInsert)
                return res.send(500)
            }

            // 신규일경우 insertId 캐치
            if (lec_idx == null)
                lec_idx=RSlectureInsert.insertId



            // 등록된 시간표 초기화
            connection.query(SQLsessionDelete , [lec_idx], (ERRsessionDelete, RSsessionDelete)=>{
                if (ERRsessionDelete) {
                    connection.release()
                    console.log(ERRsessionDelete)
                    return res.send(500)
                }
                // 세션이 없는경우
                if (sessions.length < 1  ||  sessions.length == undefined) {
                    connection.release()
                    res.send(200, {result: 'success', lec_idx})
                    return
                }


                // 세션모델
                var sessionsKeys = Object.keys(sessions)
                var tempAplDate;
                var sessStart, sessEnd, sessApl
                for(var ii=0;  ii<sessionsKeys.length;  ii++){
                    // 날짜포맷 - 시작일
                    // tempDateStart  = new Date(sessions[ii].ls_startDate)
                    sessStart  = new Date(sessions[ii].ls_startDate)
                    tempDateStart  = String(sessStart.getFullYear())+'-'
                    tempDateStart+= ((sessStart.getMonth() + 1) < 10 ? '0' : '') + String(sessStart.getMonth()+1)
                    tempDateStart+= '-'
                    tempDateStart+= (sessStart.getDate() < 10 ? '0' : '') + String(sessStart.getDate())

                    // 날짜포맷 - 종료일
                    sessEnd = new Date(sessions[ii].ls_endDate)
                    tempDateEnd = String(sessEnd.getFullYear())+'-'
                    tempDateEnd    += ((sessEnd.getMonth() + 1 < 10) ? '0' : '') + String(sessEnd.getMonth()+1)
                    tempDateEnd    += '-'
                    tempDateEnd    += (sessEnd.getDate() < 10 ? '0' : '') + String(sessEnd.getDate())

                    // 날짜포맷 - 액플런 시작일
                    sessApl = new Date(sessions[ii].ls_aplDate)
                    tempAplDate = String(sessApl.getFullYear())+'-'
                    tempAplDate    += ((sessApl.getMonth() + 1 < 10) ? '0' : '') + String(sessApl.getMonth()+1)
                    tempAplDate    += '-'
                    tempAplDate    += (sessApl.getDate() < 10 ? '0' : '') + String(sessApl.getDate())

                    tempSessions.push([
                        sessions[ii].ls_title,
                        sessions[ii].ls_location,
                        tempDateStart,
                        tempDateEnd,
                        tempAplDate,
                        sessions[ii].ls_timetableFlag,
                        // sessions[ii].ls_startDate,
                        // sessions[ii].ls_endDate,
                        // sessions[ii].ls_aplDate,

                        (ii+1), // 순서
                        lec_idx
                    ])
                    console.log(sessions[ii].ls_startDate);
                    console.log(sessions[ii].ls_endDate);
                    console.log(sessions[ii].ls_aplDate);
                }

                // 세션쿼리
                connection.query(SQLsessionInsert, [tempSessions], (ERRsessionInsert, RSsessionInsert)=>{
                    if (ERRsessionInsert) {
                        connection.release()
                        console.log(ERRsessionInsert)
                        return res.send(500)
                    }



                    // 교육모델
                    var sessionInsertId = RSsessionInsert.insertId // 세션 입력아이디
                    for(var ii=0;  ii<sessionsKeys.length;  ii++){
                        for(var jj  in  sessions[ii].sessionClass){
                            // 날짜포맷 - 시작일
                            tempDateStart = new Date(sessions[ii].sessionClass[jj].lsc_date)
                            tempDateStart = String(lec_startDate.getFullYear())+'-'
                            tempDateStart    += ((lec_startDate.getMonth() + 1) < 10 ? '0' : '') + String(lec_startDate.getMonth()+1)
                            tempDateStart    += '-'
                            tempDateStart    += (lec_startDate.getDate() < 10 ? '0' : '') + String(lec_startDate.getDate())

                            tempClass.push([
                                sessions[ii].sessionClass[jj].lsc_title,
                                tempDateStart,
                                (ii+1),
                                sessionInsertId
                            ])
                        } // #2
                        sessionInsertId++ // INSERT아이디
                    } // #1

                    // 교육이 없는경우
                    if (tempClass.length < 1  ||  tempClass.length == undefined) {
                        connection.release()
                        res.send(200, {
                            result : 'success',
                            lec_idx : lec_idx, // 강의아이디
                            ls_idx : RSsessionInsert.insertId // 세션아이디
                         })
                        return
                    }

                    // 교육쿼리
                    connection.query(SQLclassInsert, [tempClass], (ERRclassInsert, RSclassInsert)=>{
                        if (ERRclassInsert) {
                            connection.release()
                            console.log(ERRclassInsert)
                            return res.send(500)
                        }


                        // 시간표모델
                        var classInsertId = RSclassInsert.insertId
                        for(var ii=0;  ii<sessionsKeys.length;  ii++){
                            for(var jj  in  sessions[ii].sessionClass){
                                for(var kk  in  sessions[ii].sessionClass[jj].timetables){
                                    tempTimetables.push([
                                        sessions[ii].sessionClass[jj].timetables[kk].lt_title,
                                        sessions[ii].sessionClass[jj].timetables[kk].lt_startTime,
                                        sessions[ii].sessionClass[jj].timetables[kk].lt_endTime,
                                        (jj+1),
                                        classInsertId
                                    ])
                                } // #3
                                classInsertId++ // INSERT아이디
                            } // #2
                        }// #1

                        // 시간표가 없는경우
                        if (tempTimetables.length < 1  ||  tempTimetables.length == undefined) {
                            connection.release()
                            res.send(200, {
                                result : 'success',
                                lec_idx : lec_idx, // 강의아이디
                                ls_idx : RSsessionInsert.insertId // 세션아이디
                             })
                            return
                        }

                        // 시간표쿼리
                        connection.query(SQLtimetableInsert, [tempTimetables], (ERRtimetableInsert, RStimetableInsert)=>{
                            if (ERRtimetableInsert) {
                                connection.release()
                                console.log(ERRtimetableInsert)
                                return res.send(500)
                            }


                            // 모듈모델
                            var timetableInsertId = RStimetableInsert.insertId
                            for(var ii=0;  ii<sessionsKeys.length;  ii++){
                                for(var jj  in  sessions[ii].sessionClass){
                                    for(var kk  in  sessions[ii].sessionClass[jj].timetables){

                                            for(var ll  in  sessions[ii].sessionClass[jj].timetables[kk].modules){
                                                // console.log("RStimetableInsert : ", RStimetableInsert.insertId);
                                                tempModules.push([
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_type,
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_title,
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_text,
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_startTime,
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_endTime,
                                                    sessions[ii].sessionClass[jj].timetables[kk].modules[ll].lm_teacher,
                                                    (kk+1),
                                                    timetableInsertId
                                                ])
                                            } // #4

                                        timetableInsertId++ // INSERT아이디
                                    } // #3
                                } // #2
                            } // #1




                            // 모듈 없는경우
                            if (tempModules.length < 1  ||  tempModules.length == undefined) {
                                connection.release()
                                res.send(200, {
                                    result : 'success',
                                    lec_idx : lec_idx, // 강의아이디
                                    ls_idx : RSsessionInsert.insertId // 세션아이디
                                 })
                                return
                            }

                            // 모듈쿼리
                            connection.query(SQLmoduleInsert, [tempModules], (ERRmoduleInsert, RSmoduleInsert)=>{
                                if (ERRmoduleInsert) {
                                    connection.release()
                                    console.log(ERRmoduleInsert)
                                    return res.send(500)
                                }
                                connection.release()
                                res.send(200, {
                                    result : 'success',
                                    lec_idx : lec_idx, // 강의아이디
                                    ls_idx : RSsessionInsert.insertId // 세션아이디
                                 })
                            })// 모듈쿼리

                        })// 시간표쿼리
                    }) // 교육쿼리
                }) // 세션쿼리
            }) // 등록된 시간표 초기화
        }) // 강의 등록 or 업뎃
    })// pool
})
// ====== (Dev) 신규강의 - 일정/시간표 : lecture_session ====== //












// ====== (O) 신규강의 - APL기간 : lecture_session ====== //

// 신규
router.post('/create/aplterm', (req, res, next)=>{
    var tutor_idx = req.user.user.tutor_idx
    var lec_idx = req.body.lec_idx
    var da = req.body.terms

    // 임시 정보 생성쿼리
    var deleteSQL = `
    DELETE FROM lecture_session WHERE lec_idx=?`

    // 임시 정보 생성쿼리
    var lectureSummarySQL = `
    INSERT INTO  lecture SET
        lec_title=?,
        tutor_idx=?,
        lec_flag='임시저장'`

    // 세션생성쿼리
    var lectureSessionSQL = `
    INSERT INTO  lecture_session(
        lec_idx,
        ls_startDate,
        ls_endDate,
        ls_location,
        ls_seq
    )
    VALUES ?`


    var tempSessions = [] // 세션
    var time; // 세션강의시간




    pool.getConnection((er, connection)=>{
        if (er) {
            console.log(er);
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
                    da.sessionDetail[ii].ls_seq,
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
                da.sessionDetail[ii].ls_seq,
            ])
        }//for


        connection.query(deleteSQL, lec_idx, (deleteErr , deleteResult)=>{
            if ( deleteErr ) {
                connection.release()
                console.log(deleteErr);
                res.status(500).send({msg:'Error - '})
                return
            }// if

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















/* ========================================

(Dev)신규강의 - 상세시간표 : lecture_timetable

======================================== */
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
    var updateSessionSQL = "UPDATE lecture_session SET ls_title=?, ls_startTime=?, ls_endTime=?, ls_timetableFlag=?  WHERE ls_idx=?; "


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
        timetableFlag  = sessions.ls_timetableFlag
        console.log("sessions.ls_timetableFlag : ",sessions.ls_timetableFlag);

        // 업데이트 데이터 - 일괄쿼리
        sessionsQ += mysql.format(updateSessionSQL, [
            sessions.ls_title,     // 세션제목
            startTime ? startTime : '',              // 시작시간
            endTime ? endTime : '',               // 종료시간
            timetableFlag,
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
                connection.release()
                console.log('endendendendend');
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

                    // console.log('insertTimetablesResult.insertId : ' ,insertTimetablesResult.insertId);


                    // 강의모듈 만들기
                    for(var ii  in  da.sessionDetail){ // #1
                        for(var jj  in  da.sessionDetail[ii].timetables){ // #2
                            for(var kk  in  da.sessionDetail[ii].timetables[jj].modules){// #3
                                modules = da.sessionDetail[ii].timetables[jj].modules[kk]
                                // console.log(modules);
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
/* ========================================
신규강의 - 상세시간표 : lecture_timetable
======================================== */













/* ========================================

(O)신규강의 - KPI : lecture_kpi

======================================== */
router.post('/create/kpi', (req, res, next)=>{
    var flag = req.body.flag // 신규/수정 여부확인용 플래그
    var lec_idx    = req.body.lec_idx
    var da = req.body.kpi

    var deleteSQL = "DELETE FROM lecture_kpi WHERE lec_idx=?"
    var insertSQL = "INSERT INTO lecture_kpi(cc2_idx, lec_idx) VALUES ?"


    var tempKpi=[]
    for(var ii in da){
        tempKpi.push([ da[ii].cc2_idx  ,  lec_idx ])
    }// for

    console.log(tempKpi);

    pool.getConnection((err, connection)=>{
        connection.query(deleteSQL, lec_idx, (err)=>{
            if(err){
                connection.release()
                console.log(err);
                res.status(500).send({result:'Error - '})
                return
            }// if
            connection.query(insertSQL, [tempKpi], (sqlErr, result)=>{
                if(sqlErr){
                    connection.release()
                    console.log(sqlErr);
                    res.status(500).send({result:'Error - '})
                    return
                }// if

                connection.release()
                res.status(200).send({result:'success'})

            })// connection - INSERT
        })// connection - DELETE
    })// pool




})
/* ========================================
(O)신규강의 - KPI : lecture_kpi
======================================== */













/* ========================================

(O) 신규강의 - 매니저&참여기업 : company_manager

======================================== */
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
        com_code,
        lec_idx
    ) VALUES ?`

    var lec_idx                 = req.body.lec_idx // 강의아이디
    var da                        = req.body.companies // 업체정보
    var students              = req.body.students // 업체정보
    var sessionCount      = req.body.sessionCount


    var tempManager = new Array()
    var tempStudents = new Array()


    // 매니저정보
    for(var ii in da){
        tempManager.push([
            da[ii].com_managerName,
            da[ii].com_managerPhone,
            da[ii].com_code,
            lec_idx
        ])
    }// for - 매니저정보





    // 수강생
    for(var ii in students){
        tempStudents.push([
            students[ii].stu_name,
            students[ii].stu_phone,
            students[ii].stu_department==undefined ? '' : students[ii].stu_department,
            students[ii].stu_position==undefined ? '' : students[ii].stu_position,
            students[ii].com_code,
            lec_idx
        ])
    }// 수강생

    // console.log(tempManager);

    pool.getConnection((er, connection)=>{
        if (er) {
            connection.release()
            throw er
            return
        }
        // 삭제쿼리
        connection.query(deleteSQL, lec_idx, (deleteErr, deleteResult)=>{
            if ( deleteErr ) {
                connection.release()
                console.log(deleteErr);
                res.status(500).send({msg:'Error - '})
                return
            }// if

            // 삽입쿼리
            connection.query(insertSQL , [tempManager] , (err, result)=>{
                if ( err ) {
                    connection.release()
                    console.log(err);
                    res.status(500).send({msg:'Error - '})
                    return
                }// if


                //수강생 삭제쿼리
                connection.query(studentsDeleteSQL, [lec_idx], (stdDeleteErr, stdDeleteResult)=>{
                    if (stdDeleteErr) {
                        connection.release()
                        console.log(stdDeleteErr);
                        res.status(500).send({msg:'Error - '})
                        return
                    }


                    // 수강생 입력쿼리
                    connection.query(studentsSQL, [tempStudents], (stdErr, studentsResult)=>{
                        // connection.release()
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
/* ========================================
(O) 신규강의 - 매니저&참여기업 : company_manager
======================================== */














/* ========================================

(O)신규강의 - 그룹 등록 : group

======================================== */
router.post('/create/group', (req, res, next)=>{
    var lec_idx    = req.body.lec_idx
    var da = req.body

    var deleteSQL = "DELETE FROM `group` WHERE lec_idx=?"
    var insertSQL = "INSERT INTO  `group`( group_name, group_text, lec_idx ) VALUES ?"
    var updateInitSQL = `UPDATE  registration SET group_idx=NULL WHERE lec_idx = ?`



    var tempGroups = [] //강의내 팀
    for( var ii in da.teams ) {
        tempGroups.push([
            da.teams[ii].group_name,
            da.teams[ii].group_text,
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
                connection.release()
                console.log(updateInitErr);
                res.status(500).send({msg:'Error - updateInitSQL'})
                return
            }// if


            // 그룹삭제 쿼리
            connection.query(deleteSQL, [lec_idx], (deleteErr, deleteResult)=>{
                if ( deleteErr ) {
                    connection.release()
                    console.log(deleteErr);
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
                        connection.release()
                        console.log(err);
                        res.status(500).send({msg:'Error - '})
                        return
                    }// if

                    var groupIdx = groupResult.insertId // 그룹 INSERT 아이디
                    var stdUpdate = '';
                    for(var ii  in  da.teams){
                        if(da.teams[ii].students != undefined && da.teams[ii].students != null){
                            for(var jj  in  da.teams[ii].students){ // 그룹아이디 맵핑
                                // DB포맷 맞추기
                                var qq = 'UPDATE registration SET group_idx=? WHERE stu_idx=?; '
                                stdUpdate += mysql.format(qq, [
                                    groupIdx,
                                    da.teams[ii].students[jj].stu_idx
                                ])
                            }// for
                        }// if
                        groupIdx++
                    }// for


                    // 그룹에 팀원이 없는경우 종료
                    if(stdUpdate === ''){
                        connection.release()
                        res.status(200).send({ msg : 'success', data : groupResult, insertIdx: groupIdx })
                        return
                    }

                    // 그룹아이디 맵핑 쿼리
                    connection.query(stdUpdate, (stdUpdateErr, stdUpdateResult)=>{
                        if ( stdUpdateErr ) {
                            connection.release()
                            console.log(stdUpdateErr);
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


})
/* ========================================
(O)신규강의 - 그룹 등록 : group
======================================== */














/* ========================================

(O)신규강의 - 수강생 등록 : registration

======================================== */
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

})
/* ========================================
(O)신규강의 - 수강생 등록 : registration
======================================== */






























/* ========================================

(O)임시저장강의 목록

======================================== */
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
    conn.query(q, [tid], (e, rows)=>{
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












// ====== 강의시작 승인 ====== //
router.put('/start', (req,res,next)=>{
    var tutor_idx = req.user.user.tutor_idx
    var lec_idx = req.body.lec_idx
    var sql = `UPDATE lecture SET lec_flag='진행중' WHERE lec_idx=? AND tutor_idx=?`

    pool.getConnection((er, connection)=>{
        if (er) {
            throw er
            return
        }

        connection.query(sql, [lec_idx, tutor_idx], (err, rs)=>{
            connection.release()
            if (err) {
                console.log(err);
                res.send(503, {result: 'success'})
                return
            }

            res.send(200, {result:'success'})
        })// connection
    })// pool
})














// ====== 관리자 - 강의개설 승인 ====== //
router.put('/confirm/:lec_idx', (req,res,next)=>{
    var lec_idx = req.params.lec_idx // 강의아이디
    var today = new Date()
    var findIdSQL = `SELECT T.tutor_id FROM tutor T, lecture L  WHERE L.lec_idx=? AND L.tutor_idx=T.tutor_idx`
    var confirmSQL = `UPDATE lecture SET lec_flag = '강의전' , lec_serialNo=? WHERE lec_idx=? `
    var randomId = ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1); // 랜덤수

    var lec_code = ''

    pool.getConnection((er, connection)=>{

        // 강사찾기
        connection.query(findIdSQL, [lec_idx], (tutorErr, tutorResult)=>{
            if (tutorErr) {
                connection.release()
                console.log(tutorErr)
                res.send(500, {result:'error - tutorErr'})
                return
            }
            // 강좌코드생성
            lec_code = String(tutorResult[0].tutor_id[0]) + String(today.getDate()) + '-' + String(randomId)

            // 업뎃쿼리
            connection.query(confirmSQL, [lec_code, lec_idx], (confirmErr, confirmResult)=>{
                connection.release()
                if (confirmErr) {
                    console.log(confirmErr)
                    res.send(500, {result:'error - confirm'})
                    return
                }

                res.send(200, {result:'success'})
            }) // 업뎃쿼리
        }) // 강사찾기

    })// pool
})
// ====== 관리자 - 강의개설 승인 ====== //




router.get('/confirm2', (req,res,next)=>{
    var lec_idx = req.query.id // 강의아이디
    var today = new Date()
    var findIdSQL = `SELECT T.tutor_id FROM tutor T, lecture L  WHERE L.lec_idx=? AND L.tutor_idx=T.tutor_idx`
    var randomId = ((1 + Math.random()) * 0x10000 | 0).toString(16).substring(1); // 랜덤수

    var lec_code = ''

    pool.getConnection((er, connection)=>{

        connection.query(findIdSQL, [lec_idx], (tutorErr, result)=>{
            connection.release()
            if (tutorErr) {
                console.log(tutorErr)
                res.send(500, {result:'error - confirm'})
                return
            }

            console.log(lec_idx+' : '+result);
            lec_code = String(result[0].tutor_id[0]) + String(today.getDate()) + '-' + String(randomId)

            res.send(200,{
                result,
                lec_code
            })
        }) // connection

    })


})










// TEST
router.get('/call/test',  (req,res,next)=>{

    var sql = "select * from tutor order by tutor_idx desc"

    conn.query(sql, (err, rows)=>{
        if (err) {
            res.send(500, {result: 'Error'})
            return
        }

        res.status(200).send({
            result:200,
            message: "success"
        });
        // conn.destroy()
    })
    conn.end()


});

// TEST2
router.get('/call/test2',  (req,res,next)=>{

    var sql = "select * from tutor order by tutor_idx desc"


    pool.getConnection((er, connection)=>{
        connection.query(sql, (err, rows)=>{
            connection.release()
            if (err) {
                res.send(500, {result: 'Error'})
                return
            }

            res.status(200).send({
                result:200,
                message: "success"
            });
        })
    })


});







module.exports = router;
