"""Author the playable aggregate mode. Python is build tooling, never a server.

A fixed, connected district lattice has cached horizontal/vertical commuter
corridors. Route bottlenecks are recomputed on edits, never per person or tick.
This is a deliberate capacity approximation, not microscopic road occupancy.
"""
from mesoscopic_view import *

TYPES['MetroCity'] = {'model':'MesoCity', 'stats':'MesoTotals', 'roads':'(list I64)', 'rails':'(list I64)',
    'version':'I64', 'cash':'I64', 'spent':'I64', 'revenue':'I64', 'paused':'Bool'}
TYPES['MetroCommand'] = {'op':'Text', **{k:'I64' for k in 'x y x2 y2 kind'.split()}}
TYPES['MetroOutcome'] = {'city':'MetroCity', 'notice':'Text', 'changed':'Bool'}
TYPES['MetroProbeInput'] = {'population':'I64', 'ticks':'I64', 'commands':'(list MetroCommand)'}

def te(a,b): return C('std::text-equal',a,b)
def between(a,low,high): return AND(le(I(low),a),le(a,I(high)))
def axis(id): return rem(add(rem(id,I(16)),div(id,I(16))),I(2))
def outcome(city,notice,changed=False): return R(city=city,notice=T(notice),changed=B(changed))

D,fn=declarations()
fn('axis',[('id','I64')],'I64',axis(V('id')))
fn('destination',[('id','I64')],'I64',IF(eq(axis(V('id')),I(0)),
 add(mul(div(V('id'),I(16)),I(16)),sub(I(15),rem(V('id'),I(16)))),
 add(mul(sub(I(15),div(V('id'),I(16))),I(16)),rem(V('id'),I(16)))))
fn('line',[('id','I64')],'I64',IF(eq(axis(V('id')),I(0)),div(V('id'),I(16)),add(I(16),rem(V('id'),I(16)))))
fn('bottleneck',[('roads','(list I64)'),('cell','I64'),('end','I64'),('stride','I64'),('capacity','I64')],'I64',
 LET([('next',lo(V('capacity'),mul(at('I64',V('roads'),V('cell')),I(3))))],
 IF(OR(eq(V('cell'),V('end')),eq(V('next'),I(0))),V('next'),
 C('bottleneck',V('roads'),add(V('cell'),V('stride')),V('end'),V('stride'),V('next')))))
fn('bind',[('c','MesoCohort'),('roads','(list I64)'),('rails','(list I64)')],'MesoCohort',LET([
 ('end',C('destination',V('c.id'))),('direction',IF(lt(V('c.id'),V('end')),I(1),I(-1))),
 ('stride',mul(V('direction'),IF(eq(axis(V('c.id')),I(0)),I(1),I(16)))),
 ('distance',div(sub(V('end'),V('c.id')),V('stride'))),
],PATCH('MesoCohort',V('c'),road=C('bottleneck',V('roads'),V('c.id'),V('end'),V('stride'),I(12)),
 rail=mul(at('I64',V('rails'),C('line',V('c.id'))),I(12)),travel=add(I(4),mul(V('distance'),I(2))))))
fn('bind-loop',[('cohorts','(list MesoCohort)'),('roads','(list I64)'),('rails','(list I64)'),('i','I64'),('out','(list MesoCohort)')],'(list MesoCohort)',
 IF(lt(V('i'),llen('MesoCohort',V('cohorts'))),C('bind-loop',V('cohorts'),V('roads'),V('rails'),add(V('i'),I(1)),append('MesoCohort',V('out'),C('bind',at('MesoCohort',V('cohorts'),V('i')),V('roads'),V('rails')))),V('out')))
fn('bind-city',[('city','MetroCity')],'MetroCity',PATCH('MetroCity',V('city'),
 model=PATCH('MesoCity',V('city.model'),cohorts=C('bind-loop',V('city.model.cohorts'),V('city.roads'),V('city.rails'),I(0),LS('MesoCohort'))),version=add(V('city.version'),I(1))))
fn('seed-list',[('i','I64'),('end','I64'),('rail','Bool'),('out','(list I64)')],'(list I64)',
 IF(lt(V('i'),V('end')),C('seed-list',add(V('i'),I(1)),V('end'),V('rail'),append('I64',V('out'),IF(V('rail'),IF(eq(rem(V('i'),I(4)),I(2)),I(1),I(0)),I(1)))),V('out')))
for id,dest,line in [(0,15,0),(1,241,17),(16,224,16),(17,30,1),(255,240,15)]:
 D.append(TEST('destination-'+str(id),C('destination',I(id)),I(dest)))
 D.append(TEST('line-'+str(id),C('line',I(id)),I(line)))
emit('metronetwork','metronetwork',D)

