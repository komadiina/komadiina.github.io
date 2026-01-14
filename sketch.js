const glyphs =
  "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,\"^`'."
    .split("")
    .reverse();
const TEXT_SCALE = 18;

const WIDTH = 960;
const HEIGHT = 960;
let columns, rows;

const origin = { x: WIDTH / 2, y: HEIGHT / 2 };
const corners = [
  { x: 0, y: 0 },
  { x: WIDTH, y: 0 },
  { x: 0, y: HEIGHT },
  { x: WIDTH, y: HEIGHT },
];

function setup() {
  createCanvas(WIDTH, HEIGHT);
  background(21);
  textFont("monospace");
  textSize(TEXT_SCALE);
  textAlign(LEFT, TOP);
  frameRate(30);

  columns = floor(WIDTH / TEXT_SCALE);
  rows = floor(HEIGHT / TEXT_SCALE);
}

let dt = 0;

function draw() {
  background(21);

  let maxDist = 0;
  for (let c of corners) {
    maxDist = max(maxDist, dist(origin.x, origin.y, c.x, c.y));
  }

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < columns; gx++) {
      let tx = gx * TEXT_SCALE;
      let ty = gy * TEXT_SCALE;

      let n = noise(gx * 0.01 + 100, gy * 0.01 + 100, frameCount * 0.01);

      let offs = sin(
        frameCount * 0.05 +
          dist((n * tx) / 2, origin.x, ty / 2, origin.y) * 0.015
      );

      let d = dist(tx, ty, origin.x, origin.y);
      let t = constrain(d / maxDist, 0, 1) * offs;
      let idx = floor(map(t, 0, 1, 0, glyphs.length));
      idx = constrain(idx, 0, glyphs.length - 1);

      let glyph = glyphs[idx];

      fill(220);
      text(glyph, gx * TEXT_SCALE, gy * TEXT_SCALE);
    }
  }
}
