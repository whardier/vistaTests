var axios = require('axios');
const fastcsv = require('fast-csv');
const fs = require('fs');
var parse = require('csv-parse');
const { exit } = require('process');
const config = require('./config');
const args = require('yargs').argv;

const cliProgress = require('cli-progress');
const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

async function getProviderLines(stationNo, duz) {
  try {
    // First request to get the token
    const tokenResponse = await axios.post(
      config.VistaApiX.tokenUrl,
      {
        "key": config.KeyX
      }
    );

    // Extract the token from the response
    const token = tokenResponse.data.data.token;

    // Second request using the token
    const invokeResponse = await axios.post(
      config.VistaApiX.url + '/vista-sites/' + stationNo + '/users/' + duz + '/rpc/invoke',
      {
        "context": "OR CPRS GUI CHART",
        "rpc": "ORWU NEWPERS",
        "jsonResult": false,
        "parameters": [
          { "string": "" },
          { "string": "-1" },
          { "string": "PROVIDER" },
        ]
      },
      {
        headers: {
          'authorization': 'Bearer ' + token
        }
      });

    // Extract and return the payload from the response
    return invokeResponse.data.payload.split('\n');
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function getCheckAccessLine(stationNo, duz, providerDuz, option) {
  try {
    // First request to get the token
    const tokenResponse = await axios.post(
      config.VistaApiX.tokenUrl,
      {
        "key": config.KeyX
      }
    );

    // Extract the token from the response
    const token = tokenResponse.data.data.token;

    // Second request using the token
    const toolMenuResponse = await axios.post(
      config.VistaApiX.url + '/vista-sites/' + stationNo + '/users/' + duz + '/rpc/invoke',
      {
        "context": "LHS RPC CONTEXT",
        "rpc": "LHS CHECK OPTION ACCESS",
        "jsonResult": false,
        "parameters": [
          { "string": providerDuz },
          { "string": option },
        ]
      },
      {
        headers: {
          'authorization': 'Bearer ' + token
        }
      });

    // Extract and return the payload from the response
    return toolMenuResponse.data.payload;
  } catch (error) {
    console.error(error);
    throw error;
  }
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

const entryPoint = async () => {

  const ws = fs.createWriteStream("results.csv");

  const csvStream = fastcsv.format({ headers: true, includeEndRowDelimiter: true });
  csvStream.pipe(ws);

  try {
    var stations = await getStations()
  }
  catch (error) {
    console.error(error);
    throw error;
  };

  bar1.start(stations.length, 0);

  try {
    for (const station of stations) {

      var providerLines = await getProviderLines(station.stationNo, station.accountDuz);

      for (const providerLine of providerLines) {
        var [providerDuz, providerName] = providerLine.split("^");
        var checkAccessLine = await getCheckAccessLine(station.stationNo, station.accountDuz, providerDuz, args.option)
        csvStream.write({ stationNo: station.stationNo, option: args.option, checkAccessLine, providerDuz, providerName })
      }

      bar1.increment();

    }
  }
  catch (error) {
    console.error(error)
  }

  bar1.stop();

  csvStream.end();
  ws.close();

}

entryPoint()