D,fn=declarations()
fn('refresh',[('city','MetroCity')],'MetroCity',PATCH('MetroCity',V('city'),stats=C('mesoprobe::totals',V('city.model'))))
fn('initial',[('population','I64')],'MetroCity',LET([
 ('model',C('mesocity::seed',ZERO('MesoInput',population=V('population'),groups=I(256),capacity=I(3)))),
 ('city',C('metronetwork::bind-city',ZERO('MetroCity',model=V('model'),cash=I(50000),
  roads=C('metronetwork::seed-list',I(0),I(256),B(False),LS('I64')),
  rails=C('metronetwork::seed-list',I(0),I(32),B(True),LS('I64'))))),
],C('refresh',V('city'))))
fn('tick',[('city','MetroCity')],'MetroCity',IF(V('city.paused'),V('city'),LET([
 ('model',C('mesocity::tick',V('city.model'),B(False))),('stats',C('mesoprobe::totals',V('model'))),
 ('income',mul(sub(V('stats.visits'),V('city.stats.visits')),I(2))),
],PATCH('MetroCity',V('city'),model=V('model'),stats=V('stats'),cash=add(V('city.cash'),V('income')),revenue=add(V('city.revenue'),V('income'))))))
fn('advance',[('city','MetroCity'),('left','I64')],'MetroCity',IF(lt(I(0),V('left')),C('advance',C('tick',V('city')),sub(V('left'),I(1))),V('city')))
fn('selected',[('id','I64'),('command','MetroCommand')],'Bool',AND(
 le(lo(V('command.x'),V('command.x2')),rem(V('id'),I(16))),le(rem(V('id'),I(16)),hi(V('command.x'),V('command.x2'))),
 le(lo(V('command.y'),V('command.y2')),div(V('id'),I(16))),le(div(V('id'),I(16)),hi(V('command.y'),V('command.y2')))))
fn('road-cost',[('roads','(list I64)'),('command','MetroCommand'),('i','I64'),('cost','I64')],'I64',
 IF(lt(V('i'),I(256)),C('road-cost',V('roads'),V('command'),add(V('i'),I(1)),add(V('cost'),
 IF(C('selected',V('i'),V('command')),mul(hi(I(0),sub(V('command.kind'),at('I64',V('roads'),V('i')))),I(600)),I(0)))),V('cost')))
fn('road-edit',[('roads','(list I64)'),('command','MetroCommand'),('i','I64'),('out','(list I64)')],'(list I64)',
 IF(lt(V('i'),I(256)),C('road-edit',V('roads'),V('command'),add(V('i'),I(1)),append('I64',V('out'),
 IF(C('selected',V('i'),V('command')),V('command.kind'),at('I64',V('roads'),V('i'))))),V('out')))
fn('rail-edit',[('rails','(list I64)'),('line','I64'),('kind','I64'),('i','I64'),('out','(list I64)')],'(list I64)',
 IF(lt(V('i'),I(32)),C('rail-edit',V('rails'),V('line'),V('kind'),add(V('i'),I(1)),append('I64',V('out'),IF(eq(V('i'),V('line')),V('kind'),at('I64',V('rails'),V('i'))))),V('out')))
fn('grow-loop',[('cohorts','(list MesoCohort)'),('id','I64'),('i','I64'),('out','(list MesoCohort)')],'(list MesoCohort)',
 IF(lt(V('i'),I(256)),LET([('c',at('MesoCohort',V('cohorts'),V('i')))],C('grow-loop',V('cohorts'),V('id'),add(V('i'),I(1)),append('MesoCohort',V('out'),IF(eq(V('i'),V('id')),PATCH('MesoCohort',V('c'),population=add(V('c.population'),I(1000)),home=add(V('c.home'),I(1000))),V('c'))))),V('out')))
fn('road',[('city','MetroCity'),('command','MetroCommand')],'MetroOutcome',
 IF(NOT(AND(*[between(V('command.'+k),0,15) for k in 'x y x2 y2'.split()],between(V('command.kind'),0,4),OR(eq(V('command.x'),V('command.x2')),eq(V('command.y'),V('command.y2'))))),outcome(V('city'),'Draw one straight corridor inside the city.'),
 LET([('cost',C('road-cost',V('city.roads'),V('command'),I(0),I(0)))],IF(lt(V('city.cash'),V('cost')),outcome(V('city'),'Not enough funds; no part of the corridor was changed.'),
 outcome(C('metronetwork::bind-city',PATCH('MetroCity',V('city'),roads=C('road-edit',V('city.roads'),V('command'),I(0),LS('I64')),cash=sub(V('city.cash'),V('cost')),spent=add(V('city.spent'),V('cost')))),'Corridor updated. Commuter capacity has been recomputed.',True)))))
fn('rail',[('city','MetroCity'),('command','MetroCommand')],'MetroOutcome',IF(NOT(AND(between(V('command.x'),0,15),between(V('command.y'),0,15),between(V('command.kind'),0,2))),outcome(V('city'),'Invalid line setting.'),LET([
 ('line',IF(te(V('command.op'),T('rail-h')),V('command.y'),add(I(16),V('command.x')))),
 ('cost',mul(hi(I(0),sub(V('command.kind'),at('I64',V('city.rails'),V('line')))),I(2400))),
],IF(lt(V('city.cash'),V('cost')),outcome(V('city'),'Not enough funds; the line was not changed.'),
 outcome(C('metronetwork::bind-city',PATCH('MetroCity',V('city'),rails=C('rail-edit',V('city.rails'),V('line'),V('command.kind'),I(0),LS('I64')),cash=sub(V('city.cash'),V('cost')),spent=add(V('city.spent'),V('cost')))),'Rail service updated across the whole corridor.',True)))))
