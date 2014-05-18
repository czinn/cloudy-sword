/** The interface class manages the user interface.
  * It keeps track of things like which unit is selected.
  * It is designed so that it can be fully replaced by another interface
  * that works on another platform, or that looks different.
  */

// Declare constants
var HEX_HEIGHT = 200; //pixels
var PLAYER_COLORS = ["#FF0000", "#0000FF", "#00FF00", "#FF00FF"]; // Colours for the different players
  
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
    this.clientid = -1; // What our id is
    this.playingAs = -1; // Whether or not we are actually playing in the current game
    this.selectedTile = {x: -1, y: -1}; // Currently selected tile
    
    // Game list
    this.gamelist = {};
    // Client list
    this.clientlist = {};
    
    // Ping time for pinging
    var pingtime = 0;
    
    // Last person to have been messaged, or recieved a message from
    var replyTo = null;
    
    var _this = this;
    
    /* ------------ SOCKET.IO CALLBACKS ------------ */
    socket.on("connecting", function() {
        _this.messages.push("Connecting to server...");
    });
    socket.on("connect", function() {
        _this.messages.push("Connected");
        _this.uistate = 0; // Switch to lobby
        _this.sendPing();
    });
    socket.on("pong", function() {
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
    socket.on("action", function(data) {
        // Update with the action
        _this.gs.doAction(data);
    });
    socket.on("gamelist", function(data) {
        // Update the local list of games
        for(var i in data) {
            if(data.hasOwnProperty(i)) {
                _this.gamelist[i] = data[i];
            }
        }
    });
    socket.on("clientid", function(data) {
        _this.clientid = data;
    });
    socket.on("clientlist", function(data) {
        if(data.full) { // Whether the update is a full list, or just an update
            _this.clientlist = data;
        } else {
            for(var i in data) {
                if(data.hasOwnProperty(i)) {
                    if(data[i] == null) {
                        _this.messages.push(_this.clientlist[i] + " has left the room");
                        delete _this.clientlist[i];
                    } else {
                        _this.clientlist[i] = data[i];
                        if (_this.clientlist[i] != data.full) {
                            _this.messages.push(_this.clientlist[i] + " has joined the room");
                        }
                    }
                }
            }
        }
        delete _this.clientlist["full"];
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
    socket.on("chat", function(data) {
        _this.replyTo = data.from;
        if(typeof data.to !== "undefined") {
            _this.messages.push("[" + data.from + " \u2192 " + _this.clientlist[_this.clientid] + "] " + data.message);
        } else {
            _this.messages.push(data.from + ": " + data.message);
        }
    });
    
    
    /* ------------ CANVAS CALLBACKS ------------ */
    this.canvas.onclick = function(e) {
        var mx = e.pageX - e.target.offsetLeft;
        var my = e.pageY - e.target.offsetTop;
        var width = document.getElementById("canvas").width;
        
        if(_this.uistate == 0) { // Lobby
            var k = 0; // Drawing index
            for(var i in _this.gamelist) {
                if(_this.gamelist.hasOwnProperty(i)) {
                    // Check if mouse is over this game state
                    if(mx >= width - 400 && mx < width && my >= 10 + k * 50 && my < 50 + k * 50) {
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
                var tile = _this.gs.map.hexAtTransformed(mx, my, 0, 0, _this.offsetx, _this.offsety, _this.scale);
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
            if(_this.scale < 0.2) _this.scale = 0.2;
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
        
        // Ensure that the chat box isn't selected
        if(document.activeElement == document.getElementById("chat"))
            return;
            
        // UI State independent keys
        if(key == 13) { // Enter
            // Focus the chat
            document.getElementById("chat").focus();
        }
        
        if(_this.uistate == 1) { // In-game
            // Make a copy of the tile so that it doesn't cause pointer issues
            var tile = {x: _this.selectedTile.x, y: _this.selectedTile.y};
            var action = null;
            
            if(key == 108) { // L (exit to lobby)
                _this.uistate = 0;
                _this.socket.emit("leavegame");
                return;
            }
            if(key == 119) { // W
                action = {type: "move", tile: tile, dir: {x: 0, y: -1}};
            }
            if(key == 101) { // E
                action = {type: "move", tile: tile, dir: {x: 1, y: -1}};
            }
            if(key == 97) { //A
                action = {type: "move", tile: tile, dir: {x: -1, y: 0}};
            }
            if(key == 100) { //D
                action = {type: "move", tile: tile, dir: {x: 1, y: 0}};
            }
            if(key == 122) { //Z
                action = {type: "move", tile: tile, dir: {x: -1, y: 1}};
            }
            if(key == 120) { //X
                action = {type: "move", tile: tile, dir: {x: 0, y: 1}};
            }
            if(action == null) // The key press wasn't a move action
                return;
                
            // Check if the action is valid
            if(_this.gs.validAction(action, _this.playingAs)) {
                // Move the cursor
                _this.selectedTile = {x: action.tile.x + action.dir.x, y: action.tile.y + action.dir.y};
                // Do the action locally
                _this.gs.doAction(action);
                // Send the action to the server
                _this.socket.emit("action", action);
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
        if(this.gs.map.onGrid(tile)) {
            this.selectedTile = tile;
        } else {
            this.selectedTile = {x: -1, y: -1};
        }
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
    var width = document.getElementById("canvas").width;
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
                if(this.oldmx >= width - 400 && this.oldmx < width && this.oldmy >= 10 + k * 50 && this.oldmy < 50 + k * 50)
                    ctx.fillStyle = "#DDDDDD";
                // Draw the back box
                ctx.fillRect(width - 400, 10+ k * 50, 400, 40);
                // Draw the text
                ctx.fillStyle = "#444444";
                ctx.fillText("Game " + i + ": " + summary.players + "/" + summary.numPlayers + " players; Map: " + summary.mapsize, width - 390, 35 + k * 50);
                
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
    ctx.fillStyle = "#DDDDDD";
    ctx.font = "20px Arial";
    for(var i = 0; i < this.messages.length; i++) {
        ctx.fillText(this.messages[i], 5, 30+i * 30);
    }
    
    // Draw users in this room
    var k = 0;
    for(var i in this.clientlist) {
        if(this.clientlist.hasOwnProperty(i)) {
            ctx.fillText(this.clientlist[i], 5, 500 + 30 * k);
            k++;
        }
    };
};

Interface.prototype.renderMap = function(ctx) {
    var map = this.gs.map;
    var x = 0;
    var y = 0;
    var width = this.canvas.width;
    var height = this.canvas.height;
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
                
                // Draw unit
                var unit = map.tileUnit({x: c, y: r});
                if(unit != null) {
                    ctx.fillStyle = PLAYER_COLORS[unit.controller];
                    ctx.beginPath();
                    ctx.arc(x + hexx + w / 2, y + hexy + h / 2, w / 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }
    
    // Go back and draw the selected ring
    if(this.selectedTile.x >= 0) {
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
    }
};

Interface.prototype.processChat = function(chat) {
    if(chat.charAt(0) == "/") {
        var sp = chat.split(" ");
        if (sp[0] == "/help") {
            this.messages.push("+=+=+=+=+Help+=+=+=+=+");
            this.messages.push("/clear - Clears the chat window");
            this.messages.push("/msg - Private Message someone");
            this.messages.push("/r - Reply to a last messaged person");
        } else if (sp[0] == "/clear") {
            while(this.messages.length > 0) {
                this.messages.pop();
            }
            this.messages.push("Chat cleared");
        } else if(sp[0] == "/name") {
            if(sp.length > 1 && (sp[1].length > 3 || sp[1] == "Sam")) {
                this.socket.emit("changename", sp[1]);
            }
        } else if (sp[0] == "/msg") {
            if (sp.length < 2) {
                this.messages.push("/msg [user] [message]");
            } else {
                var message = "";
                for (var i = 2; i < sp.length; i++) {
                    message += sp[i] + " ";
                }
                if (this.getClientByName(sp[1]) != null || sp[1] == "console") {
                    this.replyTo = sp[1];
                    this.socket.emit("chat", {to:sp[1], message:message});
                    this.messages.push("[" + this.clientlist[this.clientid] + " \u2192 " + sp[1] + "] " + message);
                } else {
                    this.messages.push("User not found!");
                }
            }
        } else if (sp[0] == "/r") {
            if (sp.length < 1) {
                this.messages.push("/r [message]");
            } else {
                if (this.replyTo == null) {
                    this.messages.push("You have no one whom you can reply to");
                } else {
                    var message = "";
                    for (var i = 1; i < sp.length; i++) {
                        message += sp[i] + " ";
                    }
                    this.socket.emit("chat", {to:this.replyTo, message:message});
                    this.messages.push("[" + this.clientlist[this.clientid] + " \u2192 " + this.replyTo + "] " + message);
                }
            }
        } else {
            this.messages.push("Unknown command. Type /help for help");
        }
    } else {
        this.socket.emit("chat", {message: chat});
        this.messages.push(this.clientlist[this.clientid] + ": " + chat);
    }
};

Interface.prototype.getClientByName = function(name) {
    for(var i in this.clientlist) {
        if(this.clientlist.hasOwnProperty(i)) {
            if(this.clientlist[i] == name) {
                return this.clientlist[i];
            }
        }
    }
    return null;
};

Interface.prototype.sentPing = function() {
    pingtime = new Date().getTime();
    this.socket.emit("ping", "");
};
