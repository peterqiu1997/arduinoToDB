'use strict';
const mongoose = require('mongoose');
const fs = require('fs');
const model = require('./ArduinoModel');
const sp = require('serialport');
const cfg = require('./config');

// read from arduino
const SerialPort = sp.SerialPort; 
const serialport = new SerialPort("/dev/cu.usbmodem1411", { // replace with your port
    parser: SerialPort.parsers.readline('\n')
});

const accountSID = cfg.accountSID;
const authToken = cfg.authToken;
const NUMBERS = cfg.NUMBERS; 
const FROM_NUMBER = cfg.FROM_NUMBER;
const client = require('twilio')(accountSID, authToken);

const saveInterval = 1000,
      fiveMinutes = 300000;
      
let newPoint = {},
    uploading = false,
    lastCall = 0,
    lastDelete = 0;

// database
const uristring = cfg.uristring;
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
    if (count >= 0.07 && now > (lastCall + fiveMinutes)) {
        for (let i = 0; i < NUMBERS.length; i += 1) {
            client.messages.create({
                to: NUMBERS[i],
                from: FROM_NUMBER,
                body: 'Check the cleanroom! Sent at: ' + 
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
    if (Date.now() > lastDelete + 172800000) {
        model.find({}).exec(function(err, data) {
            const now = new Date(Date.now()).toString().split(' ').slice(0,5).join(' ');
            fs.writeFile("./files/" + now + "-JSON.txt", JSON.stringify(data), function(err) {
                if (!err) {
                    model.find({}).remove(function(err) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log('Successfully written and deleted documents.');
                        }
                    });
                }   
            });
        });
        lastDelete = Date.now();
    }
    
    if (uploading) {
        newPoint.save(function(err) {
            if (err) { 
                console.log(err);
            }
        });
    }
}, saveInterval);

serialport.on('close', function() { clearInterval(save); });