fn('grow',[('city','MetroCity'),('command','MetroCommand')],'MetroOutcome',IF(NOT(AND(between(V('command.x'),0,15),between(V('command.y'),0,15))),outcome(V('city'),'Select a district inside the city.'),IF(OR(lt(V('city.cash'),I(1500)),lt(I(1000000),add(V('city.model.population'),I(1000)))),outcome(V('city'),'Growth requires $1,500 and space below one million people.'),LET([
 ('model',PATCH('MesoCity',V('city.model'),population=add(V('city.model.population'),I(1000)),cohorts=C('grow-loop',V('city.model.cohorts'),add(V('command.x'),mul(V('command.y'),I(16))),I(0),LS('MesoCohort')))),
],outcome(C('refresh',PATCH('MetroCity',V('city'),model=V('model'),cash=sub(V('city.cash'),I(1500)),spent=add(V('city.spent'),I(1500)),version=add(V('city.version'),I(1)))),'Added 1,000 people without adding resident objects.',True)))))
fn('apply',[('city','MetroCity'),('command','MetroCommand')],'MetroOutcome',
 IF(te(V('command.op'),T('pause')),outcome(PATCH('MetroCity',V('city'),paused=NOT(V('city.paused'))),'',True),
 IF(te(V('command.op'),T('road')),C('road',V('city'),V('command')),
 IF(OR(te(V('command.op'),T('rail-h')),te(V('command.op'),T('rail-v'))),C('rail',V('city'),V('command')),
 IF(te(V('command.op'),T('grow')),C('grow',V('city'),V('command')),outcome(V('city'),'Unknown edit; city unchanged.'))))))
fn('commands',[('city','MetroCity'),('commands','(list MetroCommand)'),('i','I64')],'MetroCity',IF(lt(V('i'),lo(I(64),llen('MetroCommand',V('commands')))),C('commands',F(C('apply',V('city'),at('MetroCommand',V('commands'),V('i'))),'city'),V('commands'),add(V('i'),I(1))),V('city')))
fn('run',[('input','MetroProbeInput')],'MetroCity',C('advance',C('commands',C('initial',V('input.population')),V('input.commands'),I(0)),lo(I(1024),hi(I(0),V('input.ticks')))))
D.append(TEST('diagonal-edit-is-atomic',LET([('city',C('initial',I(100000)))],F(C('road',V('city'),ZERO('MetroCommand',op=T('road'),x2=I(1),y2=I(1),kind=I(4))),'city')),C('initial',I(100000))))
D.append(TEST('initial-population',F(F(C('initial',I(100003)),'stats'),'population'),I(100003)))
D.append(TEST('negative-edit-rejected',F(C('road',C('initial',I(0)),ZERO('MetroCommand',x=I(-1))),'changed'),B(False)))
D.append('(component create probe (visibility private) (port create run (type (function (MetroProbeInput) MetroCity)) (function run)))')
emit('metrocity','metrocity',D,tail=' (target create metropolis-probe (component metrocity::probe) (runner command) (port metrocity::probe::run))')

# Viewport queries include corridors crossing the camera even when their homes
# are offscreen. This keeps zoomed-in arterial traffic visible without agents.
D,fn=declarations()
fn('visible',[('id','I64'),('view','MesoView')],'Bool',LET([
 ('end',C('metronetwork::destination',V('id'))),('x',rem(V('id'),I(16))),('y',div(V('id'),I(16))),('ex',rem(V('end'),I(16))),('ey',div(V('end'),I(16))),
],AND(lt(lo(V('x'),V('ex')),add(V('view.x'),V('view.w'))),le(V('view.x'),hi(V('x'),V('ex'))),lt(lo(V('y'),V('ey')),add(V('view.y'),V('view.h'))),le(V('view.y'),hi(V('y'),V('ey'))))))
fn('rows',[('cohorts','(list MesoCohort)'),('view','MesoView'),('i','I64'),('out','(list MesoRow)')],'(list MesoRow)',
 IF(lt(V('i'),llen('MesoCohort',V('cohorts'))),LET([('c',at('MesoCohort',V('cohorts'),V('i')))],C('rows',V('cohorts'),V('view'),add(V('i'),I(1)),IF(C('visible',V('c.id'),V('view')),append('MesoRow',V('out'),LS('I64',*[V('c.'+k) for k in 'id population home queuedOut outbound work queuedBack inbound road rail travel'.split()])),V('out')))),V('out')))
D.append(TEST('offscreen-origin-crosses-view',C('visible',I(0),R(x=I(7),y=I(0),w=I(1),h=I(1))),B(True)))
D.append(TEST('unrelated-corridor-culled',C('visible',I(0),R(x=I(7),y=I(7),w=I(1),h=I(1))),B(False)))
emit('metroview','metroview',D)
