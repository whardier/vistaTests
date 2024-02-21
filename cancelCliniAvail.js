
var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const config = require('./config');


process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

function cnxClinic(stationNo, duz,clinicIen,date) {
 
 

  // Check if date is greater than 11/5/2023 and set offset to -3:00
  var offset = "-04:00";
  if (date > new Date("2023-11-05")) {
    offset = "-05:00";
  }
  console.log(date.toISOString().split('T')[0]+"T08:00"+offset)
  
  return new Promise(function (resolve, reject) {
    axios.post(config.stagingVistaApiX.tokenUrl,
      {
        "key":config.stagingKeyX
            }).then(function (data) {
              console.log
              axios.post(config.stagingVistaApiX.url+'/vista-sites/'+stationNo+'/users/'+duz+'/rpc/invoke',
                {
                  "context": "SDESRPC",
                  "rpc": "SDES CANCEL CLIN AVAILABILITY",
                  "jsonResult": false,
                  "parameters" : [
                     {"string": clinicIen},
                     {"string": "F"},
                     {"string": date.toISOString().split('T')[0]+"T08:00"+offset},
                     {"string":  date.toISOString().split('T')[0]+"T17:00"+offset}
                  ]
              }
              
              , { headers: { 'authorization': 'Bearer ' + data.data.data.token }, }
        ).then(function (data) {

          var jsonData = data.data;
          var resp = jsonData.payload
          if (resp) {
      
            resolve(resp)
          }
        })
      })
      .catch((err) => {
        console.error(err);

      });
  })
}
function getStations() {
  return new Promise(function (resolve, reject) {
    var stations = []
    fs.createReadStream("accountsStage.csv")
      .pipe(parse.parse({ delimiter: ',' }))
      .on('data', function (csvrow) {
        var row = {
          "stationNo": csvrow[0],
          "accountDuz": csvrow[1],
          "clinicIen": csvrow[2],
          "days": csvrow[3]
        }
        stations.push(row)
      })
      .on('end', () => resolve(stations));


  })
}


const doConfig = async () => {

  try {
    var stations = await getStations()
    console.log(stations.length)
    
    for (var i = 0; i < stations.length; i++) {
      console.log(stations[i].days)
      var date = new Date()
      for (var n = 0; n < stations[i].days; n++) {
        console.log(n)
        console.log(stations[i].stationNo, stations[i].accountDuz)
        
        var comInfo = await cnxClinic(stations[i].stationNo, stations[i].accountDuz,stations[i].clinicIen,date)
        if (comInfo) {
          console.log(comInfo)
        } 
        
        // add 1 day to date
        date.setDate(date.getDate() + 1)
      }
    }
  }
  catch (error) {
    console.error(error)
    error_log(error)
  }
 
}
doConfig()






