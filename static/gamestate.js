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
}
  
/** Creates a new game state object for the given number of players */
var GameState = function(players) {
	// Create a new map and make it a hexagon
	this.map = new Map(15, 15);
	this.map.makeHexShape();
	
	this.numPlayers = players;
	
	this.clearTurn();
}

/** Dumps the game state to a simpler JavaScript object
  * This is used to send the state over the network.
  */
GameState.prototype.dump = function() {
	obj = {numPlayers: this.numPlayers, map: this.map};

	return obj;
};

/** Loads the game state from a JavaScript object */
GameState.prototype.load = function(obj) {
	this.numPlayers = obj.players;
	this.map = new Map(1, 1);
	this.map.load(obj.map);
};

/** Clears the local turn.
  * The local turn is a compilation of actions/changes that have been made since it was last cleared.
  * This change record can be sent to the server as a move or sent to clients as an update before being cleared.
  * All relevant changes to the game state should be reflected in the current turn
  */
GameState.prototype.clearTurn = function() {
	// For now, the flip array is a list of tiles to be flipped (since that's the only action right now)
	this.localTurn = {flip: []};
};

/** Applies the given turn object to the state
  * Used to change from one state to a new, similar state, so that the server doesn't have to resend all data
  */
GameState.prototype.doTurn = function(obj) {
	// Currently, for testing purposes, obj only contains obj.flip, which is a list of tiles to flip	
	for(var i = 0; i < obj.flip.length; i++) {
		var tile = obj.flip[i];
		
		if(this.map.terrain[tile.y][tile.x] == Tile.NORMAL)
			this.map.terrain[tile.y][tile.x] = Tile.WALL;
		else if(this.map.terrain[tile.y][tile.x] == Tile.WALL)
			this.map.terrain[tile.y][tile.x] = Tile.NORMAL;
	}
};

/** Does an action; updates the game state and applies the change to localTurn */
GameState.prototype.doAction = function(action) {
	// For now, action is basically just a tile to be flipped
	var tile = action.tile;
	if(this.map.terrain[tile.y][tile.x] == Tile.NORMAL)
		this.map.terrain[tile.y][tile.x] = Tile.WALL;
	else if(this.map.terrain[tile.y][tile.x] == Tile.WALL)
		this.map.terrain[tile.y][tile.x] = Tile.NORMAL;
		
	// Add the tile to localTurn
	this.localTurn.flip.push(tile);
};

if(typeof exports === "object") {
	module.exports = GameState;
}