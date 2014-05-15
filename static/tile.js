/** Declares the tile enum.
  * Contains all tile types and their properties.
  */
  
var Tile = {
	EMPTY: 0, // outside map boundaries, not drawn; used to make maps look like a specific shape
	NORMAL: 1, // basic tile
	WALL: 2, // stone wall tile
	WATER: 3,
	
	// Contains properties for all tiles
	properties: {
		0: {walkable: false, color: "#000000"},
		1: {walkable: true, color: "#4CBB17"},
		2: {walkable: false, color: "#444444"},
		3: {walkable: true, color: "#1A6CD2"}
	}
};

if(typeof exports === "object") {
	module.exports = Tile;
}
