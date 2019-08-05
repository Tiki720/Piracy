function playerRender() {
    this.cpm = 1 // cycles per move i.e. progress * frames * cpm
    this.image = getImage('Pirate')
    this.imageCarry = getImage('Pirate_b')
    this.w = 64
    this.h = 64

    this.draw = function() {
        for (let i = 0; i < players.length; i++) {
            let me = players[i]
            if (me.moving) {
                var frames = (this.image.width / this.w)
                var frame = Math.floor(clamp(me.progress, 0, 1) * frames * this.cpm) % frames
            } else {
                var frame = 0
            }
            let dx = xPos(me) * scale
            let dy = yPos(me) * scale
            var img = !me.carry ? this.image : this.imageCarry
            renderer.drawImage(yPos(me), img, this.w * frame, playerAngle(me) * this.h, this.w, this.h, dx - scale / 2, dy - scale, scale * 2, scale * 2)
                //if (me.name != undefined) {
            renderer.drawName(`${me.name || '???'} (${me.kills})`, dx + scale / 2, dy - scale)
                //}
        }
    }
}

function barrelRender() {
    this.cpm = 4 // cycles per move i.e. progress * frames * cpm
    this.image = getImage('Barrel_lrr')
    this.w = 32
    this.h = 40

    this.draw = function() {
        for (let i = 0; i < barrels.length; i++) {
            let me = barrels[i]
            var frames = (this.image.width / this.w)
            var frame = Math.floor(clamp(me.progress, 0, 1) * frames * this.cpm) % frames
            let dx = xPos(me) * scale
            let dy = yPos(me) * scale
            renderer.drawImage(yPos(me), this.image, this.w * frame, this.angle(me) * this.h, this.w, this.h, dx, dy - scale / 4, (this.w / 32) * scale, (this.h / 32) * scale)
        }
    }
    this.angle = function(barrel) {
        return barrel.dir
    }
}

function mapRender() {
    this.barrel = getImage('Barrel_lr')
    this.floor = getImage('Floor_lr')

    this.draw = function() {
        if (map.length > 0) {
            for (let x = -1; x < map.length + 1; x++) {
                for (let y = -1; y < map[0].length + 1; y++) {
                    if (x >= 0 && x < map.length && y >= 0 && y < map[0].length) {
                        drawFloor(x, y, this.floor)
                        if (map[x][y])
                            renderer.drawImage(y, this.barrel, 0, 0, 32, 40, x * scale, y * scale - scale / 4, scale, 1.25 * scale)
                    } else {
                        drawWater(x, y)
                    }
                }
            }
            if (waterTick >= 10) {
                waterFrame++
                var maxFrames = waterImage.width / 64
                if (waterFrame >= maxFrames) {
                    waterFrame = 0
                }
                waterTick = 0
            } else {
                waterTick++
            }
        }
    }
}

function render() {
    this.stack = []
    this.anims = []
    this.names = []
    this.drawImage = function(layer, image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight) {
        out = {
            layer: Math.round(layer * 100) / 100,
            image: image,
            sx: sx,
            sy: sy,
            sWidth: sWidth,
            sHeight: sHeight,
            dx: dx,
            dy: dy,
            dWidth: dWidth,
            dHeight: dHeight
        }
        this.stack.push(out)
    }
    this.drawName = function(name, x, y) {
        out = {
            name: name,
            x: x,
            y: y
        }
        this.names.push(out)
    }
    this.draw = function() {
        let me = players.find((p) => p.id == playerId)
        if (me == undefined) {
            console.error('render player not found')
        }
        let xOff = clamp(xPos(me) * scale - canvas.width / 2, 0, map.length * scale - canvas.width + scale * 2)
        let yOff = clamp(yPos(me) * scale - canvas.height / 2, 0, map[0].length * scale - canvas.height + scale * 2)
        ctx.save()
        ctx.translate(-xOff, -yOff)
        for (let i = this.anims.length - 1; i >= 0; i--) {
            if (this.anims[i].run())
                this.anims.splice(i, 1)
        }
        // Draw the waters background
        ctx.fillStyle = '#006CAC'
        ctx.fillRect(-scale, -scale, canvas.width, canvas.height)
        this.stack.sort((a, b) => a.layer - b.layer)
        for (let i = 0; i < this.stack.length; i++) {
            var e = this.stack[i]
            ctx.drawImage(e.image, e.sx, e.sy, e.sWidth, e.sHeight, e.dx, e.dy, e.dWidth, e.dHeight)
        }
        this.stack = []
        for (let i = 0; i < this.names.length; i++) {
            let obj = this.names[i]
            let x = obj.x
            let y = obj.y
            let h = 10
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.font = h + "px Arial";
            let w = ctx.measureText(obj.name).width
            ctx.fillStyle = 'rgba(0,0,0,0.5)'
            ctx.fillRect(x - w / 2 - h / 2, y - h / 4, w + h, h * 1.5)
            ctx.fillStyle = 'rgba(255,255,255,1)'
            ctx.fillText(obj.name, x, y)
        }
        this.names = []
        ctx.restore()
        controlLoop()
    }
}

function animation(type, x, y, w, h, baseLayer, totalTicks, angle = 0) {
    this.image = getImage(type)
    this.x = x
    this.y = y
    this.w = w
    this.h = h
    this.angle = angle
    this.baseLayer = baseLayer
    this.totalTicks = totalTicks

    this.ticks = 0
    this.run = function() {
        //if (this.image.complete) {
        if (this.ticks >= this.totalTicks)
            return true

        let frames = this.image.width / this.w
        var frame = Math.floor(clamp(this.ticks / totalTicks, 0, 1) * frames) % frames

        renderer.drawImage(this.y + this.baseLayer, this.image, this.w * frame, this.h * this.angle, this.w, this.h, this.x * scale, this.y * scale, scale * (this.w / 32), scale * (this.h / 32))
        this.ticks += 1
            // } else {
            //console.error(this.image)
            //return true
            //}
        return false
    }
}

function getImage(source) {
    let out = new Image()
    out.src = 'client/images/' + source + '.png'
    return out
}

function drawFloor(x, y, image) {
    let water = false
    let w = map.length
    let h = map[0].length

    let sx = 4
    let sy = 4
    let sw = 32
    let sh = 32
    let dx = x * scale
    let dy = y * scale
    let dw = scale
    let dh = scale
    if (x == 0) {
        // Left side stays
        sw += 4
        dw += scale / 8
        sx -= 4
        dx -= scale / 8
        water = true
    } else if (x == w - 1) {
        // Right side stays
        sw += 4
        dw += scale / 8
        water = true
    }
    if (y == 0) {
        // Top side stays
        sh += 4
        dh += scale / 8
        sy -= 4
        dy -= scale / 8
        water = true
    } else if (y == h - 1) {
        // Bottom side stays
        sh += 20
        dh += scale * 0.625
        water = true
    }
    renderer.drawImage(-1 + y, image, sx, sy, sw, sh, dx, dy, dw, dh)
    if (water) {
        drawWater(x, y)
    }
}
const waterImage = getImage('Waves_lr')
var waterFrame = 0
var waterTick = 0

function drawWater(x, y) {
    let w = 64
    let h = 64
    renderer.drawImage(-3 + y, waterImage, 64 * waterFrame, 0, w, h, x * scale, y * scale, scale, scale)
}