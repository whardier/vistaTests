process.env["NODE_NO_WARNINGS"] = 1;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const config = require('./config');

const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

function getComInfo(stationNo,duz){

  return new Promise(function (resolve, reject) {
    axios.post(config.VistaApiX.tokenUrl,
      {
        "key":config.KeyX
            }).then(function (data) {
              console.log
              axios.post(config.VistaApiX.url+'/vista-sites/'+stationNo+'/users/'+duz+'/rpc/invoke',
                {
                  "context" : "OR CPRS GUI CHART",
                  "rpc" : "ORWU TOOLMENU", //ORWCOM GETOBJS
                  "jsonResult" : false,
                  "parameters" : []
                }
              
                , { headers: { 'authorization': 'Bearer ' + data.data.data.token }, }
                ).then(function(data){
           
                  var jsonData = data.data;
                 var resp = jsonData.payload
                 if (resp){
               
                  var respArr = resp.split("\n");
                
                   var res = respArr.filter(e=>{return e.includes("cds.med.va.gov")})
               
                    if(res.length>0){
                      var data ={}
                       data.stationNo = stationNo
                       data.result = "Yes"
                       data.data=res
                       resolve(data)
                    }else{
                      var data ={}
                      data.stationNo = stationNo
                      data.result = "No"
                      resolve(data)
                    }
                  }
               })
              })
              .catch((err) => {
                console.error(err);
              
            });
      }) 
  }
function getStations(){
    return new Promise(function(resolve,reject){
                var stations = []
                fs.createReadStream("accounts.csv")
                    .pipe(parse.parse({delimiter: ','}))
                    .on('data', function(csvrow) {
                       var row = {
                        "stationNo":csvrow[0],
                        "accountDuz":csvrow[1]
                       }
                        stations.push(row)
                    })
                    .on('end', () => resolve(stations));
    })
}
var comRes = []
function addRes(comInfo){
  comRes.push(...comInfo)
}

        const doConfig = async () => {
          
            try{
                var stations = await getStations()
                bar1.start(stations.length, 0);
                for (var i=0;i<stations.length;i++){
                    var comInfo = await getComInfo(stations[i].stationNo,stations[i].accountDuz)

                    if(comInfo){
                        addRes([comInfo])
                         }
                  bar1.increment()
                }
             }
             catch (error){
                 console.error(error)
                 error_log(error)
             }
        const ws = fs.createWriteStream("results.csv");
        fastcsv
        .write(comRes, { headers: false })
        .pipe(ws);
         }
        doConfig()

    




      