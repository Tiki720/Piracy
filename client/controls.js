var key = [];
onkeydown = onkeyup = function(e) {
    e = e || event;
    if (key[e.keyCode] != (e.type == 'keydown')) {
        key[e.keyCode] = e.type == 'keydown';
        if (e.keyCode == 68 || e.keyCode == 65 || e.keyCode == 87 || e.keyCode == 83) {
            direction.x = (e.keyCode == 68 && e.type == 'keydown' ? 1 : 0) - (e.keyCode == 65 && e.type == 'keydown' ? 1 : 0)
            direction.y = (e.keyCode == 83 && e.type == 'keydown' ? 1 : 0) - (e.keyCode == 87 && e.type == 'keydown' ? 1 : 0)
            socket.emit('playerMove', { id: playerId, x: direction.x, y: direction.y, moving: !(direction.x == 0 && direction.y == 0) })
        }
        if (e.keyCode == 32 && e.type == 'keydown')
            socket.emit('action', { id: playerId })
    }
    key[e.keyCode] = e.type == 'keydown';
}
direction = { x: 0, y: 0 }

touchPositions = {
    start: { x: 0, y: 0 },
    current: { x: 0, y: 0 },
    end: { x: 0, y: 0 },
    down: false,
    downTime: new Date().getTime()
}
const minRadius = 20
const maxRadius = 40
const downSpeed = 100
canvas.addEventListener('touchstart', function(e) {
    touchPositions.down = true
    touchPositions.downTime = new Date().getTime()
    touchPositions.start.x = e.touches[0].clientX;
    touchPositions.start.y = e.touches[0].clientY;
    e.preventDefault();
}, false);
canvas.addEventListener("touchmove", function(e) {
    touchPositions.current.x = e.touches[0].clientX;
    touchPositions.current.y = e.touches[0].clientY;
    var deltaX, deltaY
    deltaX = touchPositions.current.x - touchPositions.start.x
    deltaY = touchPositions.current.y - touchPositions.start.y
    tempX = Math.abs(deltaX)
    tempY = Math.abs(deltaY)
        // Move the player in the right direction
    socket.emit('playerMove', {
        id: playerId,
        x: tempX > tempY && tempX > minRadius ?
            (deltaX > 0 ? 1 : -1) : 0,
        y: tempY > tempX && tempY > minRadius ?
            (deltaY > 0 ? 1 : -1) : 0,
        moving: tempX > maxRadius || tempY > maxRadius
    })
    e.preventDefault();
}, false);
canvas.addEventListener('touchend', function(e) {
    touchPositions.end.x = e.changedTouches[0].clientX;
    touchPositions.end.y = e.changedTouches[0].clientY;
    touchPositions.down = false
        // Make the player stop moving
    socket.emit('playerMove', {
            id: playerId,
            x: 0,
            y: 0,
            moving: false
        })
        // Should the player pick up a barrel?
    let thisTime = new Date().getTime()
    if (thisTime - touchPositions.downTime <= downSpeed) {
        socket.emit('action', { id: playerId })
    }
    e.preventDefault();
}, false);

function controlLoop() {
    if (touchPositions.down) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'

        ctx.beginPath()
        ctx.arc(touchPositions.start.x - scale, touchPositions.start.y - scale, minRadius, 0, Math.PI * 2, true)
        ctx.arc(touchPositions.start.x - scale, touchPositions.start.y - scale, maxRadius, 0, Math.PI * 2, false)
        ctx.closePath()
        ctx.fill()
    }
}