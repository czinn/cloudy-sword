/** Declares the map class.
  * Contains terrain data and various map-related calculation functions.
  * Also contains player locations and locations of any other entities (items, non-player creatures, etc.)
  */
  
// Require tile.js if this is the server; if it is the client, the client will have already loaded it
if(typeof exports === "object") {
    var Tile = require("./tile.js");
}

/** Constructor for a map object.
  * Creates an empty map of the specified dimensions.
  */
var Map = function(rows, cols, rivernum) {
    // Create an normal terrain instead of empty for testing
    this.terrain = [];

    for(var row = 0; row < rows; row++) {
        this.terrain[row] = [];
        for(var col = 0; col < cols; col++) {
            this.terrain[row][col] = Math.random() > 0.1 ? Tile.NORMAL : Tile.WALL;
        }
    }
    
    // Create array to hold units
    this.units = []; 

    //If no number of rivers given, use default of 1
    if (rivernum == null) {
      rivernum = 1;
    }

    //Begin river generation
    for (var i = 0; i < rivernum; i++) {
      //River starting row, and column
      var river_startx = (Math.random() > 0.5) ? 0 : rows - 1;
      var river_starty = (Math.random() > 0.5) ? 0 : cols - 1;
      //River starting direction
      var river_startdir = 0;

      //Make the starting position be on an edge
      if (Math.random() > 0.5) {
        river_startx = Math.floor(Math.random() * rows);
      }
      else {
        river_starty =  Math.floor(Math.random() * cols);
      }

      //Pick the starting direction of the river
      if (river_startx == 0 && river_starty < (cols / 2) || river_starty == 0 && river_startx < (rows / 2)){
        river_startdir = 3;
      }
      else if (river_startx == 0 || river_starty == cols - 1 && river_starty < (rows / 2)) {
        river_startdir = 4;
      }
      else if (river_startx == rows - 1  && river_starty < (cols / 2) || river_starty == 0) {
        river_startdir = 1;
      }

      //Calls river generation function
      this.rivergen(river_startx, river_starty, rows, cols, river_startdir);
    }
}

//River generation
//Still needs tweaking!
//river_row is current row river is on, river_column is current column river is on, rows is total rows on map, cols is total columns on map, dir is starting direction.
Map.prototype.rivergen = function(river_row, river_column, rows, cols, dir) {
    //Limits wandering temporarily, based on map size (appicable to change)
    var river_limit_wander = (cols + rows) / 4;
    //Variable for random integer that is from 0 to 100
    var river_randomizer = 0;
    //River direction. This number will change with more river starting locations.
    var river_move = dir;

    //While river is in the map
    while (0 <= river_row && river_row < rows && 0 <= river_column && river_column < cols) {

      //Stop generating if the river hits water
      if (this.terrain[river_row][river_column] == Tile.WATER) {
        break;
      }
      //Change tile
      this.terrain[river_row][river_column] = Tile.WATER;

      //Generates the randum number for rthe river to "wander"
      river_randomizer = (Math.floor(Math.random() * 100));

        //Turning probabilities
        if (river_randomizer > 98) {
          river_move = (river_move + 4) % 6;
        }
        else if (river_randomizer > 97) {
          river_move = (river_move + 2) % 6;
        }
        else if (river_randomizer > 72) {
          river_move = (river_move + 5) % 6;
        }
        else if (river_randomizer > 47) {
          river_move = (river_move + 1) % 6;
        }
        //Continues straight
        else {
          //River branching chance
          if (Math.floor(Math.random() * 10) < 5) {
            //Branch river at this point
            //This part needs adjusting (starting direction needs to change to (river_move + [1,2,4,5]) % 6)
            this.rivergen(river_row, river_column, rows, cols, (((Math.floor(Math.random() * 5) + 1)  + river_move) % 6));
          }
        }
      
      //Limit direction change at the beginning (lower chance of smaller, off-the-visible-map rivers)
      if (river_limit_wander > 0) { 
          //Diagonal left-up only has two directions (in a corner)
          if (dir == 0) {
            river_move = (Math.pow((river_move - 2.5), 2) - 6.25 != 0.0) ? Math.floor(Math.random() * 2) * 5: river_move;

          }
          //Diagonal right-down only has two directions (in a corner)
          else if (dir == 3) {
            river_move = (Math.pow((river_move - 2.5), 2) - 0.25 != 0.0) ? Math.floor(Math.random() * 2) + 2: river_move;
          }

          //Other sides
          else if (Math.abs(dir - river_move) > 1) {
            river_move = dir + (Math.floor(Math.random() * 3) - 1);
          }
        river_limit_wander --;
      }
      
      //Move the river
      switch (river_move){
        case 0:
          river_row --;
          break;
        case 1:
          river_row --;
          river_column ++;
          break;
        case 2:
          river_column ++;
          break;
        case 3:
          river_row ++;
          break;
        case 4:
          river_row ++;
          river_column --;
          break;
        case 5:
          river_column --;
          break;
      }
    }
}


/** Calculates the distance between the given hexes
  * A step between adjacent hexes is a distance of 1
  * Does not take into account non-walkable hexes
  */
Map.prototype.distance = function(a, b) {
    return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.x + a.y - b.x - b.y));
};

/** Chops corners off to make the map shaped like a large hexagon
  * Only works properly if rows and cols are odd and equal to each other
  */
