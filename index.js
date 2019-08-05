// Read console input
var readline = require('readline');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});

rl.on('line', function(line) {
    if (line.includes('reset')) {
        initWorld()
    } else {
        console.log(eval(line))
    }
});
// File sharing to clients
const path = require('path')
var __dirname = path.resolve()
const express = require('express')
const app = express()
const serv = require('http').Server(app)
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/client/index.html')
})
app.use('/client', express.static(__dirname + '/client'))
serv.listen(5000)
console.log('server started')
    // Data sharing to clients
const io = require('socket.io')(serv, {})
io.sockets.on('connection', function(socket) {
        newPlayer(socket)
        socket.on('playerMove', (data) => {
            // Sanitize the movement data
            if (data.x > 0)
                data.x = 1
            if (data.x < 0)
                data.x = -1
            if (data.y > 0)
                data.y = 1
            if (data.y < 0)
                data.y = -1
            var i = players.findIndex((p) => p.id == data.id)
            if (i >= 0) { //&& (Math.abs(data.x + data.y) == 1 || !data.moving)) {
                var me = players[i]
                let x = data.x + me.pos.x
                let y = data.y + me.pos.y
                players[i].moving = data.moving && x >= 0 && x < w && y >= 0 && y < h && map[x][y] === 0
                if (data.x != 0 || data.y != 0)
                    players[i].dir = new vector(data.x, data.y)
            }
        })
        socket.on('action', (data) => {
            var i = players.findIndex((p) => p.id == data.id)
            if (i >= 0) {
                var me = players[i]
                if (me.carry) {
                    // If I'm carrying anything trow it
                    let x = me.dir.x + me.pos.x
                    let y = me.dir.y + me.pos.y
                    var b = new barrel(new vector(x, y), me.direction(), socket.id)
                    barrels.push(b)
                    io.sockets.emit('setBarrel', b)
                    players[i].carry = false
                } else {
                    // Otherwise pick up the barrel infront of me
                    let x = me.dir.x + me.pos.x
                    let y = me.dir.y + me.pos.y
                    if (x >= 0 && x < w && y >= 0 && y < h) {
                        if (map[x][y] == 1) {
                            players[i].carry = true
                            changeMap(x, y, 0)
                        }
                    }
                    if (!players[i].carry) {
                        let x = me.dir.x + me.des.x
                        let y = me.dir.y + me.des.y
                        if (x >= 0 && x < w && y >= 0 && y < h) {
                            if (map[x][y] == 1) {
                                players[i].carry = true
                                changeMap(x, y, 0)
                            }
                        }
                    }
                }
            }
        })
        socket.on('removePlayer', function(id) {
            var i = players.findIndex((p) => p.id == id)
            if (i >= 0) {
                //players.splice(i, 1)
            }
            io.sockets.emit('setPlayers', players)
        })
        socket.on('setName', function(name) {
            namesToIDs[name] = socket.id
            players.find((p) => p.id == socket.id).name = name
        })
    })
    // Game stuff
const w = 16
const h = 16

socketsToIDs = {}
IDsToKills = {}
namesToIDs = {}

players = []
barrels = []
initWorld()

function initWorld() {
    for (let i = 0; i < players.length; i++) {
        players[i].pos = new vector(0, 0)
    }
    map = []
    for (let x = 0; x < w; x++) {
        map[x] = []
        for (let y = 0; y < h; y++) {
            map[x][y] = 1
        }
    }
    map[0][0] = 0
    io.sockets.emit('setBarrels', barrels)
}

function getConnectedSockets() {
    return Object.values(io.of("/").connected);
}

function newPlayer(socket, oldPlayer = undefined) {
    if (IDsToKills[socket.id] == undefined)
        IDsToKills[socket.id] = 0
    var p = new player(socket)
    if (oldPlayer != undefined)
        p.name = oldPlayer.name
    players.push(p)
    socket.emit('newPlayer', socket.id)
    socket.emit('setPlayers', players)
    socket.emit('setBarrels', barrels)
    socket.emit('setMap', map)
}

function player(socket) {
    this.pos = getPlayerSpawnPos()
    this.des = this.pos
    this.id = socket.id
    socketsToIDs[socket.id] = socket

    this.dir = new vector(0, 0)
    this.moving = false
    this.progress = 0

    this.kills = IDsToKills[socket.id]

    this.run = function() {
        let x = this.des.x
        let y = this.des.y
        if (!this.pos.compare(this.des)) {
            if (x >= 0 && x < w && y >= 0 && y < h && map[x][y] === 0) {
                if (this.progress >= 1) {
                    this.progress = 0
                    this.pos = this.des
                    this.getDes()
                } else if (map[x][y] === 0) {
                    this.progress += 0.003 * frameRate
                }
            } else {
                this.des = this.pos
                this.moving = false
            }
        } else if (map[x][y] === 0) {
            this.getDes()
        }
    }

    this.getDes = function() {
        if (this.moving) {
            this.des = new vector(this.pos.x + this.dir.x, this.pos.y + this.dir.y)
        } else {
            this.des = this.pos
        }
        io.sockets.emit('setPlayer', this)
    }
    this.direction = function() {
        if (this.dir.y < 0)
            return 0
        if (this.dir.x > 0)
            return 1
        if (this.dir.y > 0)
            return 2
        if (this.dir.x < 0)
            return 3
        return 0
    }
}

