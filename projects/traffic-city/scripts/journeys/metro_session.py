"""Native aggregate sessions, transactional private saves and strict ownership."""
from metropolis import *

TYPES.update({
 'MetroSaved':{'format':'I64','owner':'Text','serial':'I64','city':'MetroCity'},
 'MetroClaim':{'status':'I64','saved':'MetroSaved'},
 'MetroState':{'city':'MetroCity','view':'MesoView','seq':'I64','ack':'I64','saved':'I64','token':'Text','owner':'Text','status':'I64','sentVersion':'I64','heartbeats':'I64','sleeping':'Bool'},
 'MetroInput':{'id':'I64','action':'MetroCommand','token':'Text','owner':'Text'},
 'MetroFrame':{'stats':'MesoTotals','view':'MesoView','rows':'(list MesoRow)','roads':'(list I64)','rails':'(list I64)','infraChanged':'Bool','paused':'Bool',**{k:'I64' for k in 'seq ack saved status version cash spent revenue level drawLimit'.split()},'notice':'Text'},
 'Header':{'name':'Text','value':'Bytes'},'HeaderValue':{'count':'I64','value':'Text'},
 'Open':{'headers':'(list Header)','path':'Text','query':'Text'},
 'Message':{'body':'(stream Bytes)','kind':'std::SessionMessageKind'},
 'PeerClose':{'code':'(option I64)','reason':'Text'},
 'MetroDecision':{'closing':'(option std::SessionClose)','kind':'std::SessionDecisionKind','messages':'(list std::SessionOutbound)','rejection':'(option std::SessionReject)','state':'(option MetroState)'},
})
def some(t,a):return G('std::option-some',t,a)
def none(t):return G('std::option-none',t)
def variant(t,a=None):return '(variant '+t+(' '+a if a else '')+')'
def key(token,backup=False):return LS('std::DataKeyPart',variant('std::DataKeyPart::Text',token),*([variant('std::DataKeyPart::Text',T('previous'))] if backup else []))
def cap(op,*args):return '(capability-call service::data std::DataStore::'+op+' '+' '.join(args)+')'
def entry(name,field):return '(field '+at('std::DataEntry',V(name),I(0))+' std::DataEntry::'+field+')'
def expectation(name):return IF(eq(llen('std::DataEntry',V(name)),I(0)),variant('std::DataExpectation::Missing'),variant('std::DataExpectation::Exact',entry(name,'revision')))
def encode(value):return G('std::data-encode','MetroSaved',value)
def decode(name):return G('std::data-decode-or','MetroSaved',entry(name,'value'),C('invalid-save'))
space='(static-text "traffic-city-metropolis-v1")'
def tx(t,body,fallback):return '(match (transaction-outcome service::data (types '+t+') (outcome std::TransactionOutcome std::TransactionAbortReason std::TransactionOutcome::Committed std::TransactionOutcome::Aborted std::TransactionAbortReason::ConditionFailed std::TransactionAbortReason::Conflict) (binding store) '+body+') (arm std::TransactionOutcome::Committed (payload result '+t+') (local result)) (arm std::TransactionOutcome::Aborted (payload reason std::TransactionAbortReason) '+fallback+'))'
D=[]
def fn(n,p,r,b,task=False):D.append(FN(n,p,r,b,effect='(task (requirement service::data) (requirement service::streams) (requirement service::config))' if task else 'pure'))
def emit(s,notice=''):return C('emit',s,T(notice),variant('std::SessionDecisionKind::continue'))

