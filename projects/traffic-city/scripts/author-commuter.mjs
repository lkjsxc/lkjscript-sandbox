// Static example authoring only. Native lkjscript builds the rail services,
// creates residents, assigns jobs and executes all movement and accounting.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const tiles = new Map(), id = (x, y) => x + y * 128;
function place(x, y, kind) {
  const key = id(x, y);
  assert(x >= 0 && x < 128 && y >= 0 && y < 128);
  assert(!tiles.has(key), `Duplicate tile ${key}`);
  tiles.set(key, kind);
}
for (const cy of [20, 48, 76, 104]) for (const cx of [22, 44, 84, 106]) {
  for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) {
    if (Math.max(Math.abs(x), Math.abs(y)) === 3) place(cx + x, cy + y, 1);
  }
  for (let n = -2; n <= 2; n++) {
    place(cx + n, cy, n === 0 ? 8 : 7);
    if (n !== 0) place(cx, cy + n, 7);
  }
  // Four explicit gates leave both rail axes clear, without building-to-building access.
  for (const [x, y] of [[-4, 0], [4, 0], [0, -4], [0, 4]]) place(cx + x, cy + y, 7);
  if (cx < 64) {
    for (let n = -3; n <= 3; n++) if (n !== 0) {
      place(cx + n, cy - 4, 3); place(cx + n, cy + 4, 3);
      place(cx - 4, cy + n, 3); place(cx + 4, cy + n, 3);
    }
    // The two homes formerly occupying the north/south gates move inside the ring.
    for (const [x, y] of [[-2,-2],[2,-2],[-2,2],[2,2],[-2,-1],[2,-1],[-2,1],[2,1]]) place(cx + x, cy + y, 3);
  } else {
    for (const y of [-3, -2, -1, 1, 2, 3]) { place(cx - 4, cy + y, 4); place(cx + 4, cy + y, 4); }
    for (const x of [-2, 2]) { place(cx + x, cy - 4, 4); place(cx + x, cy + 4, 4); }
  }
  for (const [x, y, kind] of [[-1,-1,5],[1,-1,6],[-1,1,6],[1,1,5]]) place(cx + x, cy + y, kind);
}
const layout = [...tiles].sort((a, b) => a[0] - b[0]).map(([id, kind]) => ({id, kind}));
assert.equal(layout.filter(t => t.kind === 3).length, 256);
assert.equal(layout.filter(t => t.kind === 4).length, 128);
assert.equal(layout.filter(t => t.kind === 8).length, 16);
fs.writeFileSync(new URL('../examples/commuter-layout.json', import.meta.url), JSON.stringify(layout) + '\n');
console.log('Authored 16 four-gate districts, 256 homes and 128 workplaces; both rail axes remain clear.');