function getPlayerSpawnPos() {
    positions = []
        // Get all posible positions
    for (let x = 0; x < w; x++) {
        for (let y = 0; y < h; y++) {
            if (map[x][y] === 0) {
                positions.push(new vector(x, y))
            }
        }
    }
    // Choose one at random or 0,0 if none are available
    if (positions.length == 0) {
        changeMap(0, 0, 0)
        return new vector(0, 0)
    }
    var p = positions[Math.floor(Math.random() * positions.length)]
    return p
}
var currBarrelId = 0

function barrel(pos, direction, playerId) {
    this.pos = pos
    this.dir = direction
    this.progress = 0

    this.id = currBarrelId
    this.playerId = playerId
    currBarrelId++

    // Barrel collision versus players with given direction
    this.playerCollide = function(x, y) {
        let temp = false
        for (let i = players.length - 1; i >= 0; i--) {
            var me = players[i]
            let xDiff = me.pos.x - this.pos.x
            let yDiff = me.pos.y - this.pos.y
            if (inRange(xDiff, x, x) && inRange(yDiff, y, y)) {
                this.killPlayer(i)
                temp = true
            }
        }
        if (temp) {
            io.sockets.emit('setPlayers', players)
            return true
        }

        return false
    }
    this.killPlayer = function(index) {
        // Killed the player in front of me :)
        players.find((p) => p.id == this.playerId).kills += 1
        IDsToKills[this.playerId] += 1
        newPlayer(socketsToIDs[players[index].id], players[index])
        players.splice(index, 1)
    }

    this.run = function() {
        let x = this.pos.x
        let y = this.pos.y
        let xOff = 0
        let yOff = 0
        switch (this.dir) {
            case 0:
                yOff--;
                break;
            case 1:
                xOff++;
                break;
            case 2:
                yOff++;
                break;
            case 3:
                xOff--;
                break;
        }
        if (this.playerCollide(xOff, yOff)) {
            //return true
        }
        if (x >= 0 && x < w && y >= 0 && y < h) {
            if (map[x][y] == 1) {
                changeMap(x, y, 0)
                io.sockets.emit('removeBarrelAnim', { x: x, y: y })
                var a = this.dir == 0 || this.dir == 2 ? 0 : 1
                io.sockets.emit('removeBarrelRAnim', { x: this.pos.x, y: this.pos.y, angle: a })
                return true
            }
            if (x + xOff >= 0 && x + xOff < w && y + yOff >= 0 && y + yOff < h) {
                if (map[x + xOff][y + yOff] == 1) {
                    changeMap(x + xOff, y + yOff, 0)
                    io.sockets.emit('removeBarrelAnim', { x: x + xOff, y: y + yOff })
                    var a = this.dir == 0 || this.dir == 2 ? 0 : 1
                    io.sockets.emit('removeBarrelRAnim', { x: this.pos.x, y: this.pos.y, angle: a })
                    return true
                }
            }
        } else {
            return true
        }
        if (this.progress >= 1) {
            this.progress = 0
            this.pos.add(new vector(xOff, yOff))
            io.sockets.emit('setBarrel', this)
        } else {
            this.progress += 0.005 * frameRate
        }
        return false
    }
}

/**
 * @returns {boolean} if the value is between a and b
 * @param {Number} val value to check
 * @param {Number} a  
 * @param {Number} b 
 */
function inRange(val, a, b) {
    var c = Math.min(a, b)
    var d = Math.max(a, b)
    return val >= c && val <= d
}

function changeMap(x, y, val) {
    map[x][y] = val
    io.sockets.emit('setMap', map)
}

function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max)
}

function vector(x, y) {
    this.x = x
    this.y = y
    this.compare = function(vector) {
        return this.x == vector.x && this.y == vector.y
    }
    this.add = function(vector) {
        this.x += vector.x
        this.y += vector.y
    }
    this.clamp = function(minX, maxX, minY, maxY) {
        this.x = clamp(this.x, minX, maxX)
        this.y = clamp(this.y, minY, maxY)
    }
}
const frameRate = 1000 / 60

function loop() {
    var clients = Object.keys(io.sockets.clients().connected);
    var temp = false
    for (let i = 0; i < players.length; i++) {
        if (clients.find((c) => c == players[i].id) == undefined) {
            console.log(players[i].id + ' was removed')
            players.splice(i, 1)
            temp = true
        }
    }
    if (temp)
        io.sockets.emit('setPlayers', players)
    temp = true
    for (let x = 0; x < map.length; x++) {
        for (let y = 0; y < map[0].length; y++) {
            if (map[x][y] === 1)
                temp = false
        }
    }
    if (temp) {
        initWorld()
    }
    for (let i = 0; i < players.length; i++)
        players[i].run()
    for (let i = barrels.length - 1; i >= 0; i--) {
        if (barrels[i].run()) {
            io.sockets.emit('removeBarrel', barrels[i])
            barrels.splice(i, 1)
        }
    }
}
setInterval(loop, frameRate)
