'use strict'
const mongoose = require('mongoose');
const model = require('./ArduinoModel');
const sp = require('serialport');
const cfg = require('./config');

// read from arduino
const uristring = cfg.uristring;
const SerialPort = sp.SerialPort;
const serialport = new SerialPort("/dev/cu.usbmodem1411", {
    parser: SerialPort.parsers.readline('\n')
});

// set up twilio CHANGE THIS BEFORE COMMITTING
const accountSID = cfg.accountSID;
const authToken = cfg.authToken;
const NUMBERS = cfg.NUMBERS; //'408-693-6790', '408-832-5830', 
const FROM_NUMBER = cfg.FROM_NUMBER;
const client = require('twilio')(accountSID, authToken);

const saveInterval = 1000;
let newPoint = {},
    uploading = false,
    lastCall = 0;

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
        checkCall(dataArray[5]);
        uploading = true;
        newPoint = new model({
            pressure: dataArray[0],       
            temperature: dataArray[1],
            humidity: dataArray[2],
            count: dataArray[5]
        });
    }
}

const checkCall = function(count) {
    const now = Date.now();
    if (count >= 0.07 && now > (lastCall + 300000)) {
        for (let i = 0; i < NUMBERS.length; i += 1) {
            client.messages.create({
                to: NUMBERS[i],
                from: FROM_NUMBER,
                body: 'somethings afoot in the cleanroom - sent at: ' + 
                       new Date(now).toString().split(' ').slice(0, 4).join(' ')
            }, function (err, message) {
                if (err) {
                    console.log(err);
                }
            });
        }
        lastCall = now;
    }
}

const save = setInterval(function() {
    if (uploading) {
        newPoint.save(function(err) {
            if (err) { 
                console.log(err);
            }
        });
    }
}, saveInterval);

serialport.on('close', function() { clearInterval(save); });
