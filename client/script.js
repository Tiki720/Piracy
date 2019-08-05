canvas = document.getElementById('canvas')
ctx = canvas.getContext('2d')
nameInput = document.getElementById('nameInput')
var Barrel_break = new Wad({ source: 'client/music/Barrel_break.wav' })
var myAudio = document.createElement("audio");
myAudio.src = 'client/music/Pirate_music.mp3';
myAudio.volume = '0.1'
myAudio.loop = true
const maxScale = 64
const minScale = 16
scale = 16
$(document).ready(function() {
    $('#nameInput').keypress(function(e) {
        if (e.keyCode == 13) {
            socket.emit('setName', nameInput.value)
            playerName = nameInput.value
            gameState = 1
            myAudio.play();
        }
    })
})
const socket = io({ transports: ['websocket'] })
socket.on('getName', () => {
    console.log(playerName)
    socket.emit('setName', playerName)
})
socket.on('newPlayer', (id) => playerId = id)
socket.on('setPlayers', (data) => players = data)
socket.on('setBarrels', (data) => barrels = data)
socket.on('setMap', (data) => map = data)
socket.on('setPlayer', (data) => {
    var i = players.findIndex((p) => { return p.id == data.id })
    if (i >= 0) {
        players[i] = data
    } else {
        players.push(data)
    }
})
socket.on('setBarrel', (data) => {
    var i = barrels.findIndex((b) => { return b.id == data.id })
    if (i >= 0) {
        barrels[i] = data
    } else {
        barrels.push(data)
    }
})
socket.on('removeBarrel', (data) => {
    var i = barrels.findIndex((b) => { return b.id == data.id })
    if (i >= 0) {
        barrels.splice(i, 1)
    }
})
socket.on('removeBarrelAnim', (data) => {
    var a = new animation('Barrel_destroy_anim', data.x - 0.5, data.y - 0.625, 64, 64, 0, 20)
    renderer.anims.push(a)
    Barrel_break.play()
})
socket.on('removeBarrelRAnim', (data) => {
    var a = new animation('Barrel_r_destroy_anim', data.x, data.y, 32, 40, 0, 30, data.angle)
    renderer.anims.push(a)
})
$(window).bind('beforeunload', function() {
    socket.emit('removePlayer', playerId)
    return undefined //'are you sure you want to leave?'
})
players = []
barrels = []
map = []
playerRenderer = new playerRender()
mapRenderer = new mapRender()
barrelRenderer = new barrelRender()
renderer = new render()
var oldTime = new Date().getTime()

/**
 * Game state
 * 0 - NameInput
 * 1 - Game
 * 2 - No connection
 */
gameState = 0

/**
 * Main game loop
 */
function loop() {
    if (!socket.connected) {
        gameState = 0
    }
    switch (gameState) {
        case 0:
            nameInput.style = 'display:inline'
            canvas.style = 'display:none'
            break;
        case 1:
            nameInput.style = 'display:none'

            // Set the canvas size and translate it for drawing
            if (map.length > 0) {
                canvas.width = Math.min(maxScale * (map.length + 2), Math.floor(($(window).width() - 40) / scale) * scale)
                canvas.height = Math.min(maxScale * (map[0].length + 2), Math.floor(($(window).height() - 40) / scale) * scale)
                scale = Math.round(clamp(Math.max(canvas.width / map.length, canvas.height / map[0].length), minScale, maxScale))
                ctx.translate(scale, scale)
                canvas.style = 'display:inline'
            }
            // get deltaTime for animations
            var newTime = new Date().getTime()
            var deltaTime = newTime - oldTime
            oldTime = new Date().getTime()
                // Run all the players
            for (let i = 0; i < players.length; i++) {
                if (players[i].progress < 1) {
                    players[i].progress += 0.003 * deltaTime
                }
            }
            // Run all the entity barrels
            for (let i = 0; i < barrels.length; i++) {
                if (barrels[i].progress < 1) {
                    barrels[i].progress += 0.005 * deltaTime
                }
            }
            // Add images to buffer for players and barrels
            barrelRenderer.draw()
            mapRenderer.draw()
            playerRenderer.draw()
                // Render the buffer of images
            renderer.draw()
            break;
    }
    requestAnimationFrame(loop)

}
requestAnimationFrame(loop)

/**
 * Find X position of entity
 * @param {Object} object object of the entity
 * @returns {Number} lerped value between pos and des
 */
function xPos(object) {
    if (object.des == undefined) {
        let xOff = 0
        let yOff = 0
        switch (object.dir) {
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
        object.des = { x: object.pos.x + xOff, y: object.pos.y + yOff }
    }
    return (1 - object.progress) * object.pos.x + object.progress * object.des.x
}

/**
 * Find Y position of entity
 * @param {Object} object object of the entity
 * @returns {Number} lerped value between pos and des
 */
function yPos(object) {
    if (object.des == undefined) {
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
        object.des = { x: object.pos.x + xOff, y: object.pos.y + yOff }
    }
    return (1 - object.progress) * object.pos.y + object.progress * object.des.y
}
/**
 * Find the drawing direction of a player
 * @param {object} player 
 */
function playerAngle(player) {
    if (player.dir.y < 0)
        return 0
    if (player.dir.x > 0)
        return 1
    if (player.dir.y > 0)
        return 2
    if (player.dir.x < 0)
        return 3
    return 0
}
/**
 * @returns {Number} value locked between min and max
 * @param {Number} val 
 * @param {Number} min 
 * @param {Number} max 
 */
function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max)
}