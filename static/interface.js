/** The interface class manages the user interface.
  * It keeps track of things like which unit is selected.
  * It is designed so that it can be fully replaced by another interface
  * that works on another platform, or that looks different.
  */

// Declare constants
var HEX_HEIGHT = 200; //pixels
  
/** Creates the interface object.
  * Needs a reference to the canvas to set up click handlers.
  * Needs references to the game state and socket to actually change stuff.
  */
var Interface = function(canvas, gs, socket) {
    /* ------------ VARIABLES ------------ */
    // Save parameters
    this.canvas = canvas;
    this.gs = gs;
    this.socket = socket;
    
    // Interface state
    this.uistate = 0;
    // 0 - in lobby
    // 1 - in game
    
    // Set up message log
    this.messages = [];
    
    // Some interface variables
    this.oldmx = 0; // Last mouse x position
    this.oldmy = 0; // Last mouse y position
    this.dragx = 0; // Where the drag started
    this.dragy = 0;
    this.dragging = false;
    this.mousedown = false;
    this.offsetx = 200;
    this.offsety = 0;
    this.scale = 1.0;
    this.playingAs = -1; // Whether or not we are actually playing in the current game
    this.selectedTile = {x: -1, y: -1}; // Currently selected tile
    
    // Game list
    this.gamelist = {};
    
    // Ping time for pinging
    var pingtime = 0;
    
    var _this = this;
    
    /* ------------ SOCKET.IO CALLBACKS ------------ */
    socket.on("connecting", function() {
        _this.messages.push("Connecting to server...");
    });
    socket.on("connect", function() {
        _this.messages.push("Connected. Sending ping event...");
        pingtime = new Date().getTime();
        _this.socket.emit("ping", {msg: "Everything works!"});
        _this.uistate = 0; // Switch to lobby
    });
    socket.on("pong", function(data) {
        _this.messages.push("Received pong event: " + data.msg);
        _this.messages.push("Ping time: " + (new Date().getTime() - pingtime) + "ms.");
    });
    socket.on("disconnect", function() {
        _this.messages.push("Disconnected from the server.");
    });
    socket.on("gsfull", function(data) {
        // Reload the entire game state
        _this.gs.load(data);
    });
    socket.on("gsupdate", function(data) {
        // Update the game state
        _this.gs.update(data);
    });
    socket.on("turn", function(data) {
        // Update with the turn data
        _this.gs.doTurn(data);
    });
    socket.on("gamelist", function(data) {
        // Update the local list of games
        for(var i in data) {
            if(data.hasOwnProperty(i)) {
                _this.gamelist[i] = data[i];
            }
        }
    });
    socket.on("kick", function(data) { // Kicked out of game room
        _this.uistate = 0; // Switch to lobby
    });
    socket.on("playingas", function(data) {
        _this.playingAs = data.id;
    });
    socket.on("message", function(data) {
        _this.messages.push(data);
    });
    
    /* ------------ CANVAS CALLBACKS ------------ */
    this.canvas.onclick = function(e) {
        var mx = e.pageX - e.target.offsetLeft;
        var my = e.pageY - e.target.offsetTop;
        
        if(_this.uistate == 0) { // Lobby
            var k = 0; // Drawing index
            for(var i in _this.gamelist) {
                if(_this.gamelist.hasOwnProperty(i)) {
                    // Check if mouse is over this game state
                    if(mx >= 50 && mx < 450 && my >= 50 + k * 50 && my < 90 + k * 50) {
                        // Join this game
                        socket.emit("joingame", {gameId: i});
                        // Change uistate to in game
                        _this.uistate = 1; // In-game
                    }
                    
                    k++;
                }
            }
        } else if(_this.uistate == 1) { // In-game
            if(!_this.dragging) {
                var tile = _this.gs.map.hexAtTransformed(mx, my, 10, 10, _this.offsetx, _this.offsety, _this.scale);
                if(tile.x >= 0 && tile.x < _this.gs.map.cols() && tile.y >= 0 && tile.y < _this.gs.map.rows()) {
                    _this.clickTile(tile);
                }
            }
        }
    };
    this.canvas.onmousedown = function(e) {
        _this.oldmx = e.pageX - e.target.offsetLeft;
        _this.oldmy = e.pageY - e.target.offsetTop;
        _this.dragx = _this.oldmx;
        _this.dragy = _this.oldmy;
        _this.mousedown = true;
        _this.dragging = false;
    }
    this.canvas.onmousemove = function(e) {
        var mx = e.pageX - e.target.offsetLeft;
        var my = e.pageY - e.target.offsetTop;
        
        if(_this.mousedown) {
            if(_this.uistate == 1) { // In-game
                if(_this.dragging || Math.abs(mx - _this.dragx) > 30 || Math.abs(my - _this.dragy) > 30) {
                    _this.dragging = true;
                    _this.offsetx -= mx - _this.dragx;
                    _this.offsety -= my - _this.dragy;
                    _this.dragx = mx;
                    _this.dragy = my;
                }
            }
        }
        
        _this.oldmx = mx;
        _this.oldmy = my;
    }
    this.canvas.onmouseup = function(e) {
        _this.mousedown = false;
    }
    var canvasScroll = function(e) {
        var delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
        //alert(delta);
        if(_this.uistate == 1) { // In-game
            _this.scale += delta * 0.1;
            if(_this.scale < 0.3) _this.scale = 0.3;
            if(_this.scale > 2.0) _this.scale = 2.0;
        }
    }
    this.canvas.addEventListener("mousewheel", canvasScroll, false); // Most browsers
    this.canvas.addEventListener("DOMMouseScroll", canvasScroll, false); // Firefox
    
    
    /* ------------ WINDOW CALLBACKS ------------ */
    window.onresize = this.resize;
    // Key press
    window.onkeypress = function(e) {
		if(!e) e = window.event;
		var key = e.keyCode || e.which;
        
        if(_this.uistate == 1) { // In-game
            if(key == 119) { // W
                _this.moveSelected(0, -1);
            }
            if(key == 101) { // E
                _this.moveSelected(1, -1);
            }
            if(key == 97) { //A
                _this.moveSelected(-1, 0);
            }
            if(key == 115) { //S
                if(_this.selectedTile.x != -1) {
                    _this.clickTile(_this.selectedTile);
                }
            }
            if(key == 100) { //D
                _this.moveSelected(1, 0);
            }
            if(key == 122) { //Z
                _this.moveSelected(-1, 1);
            }
            if(key == 120) { //X
                _this.moveSelected(0, 1);
            }
        }
        
    }
    
    /* ------------ FINAL INITIALIZATION ------------ */
    this.messages.push("Initialized.");
    this.resize();
    this.render();
};

