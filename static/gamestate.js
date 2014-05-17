/** Declares the game state class. Used by both client and server.
  * Contains the map, the current turn, and any other variables that represent the state of the game
  *
  * The game state on the server and client should be the same.
  * Things like "currently selected unit", which differ from client to client and which the server doesn't need, belong elsewhere.
  */
  
// Require map.js and tile.js if this is the server; if it is the client, the client will have already loaded it
if(typeof exports === "object") {
    var Map = require("./map.js");
    var Tile = require("./tile.js");
    var Unit = require("./unit.js");
}
  
/** Creates a new game state object for the given number of players */
var GameState = function(players, rows, columns) {
    // Create a new map and make it a hexagon
    this.map = new Map(rows, columns);
    this.map.makeHexShape();
    
    this.players = []; // A list of players in the game
    
    this.numPlayers = players;
    
    // Add a test unit for each player
    for(var i = 0; i < this.numPlayers; i++) {
        this.map.units.push(new Unit(this.map.randomTile(Tile.NORMAL), i, "race", "class"));
    }
    
    this.clearTurn();
};

/** Counts the number of players currently in the game */
GameState.prototype.playersInGame = function() {
    var count = 0;
    for(var i = 0; i < this.players.length; i++) {
        if(this.players[i] != -1) count++;
    }
    return count;
};

/** Adds the given player
  * Returns true if successful, false if the game was full
  */
GameState.prototype.addPlayer = function(id) {
    if(this.players.length < this.numPlayers) {
        this.players.push(id);
        return this.players.length - 1;
    }
    for(var i = 0; i < this.players.length; i++) {
        if(this.players[i] == -1) { //empty player slot
            this.players[i] = id;
            return i;
        }
    }
    return -1;
};

/** Removes the player with the given id */
GameState.prototype.removePlayer = function(id) {
    for(var i = 0; i < this.players.length; i++) {
        if(this.players[i] == id) {
            this.players[i] = -1;
            break;
        }
    }
};

/** Checks whether the given player is in the game */
GameState.prototype.hasPlayer = function(id) {
    for(var i = 0; i < this.players.length; i++) {
        if(this.players[i] == id)
            return true;
    }
    return false;
};

/** Dumps the game state to a simpler JavaScript object
  * This is used to send the state over the network.
  */
GameState.prototype.dump = function() {
    obj = {numPlayers: this.numPlayers, map: this.map, players: this.players};

    return obj;
};

/** Loads the game state from a JavaScript object */
GameState.prototype.load = function(obj) {
    this.numPlayers = obj.numPlayers;
    
    this.players = obj.players;
    
    this.map = new Map(1, 1);
    this.map.load(obj.map);
};

/** Updates the game state based on properties of update object
  * Different from doTurn in that it does non-game related stuff, like updating the players in the game.
  */
GameState.prototype.update = function(obj) {
    if("players" in obj) {
        this.players = obj.players;
    }
};

/** Clears the local turn.
  * The local turn is a compilation of actions/changes that have been made since it was last cleared.
  * This change record can be sent to the server as a move or sent to clients as an update before being cleared.
  * All relevant changes to the game state should be reflected in the current turn
  */
GameState.prototype.clearTurn = function() {
    // For now, the flip array is a list of tiles to be flipped (since that's the only action right now)
    this.localTurn = [];
};

/** Applies the given turn object to the state
  * Used to change from one state to a new, similar state, so that the server doesn't have to resend all data
  */
GameState.prototype.doTurn = function(obj) {
    // Obj is a list of actions to do; they are actually performed using doAction   
    for(var i = 0; i < obj.length; i++) {
        // Do the action without adding to localTurn
        this.doAction(obj[i], false);
    }
};

/** Does an action; updates the game state.
  * Adds the action to localTurn iff addLocal is not false */
GameState.prototype.doAction = function(action, addLocal) {
    // Action is a tile containing a unit and the direction to move it
    // Direction is of the form {x: x_change, y: y_change}
    var tile = action.tile;
    var dir = action.dir;
    
    var unit = this.map.tileUnit(tile);
    if(unit != null) {
        unit.pos.x += dir.x;
        unit.pos.y += dir.y;
    }
    
    if(typeof addLocal === "undefined" || addLocal) {
        // Add the tile to localTurn
        this.localTurn.push(action);
    }
};

/** Gets a summary of information about the game for display in the lobby */
GameState.prototype.summary = function() {
    return {
        numPlayers: this.numPlayers,
        players: this.playersInGame(),
        mapsize: this.map.cols() + " x " + this.map.rows(),
    };
};

if(typeof exports === "object") {
    module.exports = GameState;
}
