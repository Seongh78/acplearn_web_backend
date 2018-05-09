/*
Router : /companies

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../../common/dbconn').connection; // 커넥션방식
var pool = require('../../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../../common/passport').isAuthenticatedAdmin;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');









router.get('/get', (req, res, next)=>{
    // 플랜 등록 쿼리
    var tq = `
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
        L.lec_idx=9 and L.tutor_idx=1`



    conn.query(tq, (err, result)=>{
        if (err) {
            console.log(err);
            res.send(500, {result:'error'})
            return
        }
        res.send(200, {result:result})
    })

})









router.get('/push', (req, res, next)=>{
    // 플랜 등록 쿼리
    var tq = `
    INSERT INTO lecture_action_plan(
        lap_text,
        lk_idx,
        ls_idx,
        stu_idx
    ) VALUES (
        '테스트 플랜 01',
        '1',
        '1',
        '14'
    )`

    if (req.query.sql != undefined) {
        tq = req.query.sql
    }


    conn.query(tq, (err, result)=>{
        if (err) {
            console.log(err);
            res.send(500, {result:'error'})
            return
        }
        res.send(200, {result:result})
    })

})







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
// ====== (O) KPI 불러오기 ====== //











module.exports = router;
