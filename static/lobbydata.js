/** LobbyData is a server side class that manages GameStates and client data.
  * Unlike GameStates, the client doesn't have a copy of LobbyData
  * Instead, the Interface handles LobbyData-related tasks for the client.
  */

var GameState = require("./gamestate.js");
var Moniker = require("moniker");

/* ------------ CLIENT OBJECT ------------ */
// A simple object to hold some information about a client
var Client = function(id, socket) {
    this.currentGame = null; //Current game id; null for lobby
    this.socket = socket;
    this.id = id;
    this.name = Moniker.choose();
};

Client.prototype.roomName = function() {
    if(this.currentGame == null) {
        return "lobby";
    } else {
        return "game_" + this.currentGame;
    }
};


/* ------------ LOBBYDATA OBJECT ------------ */
var LobbyData = function(io) {
    // A map for the GameStates; maps game id to GameState object
    this.gamestates = {};
    
    // Keeps track of next game id to assign
    this.gameIdCounter = 0;
    
    // A map for clients; maps client id to Client object
    this.clients = {};
    
    // Keeps track of next client id to assign
    this.clientIdCounter = 0;
    
    this.io = io;
};

/** Checks whether a game with the given id exists */
LobbyData.prototype.gameExists = function(gameId) {
    return gameId in this.gamestates;
};

/** Adds a new game with the given settings
  * Right now the settings do nothing!
  */
LobbyData.prototype.addGame = function(settings) {
    if(typeof settings.players === "undefined") settings.players = 2;
    if(typeof settings.rows === "undefined") settings.rows = 15;
    if(typeof settings.cols === "undefined") settings.cols = 15;
    this.gamestates[this.gameIdCounter] = new GameState(settings.players, settings.rows, settings.cols);
    
    this.gameIdCounter++;
};

/** Adds a new client with the given socket */
LobbyData.prototype.addClient = function(socket) {
    var client = new Client(this.clientIdCounter, socket);
    this.clients[this.clientIdCounter] = client;
    this.clientIdCounter++;
    
    /* ------------ SOCKET.IO CALLBACKS ------------ */
    socket.join("lobby");
    
    // Tell them their client id
    socket.emit("clientid", client.id);
    
    // Send them the game list and client list
    this.sendGameList(client);
    this.sendClientList(client);
    
    // Send the updated client list to everyone in the lobby
    this.updateClients("lobby", [client.id]);
    
    var _this = this;
    socket.on("action", function(data) { // a new action from the client
        if(client.currentGame != null && _this.gameExists(client.currentGame)) {
            var gs = _this.gamestates[client.currentGame];
            // Verify that this player is actually a player in the game
            // Also ensure the action is valid
            var ingameid = gs.hasPlayer(client.id);
            if(ingameid != -1 && gs.validAction(data, ingameid)) {
                // Update the local game state
                gs.doAction(data);
                // Send out the update to everyone else in this game
                socket.broadcast.to("game_" + client.currentGame).emit("action", data);
            } else {
                // Send them a complete copy of the game state, to make sure they're right
                socket.emit("gsfull", gs.dump());
            }
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
    
    socket.on("changename", function(data) { // data is new name
        // Ensure name is long enough
        if(data.length > 3 || data == "Sam") {
            // Check that the new name is not already used
            if(!_this.isNameUsed(data)) {
                var oldName = client.name;
                // Change their name
                client.name = data;
                
                // Send the update to everyone in their room
                _this.updateClients(client.roomName(), [client.id]);
                _this.io.sockets.in(client.roomName()).emit("message", oldName + " is now " + data);
            }
        }
    });
    
    socket.on("leavegame", function(data) {
        _this.clientLeaveGame(client);
    });
    
    socket.on("disconnect", function(data) {
        _this.clientLeaveGame(client);
        // Tell everyone that they've left the lobby
        client.currentGame = -1;
        _this.updateClients("lobby", [client.id]);
        
        // Remove them from the client list
        delete _this.clients[client.id];
    });
    
    socket.on("clientchat", function(message) {
        socket.broadcast.emit("message", client.name + ": " + message);
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
    
    // Tell the client who they are playing as
    client.socket.emit("playingas", {id: playingAs});
    
    // Tell the client about people in their new room
    this.sendClientList(client);
    // Tell everyone else about the new client
    this.updateClients("game_" + gameid, [client.id]);
    // Tell the lobby that someone left
    this.updateClients("lobby", [client.id]);
    
    // Send the client the full game state
    client.socket.emit("gsfull", gs.dump());
    
    // Broadcast the updated game summary to everyone in the lobby
    this.updateGames([gameid]);
};

/** Handles a client leaving a game (joining lobby) */
LobbyData.prototype.clientLeaveGame = function(client) {
    if(client.currentGame == null || !this.gameExists(client.currentGame))
        return;
        
    var oldRoom = "game_" + client.currentGame;
    
    // Remove them from the game
    var gs = this.gamestates[client.currentGame];
    gs.removePlayer(client.id);
    
    // Remove the client from their current Socket.IO room
    client.socket.leave(oldRoom);
    client.socket.join("lobby");
    client.socket.broadcast.to(oldRoom).emit("gsupdate", {players: gs.players});
    
    // Broadcast the updated game summary to everyone in the lobby
    this.updateGames([client.currentGame]);
    
    // Set their current game back to null
    client.currentGame = null;
    
    // Send the updated client information to everyone in their old lobby
    this.updateClients(oldRoom, [client.id]);
    
    // Send the client a full list of clients in their new room
    this.sendClientList(client);
    
    // Send everyone else in the lobby an update about the client that just joined
    this.updateClients("lobby", [client.id]);
};

/** Sends a client a list of clients in their room */
LobbyData.prototype.sendClientList = function(client) {
    var clist = {full: true};
    for(var i in this.clients) {
        if(this.clients.hasOwnProperty(i)) {
            if(this.clients[i].roomName() == client.roomName()) {
                clist[i] = this.clients[i].name;
            }
        }
    }
    client.socket.emit("clientlist", clist);
};

/** Sends updates for the given clients to everyone in the given room (including them) */
LobbyData.prototype.updateClients = function(room, ids) {
    var clist = {full: false};
    for(var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if(this.clients[id].roomName() == room) {
            clist[id] = this.clients[id].name;
        } else {
            clist[id] = null;
        }
    }
    
    this.io.sockets.in(room).emit("clientlist", clist);
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

/** Sends settings updates for the given games to everyone in the lobby */
LobbyData.prototype.updateGames = function(ids) {
    var summaries = {};
    for(var i = 0; i < ids.length; i++) {
        var id = ids[i];
        summaries[id] = this.gamestates[id].summary();
    }
    
    this.io.sockets.in("lobby").emit("gamelist", summaries);
};

/** Checks whether a name is already in use */
LobbyData.prototype.isNameUsed = function(name) {
    for(var i in this.clients) {
        if(this.clients.hasOwnProperty(i)) {
            if(this.clients[i].name == name)
                return true;
        }
    }
    return false;
};

/** Get client based on username */
LobbyData.prototype.getClientByName = function(name) {
    for(var i in this.clients) {
        if(this.clients.hasOwnProperty(i)) {
            if(this.clients[i].name == name) {
                return this.clients[i];
            }
        }
    }
    return null;
};

LobbyData.prototype.getClientBySocket = function(socket) {
    for(var i in this.clients) {
        if(this.clients.hasOwnProperty(i)) {
            if(this.clients[i].socket == socket) {
                return this.clients[i];
            }
        }
    }
    return null;
};
module.exports = LobbyData;
