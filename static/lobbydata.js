/** LobbyData is a server side class that manages GameStates and client data.
  * Unlike GameStates, the client doesn't have a copy of LobbyData
  * Instead, the Interface handles LobbyData-related tasks for the client.
  */

var GameState = require("./gamestate.js");

/* ------------ CLIENT OBJECT ------------ */
// A simple object to hold some information about a client
var Client = function(id, socket) {
    this.currentGame = null; //Current game id; null for lobby
    this.socket = socket;
    this.id = id;
};


/* ------------ LOBBYDATA OBJECT ------------ */
var LobbyData = function() {
    // A map for the GameStates; maps game id to GameState object
    this.gamestates = {};
    
    // Keeps track of next game id to assign
    this.gameIdCounter = 0;
    
    // A map for clients; maps client id to Client object
    this.clients = {};
    
    // Keeps track of next client id to assign
    this.clientIdCounter = 0;
};

/** Checks whether a game with the given id exists */
LobbyData.prototype.gameExists = function(gameId) {
    return gameId in this.gamestates;
};

/** Adds a new game with the given settings
  * Right now the settings do nothing!
  */
LobbyData.prototype.addGame = function(settings) {
    this.gamestates[this.gameIdCounter] = new GameState(2);
    
    this.gameIdCounter++;
};

/** Adds a new client with the given socket */
LobbyData.prototype.addClient = function(socket) {
    var client = new Client(this.clientIdCounter, socket);
    this.clients[this.clientIdCounter] = client;
    this.clientIdCounter++;
    
    /* ------------ SOCKET.IO CALLBACKS ------------ */
    socket.join("lobby");
    
    // Send them the game list
    this.sendGameList(client);
    
    var _this = this;
    socket.on("turn", function(data) { // a turn update from a client
        if(client.currentGame != null && _this.gameExists(client.currentGame)) {
            var gs = _this.gamestates[client.currentGame];
            // Verify that this player is actually a player in the game
            if(gs.hasPlayer(client.id)) {
                // Update the local game state
                gs.doTurn(data);
                // Send out the update to everyone else in this game
                socket.broadcast.to("game_" + client.currentGame).emit("turn", data);
            } else {
                // Send them a complete copy of the game state, to make sure they're right
                socket.emit("gsfull", gs.dump());
            }
            console.log(client.id + " in " + JSON.stringify(gs.players));
        }
    });
    
    socket.on("joingame", function(data) {
        // Make sure data.gameId actually exists
        if(_this.gameExists(data.gameId)) {
            if(client.currentGame != null) {
                _this.clientLeaveGame(client);
            }
            _this.clientJoinGame(client, data.gameId);
        }
    });
    
    socket.on("leavegame", function(data) {
        _this.clientLeaveGame(client);
    });
    
    socket.on("disconnect", function(data) {
        _this.clientLeaveGame(client);
    });
};

/** Handles a client joining a game */
LobbyData.prototype.clientJoinGame = function(client, gameid) {
    if(!this.gameExists(gameid)) {
        client.socket.emit("kick");
        this.sendGameList(client);
        return;
    }

    client.currentGame = gameid;
    var gs = this.gamestates[gameid];
    
    // Add the player to the game
    var playingAs = gs.addPlayer(client.id); // playingAs is the in-game id of the player
    
    // Have the client leave the lobby and join the game room with Socket.IO
    client.socket.leave("lobby");
    client.socket.join("game_" + gameid);
    
    // Broadcast the updated player list
    client.socket.broadcast.to("game_" + gameid).emit("gsupdate", {players: gs.players});
    client.socket.broadcast.to("game_" + gameid).emit("message", "IP " + addr.address + ":" + addr.port  + " has joined the game!");
    
    // Tell the client who they are playing as
    client.socket.emit("playingas", {id: playingAs});
    
    // Send the client the full game state
    client.socket.emit("gsfull", gs.dump());
    
    // Broadcast the updated game summary to everyone in the lobby
    var change = {};
    change[gameid] = gs.summary();
    client.socket.broadcast.to("lobby").emit("gamelist", change);
};

/** Handles a client leaving a game (joining lobby) */
LobbyData.prototype.clientLeaveGame = function(client) {
    if(client.currentGame == null || !this.gameExists(client.currentGame))
        return;

    // Remove them from the game
    var gs = this.gamestates[client.currentGame];
    gs.removePlayer(client.id);
    
    // Remove the client from their current Socket.IO room
    client.socket.leave("game_" + client.currentGame);
    client.socket.join("lobby");
    
    // Broadcast the updated game summary to everyone in the lobby, and themselves
    var change = {};
    change[client.currentGame] = gs.summary();
    client.socket.broadcast.to("lobby").emit("gamelist", change);
    client.socket.emit("gamelist", change);
    
    // Set their current game back to null
    client.currentGame = null;
};

/** Sends a client a full list of game summaries */
LobbyData.prototype.sendGameList = function(client) {
    var summaries = {};
    for(var i in this.gamestates) {
        if(this.gamestates.hasOwnProperty(i)) {
            summaries[i] = this.gamestates[i].summary();
        }
    }
    
    client.socket.emit("gamelist", summaries);
};




module.exports = LobbyData;