/** Clicks the selected tile on the game state
  * Can be called in response to a click or to simulate a click
  */
Interface.prototype.clickTile = function(tile) {
    if(this.uistate == 1) { // In-game
        if(this.playingAs != -1) { // Not a spectator
            if(this.selectedTile.x == tile.x && this.selectedTile.y == tile.y) {
                // Flip the tile using the game state method
                this.gs.doAction({tile: tile});
                // Immediately send the turn to the server (not how it will actually work, just temp)
                this.socket.emit("turn", gs.localTurn);
                this.gs.clearTurn();
            }
        }
        this.selectedTile = tile;
    }
};

/** Moves the selected tile by the given amount */
Interface.prototype.moveSelected = function(dx, dy) {
    if(this.selectedTile.x == -1 || this.selectedTile.y == -1) {
        this.selectedTile.x = Math.floor(this.gs.map.cols() / 2);
        this.selectedTile.y = Math.floor(this.gs.map.rows() / 2);
        return;
    }
    
    this.selectedTile.x += dx;
    this.selectedTile.y += dy;
    if(this.selectedTile.x < 0 || this.selectedTile.x >= this.gs.map.cols() || this.selectedTile.y < 0 || this.selectedTile.y >= this.gs.map.rows() || this.gs.map.terrain[this.selectedTile.y][this.selectedTile.x] == Tile.EMPTY) {
        this.selectedTile.x -= dx;
        this.selectedTile.y -= dy;
    }
};

