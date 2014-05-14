/** Declares the map class.
  * Contains terrain data and various map-related calculation functions.
  * Also contains player locations and locations of any other entities (items, non-player creatures, etc.)
  */
  
// Require tile.js if this is the server; if it is the client, the client will have already loaded it
if(typeof exports === "object") {
	var Tile = require("./tile.js");
}

// Declare constants
var HEX_HEIGHT = 200; //pixels

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

/** Renders the map on the given canvas context.
  * Will render things outside the given box, but won't draw whole tiles that are outside box to save time.
  * It is recommended that the area outside the drawn map is cleared.
  * @param x The x location on the canvas to start drawing
  * @param y The y location on the canvas to start drawing
  * @param width The width of the section of map to draw
  * @param height The height of the section of map to draw
  * @param offsetx The amount by which the map is offset in the x axis; the map pixel (offsetx, offsety) will be drawn at (x, y) on the canvas; 0 by default
  * @param offsety The amount by which the map is offset in the y axis; 0 by default
  * @param scale The scale at which things are drawn. 1.0 is default if scale is not passed
  */
Map.prototype.render = function(ctx, x, y, width, height, offsetx, offsety, scale) {
	// Set defaults
	offsetx = typeof offsetx !== "undefined" ? offsetx : 0;
	offsety = typeof offsety !== "undefined" ? offsety : 0;
	scale = typeof scale !== "undefined" ? scale : 1.0;
	
	// Calculate the width and height of each hexagon
	var h = HEX_HEIGHT * scale;
	var w = Math.round(Math.sqrt(3) / 2 * h);
	
	// Go through each hexagon on the map and see if it's in the window
	for(var r = 0; r < this.rows(); r++) {
		for(var c = 0; c < this.cols(); c++) {
			// Determine the location of the top left bounding box of this hex
			var hexx = (c + r / 2) * w - offsetx;
			var hexy = (r * 3 / 4) * h - offsety;
			
			// Check if the hexagon is in the window
			if(hexx + offsetx >= 0 && hexx <= width && hexy + offsety >= 0 && hexy <= height) {
				// Set color
				var color = Tile.properties[this.terrain[r][c]].color;
				ctx.fillStyle = color;
				ctx.strokeStyle = this.terrain[r][c] != Tile.EMPTY ? "#222222" : "#000000"; //hex border
				
				ctx.beginPath();
				ctx.moveTo(x + hexx, y + hexy + h / 4);
				ctx.lineTo(x + hexx + w / 2, y + hexy);
				ctx.lineTo(x + hexx + w, y + hexy + h / 4);
				ctx.lineTo(x + hexx + w, y + hexy + h * 3 / 4);
				ctx.lineTo(x + hexx + w / 2, y + hexy + h);
				ctx.lineTo(x + hexx, y + hexy + h * 3 / 4);
				ctx.lineTo(x + hexx, y + hexy + h / 4);
				
				ctx.fill();
				ctx.stroke();
			}
		}
	}
};

if(typeof exports === "object") {
	module.exports = Map;
}
