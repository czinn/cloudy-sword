/** The Unit class contains information about any unit in the game
  * It has position, stats, health, defences, controller info, abilities, etc.
  */
  
// Load the race and class data
if(typeof exports === "object") {
    var races = require("./races.js");
    var classes = require("./classes.js");
}
  
/** Creates a unit with the given position, controller, race, and class */
var Unit = function(pos, controller, race, cls) {
    this.pos = pos;
    this.controller = controller;
    this.race = race;
    this.cls = cls;
    
    // Set up base stats (that don't change during the game)
    // These will be loaded from config files based on race and class, but for now they are constant
    this.loadStats();
    
    // Set up status variables (that change during the game)
    this.health = this.hp; // current health
    this.mana = this.mn; // current mana
    this.steps = 0; // steps this turn
};

/** Loads base stats and abilities based on the race and class of the unit */
Unit.prototype.loadStats = function() {
    var raceData = races[this.race];
    var classData = classes[this.cls];
    
    // Load the base stats from the race
    this.st = raceData.st;
    this.dx = raceData.dx;
    this.iq = raceData.iq;
    this.hp = raceData.hp;
    this.mn = raceData.mn;
    this.speed = raceData.speed;
    
    // Load abilities from class only for now
    this.abilities = classData.abilities;
};

Unit.prototype.dump = function() {
    return {
        pos: this.pos,
        controller: this.controller,
        race: this.race,
        cls: this.cls,
        health: this.health,
        mana: this.mana,
        steps: this.steps
    };
};

Unit.prototype.load = function(obj) {
    this.pos = obj.pos;
    this.controller = obj.controller;
    this.race = obj.race;
    this.cls = obj.cls;
    
    this.loadStats();
    
    this.health = obj.health;
    this.mana = obj.mana;
    this.steps = obj.steps;
};

/** Returns a nicely formatted race name (capitalized, etc.) */
Unit.prototype.raceName = function() {
    return this.race.charAt(0).toUpperCase() + this.race.slice(1);
};

/** Returns a nicely formatted class name */
Unit.prototype.className = function() {
    return this.cls.charAt(0).toUpperCase() + this.cls.slice(1);
};

if(typeof exports !== "undefined") {
    module.exports = Unit;
}