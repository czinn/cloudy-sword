// Load required modules
var express = require("express");
var favicon = require("serve-favicon");
var socketio = require("socket.io");
var LobbyData = require("./static/lobbydata.js");
var util = require("util");
// Create the express app
var app = express();

//Console input
process.stdin.resume();
process.stdin.setEncoding('utf8');

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
    
    socket.on("msguser", function(message, user) {
        if (typeof user === 'string') {
            if (user == "console") {
                if (lobby.getClientBySocket(socket) != null) {
                    console.log(lobby.getClientBySocket(socket).name + " whispers " + message);
                }
            } else {
                if (lobby.getClientByName(user) != null) {
                    lobby.getClientByName(user).socket.emit("message", lobby.getClientByName(user).name + " whispers " + message);
                }
            }
        }
    });
});

/* ------------ GAME STUFF ------------ */
// Create a lobby data object
var lobby = new LobbyData(io);
// Create some games in it
lobby.addGame({rows: 25, cols: 25});
lobby.addGame({});

//A variable to get the current instance
var _this = this;

/* ------------ CONSOLE --------------- */
process.stdin.on('data', function (text) {
    var command = util.inspect(text).substring(1, util.inspect(text).length-5);
    var args = command.split(" ");
    if (args[0] == "?" || args[0] == "help") {
        console.log("XxXxXx--HELP--xXxXxX");
        console.log("quit - Exit cloudy-sword");
    } else if (args[0] == "quit" || args[0] == "exit") {
        console.log("bye!");
        process.exit();
    } else if (args[0] == "message" || args[0] == "msg") {
        if (args.length < 2 && args[2] != "") {
            console.log("msg [username] [message]");
        } else {
            if (lobby.getClientByName(args[1]) != null) {
                var message = "";
                for (var i = 2; i < args.length; i++) {
                    message += args[i];
                }
                lobby.getClientByName(args[1]).socket.emit("message", "The Console whispers " + message);
                console.log("[console -> " + args[1] + "] " + message);
            } else {
                console.log("That user does not exist");
            }
        }
    } else {
        console.log("Unknown command. Type 'help' for help");
    }
});