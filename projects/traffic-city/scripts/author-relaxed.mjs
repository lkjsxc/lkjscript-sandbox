// Source-bound, ordinary native edit of a copied accepted graph. No accepted
// metadata is edited. This avoids replaying unchanged game declarations.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root = path.resolve(import.meta.dirname, '..');
const baselineFile = process.env.BASELINE_SELECTION;
assert(baselineFile, 'Provide BASELINE_SELECTION for the retained exact-router game.');
const baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
const bin = baseline.bin;
assert.equal(hash(fs.readFileSync(bin)), baseline.compiler_sha256);
assert.equal(hash(fs.readFileSync(baseline.artifact)), baseline.artifact_sha256);
const core = fs.readFileSync(path.join(root, 'src/core.lkjc'), 'utf8');
const original = fs.readFileSync(path.join(baseline.project, 'core.lkjc'), 'utf8').replace(/^request base=rev_[a-f0-9]+\n/, '');
assert.equal(hash(original), baseline.sources.core, 'Retained source must match its selection.');
const functions = text => [...text.matchAll(/^  \(function create ([^ ]+) .*\n   \(body .*\n/gm)];
const additions = functions(core).filter(m => m[1].startsWith('hop-') || m[1] === 'find-commute-route');
assert.equal(additions.length, 7, 'Only the explicit topology-first router may be added.');
const oldEnsure = functions(original).find(m => m[1] === 'ensure-route')?.[0];
const ensure = functions(core).find(m => m[1] === 'ensure-route')?.[0];
assert(oldEnsure && ensure);
assert.equal(ensure, oldEnsure.replace('(call find-route ', '(call find-commute-route '));
let reverted = core.replace(ensure, oldEnsure);
for (const addition of additions) reverted = reverted.replace(addition[0], '');
assert.equal(reverted, original, 'No unreviewed core changes may enter this overlay.');
for (const [name, sha] of Object.entries(baseline.sources)) {
  if (['assets', 'http', 'core'].includes(name)) continue;
  assert.equal(hash(fs.readFileSync(path.join(root, 'src', name + '.lkjc'))), sha, 'Unchanged native source: ' + name);
}
for (const dir of ['.build', 'runtime', 'evidence']) fs.mkdirSync(path.join(root, dir), {recursive:true});
const project = process.env.OVERLAY_PROJECT ? path.resolve(root, process.env.OVERLAY_PROJECT) : path.join(root, '.build', 'relaxed-overlay-' + Date.now());
assert.equal(path.dirname(project), path.join(root, '.build'));
assert(path.basename(project).startsWith('relaxed-overlay-'));
if (!fs.existsSync(project)) {
  const copy = spawnSync('cp', ['-a', '--reflink=auto', baseline.project, project], {encoding:'utf8'});
  assert.equal(copy.status, 0, copy.stderr);
}
assert(!fs.lstatSync(project).isSymbolicLink());
const work = fs.mkdtempSync(path.join(root, '.build', 'relaxed-proposals-'));
function run(args) {
  const result = spawnSync(bin, args, {cwd:root, encoding:'utf8', maxBuffer:64*1024*1024});
  if (result.error || result.status !== 0) throw Error([result.error, result.stdout, result.stderr].filter(Boolean).join('\n'));
  return result.stdout;
}
console.log('Checking copied baseline artifact identity.');
const copiedArtifact = path.join(root, 'runtime', 'relaxed-baseline-' + Date.now() + '.lkja');
run(['--project', project, 'build', '--output', copiedArtifact]);
assert.equal(hash(fs.readFileSync(copiedArtifact)), baseline.artifact_sha256, 'Copied graph must reproduce the retained baseline artifact exactly.');
const draftFile = path.join(work, 'ensure-route.lkjc');
run(['--project', project, 'change', 'draft', '--declaration', 'game::ensure-route', '--output', draftFile]);
const draft = fs.readFileSync(draftFile, 'utf8');
const module = draft.match(/\(module edit (mod_[a-f0-9]+) game\s/)?.[1];
const owner = draft.match(/\(function edit (decl_[a-f0-9]+) ensure-route\s/)?.[1];
const revision = draft.match(/^request base=(rev_[a-f0-9]+)/)?.[1];
assert(module && owner && revision);
let edit = ensure.replace('(function create ensure-route ', `(function edit ${owner} ensure-route `);
for (const name of ['world', 'q', 'origin', 'dest', 'mode', 'p']) {
  const identity = draft.match(new RegExp('\\(parameter edit (param_[a-f0-9]+) ' + name + '\\s'))?.[1];
  assert(identity, 'Canonical parameter missing: ' + name);
  edit = edit.replace('(parameter create ' + name + ' ', `(parameter edit ${identity} ${name} `);
}
const aliases = core.slice(0, core.indexOf(' (module create game'));
const existingNames = new Set(functions(original).map(m => m[1]));
const qualify = body => body.replace(/\(call ([^ :()]+)(?=[ )])/g, (whole, name) => existingNames.has(name) ? '(call game::' + name : whole);
const proposal = path.join(work, 'topology-first.lkjc');
fs.writeFileSync(proposal, 'request base=' + revision + '\n' + aliases + ` (module edit ${module} game\n` + additions.map(m=>qualify(m[0])).join('') + qualify(edit) + ')\n)\ndeclarations.end\n');
console.log('Planning and applying the ordinary source-bound native edit.');
const plan = run(['--project', project, 'change', 'plan', '--input-file', proposal]);
fs.writeFileSync(path.join(work, 'plan.txt'), plan);
const token = plan.match(/plan_[a-f0-9]+/)?.[0]; assert(token, plan);
const applied = run(['--project', project, 'change', 'apply', '--input-file', proposal, '--plan', token]);
fs.writeFileSync(path.join(work, 'apply.txt'), applied);
console.log('Checking the complete selected game graph.');
const checked = run(['--project', project, 'check']);
fs.writeFileSync(path.join(root, 'evidence', 'relaxed-native-check.txt'), checked);
console.log(checked);
const artifact = path.join(root, 'runtime', 'flowgarden-relaxed-' + Date.now() + '.lkja');
console.log(run(['--project', project, 'build', '--output', artifact]));
const selection = {
  bin, project, artifact, artifact_sha256:hash(fs.readFileSync(artifact)),
  compiler_sha256:baseline.compiler_sha256,
  sources:{...baseline.sources, core:hash(core)},
  tests:Number(checked.match(/tests passed=(\d+)/)?.[1]),
  authoring:{kind:'source-bound copied-graph canonical edit', baseline_artifact_sha256:baseline.artifact_sha256, base_core_sha256:baseline.sources.core, proposal_sha256:hash(fs.readFileSync(proposal)), retained_presentation:true},
};
// Embedded HTTP is retained from baseline. Pair with a separately source-bound
// HTTP_CITY_SELECTION when testing or deploying current browser presentation.
const out = path.resolve(root, process.env.BUILD_SELECTION || '.build/selection.json');
fs.writeFileSync(out, JSON.stringify(selection, null, 2) + '\n');
fs.writeFileSync(path.join(root, 'evidence/relaxed-build.json'), JSON.stringify(selection, null, 2) + '\n');
console.log('Selected native session artifact:', out);
