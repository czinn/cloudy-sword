/** Declares the tile enum.
  * Contains all tile types and their properties.
  */
  
var Tile = {
	EMPTY: 0, // outside map boundaries, not drawn; used to make maps look like a specific shape
	NORMAL: 1, // basic tile
	WALL: 2, // stone wall tile
	
	// Contains properties for all tiles
	properties: {
		0: {walkable: false, color: "#000000"},
		1: {walkable: true, color: "#DDDDDD"},
		2: {walkable: false, color: "#888888"}
	}
};

if(typeof exports === "object") {
	module.exports = Tile;
}
