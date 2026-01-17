const glyphs =
    "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'.  "
        // "$@B%/\\+=><~-;:,.".
        .split("")
        .reverse();
const blank = " ";
const TEXT_SCALE = 8;

// Source - https://stackoverflow.com/a
// Posted by ryanve, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-17, License - CC BY-SA 4.0

let vw = Math.max(
    document.documentElement.clientWidth || 0,
    window.innerWidth || 0,
);
let vh = Math.max(
    document.documentElement.clientHeight || 0,
    window.innerHeight || 0,
);

const D = 468;
let WIDTH = D;
let HEIGHT = D;
let W = WIDTH,
    H = HEIGHT;
let columns, rows;

let origin;
const corners = [
    { x: 0, y: 0 },
    { x: WIDTH, y: 0 },
    { x: 0, y: HEIGHT },
    { x: WIDTH, y: HEIGHT },
];
const COLOR_STOPS = [
    { t: 0.0, c: [10, 10, 20] },
    { t: 0.4, c: [80, 100, 160] },
    { t: 0.7, c: [220, 120, 40] },
    { t: 1.0, c: [255, 240, 200] },
];

const PASSES = 50,
    ADJACENT_CRITERIA = 6, // 3x3
    NEARBY_CRITERIA = 10, // 5x5
    DENSITY = 0.565;

const gradients = [
    (n, tx, ty, dx, dy) => dist((n * tx) / 2, ty / 2, dx, dy) * 0.02,
    (n, tx, ty, dx, dy) => dist((n * tx) / 2, dx, ty / 2, dy) * 0.02,
    (n, tx, ty, dx, dy) => dist(cos(tx), tan(ty), cos(dx), tan(n)),

    // gpt-generated shader patterns
    (n, tx, ty, dx, dy) => sin(dist(tx, ty, dx, dy) * 0.04 - n * 6),
    (n, tx, ty, dx, dy) => sin(dist(tx, ty, dx, dy) * 0.06 + n * 4),
    (n, tx, ty, dx, dy) =>
        sin(atan2(ty - dy, tx - dx) * 8 + dist(tx, ty, dx, dy) * 0.03),
    (n, tx, ty, dx, dy) => sin(tx * 0.05 + n * 4) + cos(ty * 0.05 + n * 4),
    (n, tx, ty, dx, dy) => sin(tx * 0.04 + sin(ty * 0.04 + n * 3)),
    (n, tx, ty, dx, dy) => sin(ty * 0.1 + n * 6) * cos(tx * 0.02),
    (n, tx, ty, dx, dy) => sin(tx * ty * 0.0004 + n * 4),
    (n, tx, ty, dx, dy) => sin(tx * 0.05 + ty * 0.03 + n * 5),
    (n, tx, ty, dx, dy) => abs(sin(tx * 0.1) * cos(ty * 0.1 + n)),
    (n, tx, ty, dx, dy) =>
        sin(atan2(ty - dy, tx - dx) * 6 + dist(tx, ty, dx, dy) * 0.04),
    (n, tx, ty, dx, dy) => 1 / (1 + dist(tx, ty, dx, dy) * 0.05 + n),
    (n, tx, ty, dx, dy) => sin(atan2(ty - dy, tx - dx) * 4 + n * 5),
];

const mouseRadius = 16;

let dt = 0;
let glyphOffset = 2;
let dynamicGradient;
let velX, velY, density;
let mouseVelocityVec, mouseSpeed;
let usingMouse = true;
let cellularAutomata = false;
let epoch = 1;
let grid, next, flooded;
let randomColumn, randomRow;

function drawFunc() {}

