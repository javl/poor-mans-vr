var express = require('express');
var app = express();
var syc = require('syc');
var serialport = require('serialport');
var SerialPort = serialport.SerialPort;
var parsers = serialport.parsers;

var server = app.listen(3000, function() {
  console.log('Listening on port %d', server.address().port);
});
var io = require('socket.io')(server);

// Syc logic - Creating an array of messages which Syc will synchronize.
var messages = syc.sync('messages', []);

var newData = [];
var useData = false;

var robotPort = new SerialPort('/dev/ttyACM0', {
  baudrate: 115200,
});

// console.log(messages);
robotPort.on('open', function() {
    setTimeout(function(){writeCmd('TestMode on')}, 1000);
    setTimeout(function(){writeCmd('GetLDSScan StreamOn')}, 2000);
    setTimeout(function(){writeCmd('SetLDSRotation on')}, 3000);
});


function hex8(val) {
    val &= 0xFF;
    var hex = val.toString(16).toUpperCase();
    return ("00" + hex).slice(-2);
}

/* Convert value as 16-bit unsigned integer to 4 digit hexadecimal number. */

function hex16(val) {
    val &= 0xFFFF;
    var hex = val.toString(16).toUpperCase();
    return ("0000" + hex).slice(-4);
}

/* Convert value as 32-bit unsigned integer to 8 digit hexadecimal number. */

function hex32(val) {
    val &= 0xFFFFFFFF;
    var hex = val.toString(16).toUpperCase();
    return ("00000000" + hex).slice(-8);
}

var rounds = 0;
robotPort.on('data', function(data) {
  if(data.length == 1446){
    rounds++;
    newData = [];
    if(rounds > 10){
      for(var i=0;i<data.length-6;i+=4){
        newData.push([data[i], data[i+1]]);
        console.log(data[i], data[i+1]);
      }
    }
    console.log("update, "+Math.random());
    messages[0] = newData;
  }
});

function writeCmd(cmd){
  robotPort.write(cmd+'\n', function(err) {
    if (err) {
      return console.log('Error writing message \''+cmd+'\': ', err.message);
    }
    console.log('message written ('+cmd+')');
  });

}

process.on('SIGINT', function() {
    console.log("\nGracefully shutting down from SIGINT (Ctrl+C)");
    // For some reason the robot doesn't always listen properly to the following stop commands,
    // So I'm sending them again after a short delay.
    writeCmd('SetLDSScan StreamOff');
    writeCmd('SetLDSRotation off');
    writeCmd('TestMode off');

    setTimeout(function(){writeCmd('GetLDSScan StreamOff')}, 2000);
    setTimeout(function(){writeCmd('SetLDSRotation off')}, 1000);
    setTimeout(function(){writeCmd('TestMode off')}, 2000);
    setTimeout(function(){process.exit()}, 3000);
});

// Routes
app.use(express.static('static'));

app.get('/', function(req, res){
  res.sendfile('static/index.html');
});

app.get('/syc.js', function (req, res){
  res.sendfile('node_modules/syc/client/syc.js');
});


// Socket.io && Syc initalization
io.on('connection', function (socket) {
  syc.connect(socket);
});
