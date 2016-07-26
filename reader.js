const mongoose = require('mongoose');
const model = require('./ArduinoModel');
const sp = require('serialport');

const uristring = '***REMOVED***';
const SerialPort = sp.SerialPort;
const serialport = new SerialPort("/dev/ttyACM0", {
    parser: SerialPort.parsers.readline('\n')
});
const saveInterval = 1000;
let newPoint = {};

mongoose.connect(uristring, function(err, res) {
    if (err) {
        console.log("Error: " + err);
    }
});

serialport.on('open', function(){
    serialport.on('data', handleData);
});

const handleData = function(data) {
    const dataArray = data.split(',');
    if (dataArray.length === 6) {
        newPoint = new model({
            pressure: dataArray[0],       
            temperature: dataArray[1],
            humidity: dataArray[2],
            count: dataArray[5]
        });
    }
}

const save = setInterval(function() {
    newPoint.save(function(err) {
            if (err) { 
                console.log(err);
            }
        });
}, saveInterval);

serialport.on('close', function() { clearInterval(save); });
