"""Native railway services, shared track and passenger journeys."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def test(n,a,e):D.append(TEST(n,a,e))
def line(t,id):return C('line',t,id)
def plan(t,id):return C('plan',t,id)
def setline(t,l):return PATCH('Transit',t,lines=mput('I64 RailLine',F(t,'lines'),F(l,'id'),l))
def setplan(t,id,p):return PATCH('Transit',t,plans=mput('I64 RailPlan',F(t,'plans'),id,p))
def rmplan(t,id):return PATCH('Transit',t,plans=G('std::map-remove','I64 RailPlan',F(t,'plans'),id))
fn('line',[('t','Transit'),('id','I64')],'RailLine',mget('I64 RailLine',V('t.lines'),V('id'),ZERO('RailLine')))
fn('plan',[('t','Transit'),('id','I64')],'RailPlan',mget('I64 RailPlan',V('t.plans'),V('id'),ZERO('RailPlan')))
fn('period',[('l','RailLine')],'I64',mul(add(V('l.rideTicks'),mul(sub(llen('I64',C('stops',V('l'))),I(1)),I(3))),I(2)))
fn('expense',[('l','RailLine')],'I64',add(I(2),div(add(C('distance',V('l'),V('l.from'),C('next-stop',V('l'))),I(15)),I(16))))
fn('on-line',[('l','RailLine'),('id','I64')],'Bool',le(I(0),C('index',C('path',V('l')),V('id'),I(0))))
fn('overlap',[('t','Transit'),('id','I64'),('index','I64')],'Bool',OR(lt(I(0),get(V('t.tracks'),V('id'))),IF(lt(V('index'),llen('I64',V('t.ids'))),OR(C('on-line',line(V('t'),at('I64',V('t.ids'),V('index'))),V('id')),C('overlap',V('t'),V('id'),add(V('index'),I(1)))),B(False))))
fn('water',[('city','City'),('id','I64')],'Bool',C('terrain::water',V('city'),V('id')))
fn('access',[('world','World'),('id','I64'),('d','I64')],'Bool',IF(lt(V('d'),I(4)),LET([('k',get(V('world.tiles'),C('game::neighbor',V('id'),V('d'))))],OR(C('game::road',V('k')),eq(V('k'),I(7)),C('access',V('world'),V('id'),add(V('d'),I(1))))),B(False)))
fn('corridor',[('city','City'),('a','I64'),('b','I64'),('d','I64')],'Bool',AND(NOT(C('game::building',get(V('city.world.tiles'),V('a')))),NOT(C('overlap',V('city.sim.transit'),V('a'),I(0))),IF(eq(V('a'),V('b')),B(True),C('corridor',V('city'),C('game::neighbor',V('a'),V('d')),V('b'),V('d')))))
fn('water-count',[('city','City'),('a','I64'),('b','I64'),('d','I64')],'I64',add(IF(C('water',V('city'),V('a')),I(1),I(0)),IF(eq(V('a'),V('b')),I(0),C('water-count',V('city'),C('game::neighbor',V('a'),V('d')),V('b'),V('d')))))
exec((Path(__file__).parent/'rail_network.py').read_text())
# Build a single atomic service; stations are kind 8 and are not employment destinations.
build=LET([
 ('a',C('game::id',V('c.x'),V('c.y'))),('b',C('game::id',V('c.x2'),V('c.y2'))),
 ('distance',C('game::manhattan',V('a'),V('b'))),('direction',IF(eq(V('c.y'),V('c.y2')),IF(lt(V('c.x'),V('c.x2')),I(0),I(2)),IF(lt(V('c.y'),V('c.y2')),I(1),I(3))))],
 IF(OR(lt(V('distance'),I(5)),lt(I(63),V('distance'))),R(city=V('city'),notice=T('Draw a straight rail line from 6 to 64 tiles.')),
 IF(le(I(4),llen('I64',V('city.sim.transit.ids'))),R(city=V('city'),notice=T('This preview supports four independent shuttle lines.')),
 IF(OR(NOT(eq(get(V('city.world.tiles'),V('a')),I(0))),NOT(eq(get(V('city.world.tiles'),V('b')),I(0))),C('water',V('city'),V('a')),C('water',V('city'),V('b'))),R(city=V('city'),notice=T('Both end stations need empty dry land.')),
 IF(NOT(AND(C('access',V('city.world'),V('a'),I(0)),C('access',V('city.world'),V('b'),I(0)))),R(city=V('city'),notice=T('Connect both end stations to an adjacent road or footpath.')),
 IF(NOT(C('corridor',V('city'),V('a'),V('b'),V('direction'))),R(city=V('city'),notice=T('Elevated rail can cross roads and water, but not buildings or other rail lines.')),
 LET([('cost',add(add(I(180),mul(add(V('distance'),I(1)),I(12))),mul(C('water-count',V('city'),V('a'),V('b'),V('direction')),I(24)))),
 ('id',add(V('city.sim.transit.nextId'),I(1))),('l',ZERO('RailLine',id=V('id'),a=V('a'),b=V('b'),**{'from':V('a'),'to':V('a')},dwell=I(3),cost=V('cost'),capacity=I(16),rideTicks=div(add(V('distance'),I(3)),I(4)),enabled=B(True)))],
 IF(lt(V('city.cash'),V('cost')),R(city=V('city'),notice=T('Not enough funds: rail costs $180 plus $12 per tile and $24 per water tile.')),
 LET([('world',C('game::world',put(put(V('city.world.tiles'),V('a'),I(8)),V('b'),I(8)),V('city.world.signals'),add(V('city.world.version'),I(1)))),
 ('transit',PATCH('Transit',setline(V('city.sim.transit'),V('l')),ids=append('I64',V('city.sim.transit.ids'),V('id')),nextId=V('id'),tracks=C('track-put',C('path',V('l')),I(0),V('city.sim.transit.tracks'))))],
 R(city=PATCH('City',V('city'),world=V('world'),cash=sub(V('city.cash'),V('cost')),sim=PATCH('Sim',V('city.sim'),transit=V('transit'),lookup=MP(),healthy=I(0))),notice=T('Shuttle line built. Residents compare the full walk, wait and ride time. Every departure has an operating cost.')))))))))))
fn('build',[('city','City'),('c','Command')],'Outcome',IF(AND(*[AND(le(I(0),V('c.'+k)),le(V('c.'+k),I(127))) for k in ['x','y','x2','y2']],OR(eq(V('c.x'),V('c.x2')),eq(V('c.y'),V('c.y2')))),IF(lt(I(8190),mlen('I64 I64',V('city.world.tiles'))),R(city=V('city'),notice=T('Two stations need two free tiles within the 8,192-tile preview limit.')),build),R(city=V('city'),notice=T('Invalid rail coordinates; city unchanged.'))))
fn('service',[('city','City'),('c','Command')],'Outcome',LET([('l',line(V('city.sim.transit'),V('c.x')))],IF(AND(lt(I(0),V('l.id')),OR(eq(V('c.kind'),I(0)),eq(V('c.kind'),I(1)))),R(city=PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),enabled=eq(V('c.kind'),I(1)))))),notice=IF(eq(V('c.kind'),I(1)),T('Rail service enabled. Departures require funds.'),T('Service suspended. Trains finish paid legs; waiting residents can walk.'))),R(city=V('city'),notice=T('Invalid rail service command.')))))
exec((Path(__file__).parent/'rail_pairs.py').read_text())
# Rail searches use the same cache and per-tick budget as walking and driving.
exec((Path(__file__).parent/'rail_choice.py').read_text())
fn('search',[('world','World'),('q','Numbers'),('t','Transit'),('cash','I64'),('origin','I64'),('dest','I64'),('index','I64'),('out','RailSearch')],'RailSearch',IF(lt(V('index'),llen('I64',V('t.ids'))),LET([('l',line(V('t'),at('I64',V('t.ids'),V('index')))),('next',IF(AND(V('l.enabled'),le(C('expense',V('l')),V('cash'))),C('candidate',V('world'),V('q'),V('origin'),V('dest'),V('l'),B(False),V('out')),V('out')))],C('search',V('world'),V('q'),V('t'),V('cash'),V('origin'),V('dest'),add(V('index'),I(1)),V('next'))),V('out')))
# Waiting queues are append-only on station arrival and drained in stable order.
fn('enqueue',[('m','Move'),('r','Resident'),('tick','I64')],'Move',LET([('p',plan(V('m.transit'),V('r.id'))),('l',line(V('m.transit'),V('p.line'))),('next',PATCH('RailLine',V('l'),queueA=IF(eq(V('p.board'),V('l.a')),append('I64',V('l.queueA'),V('r.id')),V('l.queueA')),queueB=IF(eq(V('p.board'),V('l.b')),append('I64',V('l.queueB'),V('r.id')),V('l.queueB'))))],PATCH('Move',V('m'),transit=setplan(setline(V('m.transit'),V('next')),V('r.id'),PATCH('RailPlan',V('p'),stage=I(2))),agents=mput('I64 Resident',V('m.agents'),V('r.id'),PATCH('Resident',V('r'),state=I(5),wait=I(0),ready=V('tick'),reason=I(10),elapsed=I(0),duration=I(0),**{'from':V('r.cell'),'to':V('r.cell')})))))
# A batch updates train riders and platform queues from one authoritative snapshot.
fn('board',[('queue','(list I64)'),('index','I64'),('l','RailLine'),('tick','I64'),('out','RailBatch')],'RailBatch',IF(lt(V('index'),llen('I64',V('queue'))),LET([
 ('id',at('I64',V('queue'),V('index'))),('r',C('game::agent',V('out.agents'),V('id'))),('p',plan(V('out.transit'),V('id'))),
 ('valid',AND(eq(V('r.state'),I(5)),eq(V('p.line'),V('l.id')),eq(V('p.board'),V('l.from')))),
 ('seat',AND(V('valid'),lt(V('out.count'),V('l.capacity')))),
 ('next',PATCH('RailBatch',V('out'),queue=IF(AND(V('valid'),NOT(V('seat'))),append('I64',V('out.queue'),V('id')),V('out.queue')),passengers=IF(V('seat'),append('I64',V('out.passengers'),V('id')),V('out.passengers')),count=add(V('out.count'),IF(V('seat'),I(1),I(0))),
 transit=IF(V('seat'),PATCH('Transit',setplan(V('out.transit'),V('id'),PATCH('RailPlan',V('p'),stage=I(3))),boardings=add(V('out.transit.boardings'),I(1))),V('out.transit')),
 agents=IF(V('seat'),mput('I64 Resident',V('out.agents'),V('id'),PATCH('Resident',V('r'),state=I(6),wait=I(0),ready=V('tick'),reason=I(11),elapsed=I(0),duration=C('railplan::ride-between',V('l'),V('p.board'),V('p.alight')),**{'from':V('p.board'),'to':V('p.alight')})),V('out.agents'))))],C('board',V('queue'),add(V('index'),I(1)),V('l'),V('tick'),V('next'))),V('out')))
fn('riders',[('l','RailLine'),('index','I64'),('arrival','Bool'),('out','RailBatch')],'RailBatch',IF(lt(V('index'),llen('I64',V('l.passengers'))),LET([
 ('id',at('I64',V('l.passengers'),V('index'))),('r',C('game::agent',V('out.agents'),V('id'))),('p',plan(V('out.transit'),V('id'))),
 ('valid',AND(eq(V('r.state'),I(6)),eq(V('p.line'),V('l.id')))),
 ('next',IF(V('valid'),PATCH('RailBatch',V('out'),transit=IF(V('arrival'),setplan(V('out.transit'),V('id'),PATCH('RailPlan',V('p'),stage=I(4))),V('out.transit')),agents=mput('I64 Resident',V('out.agents'),V('id'),IF(V('arrival'),PATCH('Resident',V('r'),state=I(1),cell=V('p.alight'),route=I(0),step=I(0),elapsed=I(0),duration=I(0),wait=I(0),reason=I(8),**{'from':V('p.alight'),'to':V('p.alight')}),PATCH('Resident',V('r'),elapsed=V('l.elapsed')))),passengers=IF(V('arrival'),V('out.passengers'),append('I64',V('out.passengers'),V('id')))),V('out')))],C('riders',V('l'),add(V('index'),I(1)),V('arrival'),V('next'))),V('out')))
# Payment happens once before boarding/departure, so an in-flight leg always finishes.
fn('step-line',[('city','City'),('l','RailLine')],'City',IF(lt(V('l.elapsed'),V('l.duration')),
 LET([('moved',PATCH('RailLine',V('l'),elapsed=add(V('l.elapsed'),I(1)))),('arrival',eq(V('moved.elapsed'),V('moved.duration'))),('batch',C('riders',V('moved'),I(0),V('arrival'),ZERO('RailBatch',transit=V('city.sim.transit'),agents=V('city.sim.agents')))),
 ('next',IF(V('arrival'),PATCH('RailLine',V('moved'),**{'from':V('moved.to')},elapsed=I(0),duration=I(0),dwell=I(3),status=I(0),passengers=LS('I64')),PATCH('RailLine',V('moved'),passengers=V('batch.passengers'))))],
 PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),agents=V('batch.agents'),transit=setline(V('batch.transit'),V('next'))))),
 IF(lt(I(1),V('l.dwell')),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),dwell=sub(V('l.dwell'),I(1)))))),
 IF(NOT(V('l.enabled')),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),status=I(3))))),
 IF(lt(V('city.cash'),C('expense',V('l'))),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),status=I(2))))),
 LET([('atA',eq(V('l.from'),V('l.a'))),('batch',C('board',IF(V('atA'),V('l.queueA'),V('l.queueB')),I(0),V('l'),add(V('city.sim.tick'),I(1)),ZERO('RailBatch',transit=V('city.sim.transit'),agents=V('city.sim.agents')))),('cost',C('expense',V('l'))),
 ('next',PATCH('RailLine',V('l'),**{'to':IF(V('atA'),V('l.b'),V('l.a'))},elapsed=I(0),duration=C('railplan::ride-between',V('l'),V('p.board'),V('p.alight')),dwell=I(0),status=I(1),departures=add(V('l.departures'),I(1)),boardings=add(V('l.boardings'),V('batch.count')),spent=add(V('l.spent'),V('cost')),passengers=V('batch.passengers'),queueA=IF(V('atA'),V('batch.queue'),V('l.queueA')),queueB=IF(V('atA'),V('l.queueB'),V('batch.queue'))))],
 PATCH('City',V('city'),cash=sub(V('city.cash'),V('cost')),sim=PATCH('Sim',V('city.sim'),agents=V('batch.agents'),transit=PATCH('Transit',setline(V('batch.transit'),V('next')),spent=add(V('batch.transit.spent'),V('cost')))))))))))
fn('tick',[('city','City'),('index','I64')],'City',IF(lt(V('index'),llen('I64',V('city.sim.transit.ids'))),C('tick',C('step-line',V('city'),line(V('city.sim.transit'),at('I64',V('city.sim.transit.ids'),V('index')))),add(V('index'),I(1))),V('city')))
fn('fallback',[('t','Transit'),('r','Resident')],'Bool',LET([('p',plan(V('t'),V('r.id'))),('l',line(V('t'),V('p.line')))],OR(eq(V('l.id'),I(0)),NOT(V('l.enabled')),AND(eq(V('l.status'),I(2)),le(C('period',V('l')),V('r.wait'))))))
# Completed or explicitly cancelled journeys release their per-journey plans.
fn('without',[('items','(list I64)'),('id','I64'),('index','I64'),('out','(list I64)')],'(list I64)',IF(lt(V('index'),llen('I64',V('items'))),LET([('item',at('I64',V('items'),V('index')))],C('without',V('items'),V('id'),add(V('index'),I(1)),IF(eq(V('item'),V('id')),V('out'),append('I64',V('out'),V('item'))))),V('out')))
fn('forget',[('t','Transit'),('id','I64')],'Transit',LET([('p',plan(V('t'),V('id'))),('l',line(V('t'),V('p.line'))),('next',rmplan(V('t'),V('id')))],IF(lt(I(0),V('l.id')),setline(V('next'),PATCH('RailLine',V('l'),queueA=C('without',V('l.queueA'),V('id'),I(0),LS('I64')),queueB=C('without',V('l.queueB'),V('id'),I(0),LS('I64')),passengers=C('without',V('l.passengers'),V('id'),I(0),LS('I64')))),V('next'))))
fn('begin',[('t','Transit'),('id','I64')],'Transit',LET([('cleaned',C('forget',V('t'),V('id')))],PATCH('Transit',V('cleaned'),choices=G('std::map-remove','I64 I64',V('t.choices'),V('id')))))
fn('choice',[('t','Transit'),('id','I64'),('mode','I64')],'Transit',PATCH('Transit',V('t'),choices=put(V('t.choices'),V('id'),V('mode'))))
fn('finish',[('t','Transit'),('id','I64')],'Transit',LET([('cleaned',rmplan(V('t'),V('id')))],PATCH('Transit',V('cleaned'),completed=add(V('t.completed'),IF(lt(I(0),F(plan(V('t'),V('id')),'line')),I(1),I(0))))))
# Replace the shuttle-only movement with ordered multi-stop service movement.
D=[d for d in D if not any(('(function create '+n+' ') in d for n in ['enqueue','riders','step-line','forget'])]
exec((Path(__file__).parent/'rail_train_v2.py').read_text())
# Generation witnesses for capacity, geometry and cost; movement integration has scenario tests.
test('rail-operating-cost',C('expense',ZERO('RailLine',a=I(0),b=I(32))),I(4))
test('rail-line-membership',C('on-line',ZERO('RailLine',a=I(128),b=I(148)),I(138)),B(True))
test('rail-line-not-diagonal',C('on-line',ZERO('RailLine',a=I(128),b=I(148)),I(10)),B(False))
exec((Path(__file__).parent/'rail_removal.py').read_text())
# Respect ordinary change-plan witness limits with coherent native modules.
import re
sets={
 'railpath':set('append-path segment path stops index distance service-direction next-stop ride queue-key travel-direction platform set-platform waiting-loop waiting track-put keys track-ids path-slice leg shares blocked'.split()),
 'railinfra':set('track-plan track-build station-build track-route create-service service-pair insert-stop add-stop'.split()),
 'railbuild':{'build','service'},
 'railplan':{'candidate','candidate-pair','candidate-bounded','search','search-bounded','boarding-cost','lower-bound','can-improve','pair','pair-positions','pair-scan','ride-between'},
 'railqueue':{'enqueue','board','riders'},
 'railboarding':{'suspend-riders','depart'},
 'railtrain':{'step-line','tick','fallback'},
 'railedit':{'intersects','intersects-path','clean-platforms','selection','clean-queue','keep-lines','keep-plans','remove-transit'},
}
owners={}
for d in D:
 m=re.search(r'\(function create ([^ ]+)',d)
 if m:owners[m.group(1)]=next((module for module,names in sets.items() if m.group(1) in names),'rail')
for module in ['railpath','rail','railinfra','railbuild','railplan','railqueue','railboarding','railtrain','railedit']:
 defs=[]
 for d in D:
  m=re.search(r'\(function create ([^ ]+)',d)
  if (owners[m.group(1)] if m else 'rail')!=module:continue
  def qualify(match):
   name=match.group(1);owner=owners.get(name)
   return '(call '+(owner+'::'+name if owner and owner!=module else name)+' '
  defs.append(re.sub(r'\(call ([^ :()]+) ',qualify,d))
 emit(module,module,defs)
