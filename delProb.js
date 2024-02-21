process.env["NODE_NO_WARNINGS"] = 1;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const config = require('./config');

const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

function getComInfo(stationNo,duz,prob){

    return new Promise(function(resolve,reject){
    axios.post(config.vistaApiStaging.tokenUrl,
            {
              "key":config.keyStaging,
              "stationNo": stationNo,
              "duz": duz
                        }).then(function(data){
          
              axios.post(config.vistaApiStaging.url,                
                {
                  "context" : "OR CPRS GUI CHART",
                  "rpc" : "ORQQPL DELETE", //ORWCOM GETOBJS
                  "jsonResult" : "false",
                  "parameters" : [prob,"983","500",""]
                 },{  headers:{'authorization':'Bearer '+data.data.payload.token},}
                ).then(function(data){
                    
                      resolve (data.data.payload)
                   
                  })
            
              .catch((err) => {
                console.error(err);
              
            });
      }) 
  })
}
function getStations(){
    return new Promise(function(resolve,reject){
                var stations = []
                fs.createReadStream("accountsstage.csv")
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
function getProblems(){

  return new Promise(function(resolve,reject){
              var problems = []
              fs.createReadStream("probs.csv")
                  .pipe(parse.parse({delimiter: ','}))
                  .on('data', function(csvrow) {
                      var row = {
                      "probIen":csvrow[0],
                         }
                    
                      problems.push(row)
                  })
                  .on('end', () => resolve(problems));
  })
}
var comRes = []
function addRes(comInfo){
  comRes.push(...comInfo)
}

        const doConfig = async () => {
          
            try{
                var stations = await getStations()
                var problems = await getProblems()
               console.log(problems.length)
                //bar1.start(stations.length, 0);
                for (var i=0;i<problems.length;i++){
                  console.log(stations[0].stationNo,stations[0].accountDuz,problems[i].probIen)
                  
                      var result = await getComInfo(stations[0].stationNo,stations[0].accountDuz,problems[i].probIen)
                
                   console.log(result)

                   
                 // bar1.increment()
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

    




      