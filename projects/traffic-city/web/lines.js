// Railway presentation only: the native service owns every departure and edit.
export const lineWaiting = line => (line.platforms || []).reduce((n, p) => n + p.forward + p.reverse, 0);
export const lineMoving = line => line.status === 1 || (line.duration > 0 && line.elapsed < line.duration);
export const lineEditable = line => !line.enabled && !lineMoving(line) && !line.occupancy && !lineWaiting(line);
export function lineState(line, paused = false) {
  const stoppedClock = paused ? ' City time is paused; start traffic to let this finish.' : '';
  if (!line.enabled && lineMoving(line)) return {label: 'Stopping at next station', detail: 'The paid leg finishes before the train stops. Riders leave at the next station and continue on foot. No new departures.' + stoppedClock};
  if (!line.enabled && (line.occupancy || lineWaiting(line))) return {label: 'Clearing passengers', detail: 'Waiting passengers choose another journey. Stop editing unlocks when the train and platforms are empty.' + stoppedClock};
  if (!line.enabled) return {label: 'Not running · ready to edit', detail: 'Start departures when the ordered stop list is ready. Only this line is stopped; the rest of the city can run.'};
  if (line.status === 2) return {label: 'Waiting for funds', detail: `The next leg needs $${line.expense}. No operating charge or departure occurs until it can be paid.`};
  if (line.status === 4) return {label: 'Waiting for clear track', detail: 'Another train owns a shared section. This train departs after that section clears.' + stoppedClock};
  return {label: lineMoving(line) ? 'Running' : 'At station', detail: (lineMoving(line) ? 'Travelling to the next stop.' : 'Boarding, then departing in stop order.') + (paused ? ' City time is paused.' : '')};
}
const palette = ['#6f7194', '#b18b53', '#528b8a', '#a7736c'];
const coordinates = id => `${id % 128}, ${Math.floor(id / 128)}`;
export function createLineManager({getLines, getStations, getStatus, getPaused, getPending, send, addStop, focusStation, beginService, onOpen}) {
  const panel = document.createElement('aside'); panel.id = 'lines-panel'; panel.hidden = true;
  panel.setAttribute('aria-label', 'Railway lines');
  panel.innerHTML = `<header><h2>Lines</h2><button id="lines-close" aria-label="Close lines">×</button></header>
    <p id="lines-summary" class="small"></p><div id="lines-list" aria-label="Choose a line"></div>
    <section id="line-details" hidden><h3 id="line-title"></h3><p id="line-status" role="status"></p><p id="line-explanation" class="small"></p>
    <dl class="line-metrics"><dt>On train</dt><dd id="line-occupancy"></dd><dt>Waiting at stops</dt><dd id="line-waiting"></dd><dt>Next leg / spent</dt><dd id="line-expenses"></dd><dt>Total boardings</dt><dd id="line-boardings"></dd></dl>
    <h4>Stops · travel order</h4><ol id="line-stop-list"></ol>
    <button id="line-toggle"></button><button id="line-map-stop">Add stop on map</button>
    <label for="line-stop-select">Existing station</label><select id="line-stop-select"></select><button id="line-add-existing">Add selected stop</button>
    <p id="line-edit-reason" class="small"></p></section><button id="line-create">Create another line</button>`;
  document.querySelector('main').append(panel);
  const $ = id => panel.querySelector('#' + id);
  let selected = 0, stopKey = '', stationKey = '';
  const current = () => getLines().find(line => line.id === selected);
  function close() { panel.hidden = true; document.getElementById('lines-open')?.focus({preventScroll: true}); }
  $('lines-close').onclick = close;
  $('lines-list').onclick = event => { const button = event.target.closest('[data-line]'); if (button) { selected = Number(button.dataset.line); stopKey = ''; render(); } };
  $('line-stop-list').onclick = event => { const button = event.target.closest('[data-station]'); if (button) focusStation(Number(button.dataset.station)); };
  $('line-toggle').onclick = () => { const line = current(); if (line) send('rail-service', {x: line.id, kind: line.enabled ? 0 : 1}); };
  $('line-map-stop').onclick = () => { const line = current(); if (line && lineEditable(line)) { close(); addStop(line.id); } };
  $('line-add-existing').onclick = () => { const line = current(), station = Number($('line-stop-select').value); if (line && lineEditable(line) && station >= 0 && $('line-stop-select').value !== '') send('rail-stop', {x: line.id, y: station}); };
  $('line-create').onclick = () => { close(); beginService(); };
  function render() {
    if (panel.hidden) return;
    const lines = getLines(), pending = getPending(), online = getStatus() === 1;
    if (!lines.some(line => line.id === selected)) { selected = lines[0]?.id || 0; stopKey = ''; }
    $('lines-summary').textContent = lines.length ? `${lines.length} ${lines.length === 1 ? 'line' : 'lines'} · ${lines.filter(line => line.enabled).length} accepting departures · ${lines.reduce((n, line) => n + lineWaiting(line), 0)} waiting` : 'No lines yet. Build track and stations, then connect two stations.';
    for (const old of $('lines-list').querySelectorAll('[data-line]')) if (!lines.some(line => line.id === Number(old.dataset.line))) old.remove();
    for (const line of lines) {
      let button = $('lines-list').querySelector(`[data-line="${line.id}"]`);
      if (!button) { button = document.createElement('button'); button.dataset.line = line.id; button.innerHTML = '<b></b><span></span>'; $('lines-list').append(button); }
      button.style.setProperty('--line-color', palette[(line.id - 1) % palette.length]);
      button.querySelector('b').textContent = `Line ${line.id}`; button.querySelector('span').textContent = lineState(line, getPaused()).label;
      button.setAttribute('aria-pressed', String(line.id === selected));
    }
    const line = current(); $('line-details').hidden = !line; $('line-create').disabled = !online;
    if (!line) return;
    const state = lineState(line, getPaused()), stops = line.stops || [line.a, line.b];
    const applying = pending.some(action => action.x === line.id && ['rail-service', 'rail-stop'].includes(action.op));
    $('line-title').textContent = `Line ${line.id}`; $('line-status').textContent = applying ? 'Applying change…' : state.label;
    $('line-explanation').textContent = state.detail;
    $('line-occupancy').textContent = `${line.occupancy} / ${line.capacity}`; $('line-waiting').textContent = String(lineWaiting(line));
    $('line-expenses').textContent = `$${line.expense} / $${line.spent}`; $('line-boardings').textContent = String(line.boardings);
    const key = `${line.id}:${stops.join(',')}`;
    if (key !== stopKey) { $('line-stop-list').replaceChildren(); for (const [index, station] of stops.entries()) { const item = document.createElement('li'), button = document.createElement('button'); button.dataset.station = station; button.innerHTML = '<span></span><small></small>'; button.querySelector('span').textContent = `${index + 1} · ${coordinates(station)}`; item.append(button); $('line-stop-list').append(item); } stopKey = key; }
    for (const button of $('line-stop-list').querySelectorAll('[data-station]')) { const station = Number(button.dataset.station), p = (line.platforms || []).find(p => p.station === station); button.querySelector('small').textContent = `${p ? p.forward + p.reverse : 0} waiting${line.from === station && !lineMoving(line) ? ' · train here' : ''}`; }
    const choices = getStations().filter(id => !stops.includes(id)), choiceKey = `${line.id}:${choices.join(',')}`;
    if (choiceKey !== stationKey) { const value = $('line-stop-select').value; $('line-stop-select').replaceChildren(); const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = choices.length ? 'Choose a station…' : 'No other stations'; $('line-stop-select').append(placeholder); for (const id of choices) { const option = document.createElement('option'); option.value = id; option.textContent = coordinates(id); $('line-stop-select').append(option); } if (choices.includes(Number(value)) && value !== '') $('line-stop-select').value = value; stationKey = choiceKey; }
    const ready = online && !applying && lineEditable(line) && stops.length < 8;
    $('line-toggle').textContent = line.enabled ? 'Stop this line at next station' : 'Start departures'; $('line-toggle').disabled = !online || applying;
    $('line-map-stop').disabled = !ready; $('line-stop-select').disabled = !ready; $('line-add-existing').disabled = !ready || !choices.length;
    $('line-edit-reason').textContent = stops.length >= 8 ? 'This line has the maximum eight stops.' : lineEditable(line) ? 'Choose a station on this route, or extend track beyond its final stop. No whole-city pause is needed.' : 'Stop this line, then let its train and platforms empty to edit stops. Other lines keep running.';
  }
  return {get open() { return !panel.hidden; }, close, render, show(id = 0) { onOpen(); if (id) selected = id; panel.hidden = false; render(); $('lines-close').focus({preventScroll: true}); }};
}