function setup() {
    WIDTH = W = constrain(vw, 0, 648);
    HEIGHT = H = (2 * vh) / 5;
    origin = { x: WIDTH / 2, y: HEIGHT / 2 };

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

    // usingMouse = random() < 0.8;
    // if (!usingMouse) cellularAutomata = random() < 0.25;

    usingMouse = true;
    cellularAutomata = false;

    document.title = "komadiina | ognjen komadina";
    mouseVelocityVec = createVector(mouseX, mouseY);

    if (cellularAutomata) {
        console.log(`carving random cave...`);
    } else {
        console.log(`using anim=${dynamicGradient}, mouse=${usingMouse}`);
    }

    drawFunc = drawShader;
    if (usingMouse) initField();
    else if (cellularAutomata) {
        initBuffers();
        drawFunc = drawCellular;
    }
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
        let f = gradients[dynamicGradient](n, tx, ty, origin.x, origin.y);

        let offs = sin(frameCount * 0.02 + f);
        t *= offs;
        const v = sqrt(velX[gy][gx] ** 2 + velY[gy][gx] ** 2);
        const base = map(t, 0, 1, 0, 1); // base 2d shader
        const ink = constrain(density[gy][gx], 0, 1);

        const combined = base * (2.5 + ink * 1.2) + v * 0.5;

        let idx = floor(map(combined, 0, 1.5, 0, glyphs.length));
        idx = constrain(idx, 0, glyphs.length - 1);

        if (idx) glyph = glyphs[idx];
        return idx;
    }

    return 0;
};

let noMouseCalc = (gx, gy, maxDist) => {
    let tx = gx * TEXT_SCALE;
    let ty = gy * TEXT_SCALE;

    ((tx =
        tx * cos((frameCount * PI * 0.03) / 4) -
        ty * sin((frameCount * PI * 0.03) / 2)),
        (ty =
            tx * sin((frameCount * PI * 0.03) / 4) +
            ty * cos((frameCount * PI * 0.03) / 2)));

    ty = 1.1 * map(ty, gy * TEXT_SCALE, ty, 0, gy * TEXT_SCALE);
    tx = (1.0 + random(0.1)) * map(tx, gx * TEXT_SCALE, tx, 0, gx * TEXT_SCALE);

    let d = dist(tx, ty, origin.x, origin.y);
    let t = constrain(d / maxDist, 0, 1);
    let glyph = blank;

    if (t < 0.966) {
        let n = noise(gx * 0.05 + 100, gy * 0.12 + 100, frameCount * 0.05);
        let f = gradients[dynamicGradient](n, tx, ty, origin.x, origin.y);
        let offs = sin(frameCount * 0.02 + f);
        t *= offs;
        let idx = floor(map(t, 0, 1, 0, glyphs.length) * 0.5);
        idx = constrain(idx - glyphOffset, 0, glyphs.length - 1);

        if (idx) glyph = glyphs[idx];
        return idx;
    }

    return 0;
};

function initBuffers() {
    grid = new Uint8Array(W * H);
    next = new Uint8Array(W * H);
    flooded = new Uint8Array(W * H);

    randomColumn = Math.round(random(4, W - 4));
    randomRow = Math.round(random(4, H - 4));

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let idx = x + y * W;

            if (x == 0 || y == 0 || x == W - 1 || y == H - 1) grid[idx] = 1;
            // else if (abs(W - abs(x - y)) < W / 2) grid[idx] = 0
            else if (
                abs(x - randomColumn) > 2 &&
                abs(y - randomRow) > 2 &&
                random() < DENSITY
            )
                grid[idx] = 1;
            else grid[idx] = 0;
        }
    }
}

function countAdjacent(grid, w, h, x, y) {
    let adjacent = 0;

    for (let dy = y - 1; dy <= y + 1; dy++) {
        for (let dx = x - 1; dx <= x + 1; dx++) {
            if (grid[dx + dy * w] === 1) adjacent++;
        }
    }

    return adjacent;
}

function countNearby(grid, w, h, x, y) {
    let nearby = 0;
    let delta = 2;

    for (let dy = y - delta; dy <= y + delta; dy++) {
        for (let dx = x - delta; dx <= x + delta; dx++) {
            if (Math.abs(dx - x) == 2 && Math.abs(dy - y) == 2)
                continue; // 0,0
            else if (dx < 0 || dx > w || dy < 0 || dy > h) continue;
            if (grid[dx + dy * w] === 1) nearby++;
        }
    }

    return nearby;
}

