const glyphs =
    // "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'."
    "$@B%/\\+=><~-;:,.".split("").reverse();
const blank = " ";
const TEXT_SCALE = 6;

const D = 468;
const WIDTH = D;
const HEIGHT = D;
let columns, rows;

const origin = { x: WIDTH / 2, y: HEIGHT / 2 };
const corners = [
    { x: 0, y: 0 },
    { x: WIDTH, y: 0 },
    { x: 0, y: HEIGHT },
    { x: WIDTH, y: HEIGHT },
];

let dynamic;

function setup() {
    const canv = createCanvas(WIDTH, HEIGHT);
    canv.parent("canvas-parent");
    textFont("monospace");
    textSize(TEXT_SCALE);
    textAlign(LEFT, TOP);
    frameRate(24);
    noSmooth();

    columns = floor(WIDTH / TEXT_SCALE);
    rows = floor(HEIGHT / TEXT_SCALE);

    dynamic = random(1) < 0.5;
    console.log(dynamic);
}

let dt = 0;
let glyphOffset = 2;
let header = "komadiina";

function draw() {
    background(11);

    let maxDist = 0;
    for (let c of corners) {
        maxDist = max(maxDist, dist(origin.x, origin.y, c.x, c.y));
    }

    for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < columns; gx++) {
            let tx = gx * TEXT_SCALE;
            let ty = gy * TEXT_SCALE;
            let d = dist(tx, ty, origin.x, origin.y);
            let t = constrain(d / maxDist, 0, 1);
            let glyph = blank;

            if (t < 0.966) {
                let n = noise(
                    gx * 0.05 + 100,
                    gy * 0.12 + 100,
                    frameCount * 0.01
                );
                let f = dynamic
                    ? dist((n * tx) / 2, origin.x, ty / 2, origin.y) * 0.02
                    : dist((n * tx) / 2, ty / 2, origin.x, origin.y) * 0.02;
                let offs = sin(frameCount * 0.04 + f);
                t *= offs;
                let idx = floor(map(t, 0, 1, 0, glyphs.length));
                idx = constrain(idx - glyphOffset, 0, glyphs.length - 1);

                if (!idx) glyph = blank;
                else glyph = glyphs[idx];
            }

            fill(255);
            text(glyph, gx * TEXT_SCALE, gy * TEXT_SCALE);
        }
    }
}
