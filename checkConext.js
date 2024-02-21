
var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const config = require('./config');


process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

function chkContext(stationNo, duz) {

  return new Promise(function (resolve, reject) {
    axios.post(config.VistaApiX.tokenUrl,
      {
        "key":config.KeyX
            }).then(function (data) {
              console.log
              axios.post(config.VistaApiX.url+'/vista-sites/'+stationNo+'/users/'+duz+'/rpc/invoke',
                {
                  "context": "DVBA CAPRI GUI",
                  "rpc": "DDR LISTER",
                  "jsonResult": false,
                  "parameters" : [
                    {
                      "namedArray": {
                        "FILE":"19",
                           "FIELDS":"@;.01",
                           "FLAGS":"IP",
                           "XREF":"B",
                           "MAX":"1",
                           "FROM":"CDSP RPC CONTEX",
                           "PART":"CDSP RPC CONTEXT"
                       }   
                  }
                  ]
              }
              
              , { headers: { 'authorization': 'Bearer ' + data.data.data.token }, }
        ).then(function (data) {

          var jsonData = data.data;
          var resp = jsonData.payload
          if (resp) {
            var respArr = resp.split(/\r?\n/);
            var dataArr = []
            respArr.forEach(function (e) {
              var rec = e.split("^")
              if (rec.length > 1)
               
                rec.push(stationNo)
              dataArr.push(rec)
            })
            resolve(dataArr)
          }
        })
      })
      .catch((err) => {
        console.log(err)
         });
  })
}
function getStations() {
  return new Promise(function (resolve, reject) {
    var stations = []
    fs.createReadStream("accounts.csv")
      .pipe(parse.parse({ delimiter: ',' }))
      .on('data', function (csvrow) {
        var row = {
          "stationNo": csvrow[0],
          "accountDuz": csvrow[1],
        }
        stations.push(row)
      })
      .on('end', () => resolve(stations));


  })
}
var comRes = []
var count=0
function addRes(comInfo) {
  comRes.push(...comInfo)
}
const doConfig = async () => {

  try {
    var stations = await getStations()
    console.log(stations.length)
    
    for (var i = 0; i < stations.length; i++) {
    
        console.log(stations[i].stationNo)
        
        var context = await chkContext(stations[i].stationNo, stations[i].accountDuz)
        if (context) {
        
          var test=context[1]
     
          if (test[1] == 'CDSP RPC CONTEXT'){
            console.log(test)
            addRes(context)
            count++

          }
      }
    }
  }
  catch (error) {
    console.error(error)
  
  }
  console.log(count +' of '+stations.length)
  const ws = fs.createWriteStream("results.csv");
  fastcsv
    .write(comRes, { headers: false })
    .pipe(ws);
}
doConfig()






