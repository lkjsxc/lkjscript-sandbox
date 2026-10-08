from protocol import *
from native import emit as write_source
import re
D=[]
def fn(n,p,r,b,task=False):D.append(FN(n,p,r,b,effect='(task (requirement service::data) (requirement service::streams) (requirement service::config))' if task else 'pure'))
def cap(op,*args):return '(capability-call service::data std::DataStore::'+op+' '+' '.join(args)+')'
def key(s):return LS('std::DataKeyPart',variant('std::DataKeyPart::Text',s))
def dec(t,b,f):return G('std::data-decode-or',t,b,f)
def enc(t,v):return G('std::data-encode',t,v)
def entry(name):return at('std::DataEntry',V(name),I(0))
def ef(name,field):return '(field '+entry(name)+' std::DataEntry::'+field+')'
def expectation(name):return IF(eq(llen('std::DataEntry',V(name)),I(0)),variant('std::DataExpectation::Missing'),variant('std::DataExpectation::Exact',ef(name,'revision')))
space='(static-text "flowgarden-v4")'
def tx(t,body,fallback):return '(match (transaction-outcome service::data (types '+t+') (outcome std::TransactionOutcome std::TransactionAbortReason std::TransactionOutcome::Committed std::TransactionOutcome::Aborted std::TransactionAbortReason::ConditionFailed std::TransactionAbortReason::Conflict) (binding save) '+body+') (arm std::TransactionOutcome::Committed (payload result '+t+') (local result)) (arm std::TransactionOutcome::Aborted (payload reason std::TransactionAbortReason) '+fallback+'))'
fn('invalid-save',[],'Saved',R(format=I(-1),owner=T(''),serial=I(0),city=ZERO('City')))
fn('hex-loop',[('bytes','Bytes'),('index','I64')],'Bool',IF(lt(V('index'),C('std::bytes-length',V('bytes'))),LET([('v',C('std::bytes-get',V('bytes'),V('index')))],AND(OR(C('town::between',V('v'),I(48),I(57)),C('town::between',V('v'),I(97),I(102))),C('hex-loop',V('bytes'),add(V('index'),I(1))))),B(True)))
fn('token-valid',[('token','Text'),('length','I64')],'Bool',AND(eq(C('std::text-length',V('token')),V('length')),C('hex-loop',C('std::bytes-from-text',V('token')),I(0))))
fn('save-limit',[],'I64',LET([('n',F(G('std::json-decode-or','I64',C('std::bytes-from-text','(capability-call service::config std::Configuration::text (static-text \"saved_city_limit\"))'.replace('\\\"','\"')),I(0)),'value'))],IF(C('town::between',V('n'),I(1),I(4096)),V('n'),I(0))),True)
fn('claim',[('token','Text'),('owner','Text'),('limit','I64')],'Claim',tx('Claim',LET([('key',key(V('token'))),('entries',cap('get',space,V('key'))),('missing',eq(llen('std::DataEntry',V('entries')),I(0))),('saved',IF(V('missing'),R(format=I(9),owner=T(''),serial=I(0),city=C('town::initial')),C('migrate::decode',ef('entries','value')))),('registry',cap('get',space,key(T('registry')))),('count',IF(eq(llen('std::DataEntry',V('registry')),I(0)),I(0),dec('I64',ef('registry','value'),I(-1))))],IF(OR(NOT(eq(V('saved.format'),I(9))),AND(V('missing'),OR(lt(V('count'),I(0)),eq(V('limit'),I(0))))),R(status=I(3),saved=V('saved')),IF(AND(V('missing'),le(V('limit'),V('count'))),R(status=I(4),saved=V('saved')),LET([('bound',PATCH('Saved',V('saved'),owner=V('owner'),serial=add(V('saved.serial'),I(1)),city=PATCH('City',V('saved.city'),world=C('game::cache-world',V('saved.city.world'))))),('registered',IF(V('missing'),cap('put',space,key(T('registry')),enc('I64',add(V('count'),I(1))),expectation('registry')),B(True))),('put',cap('put',space,V('key'),enc('Saved',V('bound')),expectation('entries')))],R(status=IF(AND(V('registered'),V('put')),I(1),I(5)),saved=V('bound')))))),R(status=I(5),saved=C('invalid-save'))),True)
fn('checkpoint',[('state','State')],'I64',tx('I64',LET([('key',key(V('state.token'))),('entries',cap('get',space,V('key')))],IF(eq(llen('std::DataEntry',V('entries')),I(0)),I(3),LET([('saved',C('migrate::decode',ef('entries','value')))],IF(NOT(eq(V('saved.format'),I(9))),I(3),IF(NOT(te(V('saved.owner'),V('state.owner'))),I(2),IF(cap('put',space,V('key'),enc('Saved',R(format=I(9),owner=V('state.owner'),serial=add(V('saved.serial'),I(1)),city=V('state.city'))),expectation('entries')),I(1),I(5))))))),I(5)),True)
fn('claim-retry',[('token','Text'),('owner','Text'),('remaining','I64'),('limit','I64')],'Claim',LET([('result',C('claim',V('token'),V('owner'),V('limit')))],IF(AND(eq(V('result.status'),I(5)),lt(I(0),V('remaining'))),C('claim-retry',V('token'),V('owner'),sub(V('remaining'),I(1)),V('limit')),V('result'))),True)
fn('checkpoint-retry',[('state','State'),('remaining','I64')],'I64',LET([('result',C('checkpoint',V('state')))],IF(AND(eq(V('result'),I(5)),lt(I(0),V('remaining'))),C('checkpoint-retry',V('state'),sub(V('remaining'),I(1))),V('result'))),True)
fn('owned',[('state','State')],'Bool',LET([('entries',cap('get',space,key(V('state.token'))))],IF(eq(llen('std::DataEntry',V('entries')),I(0)),B(False),LET([('saved',C('migrate::decode',ef('entries','value')))],AND(eq(V('saved.format'),I(9)),te(V('saved.owner'),V('state.owner')))))),True)
# The checked-in native declaration input owns the established Origin policy.
# Preserve it exactly without depending on a standalone repository's Git paths
# or private history. This also works from a source archive without .git.
origin_source=ROOT/'src'/'session-origin.lkjc'
old=(origin_source if origin_source.exists() else ROOT/'src'/'session.lkjc').read_text()
for name in ['find-header','origin-allowed','test-header']:
 start=old.index('  (function create '+name+' ');depth=0;quoted=False;escaped=False
 for i in range(start, len(old)):
  c=old[i]
  if quoted:
   if escaped:escaped=False
   elif c=='\\':escaped=True
   elif c=='"':quoted=False
  elif c=='"':quoted=True
  elif c=='(':depth+=1
  elif c==')':
   depth-=1
   if depth==0:D.append(old[start:i+1]+'\n');break
