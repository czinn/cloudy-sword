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
var Map = function(rows, cols) {
    //Create an normal terrain instead of empty for testing
    this.terrain = [];

    for(var row = 0; row < rows; row++) {
        this.terrain[row] = [];
        for(var col = 0; col < cols; col++) {
            this.terrain[row][col] = Math.random() > 0.2 ? Tile.NORMAL : Tile.WALL
        }

    }
    //Basic River generation
    //Currently dirty, simple and random
    //River starting row, and column
    var river_row = Math.floor(Math.random() * (rows - 4)) + 2;
    var river_column = 0;

    var river_randomizer = 0;
    //River movement, gives river general sense of direction. This number will change with more river starting locations.
    var river_move = 2;


    while (0 <= river_row && river_row < rows && 0 <= river_column && river_column < cols) {
      
      if (this.terrain[river_row][river_column] == Tile.WATER) {
        break;
      }

      this.terrain[river_row][river_column] = Tile.WATER

      river_randomizer = (Math.floor(Math.random() * 1000));

      if (river_randomizer > 990) {
        river_move = (river_move + 4) % 6;
      }
      else if (river_randomizer > 980) {
        river_move = (river_move + 2) % 6;
      }
      else if (river_randomizer > 740) {
        river_move = (river_move + 5) % 6;
      }
      else if (river_randomizer > 520) {
        river_move = (river_move + 1) % 6;
      }

      switch (river_move){
        case 0:
          river_row -= 1;
          break;
        case 1:
          river_row -= 1;
          river_column += 1;
          break;
        case 2:
          river_column += 1;
          break;
        case 3:
          river_row += 1;
          break;
        case 4:
          river_row += 1;
          river_column -= 1;
          break;
        case 5:
          river_column += 1;
          break;
      }
    }


}

/** Calculates the distance between the given hexes
  * A step between adjacent hexes is a distance of 1
  * Does not take into account non-walkable hexes
  */
Map.prototype.distance = function(x1, y1, x2, y2) {
    return Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), Math.abs(y2 + x2 - y1 - x1));
};

/** Chops corners off to make the map shaped like a large hexagon
  * Only works properly if rows and cols are odd and equal to each other
  */
Map.prototype.makeHexShape = function() {
    // Size of the corners to chop off
    var cornerSize = (this.rows() - 1) / 2;
    
    for(var r = 0; r < this.rows(); r++) {
        for(var c = 0; c < this.cols(); c++) {
            if(this.distance(0, 0, r, c) < cornerSize || this.distance(this.rows() - 1, this.cols() - 1, r, c) < cornerSize) {
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

    return obj;
};

/** Loads the map from a JavaScript object */
Map.prototype.load = function(obj) {
    this.terrain = obj.terrain;
};

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

if(typeof exports === "object") {
    module.exports = Map;
}
