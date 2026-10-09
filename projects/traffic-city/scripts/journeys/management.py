# Imported by session.py: same native transactional capability, no external host.
def backup_key(token): return LS('std::DataKeyPart',variant('std::DataKeyPart::Text',token),variant('std::DataKeyPart::Text',T('previous-city')))
fn('has-undo',[('token','Text')],'Bool',LET([('entries',cap('get',space,backup_key(V('token'))))],IF(eq(llen('std::DataEntry',V('entries')),I(0)),B(False),eq(F(C('migrate::decode',ef('entries','value')),'format'),I(9)))),True)
fn('replace-saved',[('state','State'),('restore','Bool')],'Claim',tx('Claim',LET([
 ('entries',cap('get',space,key(V('state.token')))),
 ('backup',cap('get',space,backup_key(V('state.token')))),
 ('saved',IF(eq(llen('std::DataEntry',V('entries')),I(0)),C('invalid-save'),C('migrate::decode',ef('entries','value')))),
 ('previous',IF(eq(llen('std::DataEntry',V('backup')),I(0)),C('invalid-save'),C('migrate::decode',ef('backup','value'))))],
 IF(NOT(eq(V('saved.format'),I(9))),R(status=I(3),saved=V('saved')),
 IF(NOT(te(V('saved.owner'),V('state.owner'))),R(status=I(2),saved=V('saved')),
 IF(AND(V('restore'),NOT(eq(V('previous.format'),I(9)))),R(status=I(6),saved=V('saved')),
 LET([('city',IF(V('restore'),PATCH('City',V('previous.city'),paused=B(True)),IF(le(I(11),V('state.management')),C('scenarios::load',sub(V('state.management'),I(10))),C('town::initial')))),
      ('next',R(format=I(9),owner=V('state.owner'),serial=add(V('saved.serial'),I(1)),city=V('city'))),
      ('put',cap('put',space,key(V('state.token')),enc('Saved',V('next')),expectation('entries'))),
      ('backupPut',cap('put',space,backup_key(V('state.token')),enc('Saved',IF(V('restore'),C('invalid-save'),V('saved'))),expectation('backup')))],
 R(status=IF(AND(V('put'),V('backupPut')),I(1),I(5)),saved=V('next'))))))),R(status=I(5),saved=C('invalid-save'))),True)
fn('replace-retry',[('state','State'),('restore','Bool'),('remaining','I64')],'Claim',LET([('result',C('replace-saved',V('state'),V('restore')))],IF(AND(eq(V('result.status'),I(5)),lt(I(0),V('remaining'))),C('replace-retry',V('state'),V('restore'),sub(V('remaining'),I(1))),V('result'))),True)
fn('clear-review',[('state','State')],'State',PATCH('State',V('state'),quote=ZERO('EditQuote'),management=I(0),confirmation=I(0)))
fn('review-remove',[('state','State'),('command','Command')],'Decision',LET([('quote',C('remove::quote',V('state.city'),V('command'),V('state.ack')))],IF(V('quote.valid'),C('save-state',PATCH('State',C('clear-review',V('state')),city=PATCH('City',V('state.city'),paused=B(True)),quote=V('quote')),T('Review this area. Traffic is paused; nothing has been removed.')),emit(C('clear-review',V('state')),T('Select a non-empty rectangle inside the map, up to 256 tiles.')))),True)
fn('apply-remove',[('state','State'),('command','Command')],'Decision',IF(AND(eq(V('command.x'),V('state.quote.id')),V('state.quote.valid')),LET([('outcome',C('remove::apply',V('state.city'),V('state.quote')))],C('save-state',PATCH('State',C('clear-review',V('state')),city=C('moneyedit::command',V('state.city'),V('outcome.city')),selection=I(-1)),V('outcome.notice'))),emit(C('clear-review',V('state')),T('This review has expired. Select the area again.'))),True)
fn('review-city',[('state','State'),('restore','Bool')],'Decision',IF(AND(V('restore'),NOT(V('state.undo'))),emit(C('clear-review',V('state')),T('There is no previous city to restore.')),C('save-state',PATCH('State',C('clear-review',V('state')),city=PATCH('City',V('state.city'),paused=B(True)),management=IF(V('restore'),I(2),I(1)),confirmation=V('state.ack')),T('Traffic paused. Confirm or cancel; your city is unchanged.'))),True)
fn('manage-city',[('state','State'),('command','Command'),('restore','Bool')],'Decision',IF(AND(V('state.city.paused'),OR(eq(V('state.management'),IF(V('restore'),I(2),I(1))),AND(NOT(V('restore')),C('town::between',V('state.management'),I(11),I(15)),eq(V('command.kind'),sub(V('state.management'),I(10))))),lt(I(0),V('state.confirmation')),eq(V('command.x'),V('state.confirmation'))),LET([('result',C('replace-retry',V('state'),V('restore'),I(2)))],IF(eq(V('result.status'),I(1)),emit(PATCH('State',C('clear-review',V('state')),city=V('result.saved.city'),saved=V('result.saved.city.sim.tick'),mapVersion=I(-1),selection=I(-1),undo=NOT(V('restore'))),IF(V('restore'),T('Previous city restored. Continue when ready.'),T('New city ready. Your previous city can be restored from Menu.')),B(True)),emit(PATCH('State',C('clear-review',V('state')),status=IF(eq(V('result.status'),I(6)),I(1),V('result.status'))),T('City change was not committed. The current saved city is retained.')))),emit(C('clear-review',V('state')),T('Open Manage city and review this action first.'))),True)
fn('review-scenario',[('state','State'),('command','Command')],'Decision',IF(C('town::between',V('command.kind'),I(1),I(5)),C('save-state',PATCH('State',C('clear-review',V('state')),city=PATCH('City',V('state.city'),paused=B(True)),management=add(I(10),V('command.kind')),confirmation=V('state.ack')),T('Your city is saved. Confirm to load an independent example and keep one recoverable backup.')),emit(C('clear-review',V('state')),T('Unknown city example; current city retained.'))),True)
# Build the dispatch expression from the last branch so nesting remains reviewable.
active=LET([('outcome',C('town::command',V('state.city'),V('command')))],C('save-state',PATCH('State',C('clear-review',V('state')),city=V('outcome.city')),V('outcome.notice')))
for op,body in reversed([
 ('save',C('save-state',V('state'),T('City saved.'))),
 ('cancel-review',emit(C('clear-review',V('state')))),
 ('review-remove',C('review-remove',V('state'),V('command'))),
 ('apply-remove',C('apply-remove',V('state'),V('command'))),
 ('review-scenario',C('review-scenario',V('state'),V('command'))),
 ('load-scenario',IF(C('town::between',V('state.management'),I(11),I(15)),C('manage-city',V('state'),V('command'),B(False)),emit(C('clear-review',V('state')),T('Review a city example before loading.')))),
 ('review-reset',C('review-city',V('state'),B(False))),
 ('review-restore',C('review-city',V('state'),B(True))),
 ('reset-city',C('manage-city',V('state'),V('command'),B(False))),
 ('restore-city',C('manage-city',V('state'),V('command'),B(True))),
]): active=IF(te(V('command.op'),T(op)),body,active)
fn('active-input',[('state','State'),('command','Command')],'Decision',active,True)