fn('empty',[],'MetroState',ZERO('MetroState',view=R(x=I(0),y=I(0),w=I(16),h=I(16)),saved=I(-1),sentVersion=I(-1)))
fn('invalid-save',[],'MetroSaved',ZERO('MetroSaved',format=I(-1)))
fn('hex',[('bytes','Bytes'),('i','I64')],'Bool',IF(lt(V('i'),C('std::bytes-length',V('bytes'))),LET([('n',C('std::bytes-get',V('bytes'),V('i')))],AND(OR(between(V('n'),48,57),between(V('n'),97,102)),C('hex',V('bytes'),add(V('i'),I(1))))),B(True)))
fn('valid-key',[('token','Text'),('length','I64')],'Bool',AND(eq(C('std::text-length',V('token')),V('length')),C('hex',C('std::bytes-from-text',V('token')),I(0))))
# Keep the established exact Origin policy. Do not introduce wildcard origins.
source=(ROOT/'src/session-origin.lkjc').read_text()
for name in ['find-header','origin-allowed','test-header']:
 start=source.index('  (function create '+name+' ');depth=0;quoted=False;escaped=False
 for i in range(start,len(source)):
  c=source[i]
  if quoted:
   if escaped:escaped=False
   elif c=='\\':escaped=True
   elif c=='"':quoted=False
  elif c=='"':quoted=True
  elif c=='(':depth+=1
  elif c==')':
   depth-=1
   if depth==0:D.append(source[start:i+1]+'\n');break
fn('save-limit',[],'I64',LET([('n',F(G('std::json-decode-or','I64',C('std::bytes-from-text','(capability-call service::config std::Configuration::text (static-text "saved_city_limit"))'),I(0)),'value'))],IF(between(V('n'),1,4096),V('n'),I(0))),True)
fn('claim',[('token','Text'),('owner','Text'),('limit','I64')],'MetroClaim',tx('MetroClaim',LET([
 ('entries',cap('get',space,key(V('token')))),('missing',eq(llen('std::DataEntry',V('entries')),I(0))),
 ('registry',cap('get',space,key(T('registry')))),('count',IF(eq(llen('std::DataEntry',V('registry')),I(0)),I(0),G('std::data-decode-or','I64',entry('registry','value'),I(-1)))),
],IF(AND(V('missing'),OR(lt(V('count'),I(0)),le(V('limit'),V('count')))),R(status=I(4),saved=C('invalid-save')),LET([
 ('saved',IF(V('missing'),ZERO('MetroSaved',format=I(1),city=C('metrocity::initial',I(100000))),decode('entries'))),
],IF(NOT(eq(V('saved.format'),I(1))),R(status=I(3),saved=V('saved')),LET([
 ('bound',PATCH('MetroSaved',V('saved'),owner=V('owner'),serial=add(V('saved.serial'),I(1)))),
 ('registered',IF(V('missing'),cap('put',space,key(T('registry')),G('std::data-encode','I64',add(V('count'),I(1))),expectation('registry')),B(True))),
 ('written',cap('put',space,key(V('token')),encode(V('bound')),expectation('entries'))),
],R(status=IF(AND(V('registered'),V('written')),I(1),I(5)),saved=V('bound'))))))),R(status=I(5),saved=C('invalid-save'))),True)
fn('checkpoint',[('state','MetroState'),('backup','Bool')],'I64',tx('I64',LET([
 ('entries',cap('get',space,key(V('state.token')))),
],IF(eq(llen('std::DataEntry',V('entries')),I(0)),I(3),LET([('saved',decode('entries'))],
 IF(NOT(eq(V('saved.format'),I(1))),I(3),IF(NOT(te(V('saved.owner'),V('state.owner'))),I(2),LET([
 ('previous',IF(V('backup'),cap('get',space,key(V('state.token'),True)),LS('std::DataEntry'))),
 ('backed',IF(V('backup'),cap('put',space,key(V('state.token'),True),encode(V('saved')),expectation('previous')),B(True))),
 ('written',cap('put',space,key(V('state.token')),encode(PATCH('MetroSaved',V('saved'),city=V('state.city'),serial=add(V('saved.serial'),I(1)))),expectation('entries'))),
],IF(AND(V('backed'),V('written')),I(1),I(5)))))))),I(5)),True)
fn('owned',[('state','MetroState')],'Bool',LET([('entries',cap('get',space,key(V('state.token'))))],
 IF(eq(llen('std::DataEntry',V('entries')),I(0)),B(False),LET([('saved',decode('entries'))],AND(eq(V('saved.format'),I(1)),te(V('saved.owner'),V('state.owner')))))),True)
