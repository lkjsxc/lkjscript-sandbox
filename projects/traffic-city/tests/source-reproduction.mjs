// Optional authoring regression: Python is not needed for normal native builds.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root = path.resolve(import.meta.dirname, '..');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'traffic-city-source-'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const nativeFiles = dir => fs.readdirSync(dir).filter(name => name.endsWith('.lkjc')).sort();
const expected = nativeFiles(path.join(root, 'src'));
const sources = Object.fromEntries(expected.map(name => [name, hash(path.join(root, 'src', name))]));

try {
  for (const name of ['scripts', 'src', 'web', 'examples']) {
    fs.cpSync(path.join(root, name), path.join(directory, name), {
      recursive: true,
      filter: file => !file.split(path.sep).includes('__pycache__'),
    });
  }
  assert(!fs.existsSync(path.join(directory, '.git')));
  for (let pass = 1; pass <= 2; pass++) {
    for (const [program, ...args] of [['bash', 'scripts/generate-native.sh'], [process.execPath, 'scripts/embed-assets.mjs']]) {
      const result = spawnSync(program, args, {cwd: directory, encoding: 'utf8', timeout: 120000});
      assert.equal(result.status, 0, `${program}: ${result.error?.message || ''}\n${result.stdout || ''}\n${result.stderr || ''}`);
    }
    assert.deepEqual(nativeFiles(path.join(directory, 'src')), expected);
    for (const name of expected) {
      assert.equal(hash(path.join(directory, 'src', name)), sources[name], `Regeneration ${pass} changed ${name}`);
    }
  }
  fs.mkdirSync(path.join(root, 'evidence'), {recursive: true});
  fs.writeFileSync(path.join(root, 'evidence', 'source-reproduction.json'), JSON.stringify({
    passed: true, source_files: expected.length, passes: 2, sources,
    method: 'Regenerate ordinary declaration inputs twice from a source-only archive without Git, an accepted graph, runtime artifacts or player stores. Origin policy remains byte-identical.',
  }, null, 2) + '\n');
  console.log(`PASS ${expected.length} native declaration files reproduce twice without Git history.`);
} finally {
  fs.rmSync(directory, {recursive: true, force: true});
}
