// Load required modules
var express = require("express");
var favicon = require("serve-favicon");
var socketio = require("socket.io");
var GameState = require("./static/gamestate.js");

// Create the express app
var app = express();

// Set up static file directory and favicon
app.use("/static", express.static(__dirname + "/static"));
app.use(favicon(__dirname + "/static/favicon.ico"));

/* ------------ GAME STUFF ------------ */
// Create a really sketchy global game state
var gs = new GameState(2); // player number doesn't really matter

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
    
    socket.emit("fullgs", gs.dump()); // send the client the full game state
    
    // Set up Socket.IO event callbacks here
    socket.on("ping", function(data) {
        socket.emit("pong", data);
    });
    
    socket.on("turn", function(data) { // a turn update from a client
        // Update the local game state
        gs.doTurn(data);
        // Send out the update to everyone else
        socket.broadcast.emit("turn", data);
    });
    
    socket.on("disconnect", function() {
        console.log(addr.address + " disconnected.");
    });
});