fn('restore',[('state','MetroState')],'MetroClaim',tx('MetroClaim',LET([
 ('entries',cap('get',space,key(V('state.token')))),('previous',cap('get',space,key(V('state.token'),True))),
],IF(OR(eq(llen('std::DataEntry',V('entries')),I(0)),eq(llen('std::DataEntry',V('previous')),I(0))),R(status=I(3),saved=C('invalid-save')),LET([
 ('saved',decode('entries')),('prior',decode('previous')),
],IF(NOT(te(V('saved.owner'),V('state.owner'))),R(status=I(2),saved=C('invalid-save')),IF(NOT(AND(eq(V('saved.format'),I(1)),eq(V('prior.format'),I(1)))),R(status=I(3),saved=C('invalid-save')),LET([
 ('bound',PATCH('MetroSaved',V('prior'),owner=V('state.owner'),serial=add(V('saved.serial'),I(1)))),
 ('consumed',cap('put',space,key(V('state.token'),True),encode(C('invalid-save')),expectation('previous'))),
 ('written',cap('put',space,key(V('state.token')),encode(V('bound')),expectation('entries'))),
],R(status=IF(AND(V('consumed'),V('written')),I(1),I(5)),saved=V('bound')))))))),R(status=I(5),saved=C('invalid-save'))),True)
# Retry only an explicitly aborted transaction; a committed edit is never replayed.
fn('claim-retry',[('token','Text'),('owner','Text'),('limit','I64'),('left','I64')],'MetroClaim',LET([
 ('result',C('claim',V('token'),V('owner'),V('limit'))),
],IF(AND(eq(V('result.status'),I(5)),lt(I(0),V('left'))),C('claim-retry',V('token'),V('owner'),V('limit'),sub(V('left'),I(1))),V('result'))),True)
fn('checkpoint-retry',[('state','MetroState'),('backup','Bool'),('left','I64')],'I64',LET([
 ('result',C('checkpoint',V('state'),V('backup'))),
],IF(AND(eq(V('result'),I(5)),lt(I(0),V('left'))),C('checkpoint-retry',V('state'),V('backup'),sub(V('left'),I(1))),V('result'))),True)
fn('emit',[('s','MetroState'),('notice','Text'),('kind','std::SessionDecisionKind')],'MetroDecision',LET([
 ('changed',NOT(eq(V('s.sentVersion'),V('s.city.version')))),('seq',add(V('s.seq'),I(1))),
 ('area',mul(V('s.view.w'),V('s.view.h'))),('level',IF(le(V('area'),I(16)),I(2),IF(le(V('area'),I(96)),I(1),I(0)))),
 ('frame',R(stats=V('s.city.stats'),view=V('s.view'),rows=C('metroview::rows',V('s.city.model.cohorts'),V('s.view'),I(0),LS('MesoRow')),
 roads=IF(V('changed'),V('s.city.roads'),LS('I64')),rails=IF(V('changed'),V('s.city.rails'),LS('I64')),infraChanged=V('changed'),
 paused=V('s.city.paused'),seq=V('seq'),ack=V('s.ack'),saved=V('s.saved'),status=V('s.status'),version=V('s.city.version'),cash=V('s.city.cash'),spent=V('s.city.spent'),revenue=V('s.city.revenue'),level=V('level'),drawLimit=IF(eq(V('level'),I(2)),I(1536),IF(eq(V('level'),I(1)),I(640),I(256))),notice=V('notice'))),
],R(kind=V('kind'),state=some('MetroState',PATCH('MetroState',V('s'),seq=V('seq'),sentVersion=V('s.city.version'))),
 messages=LS('std::SessionOutbound',variant('std::SessionOutbound::text',C('std::bytes-to-text',G('std::json-encode','MetroFrame',V('frame'))))),closing=none('std::SessionClose'),rejection=none('std::SessionReject'))))
