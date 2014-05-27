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
    
    this.turn = 0; // player that is currently playing (not the turn count)
    
    // Add a couple of test units for each player
    for(var i = 0; i < this.numPlayers; i++) {
        this.map.units.push(new Unit(this.map.randomTile(Tile.NORMAL), i, "gnome", "wizard"));
        this.map.units.push(new Unit(this.map.randomTile(Tile.NORMAL), i, "gnome", "wizard"));
    }
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

/** Checks whether the given player is in the game
  * Returns that player's in-game id */
GameState.prototype.hasPlayer = function(id) {
    for(var i = 0; i < this.players.length; i++) {
        if(this.players[i] == id)
            return i;
    }
    return -1;
};

/** Dumps the game state to a simpler JavaScript object
  * This is used to send the state over the network.
  */
GameState.prototype.dump = function() {
    obj = {numPlayers: this.numPlayers, map: this.map, players: this.players, turn: this.turn};

    return obj;
};

/** Loads the game state from a JavaScript object */
GameState.prototype.load = function(obj) {
    this.numPlayers = obj.numPlayers;
    
    this.players = obj.players;
    
    this.turn = obj.turn;
    
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

/** Checks whether the given action is a valid action for the given player */
GameState.prototype.validAction = function(action, player) {
    if(player != this.turn) return false; // Can't do stuff if it's not your turn!
    
    if(action.type == "move") { // Move action
        var tile = action.tile;
        var dir = action.dir;
        var target = {x: tile.x + dir.x, y: tile.y + dir.y};
        var unit = this.map.tileUnit(tile);
        if(unit != null && unit.controller == player && this.map.tileWalkable(target) && unit.steps < unit.speed)
            return true;
    } else if(action.type == "end") { // End turn action
        // End turn is always valid
        return true;
    } else if(action.type == "ability") {
        var unit = this.map.tileUnit(action.unit);
        if(unit == null) return false;
        if(unit.usedAbility) return false;
        var ability = unit.abilities[action.ability];
        if(ability == null) return false;
        var target = action.target;
        if(this.map.validTarget(target, unit, ability)) {
            // Valid!
            return true;
        } else {
            return false;
        }
    }
    
    return false;
};

/** Does an action; updates the game state. */
GameState.prototype.doAction = function(action) {
    if(action.type == "move") { // Move action
        // Action is a tile containing a unit and the direction to move it
        // Direction is of the form {x: x_change, y: y_change}
        var tile = action.tile;
        var dir = action.dir;
        
        var unit = this.map.tileUnit(tile);
        if(unit != null) {
            unit.pos.x += dir.x;
            unit.pos.y += dir.y;
            unit.steps += 1;
        }
    } else if(action.type == "end") { // End turn action
        this.endTurn();
        this.advanceTurn();
        this.startTurn();
    } else if(action.type == "ability") { // Use an ability
        var unit = this.map.tileUnit(action.unit);
        var ability = unit.abilities[action.ability];
        var target = action.target;
        unit.usedAbility = true;
        if(ability.target == "unit" || ability.target == "ally" || ability.target == "enemy") {
            var targetUnit = this.map.tileUnit(target);
            // Do ability things
            if(typeof ability.action.damage !== "undefined") {
                // Placeholder, just do some damage
                targetUnit.health -= 5;
            }
            if(typeof ability.action.heal !== "undefined") {
                // Placeholder, just do some healing
                targetUnit.health += 5;
            }
        }
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

/** Does start of turn stuff for the current player */
GameState.prototype.startTurn = function() {
    // Reset the steps of each unit that the player controls
    for(var i = 0; i < this.map.units.length; i++) {
        var unit = this.map.units[i];
        if(unit.controller == this.turn) {
            // Reset steps
            unit.steps = 0;
            // Reset ability use
            unit.usedAbility = false;
        }
    }
};

GameState.prototype.advanceTurn = function() {
    // Advances the turn counter
    this.turn++;
    if(this.turn >= this.numPlayers) {
        this.turn = 0;
    }
};

/** Does end of turn stuff for the current player */
GameState.prototype.endTurn = function() {
    // Currently nothing happens at the end of a turn
};

if(typeof exports === "object") {
    module.exports = GameState;
}
