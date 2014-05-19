/** The Unit class contains information about any unit in the game
  * It has position, stats, health, defences, controller info, abilities, etc.
  */
  
  
/** Creates a unit with the given position, controller, race, and class */
var Unit = function(pos, controller, race, cls) {
    this.pos = pos;
    this.controller = controller;
    this.race = race;
    this.cls = cls;
    
    // Set up base stats (that don't change during the game)
    // These will be loaded from config files based on race and class, but for now they are constant
    this.st = 5;
    this.iq = 5;
    this.dx = 5;
    this.hp = 25; // max hp
    this.mn = 25; // max mana
    this.speed = 5; // steps per turn
    this.abilities = []; // load from race/class later
    
    // Set up status variables (that change during the game)
    this.health = this.hp; // current health
    this.mana = this.mn; // current mana
    this.steps = 0; // steps this turn
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
    
    this.st = 5;
    this.iq = 5;
    this.dx = 5;
    this.hp = 25; // max hp
    this.mn = 25; // max mana
    this.speed = 5; // steps per turn
    this.abilities = []; // load from race/class later
    
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