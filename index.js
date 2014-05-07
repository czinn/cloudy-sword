// Load the http module.
var http = require('http')
var socketio = require('socket.io');

// Hello World
var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("Hello World\n");
});

// Initialize Socket.IO
var io = socketio.listen(server);

// Listen on port 5000
server.listen(5000);
console.log("Server running on port 5000");
