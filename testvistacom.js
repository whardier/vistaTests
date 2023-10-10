var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const config = require('./config');
const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
function getComInfo(stationNo, duz) {

  return new Promise(function (resolve, reject) {
    axios.post(config.vistaApi.tokenUrl,
      {
        "key": config.key,
        "stationNo": stationNo,
        "duz": duz
      }).then(function (data) {

        axios.post(config.vistaApi.url,
          {

            "context": "OR CPRS GUI CHART",
            "rpc": "ORWCOM ORDEROBJ", //ORWCOM GETOBJS
            "jsonResult": "false",
            "parameters": ["4"]


          }, { headers: { 'authorization': 'Bearer ' + data.data.payload.token }, }
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
            //console.log(dataArr)
            resolve(dataArr)
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
    fs.createReadStream("accounts.csv")
      .pipe(parse.parse({ delimiter: ',' }))
      .on('data', function (csvrow) {
        var row = {
          "stationNo": csvrow[0],
          "accountDuz": csvrow[1]
        }
        stations.push(row)
      })
      .on('end', () => resolve(stations));


  })
}
var comRes = []
function addRes(comInfo) {
  comRes.push(...comInfo)
}

const doConfig = async () => {

  try {
    var stations = await getStations()
    bar1.start(stations.length, 0);
    for (var i = 0; i < stations.length; i++) {
      var comInfo = await getComInfo(stations[i].stationNo, stations[i].accountDuz)

      if (comInfo) {
        addRes(comInfo)
      } else {
      }
      bar1.increment()
    }
  }
  catch (error) {
    console.error(error)
    error_log(error)
  }
  const ws = fs.createWriteStream("results.csv");
  fastcsv
    .write(comRes, { headers: false })
    .pipe(ws);
}
doConfig()