Interface.prototype.resize = function() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.render();
};

Interface.prototype.render = function() {
    // Get the context
    var ctx = this.canvas.getContext("2d");
    
    // Clear the canvas with a black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    if(this.uistate == 0) { // Lobby
        // Draw the list of games
        var k = 0; // Drawing index
        for(var i in this.gamelist) {
            if(this.gamelist.hasOwnProperty(i)) {
                var summary = this.gamelist[i];
                ctx.fillStyle = "#AAAAAA";
                // Check if mouse is over it
                if(this.oldmx >= 50 && this.oldmx < 450 && this.oldmy >= 50 + k * 50 && this.oldmy < 90 + k * 50)
                    ctx.fillStyle = "#DDDDDD";
                // Draw the back box
                ctx.fillRect(50, 50 + k * 50, 400, 40);
                // Draw the text
                ctx.fillStyle = "#444444";
                ctx.fillText("Game " + i + ": " + summary.players + "/" + summary.numPlayers + " players; Map: " + summary.mapsize, 60, 75 + k * 50);
                
                k++;
            }
        }
    }
    if(this.uistate == 1) { // In-game
        // Draw the map
        this.renderMap(ctx, 10, 10, this.canvas.width - 10, this.canvas.height - 10, this.offsetx, this.offsety, this.scale);
        
        // Indicate what playingAs is
        ctx.fillStyle = "#DDDDDD";
        if(this.playingAs != -1) {
            ctx.fillText("You are player " + this.playingAs, 10, this.canvas.height - 30);
        } else {
            ctx.fillText("You are spectating", 10, this.canvas.height - 30);
        }
    }
    
    // Draw messages
    ctx.fillStyle = "#FF0000";
    ctx.font = "20px Arial";
    for(var i = 0; i < this.messages.length; i++) {
        ctx.fillText(this.messages[i], 500, 100 + i * 30);
    }
};

Interface.prototype.renderMap = function(ctx) {
    var map = this.gs.map;
    var x = 10;
    var y = 10;
    var width = this.canvas.width - 10;
    var height = this.canvas.height - 10;
    var offsetx = this.offsetx;
    var offsety = this.offsety;
    var scale = this.scale;

    // Calculate the width and height of each hexagon
    var h = HEX_HEIGHT * scale;
    var w = Math.round(Math.sqrt(3) / 2 * h);
    
    // Go through each hexagon on the map and see if it's in the window
    for(var r = 0; r < map.rows(); r++) {
        for(var c = 0; c < map.cols(); c++) {
            // Determine the location of the top left bounding box of this hex
            var hexx = (c + r / 2) * w - offsetx;
            var hexy = (r * 3 / 4) * h - offsety;
            
            // Check if the hexagon is in the window
            if(hexx + w >= 0 && hexx <= width && hexy + h >= 0 && hexy <= height) {
                // Set color
                var color = Tile.properties[map.terrain[r][c]].color;
                ctx.fillStyle = color;
                ctx.strokeStyle = map.terrain[r][c] != Tile.EMPTY ? "#222222" : "#000000"; //hex border
                
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
    
    // Go back and draw the selected ring
    var hexx = (this.selectedTile.x + this.selectedTile.y / 2) * w - offsetx;
    var hexy = (this.selectedTile.y * 3 / 4) * h - offsety;
    // Check if the hexagon is in the window
    if(hexx + w >= 0 && hexx <= width && hexy + h >= 0 && hexy <= height) {
        ctx.strokeStyle = "#FF0000";
        
        ctx.beginPath();
        ctx.moveTo(x + hexx, y + hexy + h / 4);
        ctx.lineTo(x + hexx + w / 2, y + hexy);
        ctx.lineTo(x + hexx + w, y + hexy + h / 4);
        ctx.lineTo(x + hexx + w, y + hexy + h * 3 / 4);
        ctx.lineTo(x + hexx + w / 2, y + hexy + h);
        ctx.lineTo(x + hexx, y + hexy + h * 3 / 4);
        ctx.lineTo(x + hexx, y + hexy + h / 4);
        
        ctx.stroke();
    }
};
