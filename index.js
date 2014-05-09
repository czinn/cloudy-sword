// Load required modules
var express = require("express");
var favicon = require("serve-favicon");
var socketio = require("socket.io");

//Create the express app
var app = express();

//Set up static file directory and favicon
app.use("/static", express.static(__dirname + "/static"));
app.use(favicon(__dirname + "/static/favicon.ico"));

/* ------------ APPLICATION PAGES ------------ */
app.get("/", function(req, res) {
	res.sendfile(__dirname + "/views/index.html");
});

/* ------------ START SERVER ------------ */
var server = app.listen(5000, function() {
	console.log("Server listening on port %d", server.address().port);
});

/* ------------ SOCKET.IO ------------ */
var io = socketio.listen(server, {log: false});

//Set up Socket.IO connection handler
io.sockets.on("connection", function(socket) {
	console.log("A client connected with Socket.IO");
	
	//Set up Socket.IO event callbacks here
	socket.on("ping", function(data) {
		socket.emit("pong", data);
	});
});