fn('quiet',[('s','MetroState')],'MetroDecision',R(kind=variant('std::SessionDecisionKind::continue'),state=some('MetroState',V('s')),messages=LS('std::SessionOutbound'),closing=none('std::SessionClose'),rejection=none('std::SessionReject')))
fn('finish',[],'MetroDecision',R(kind=variant('std::SessionDecisionKind::finish'),state=none('MetroState'),messages=LS('std::SessionOutbound'),closing=none('std::SessionClose'),rejection=none('std::SessionReject')))
fn('reject',[],'MetroDecision',R(kind=variant('std::SessionDecisionKind::reject'),state=none('MetroState'),messages=LS('std::SessionOutbound'),closing=none('std::SessionClose'),rejection=some('std::SessionReject','(record std::SessionReject (field std::SessionReject::status (i64 403)) (field std::SessionReject::headers (list Header)) (field std::SessionReject::body '+C('std::bytes-from-text',T('Use /metropolis/live from an allowed Origin.'))+'))')))
fn('open',[('open','Open')],'MetroDecision',IF(AND(te(V('open.path'),T('/metropolis/live')),C('origin-allowed',V('open.headers'),'(capability-call service::config std::Configuration::text (static-text "direct_origin"))','(capability-call service::config std::Configuration::text (static-text "local_origin"))')),C('emit',C('empty'),T('Connecting to your aggregate city.'),variant('std::SessionDecisionKind::accept')),C('reject')),True)
fn('resume',[('s','MetroState'),('input','MetroInput')],'MetroDecision',IF(AND(C('valid-key',V('input.token'),I(64)),C('valid-key',V('input.owner'),I(32))),LET([
 ('claim',C('claim-retry',V('input.token'),V('input.owner'),C('save-limit'),I(2))),
],emit(PATCH('MetroState',V('s'),city=IF(eq(V('claim.status'),I(1)),V('claim.saved.city'),V('s.city')),token=V('input.token'),owner=V('input.owner'),status=V('claim.status'),saved=IF(eq(V('claim.status'),I(1)),V('claim.saved.city.model.tick'),I(-1)),sentVersion=I(-1)),'City resumed. Dots and vehicles represent groups, not individual residents.')),emit(V('s'),'Invalid recovery key; no save was changed.')),True)
# A failed edit checkpoint rolls the candidate city back before sending its ack.
fn('commit',[('before','MetroState'),('city','MetroCity'),('notice','Text'),('backup','Bool')],'MetroDecision',LET([
 ('candidate',PATCH('MetroState',V('before'),city=V('city'))),('status',C('checkpoint-retry',V('candidate'),V('backup'),I(2))),
],C('emit',PATCH('MetroState',V('before'),city=IF(eq(V('status'),I(1)),V('city'),V('before.city')),status=V('status'),saved=IF(eq(V('status'),I(1)),V('city.model.tick'),V('before.saved'))),
 IF(eq(V('status'),I(1)),V('notice'),IF(eq(V('status'),I(2)),T('Another tab owns this city. Resume here to take control.'),T('Save failed; the edit was not applied. Reconnect to recover.'))),variant('std::SessionDecisionKind::continue'))),True)
fn('active',[('s','MetroState'),('c','MetroCommand')],'MetroDecision',
 IF(te(V('c.op'),T('save')),C('commit',V('s'),V('s.city'),T('City saved.'),B(False)),
 IF(te(V('c.op'),T('scenario')),IF(OR(eq(V('c.kind'),I(100000)),eq(V('c.kind'),I(250000)),eq(V('c.kind'),I(1000000))),C('commit',V('s'),PATCH('MetroCity',C('metrocity::initial',V('c.kind')),version=add(V('s.city.version'),I(1))),T('New city loaded. The previous city is kept as a backup.'),B(True)),emit(V('s'),'Choose a supported city size.')),
 IF(te(V('c.op'),T('restore')),LET([('r',C('restore',V('s')))],emit(PATCH('MetroState',V('s'),city=IF(eq(V('r.status'),I(1)),V('r.saved.city'),V('s.city')),saved=IF(eq(V('r.status'),I(1)),V('r.saved.city.model.tick'),V('s.saved')),status=IF(eq(V('r.status'),I(3)),V('s.status'),V('r.status')),sentVersion=I(-1)),'Restore request processed; a backup can be restored once.')),
 LET([('out',C('metrocity::apply',V('s.city'),V('c')))],IF(V('out.changed'),C('commit',V('s'),V('out.city'),V('out.notice'),B(False)),C('emit',V('s'),V('out.notice'),variant('std::SessionDecisionKind::continue'))))))),True)
