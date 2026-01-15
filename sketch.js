const glyphs =
    // "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'."
    "$@B%/\\+=><~-;:,.".split("").reverse();
const blank = " ";
const TEXT_SCALE = 12;

const D = 468;
const WIDTH = D * 2;
const HEIGHT = D;
let columns, rows;

const origin = { x: WIDTH / 2, y: HEIGHT / 2 };
const corners = [
    { x: 0, y: 0 },
    { x: WIDTH, y: 0 },
    { x: 0, y: HEIGHT },
    { x: WIDTH, y: HEIGHT },
];

const gradients = [
    (n, tx, ty, dx, dy) => dist((n * tx) / 2, ty / 2, dx, dy) * 0.02,
    (n, tx, ty, dx, dy) => dist((n * tx) / 2, dx, ty / 2, dy) * 0.02,
    (n, tx, ty, dx, dy) =>
        dist(cos((n * tx) / 2) + tx, n * ty, dx, sin((dy * dy) / 4) + dy) * 0.2,
    (n, tx, ty, dx, dy) => dist(cos(tx), ty, cos(dx), dy),
];

let dt = 0;
let glyphOffset = 2;
const mouseRadius = 16;

let dynamicGradient;
let velX, velY, density;
let mouseVelocityVec, mouseSpeed;
let usingMouse = true;

function setup() {
    const canv = createCanvas(WIDTH, HEIGHT);
    canv.parent("canvas-parent");
    textFont("monospace");
    textSize(TEXT_SCALE);
    textAlign(LEFT, TOP);
    frameRate(30);
    noSmooth();

    columns = floor(WIDTH / TEXT_SCALE);
    rows = floor(HEIGHT / TEXT_SCALE);

    dynamicGradient = floor(random(0, gradients.length));
    usingMouse = random() < 0.5;
    usingMouse = true;

    console.log(`using anim=${dynamicGradient}, mouse=${usingMouse}`);
    document.title = "komadiina | ognjen komadina";
    mouseVelocityVec = createVector(mouseX, mouseY);

    if (usingMouse) initField();
}

function initField() {
    velX = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));
    velY = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));

    density = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));
}

function injectMousePhysics() {
    const mx = mouseX / TEXT_SCALE;
    const my = mouseY / TEXT_SCALE;

    const vx = mouseX - pmouseX;
    const vy = mouseY - pmouseY;

    for (let y = floor(my - mouseRadius); y <= ceil(my + mouseRadius); y++) {
        for (
            let x = floor(mx - mouseRadius);
            x <= ceil(mx + mouseRadius);
            x++
        ) {
            if (x < 0 || y < 0 || x >= columns || y >= rows) continue;

            const d = dist(x, y, mx, my);
            if (d > mouseRadius) continue;

            const falloff = 1 - d / mouseRadius;

            velX[y][x] += vx * falloff * 0.2;
            velY[y][x] += vy * falloff * 0.2;
            density[y][x] += falloff * 0.9;
        }
    }
}

function advect() {
    const newX = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));
    const newY = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const vx = velX[y][x];
            const vy = velY[y][x];

            const px = x - vx;
            const py = y - vy;

            const x0 = constrain(floor(px), 0, columns - 1);
            const y0 = constrain(floor(py), 0, rows - 1);

            newX[y][x] = velX[y0][x0] * 0.66;
            newY[y][x] = velY[y0][x0] * 0.66;
        }
    }

    velX = newX;
    velY = newY;
}

function advectDensity() {
    const next = Array(rows)
        .fill()
        .map(() => new Float32Array(columns));

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const px = x - velX[y][x];
            const py = y - velY[y][x];

            const x0 = constrain(floor(px), 0, columns - 1);
            const y0 = constrain(floor(py), 0, rows - 1);

            next[y][x] = density[y0][x0] * 0.995; // decay
        }
    }

    density = next;
}

let mouseCalc = (gx, gy, maxDist) => {
    let tx = gx * TEXT_SCALE;
    let ty = gy * TEXT_SCALE;
    let d = dist(tx, ty, origin.x, origin.y);
    let t = constrain(d / maxDist, 0, 1);
    let glyph = blank;

    let mouseDist = dist(mouseX, mouseY, pmouseX, pmouseY);
    mouseVelocityVec.set(mouseX - pmouseX, mouseY - pmouseY);
    speed = mouseDist / deltaTime;
    let m = map(mouseVelocityVec.mag(), 0, 200, 1, 1.5);

    if (t < 0.966) {
        let n = noise(gx * 0.05 + 100, gy * 0.12 + 100, frameCount * 0.05);
        let f = undefined;

        try {
            f = gradients[dynamicGradient](n, tx, ty, origin.x, origin.y);
        } catch {
            f = gradients[0](n, tx, ty, origin.x, origin.y);
        }

        let offs = sin(frameCount * 0.02 + f);
        t *= offs;
        // let idx = floor(map(t, 0, 1, 0, glyphs.length) * m * mouseCenterDist);
        // idx = constrain(idx, 0, glyphs.length - 1);

        const v = sqrt(velX[gy][gx] ** 2 + velY[gy][gx] ** 2);
        const base = map(t, 0, 1, 0, 1); // base 2d shader
        const ink = constrain(density[gy][gx], 0, 1);

        const combined = base * (2.5 + ink * 1.2) + v * 0.5;

        let idx = floor(map(combined, 0, 1.5, 0, glyphs.length));
        idx = constrain(idx, 0, glyphs.length - 1);

        if (idx) glyph = glyphs[idx];
    }

    return glyph;
};

let noMouseCalc = (gx, gy, maxDist) => {
    let tx = gx * TEXT_SCALE;
    let ty = gy * TEXT_SCALE;
    let d = dist(tx, ty, origin.x, origin.y);
    let t = constrain(d / maxDist, 0, 1);
    let glyph = blank;

    if (t < 0.966) {
        let n = noise(gx * 0.05 + 100, gy * 0.12 + 100, frameCount * 0.05);
        let f = undefined;
        try {
            f = gradients[dynamicGradient](n, tx, ty, origin.x, origin.y);
        } catch {
            f = gradients[0](n, tx, ty, origin.x, origin.y);
        }
        let offs = sin(frameCount * 0.02 + f);
        t *= offs;
        let idx = floor(map(t, 0, 1, 0, glyphs.length) * 0.5);
        idx = constrain(idx - glyphOffset, 0, glyphs.length - 1);

        if (idx) glyph = glyphs[idx];
        return glyph;
    }
};

function draw() {
    background(11);

    let maxDist = 0;
    for (let c of corners) {
        maxDist = max(maxDist, dist(origin.x, origin.y, c.x, c.y));
    }

    let calc = usingMouse ? mouseCalc : noMouseCalc;

    if (usingMouse) {
        injectMousePhysics();
        advect();
        advectDensity();
    }

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < columns; gx++) {
            fill(255);
            text(calc(gx, gy, maxDist), gx * TEXT_SCALE, gy * TEXT_SCALE);
        }
    }
}