Map.prototype.makeHexShape = function() {
    
    var center = {x: Math.floor(this.cols() / 2), y: Math.floor(this.rows() / 2)};
    var radius = Math.floor(this.cols() / 2);
    
    for(var r = 0; r < this.rows(); r++) {
        for(var c = 0; c < this.cols(); c++) {
            if(this.distance(center, {x: c, y: r}) > radius) {
                this.terrain[r][c] = Tile.EMPTY;
            }
        }
    }
};

Map.prototype.rows = function() {
    return this.terrain.length;
};

Map.prototype.cols = function() {
    return this.terrain[0].length;
};

/** Dumps the map state to a simpler JavaScript object
  * This is used to send the map over the network.
  */
Map.prototype.dump = function() {
    obj = {terrain: this.terrain};
    
    obj.units = [];
    for(var i = 0; i < this.units.length; i++) {
        obj.units.push(this.units[i].dump());
    }

    return obj;
};

/** Loads the map from a JavaScript object */
Map.prototype.load = function(obj) {
    this.terrain = obj.terrain;
    
    this.units = [];
    for(var i = 0; i < obj.units.length; i++) {
        var unit = new Unit(null, -1, "gnome", "wizard");
        unit.load(obj.units[i]);
        this.units.push(unit);
    }
};

/** Returns a random tile that is of the given type */
Map.prototype.randomTile = function(type) {
    while(true) {
        var x = Math.floor(Math.random() * this.cols());
        var y = Math.floor(Math.random() * this.rows());
        if(this.terrain[y][x] == type) {
            return {x: x, y: y};
        }
    }
};

/** Returns the unit on a given tile, or null */
Map.prototype.tileUnit = function(tile) {
    for(var i = 0; i < this.units.length; i++) {
        if(this.units[i].pos.x == tile.x && this.units[i].pos.y == tile.y) {
            return this.units[i];
        }
    }
    return null;
};

/** Returns the tile at the given location */
Map.prototype.tileAt = function(location) {
    return this.terrain[location.y][location.x];
}

/** Sets the tile at the location with the given tile type */
Map.prototype.setTile = function(location, tile) {
    this.terrain[location.y][location.x] = tile;
}

/** Counts the number of tiles around a given location of the given type */
Map.prototype.tileCount = function(location, tile) {
    var locations = [[-1, 0], [1,0],[0,-1], [0,1], [-1,1], [1,-1]];    
    var amount = 0;
    var _this = this;
    locations.forEach(function(location) {
        var t = {x:location.x+location[0], y:location.y+location[1]};
        if (_this.onGrid(t) && _this.tileAt(t) == tile) amount++;
    });
    return amount;
}

/** Checks of the given location is on the grid (Not empty and in array) */
Map.prototype.onGrid = function(tile) {
    return (tile.y >= 0 && tile.y < this.rows() && tile.x >= 0 && tile.x < this.cols()) && this.tileAt(tile) != Tile.EMPTY;
}

/** Gets the row and column of the hexagon that contains (px, py)
  * @returns {x: column, y: row}
  */
Map.prototype.hexAt = function(px, py) {
    // Calculate the size of the hexagons
    var size = HEX_HEIGHT / 2;
    
    // Use that to find the approximate x and y of the tile
    var y = 2/3 * (py - HEX_HEIGHT / 2) / size;
    var x = 1/3 * (Math.sqrt(3) * px - py + HEX_HEIGHT / 2) / size - 0.5;
    var z = -x - y; // calculate z, used later
    
    // Round each coordinate
    var rx = Math.round(x);
    var ry = Math.round(y);
    var rz = Math.round(z);
    
    // Calculate deltas
    var dx = Math.abs(rx - x);
    var dy = Math.abs(ry - y);
    var dz = Math.abs(rz - z);
    
    // Reverse the largest delta
    if(dx > dy && dx > dz) {
        rx = -ry - rz;
    } else if(dy > dz) {
        ry = -rx - rz;
    }
    
    return {x: rx, y: ry};
};

/** Gets the row and column of the hexagon that contains (px, py) after reversing the transformations applied during rendering
  * See Map.render for what these transformations actually are
  */
Map.prototype.hexAtTransformed = function(px, py, x, y, offsetx, offsety, scale) {
    // Set defaults
    offsetx = typeof offsetx !== "undefined" ? offsetx : 0;
    offsety = typeof offsety !== "undefined" ? offsety : 0;
    scale = typeof scale !== "undefined" ? scale : 1.0;
    
    return this.hexAt((px + offsetx - x) / scale, (py + offsety - y) / scale);
};

/** Gets whether the given tile is walkable */
Map.prototype.tileWalkable = function(tile) {
    if(!this.onGrid(tile)) return false;
    if(!Tile.properties[this.tileAt(tile)].walkable) return false;
    var unit = this.tileUnit(tile);
    if(unit != null) return false;
    
    return true;
};

/** Checks whether the given tile is a valid target for the given ability used by the given unit
  * Even though some abilities target units instead of tiles, this is still valid */
Map.prototype.validTarget = function(tile, unit, ability) {
    if(!this.onGrid(tile)) return false;

    var dist = this.distance(tile, unit.pos);
    
    var range = ability.range;
    if(ability.type == "melee") {
        range = 1;
    }
    
    if(dist > range) return false;
    
    var target = this.tileUnit(tile);
    
    if(ability.target == "tile" && target == null) return true;
    if(ability.target == "unit" && target != null) return true;
    if(ability.target == "ally" && target != null && target.controller == unit.controller) return true;
    if(ability.target == "enemy" && target != null && target.controller != unit.controller) return true;
    
    return false;
};

if(typeof exports === "object") {
    module.exports = Map;
}
