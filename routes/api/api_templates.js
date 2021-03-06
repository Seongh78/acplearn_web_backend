/*
Router : /companies

*/

var express = require('express');
var router = express.Router();
var mysql = require('mysql'); // multi query사용
var conn = require('../common/dbconn').connection; // 커넥션방식
var pool = require('../common/dbconn').connectionPool; // 풀링방식
var isAuthenticatedAdmin = require('../common/passport').isAuthenticatedAdmin;
var xlsx = require('node-xlsx');
var fileUpload = require('express-fileupload');




// ====== 템플릿 강의 목록 ====== //
router.get('/', (req, res, next)=>{
    var usr_idx = req.user.user.tutor_idx; // 유저아이디
    var sql = "SELECT * FROM template_lecture WHERE tutor_idx=?"

    pool.getConnection((er, connection)=>{
        connection.query(sql , [usr_idx], (templatesErr, templatesResult)=>{
            connection.release()
            if(templatesErr){
                console.log(templatesErr);
                res.send(500, {result:'error'})
                return
            }

            res.send(200, {
                result:'success',
                templates : templatesResult
            })

        })//conn
    })// pool


})
// ====== 템플릿 강의 목록 ====== //








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














module.exports = router;
