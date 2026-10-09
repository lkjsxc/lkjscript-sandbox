"""Synthetic interactive benchmark; small ordinary units, unchanged protocol.

There is no datastore or private-city capability. Only the final transition
owns the one-call ByteStream requirement. All city work remains native.
"""
from protocol import *
D=[]
def fn(n,p,r,b,task=False):D.append(FN(n,p,r,b,effect='(task (requirement runner::streams))' if task else 'pure'))
fn('initial',[('query','Text')],'State',LET([('rows',IF(te(V('query'),T('64')),I(64),IF(te(V('query'),T('32')),I(32),IF(te(V('query'),T('8')),I(8),I(2))))),('city',C('town::from-tiles',C('testbed::rows',I(0),V('rows'),MP()),I(100000)))],PATCH('State',C('view::empty-state'),city=PATCH('City',V('city'),paused=B(False)),status=I(1))))
emit('benchmarkseed','benchmarkseed',D)
D=[]
cont=variant('std::SessionDecisionKind::continue')
fn('message',[('state','State'),('raw','Bytes')],'Decision',LET([('command',F(G('std::json-decode-or','Command',V('raw'),ZERO('Command',op=T('view'),x2=I(30),y2=I(20))),'value'))],C('view::emit',PATCH('State',V('state'),view=C('viewdata::view',V('command'))),B(True),T(''),cont)))
emit('benchmarkmessage','benchmarkmessage',D)
D=[]
fn('tick',[('state','State')],'Decision',C('view::emit',PATCH('State',V('state'),city=C('traffic::tick',V('state.city'))),B(False),T(''),cont))
emit('benchmarktick','benchmarktick',D)
D=[]
current=G('std::option-get-or','State',V('state'),C('view::empty-state'))
fn('transition',[('state','(option State)'),('event','std::SessionEvent')],'Decision',
 '(match (local event)'
 ' (arm std::SessionEvent::open (payload open Open) '+C('view::emit',C('benchmarkseed::initial',V('open.query')),B(True),T('Synthetic city; no saves.'),variant('std::SessionDecisionKind::accept'))+')'
 ' (arm std::SessionEvent::message (payload message Message) '+C('benchmarkmessage::message',current,'(capability-call runner::streams std::ByteStream::read-all '+V('message.body')+' (i64 4096))')+')'
 ' (arm std::SessionEvent::tick '+C('benchmarktick::tick',current)+')'
 ' (arm std::SessionEvent::peer-close (payload peer PeerClose) '+C('view::finish')+')'
 ' (arm std::SessionEvent::shutdown '+C('view::finish')+'))',True)
D.append('(component create runner (visibility private) (requirement create streams (interface std::ByteStream) (operations std::ByteStream::read-all) (limits (maximum_calls 1 calls))) (port create live (type (task-function ((option State) std::SessionEvent) Decision (row (requirement streams)))) (function transition)))')
emit('benchmark','benchmark',D,tail=' (target create benchmark-live (component benchmark::runner) (runner interactive) (port benchmark::runner::live))')
