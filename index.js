// Load required modules
var express = require("express");
var favicon = require("serve-favicon");
var socketio = require("socket.io");
var LobbyData = require("./static/lobbydata.js");

// Create the express app
var app = express();

// Set up static file directory and favicon
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

// Set up Socket.IO connection handler
io.sockets.on("connection", function(socket) {
    var addr = socket.handshake.address;
    console.log("A client connected from " + addr.address + ":" + addr.port);
    
    lobby.addClient(socket);
    
    // Set up Socket.IO event callbacks here
    socket.on("ping", function(data) {
        socket.emit("pong", data);
    });
    
    socket.on("disconnect", function() {
        console.log(addr.address + ":" + addr.port + " disconnected.");
    });
    
    socket.on("sudo", function(data) {
        io.sockets.emit(data.channel, data.message);
    });
});

/* ------------ GAME STUFF ------------ */
// Create a lobby data object
var lobby = new LobbyData(io);
// Create some games in it
lobby.addGame({rows: 25, cols: 25});
lobby.addGame({});