fn('reject',[('message','Text')],'Decision',R(kind=variant('std::SessionDecisionKind::reject'),state=none('State'),messages=LS('std::SessionOutbound'),closing=none('std::SessionClose'),rejection=some('std::SessionReject','(record std::SessionReject (field std::SessionReject::status (i64 403)) (field std::SessionReject::headers (list Header)) (field std::SessionReject::body '+C('std::bytes-from-text',V('message'))+'))')))
cont=variant('std::SessionDecisionKind::continue')
def emit(state,notice=T(''),reset=B(False)):return C('view::emit',state,reset,notice,cont)
fn('open',[('open','Open')],'Decision',IF(AND(te(V('open.path'),T('/live')),C('origin-allowed',V('open.headers'),'(capability-call service::config std::Configuration::text (static-text "direct_origin"))','(capability-call service::config std::Configuration::text (static-text "local_origin"))')),C('view::emit',C('view::empty-state'),B(True),T('Resuming your saved city…'),variant('std::SessionDecisionKind::accept')),C('reject',T('Use /live from an allowed Origin.'))),True)
fn('save-state',[('state','State'),('notice','Text')],'Decision',LET([('status',C('checkpoint-retry',V('state'),I(2)))],emit(PATCH('State',V('state'),status=V('status'),saved=IF(eq(V('status'),I(1)),V('state.city.sim.tick'),V('state.saved'))),IF(eq(V('status'),I(1)),V('notice'),IF(eq(V('status'),I(2)),T('Another tab is controlling this city. Resume here to take over.'),T('Save could not be committed. Your previous saved city is retained. Reconnect to recover.'))))),True)
fn('resume',[('state','State'),('input','Input')],'Decision',IF(AND(C('token-valid',V('input.token'),I(64)),C('token-valid',V('input.owner'),I(32))),LET([('claim',C('claim-retry',V('input.token'),V('input.owner'),I(2),C('save-limit')))],emit(PATCH('State',V('state'),city=IF(eq(V('claim.status'),I(1)),V('claim.saved.city'),V('state.city')),token=V('input.token'),owner=V('input.owner'),status=V('claim.status'),saved=IF(eq(V('claim.status'),I(1)),V('claim.saved.city.sim.tick'),I(-1)),mapVersion=I(-1),ack=V('input.id'),undo=IF(eq(V('claim.status'),I(1)),C('has-undo',V('input.token')),B(False)),lab=C('labbase::empty'),quote=ZERO('EditQuote'),management=I(0),confirmation=I(0)),IF(eq(V('claim.status'),I(1)),T('City restored. Changes save automatically; only this tab may write.'),IF(eq(V('claim.status'),I(4)),T('Saved-city capacity reached. Existing cities are preserved; the host can raise the saved-city limit.'),IF(eq(V('claim.status'),I(3)),T('Saved city needs recovery. It has not been replaced.'),T('City was claimed concurrently. Retry Resume.')))),B(True))),emit(PATCH('State',V('state'),ack=V('input.id')),T('Invalid recovery key; no city was changed.'))),True)
# Management callbacks share the same data requirement and transactions.
exec((Path(__file__).parent/'management.py').read_text())
exec((Path(__file__).parent/'lab_session.py').read_text())
# Commands carry sequence numbers; every accepted mutation is durable before its acknowledgement.
fn('input',[('state','State'),('input','Input')],'Decision',IF(NOT(eq(V('input.id'),add(V('state.ack'),I(1)))),emit(V('state'),T('Command sequence rejected; city unchanged.')),IF(te(V('input.action.op'),T('resume')),C('resume',V('state'),V('input')),LET([('s',PATCH('State',V('state'),ack=V('input.id'))),('command',V('input.action'))],IF(te(V('command.op'),T('view')),emit(PATCH('State',V('s'),view=C('viewdata::view',V('command'))),T(''),B(True)),IF(te(V('command.op'),T('inspect')),emit(PATCH('State',V('s'),selection=IF(lt(I(0),V('command.kind')),V('command.kind'),C('viewdata::selected',C('labbase::shown',V('state.city'),V('state.lab')),add(mul(IF(eq(V('command.x2'),I(1)),I(1),I(0)),I(16384)),C('game::id',mn(I(127),mx(I(0),V('command.x'))),mn(I(127),mx(I(0),V('command.y'))))),I(0))))),IF(NOT(eq(V('state.status'),I(1))),emit(V('s'),T('Resume your city before editing.')),IF(OR(lt(I(0),V('s.lab.phase')),te(V('command.op'),T('lab-start'))),C('lab-active',V('s'),V('command')),C('active-input',V('s'),V('command'))))))))),True)
fn('tick',[('state','State')],'Decision',IF(NOT(eq(V('state.status'),I(1))),emit(V('state')),LET([('activeLab',lt(I(0),V('state.lab.phase'))),('city',IF(OR(V('activeLab'),V('state.city.paused')),V('state.city'),C('traffic::tick',V('state.city')))),('lab',IF(V('activeLab'),C('labstep::advance',V('state.lab'),V('city')),V('state.lab'))),('s',PATCH('State',V('state'),city=V('city'),lab=V('lab'),mapVersion=IF(eq(V('lab.phase'),V('state.lab.phase')),V('state.mapVersion'),I(-1))))],IF(le(I(10),sub(V('city.sim.tick'),V('state.saved'))),C('save-state',V('s'),T('')),IF(AND(eq(mod(V('state.seq'),I(10)),I(0)),NOT(C('owned',V('state')))),emit(PATCH('State',V('s'),status=I(2)),T('Another tab took control. Resume here to take over.')),emit(V('s')))))),True)
fn('close',[('state','State')],'Decision',LET([('saved',IF(eq(V('state.status'),I(1)),C('checkpoint',V('state')),I(0)))],C('view::finish')),True)
fn('invalid',[],'Input',R(id=I(-1),action=ZERO('Command'),token=T(''),owner=T('')))
current=G('std::option-get-or','State',V('state'),C('view::empty-state'))
fn('transition',[('state','(option State)'),('event','std::SessionEvent')],'Decision','(match (local event) (arm std::SessionEvent::open (payload open Open) '+C('open',V('open'))+') (arm std::SessionEvent::message (payload message Message) '+C('input',current,F(G('std::json-decode-or','Input','(capability-call service::streams std::ByteStream::read-all '+V('message.body')+' (i64 4096))',C('invalid')),'value'))+') (arm std::SessionEvent::tick '+C('tick',current)+') (arm std::SessionEvent::peer-close (payload peer PeerClose) '+C('close',current)+') (arm std::SessionEvent::shutdown '+C('close',current)+'))',True)
D.append('''(component create service (visibility private)
 (requirement create data (interface std::DataStore) (operations std::DataStore::get std::DataStore::put std::DataStore::transaction) (limits (maximum_calls 16 calls)))
 (requirement create streams (interface std::ByteStream) (operations std::ByteStream::read-all) (limits (maximum_calls 1 calls)))
 (requirement create config (interface std::Configuration) (operations std::Configuration::text) (limits (maximum_calls 2 calls)))
 (port create live (type (task-function ((option State) std::SessionEvent) Decision (row (requirement data) (requirement streams) (requirement config)))) (function transition)))''')
D.append(TEST('reject-short-city-key',C('token-valid',T('abc'),I(64)),B(False)))
D.append(TEST('reject-path-city-key',C('token-valid',T('../x'),I(4)),B(False)))
exec((Path(__file__).parent/'session_modules.py').read_text())