function placeWall(grid, w, h, x, y) {
    let adj = countAdjacent(grid, w, h, x, y);
    let near = countNearby(grid, w, h, x, y);

    if (adj >= ADJACENT_CRITERIA) return 1; // grow wall, enough adjacent walls
    if (near <= NEARBY_CRITERIA) return 0; // collapse wall, not enough nearby walls

    return grid[x + y * w]; //noop
}

function step() {
    for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
            let idx = x + y * W;
            if (x == 0 || y == 0 || x == width - 1 || y == height - 1)
                next[idx] = 1;
            else next[idx] = placeWall(grid, W, H, x, y);
        }
    }

    for (let x = 0; x < W; x++) {
        next[x] = 1;
        next[x + (H - 1) * W] = 1;
    }

    for (let y = 0; y < H; y++) {
        next[y * W] = 1;
        next[y * W + W - 1] = 1;
    }

    let tmp = grid;
    grid = next;
    next = tmp;
}

function dfs() {
    let stack = [{ x: randomColumn, y: randomRow }];
    let visited = new Uint8Array(W * H);

    while (stack.length) {
        let { x, y } = stack.pop();
        let i = x + y * W;

        if (visited[i]) continue;
        if (grid[i] === 1) continue;
        visited[i] = 1;
        let nextNeighbors = [];

        if (x > 0) nextNeighbors.push({ x: x - 1, y });
        if (x < W - 1) nextNeighbors.push({ x: x + 1, y });
        if (y > 0) nextNeighbors.push({ x, y: y - 1 });
        if (y < H - 1) nextNeighbors.push({ x, y: y + 1 });

        let toVisit = [];
        for (let n of nextNeighbors)
            if (grid[n.x + n.y * W] == grid[x + y * W]) toVisit.push(n); // connects same with neighbor

        if (toVisit.length > 3) stack.push(...nextNeighbors);
    }

    for (let i = 0; i < W * H; i++) {
        if (!visited[i]) grid[i] = 1; // fill unreachable voids
    }
}

function updateGrid() {
    loadPixels();

    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            let c = grid[x + y * W] * 165; // 0 || 255
            let idx = (x + y * W) * 4; // expand to 8bpp RGBA

            pixels[idx + 0] = pixels[idx + 1] = pixels[idx + 2] = c;
            pixels[idx + 3] = 255;
        }
    }

    updatePixels();
}

function norm(idx, max) {
    return Math.min(1, Math.max(0, idx / (max - 1)));
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function sampleGradient(t) {
    for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
        const a = COLOR_STOPS[i];
        const b = COLOR_STOPS[i + 1];

        if (t >= a.t && t <= b.t) {
            const u = (t - a.t) / (b.t - a.t);

            return [
                lerp(a.c[0], b.c[0], u),
                lerp(a.c[1], b.c[1], u) * 2,
                lerp(a.c[2], b.c[2], u) * 6,
            ];
        }
    }

    return COLOR_STOPS.at(-1).c;
}

const getRGBAColor = (idx) => {
    const t = norm(idx + random(glyphs.length - idx), glyphs.length);
    const [r, g, b] = sampleGradient(t);
    return [r | 0, g | 0, b | 0, 255];
};

function drawShader() {
    background(11);
    let maxDist = 0;
    for (let c of corners) {
        maxDist = max(maxDist, dist(origin.x, origin.y, c.x, c.y));
    }

    let calc = noMouseCalc;

    if (usingMouse) {
        calc = mouseCalc;
        injectMousePhysics();
        advect();
        advectDensity();
    }

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < columns; gx++) {
            let idx = calc(gx, gy, maxDist);
            let [r, g, b, a] = getRGBAColor(idx);

            fill(r, g, b, a);
            text(glyphs[idx], gx * TEXT_SCALE, gy * TEXT_SCALE);
        }
    }
}

function drawCellular() {
    step();
    updateGrid();

    if (epoch >= PASSES) {
        epoch = epoch - 1;
        dfs();
        updateGrid();
        noLoop();
    }
    epoch++;
}

function draw() {
    drawFunc();
}