fn('input',[('state','MetroState'),('input','MetroInput')],'MetroDecision',IF(NOT(eq(V('input.id'),add(V('state.ack'),I(1)))),emit(V('state'),'Command sequence rejected; city unchanged.'),LET([
 ('s',PATCH('MetroState',V('state'),ack=V('input.id'))),('c',V('input.action')),
],IF(te(V('c.op'),T('resume')),C('resume',V('s'),V('input')),
 IF(te(V('c.op'),T('view')),emit(PATCH('MetroState',V('s'),view=C('mesoview::view',R(x=V('c.x'),y=V('c.y'),w=V('c.x2'),h=V('c.y2'))))),
 IF(te(V('c.op'),T('sleep')),emit(PATCH('MetroState',V('s'),sleeping=eq(V('c.kind'),I(1)))),
 IF(NOT(eq(V('s.status'),I(1))),emit(V('s'),'Resume your city before editing.'),C('active',V('s'),V('c')))))))),True)
fn('tick',[('state','MetroState')],'MetroDecision',LET([
 ('s',PATCH('MetroState',V('state'),heartbeats=add(V('state.heartbeats'),I(1)))),
],IF(NOT(eq(V('s.status'),I(1))),C('quiet',V('s')),
 IF(AND(eq(rem(V('s.heartbeats'),I(20)),I(0)),NOT(C('owned',V('s')))),emit(PATCH('MetroState',V('s'),status=I(2)),'Another tab owns this city. Resume here to take control.'),
 IF(OR(V('s.city.paused'),V('s.sleeping')),C('quiet',V('s')),LET([
 ('next',PATCH('MetroState',V('s'),city=C('metrocity::tick',V('s.city')))),
],IF(le(I(20),sub(V('next.city.model.tick'),V('s.saved'))),C('commit',V('next'),V('next.city'),T(''),B(False)),emit(V('next')))))))),True)
fn('close',[('s','MetroState')],'MetroDecision',LET([('saved',IF(eq(V('s.status'),I(1)),C('checkpoint-retry',V('s'),B(False),I(2)),I(0)))],C('finish')),True)
current=G('std::option-get-or','MetroState',V('state'),C('empty'))
fn('transition',[('state','(option MetroState)'),('event','std::SessionEvent')],'MetroDecision',
 '(match (local event) (arm std::SessionEvent::open (payload open Open) '+C('open',V('open'))+') (arm std::SessionEvent::message (payload message Message) '+C('input',current,F(G('std::json-decode-or','MetroInput','(capability-call service::streams std::ByteStream::read-all '+V('message.body')+' (i64 4096))',ZERO('MetroInput',id=I(-1))),'value'))+') (arm std::SessionEvent::tick '+C('tick',current)+') (arm std::SessionEvent::peer-close (payload peer PeerClose) '+C('close',current)+') (arm std::SessionEvent::shutdown '+C('close',current)+'))',True)
D.append('''(component create service (visibility private)
 (requirement create data (interface std::DataStore) (operations std::DataStore::get std::DataStore::put std::DataStore::transaction) (limits (maximum_calls 16 calls)))
 (requirement create streams (interface std::ByteStream) (operations std::ByteStream::read-all) (limits (maximum_calls 1 calls)))
 (requirement create config (interface std::Configuration) (operations std::Configuration::text) (limits (maximum_calls 2 calls)))
 (port create live (type (task-function ((option MetroState) std::SessionEvent) MetroDecision (row (requirement data) (requirement streams) (requirement config)))) (function transition)))''')
for token,valid in [('a'*64,True),('z'*64,False),('abc',False),('../'+'a'*61,False)]:
 D.append(TEST('key-'+str(len(D)),C('valid-key',T(token),I(64)),B(valid)))
D.append(TEST('reject-cross-origin',C('origin-allowed',LS('Header',C('test-header',T('origin'),T('https://invalid.test')),C('test-header',T('host'),T('localhost'))),T('http://localhost'),T('http://127.0.0.1')),B(False)))
emit_source=__import__('native').emit
emit_source('metrosession','metro',D,tail=' (target create metropolis-live (component metro::service) (runner interactive) (port metro::service::live))')
