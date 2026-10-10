from native import *
D=[]
def fn(n,p,r,b,private=False):D.append(FN(n,p,r,b,private))
def test(n,a,e):D.append(TEST(n,a,e))
# Deterministic scalar and sparse-map operations.
fn('get',[('values','Numbers'),('id','I64')],'I64',mget('I64 I64',V('values'),V('id'),I(0)))
fn('put',[('values','Numbers'),('id','I64'),('value','I64')],'Numbers',mput('I64 I64',V('values'),V('id'),V('value')))
fn('qput',[('values','Numbers'),('id','I64'),('value','I64')],'Numbers',IF(le(V('value'),I(0)),G('std::map-remove','I64 I64',V('values'),V('id')),put(V('values'),V('id'),V('value'))))
fn('bump',[('values','Numbers'),('id','I64'),('amount','I64')],'Numbers',C('qput',V('values'),V('id'),add(get(V('values'),V('id')),V('amount'))))
fn('min',[('a','I64'),('b','I64')],'I64',IF(lt(V('a'),V('b')),V('a'),V('b')))
fn('max',[('a','I64'),('b','I64')],'I64',IF(lt(V('a'),V('b')),V('b'),V('a')))
fn('mod',[('a','I64'),('b','I64')],'I64',sub(V('a'),mul(div(V('a'),V('b')),V('b'))))
fn('abs',[('a','I64')],'I64',IF(lt(V('a'),I(0)),sub(I(0),V('a')),V('a')))
fn('id',[('x','I64'),('y','I64')],'I64',add(V('x'),mul(V('y'),I(128))))
fn('x',[('id','I64')],'I64',sub(V('id'),mul(div(V('id'),I(128)),I(128))))
fn('y',[('id','I64')],'I64',LET([('row',div(V('id'),I(128)))],sub(V('row'),mul(div(V('row'),I(128)),I(128)))))
fn('road',[('kind','I64')],'Bool',IF(le(V('kind'),I(2)),le(I(1),V('kind')),AND(le(I(9),V('kind')),le(V('kind'),I(13)))))
fn('building',[('kind','I64')],'Bool',AND(le(I(3),V('kind')),le(V('kind'),I(6))))
fn('neighbor',[('id','I64'),('direction','I64')],'I64',C('roads::neighbor',V('id'),V('direction')))
fn('direction',[('a','I64'),('b','I64')],'I64',IF(eq(add(V('a'),I(1)),V('b')),I(0),IF(eq(add(V('a'),I(128)),V('b')),I(1),IF(eq(sub(V('a'),I(1)),V('b')),I(2),I(3)))))
fn('manhattan',[('a','I64'),('b','I64')],'I64',add(C('abs',sub(C('x',V('a')),C('x',V('b')))),C('abs',sub(C('y',V('a')),C('y',V('b'))))))
fn('junction-key',[('world','World'),('cell','I64')],'I64',IF(lt(V('cell'),I(16384)),V('cell'),IF(C('roads::portal',V('world.tiles'),V('cell')),sub(V('cell'),I(16384)),V('cell'))))
fn('degree',[('tiles','Numbers'),('id','I64')],'I64',C('roads::degree',V('tiles'),V('id')))
fn('capacity',[('kind','I64')],'I64',IF(C('road',V('kind')),IF(eq(V('kind'),I(2)),I(2),I(1)),IF(eq(V('kind'),I(4)),I(16),IF(eq(V('kind'),I(5)),I(8),I(12)))))
fn('storage',[('kind','I64')],'I64',IF(C('road',V('kind')),I(3),IF(C('building',V('kind')),C('capacity',V('kind')),I(0))))
fn('price',[('kind','I64')],'I64',IF(C('roads::oneway',V('kind')),I(12),IF(eq(V('kind'),I(13)),I(60),IF(eq(V('kind'),I(1)),I(8),IF(eq(V('kind'),I(2)),I(24),IF(eq(V('kind'),I(3)),I(70),IF(eq(V('kind'),I(4)),I(140),IF(eq(V('kind'),I(5)),I(110),IF(eq(V('kind'),I(6)),I(90),IF(eq(V('kind'),I(7)),I(4),I(0)))))))))))
fn('lane-key',[('cell','I64'),('direction','I64'),('lane','I64')],'I64',add(mul(V('cell'),I(8)),add(mul(V('direction'),I(2)),V('lane'))))
fn('lane',[('kind','I64'),('id','I64')],'I64',IF(eq(V('kind'),I(2)),mod(V('id'),I(2)),I(0)))
fn('phase',[('tick','I64')],'I64',LET([('t',mod(V('tick'),I(16)))],IF(OR(eq(V('t'),I(7)),eq(V('t'),I(15))),I(-1),IF(lt(V('t'),I(7)),I(0),I(1)))))
fn('mask-conflict',[('a','I64'),('b','I64')],'Bool',OR(*[AND(eq(mod(div(V('a'),I(bit)),I(2)),I(1)),eq(mod(div(V('b'),I(bit)),I(2)),I(1))) for bit in [1,2,4,8]]))
base=[(4,6,7),(8,12,14),(1,9,13),(2,3,11)]
mask=I(15)
for direction in reversed(range(4)):
 right,straight,left=base[direction]
 val=IF(eq(mod(sub(add(V('outgoing'),I(4)),V('incoming')),I(4)),I(1)),I(right),IF(eq(V('incoming'),V('outgoing')),I(straight),IF(eq(mod(sub(add(V('outgoing'),I(4)),V('incoming')),I(4)),I(3)),I(left),I(15))))
 mask=IF(eq(V('incoming'),I(direction)),val,mask)
fn('movement-mask',[('incoming','I64'),('outgoing','I64')],'I64',mask)
fn('signal-allows',[('control','I64'),('direction','I64'),('wait','I64'),('tick','I64')],'Bool',IF(eq(V('control'),I(0)),B(True),IF(eq(V('control'),I(1)),eq(mod(V('direction'),I(2)),C('phase',V('tick'))),OR(eq(mod(V('direction'),I(2)),sub(V('control'),I(2))),le(I(4),V('wait'))))))
# A topology pass caches static lists and the compact overview, never traffic per frame.
fn('world-loop',[('world','World'),('entries','(list Pair)'),('index','I64')],'World',IF(lt(V('index'),llen('Pair',V('entries'))),LET([('entry',at('Pair',V('entries'),V('index'))),('id',V('entry.key')),('kind',V('entry.value'))],C('world-loop',PATCH('World',V('world'),ids=append('I64',V('world.ids'),V('id')),homes=IF(eq(V('kind'),I(3)),append('I64',V('world.homes'),V('id')),V('world.homes')),jobs=IF(eq(V('kind'),I(4)),append('I64',V('world.jobs'),V('id')),V('world.jobs')),shops=IF(eq(V('kind'),I(5)),append('I64',V('world.shops'),V('id')),V('world.shops')),parks=IF(eq(V('kind'),I(6)),append('I64',V('world.parks'),V('id')),V('world.parks')),junctions=IF(C('roads::junction',V('world.tiles'),V('id')),put(V('world.junctions'),V('id'),I(1)),V('world.junctions')),overview=append('I64',V('world.overview'),add(mul(V('id'),I(16)),V('kind')))),V('entries'),add(V('index'),I(1)))),V('world')))
fn('world',[('tiles','Numbers'),('signals','Numbers'),('version','I64')],'World',C('cache-world',C('world-loop',ZERO('World',tiles=V('tiles'),signals=V('signals'),version=V('version')),G('std::map-entries','I64 I64',V('tiles')),I(0))))
fn('empty-route',[],'Route',ZERO('Route',cost=I(-1),version=I(-1)))
fn('empty-agent',[],'Resident',ZERO('Resident',id=I(-1),home=I(-1),job=I(-1),dest=I(-1),cell=I(-1),reason=I(1)))
fn('agent',[('agents','Residents'),('id','I64')],'Resident',mget('I64 Resident',V('agents'),V('id'),C('empty-agent')))
fn('route',[('routes','Routes'),('id','I64')],'Route',mget('I64 Route',V('routes'),V('id'),C('empty-route')))
fn('empty-sim',[],'Sim',ZERO('Sim',nextId=I(1),nextRoute=I(1)))
# Weighted shortest paths with integer A* buckets. No per-car global search each tick.
fn('passable',[('tiles','Numbers'),('id','I64'),('origin','I64'),('dest','I64'),('mode','I64')],'Bool',C('roads::passable',V('tiles'),V('id'),V('origin'),V('dest'),V('mode')))
# Door-to-door car access and parking are actual timed phases.
fn('car-access-time',[],'I64',I(12))
fn('edge-time',[('world','World'),('cell','I64'),('mode','I64')],'I64',IF(eq(V('mode'),I(1)),I(4),LET([('kind',get(V('world.tiles'),V('cell')))],IF(eq(V('kind'),I(1)),I(2),IF(AND(le(I(9),V('kind')),le(V('kind'),I(13))),I(2),I(1))))))
fn('edge-estimate-uncached',[('world','World'),('q','Numbers'),('cell','I64'),('mode','I64')],'I64',add(C('edge-time',V('world'),V('cell'),V('mode')),IF(eq(V('mode'),I(2)),add(IF(eq(get(V('world.junctions'),V('cell')),I(1)),I(2),I(0)),mn(I(8),div(get(V('q'),V('cell')),mx(I(1),C('capacity',get(V('world.tiles'),V('cell'))))))),I(0))))
fn('edge-estimate',[('world','World'),('q','Numbers'),('cell','I64'),('mode','I64')],'I64',
 IF(eq(V('mode'),I(1)),I(4),LET([('entry',get(V('world.junctions'),sub(I(-1024),V('cell'))))],
 IF(AND(lt(I(0),V('entry')),eq(get(V('world.junctions'),I(-258)),I(3))),
 LET([('meta',div(sub(V('entry'),I(1)),I(1048576)))],
 add(mod(V('meta'),I(16)),mn(I(8),div(get(V('q'),V('cell')),div(V('meta'),I(16)))))),
 C('edge-estimate-uncached',V('world'),V('q'),V('cell'),V('mode'))))))
# Per-query admissible axis bounds: every horizontal/vertical crossing must pay
# at least the cheapest admissible entry in that column/row. This remains a lower
# bound with walls, junction costs, footpaths and queues; no weighted-A* shortcut.
fn('axis-scan',[('world','World'),('index','I64'),('axis','Axis')],'Axis',IF(lt(V('index'),llen('I64',V('world.ids'))),LET([('id',at('I64',V('world.ids'),V('index'))),('kind',get(V('world.tiles'),V('id'))),('x',C('x',V('id'))),('y',C('y',V('id'))),('cost',add(IF(C('roads::slow',V('kind')),I(2),I(1)),IF(eq(get(V('world.junctions'),V('id')),I(1)),I(2),I(0)))),('cx',get(V('axis.columns'),V('x'))),('cy',get(V('axis.rows'),V('y')))],C('axis-scan',V('world'),add(V('index'),I(1)),IF(lt(I(0),V('kind')),R(columns=IF(OR(eq(V('cx'),I(0)),lt(V('cost'),V('cx'))),put(V('axis.columns'),V('x'),V('cost')),V('axis.columns')),rows=IF(OR(eq(V('cy'),I(0)),lt(V('cost'),V('cy'))),put(V('axis.rows'),V('y'),V('cost')),V('axis.rows'))),V('axis')))),V('axis')))
fn('axis-prefix',[('values','Numbers'),('index','I64'),('sum','I64'),('result','Numbers')],'Numbers',IF(lt(V('index'),I(128)),LET([('sum2',add(V('sum'),mx(I(1),get(V('values'),V('index')))))],C('axis-prefix',V('values'),add(V('index'),I(1)),V('sum2'),put(V('result'),V('index'),V('sum2')))),V('result')))
# Keep the v4 saved City shape stable. Nonnegative keys in world.junctions
# identify junctions; reserved -1..-256 hold derived X/Y prefix bounds and -257
# marks their presence. These derived entries never enter the tile/view protocol.
fn('cache-pack',[('x','Numbers'),('y','Numbers'),('index','I64'),('cache','Numbers')],'Numbers',IF(lt(V('index'),I(128)),C('cache-pack',V('x'),V('y'),add(V('index'),I(1)),put(put(V('cache'),sub(I(-1),V('index')),get(V('x'),V('index'))),sub(I(-129),V('index')),get(V('y'),V('index')))),put(V('cache'),I(-257),I(1))))
fn('cache-world',[('world','World')],'World',
 IF(AND(eq(get(V('world.junctions'),I(-257)),I(1)),eq(get(V('world.junctions'),I(-258)),I(3))),V('world'),
 LET([('axis',C('axis-scan',V('world'),I(0),ZERO('Axis'))),
      ('hx',C('axis-prefix',V('axis.columns'),I(0),I(0),MP())),('hy',C('axis-prefix',V('axis.rows'),I(0),I(0),MP()))],
 PATCH('World',V('world'),junctions=C('roadcache::build',V('world.tiles'),V('world.ids'),I(0),C('cache-pack',V('hx'),V('hy'),I(0),V('world.junctions')))))))

fn('prefix-get',[('cache','Numbers'),('axis','I64'),('index','I64')],'I64',IF(lt(V('index'),I(0)),I(0),get(V('cache'),sub(sub(I(-1),mul(V('axis'),I(128))),V('index')))))
fn('axis-distance',[('prefix','Numbers'),('a','I64'),('b','I64'),('axis','I64')],'I64',IF(le(V('a'),V('b')),sub(C('prefix-get',V('prefix'),V('axis'),V('b')),C('prefix-get',V('prefix'),V('axis'),V('a'))),sub(C('prefix-get',V('prefix'),V('axis'),sub(V('a'),I(1))),C('prefix-get',V('prefix'),V('axis'),sub(V('b'),I(1))))))
fn('heuristic',[('cell','I64'),('dest','I64'),('mode','I64'),('hx','Numbers'),('hy','Numbers')],'I64',IF(eq(V('mode'),I(1)),mul(C('manhattan',V('cell'),V('dest')),I(4)),add(C('axis-distance',V('hx'),C('x',V('cell')),C('x',V('dest')),I(0)),C('axis-distance',V('hy'),C('y',V('cell')),C('y',V('dest')),I(1)))))
fn('can-step',[('tiles','Numbers'),('from','I64'),('to','I64'),('origin','I64'),('dest','I64'),('mode','I64')],'Bool',C('roads::can-step',V('tiles'),V('from'),V('to'),V('origin'),V('dest'),V('mode')))
from frontier import SEARCH_TYPE, add_frontier
add_frontier(fn)
from relaxed_frontier import add_relaxed_frontier
add_relaxed_frontier(fn)
fn('route-signature',[('origin','I64'),('dest','I64'),('mode','I64')],'I64',add(mul(V('origin'),I(65536)),add(mul(V('dest'),I(2)),sub(V('mode'),I(1)))))
fn('ensure-route',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('mode','I64'),('p','Plan')],'Plan',LET([('signature',C('route-signature',V('origin'),V('dest'),V('mode'))),('known',get(V('p.lookup'),V('signature'))),('route',C('route',V('p.routes'),V('known')))],IF(AND(lt(I(0),V('known')),eq(V('route.version'),V('world.version')),eq(V('route.origin'),V('origin')),eq(V('route.dest'),V('dest')),eq(V('route.mode'),V('mode'))),PATCH('Plan',V('p'),id=V('known')),IF(le(V('p.budget'),I(0)),PATCH('Plan',V('p'),id=I(0)),LET([('route2',C('find-commute-route',V('world'),V('q'),V('origin'),V('dest'),V('mode'))),('bound',PATCH('Route',V('route2'),version=V('world.version'),origin=V('origin'),dest=V('dest'),mode=V('mode')))],PATCH('Plan',V('p'),routes=mput('I64 Route',V('p.routes'),V('p.nextRoute'),V('bound')),lookup=put(V('p.lookup'),V('signature'),V('p.nextRoute')),nextRoute=add(V('p.nextRoute'),I(1)),budget=sub(V('p.budget'),I(1)),id=V('p.nextRoute')))))))
fn('estimate-loop',[('world','World'),('q','Numbers'),('route','Route'),('index','I64'),('cost','I64')],'I64',IF(lt(V('index'),llen('I64',V('route.path'))),C('estimate-loop',V('world'),V('q'),V('route'),add(V('index'),I(1)),add(V('cost'),C('edge-estimate',V('world'),V('q'),at('I64',V('route.path'),V('index')),V('route.mode')))),V('cost')))
# Walking edges always cost four cycles; do not rescan a whole cached path.
fn('estimate',[('world','World'),('q','Numbers'),('route','Route')],'I64',IF(lt(V('route.cost'),I(0)),I(-1),IF(eq(V('route.mode'),I(1)),mul(mx(I(0),sub(llen('I64',V('route.path')),I(1))),I(4)),C('estimate-loop',V('world'),V('q'),V('route'),I(1),IF(eq(V('route.mode'),I(2)),mul(I(2),C('car-access-time')),I(0))))))
fn('choose-mode',[('walk','I64'),('car','I64')],'I64',IF(lt(V('walk'),I(0)),IF(lt(V('car'),I(0)),I(0),I(2)),IF(OR(lt(V('car'),I(0)),le(V('walk'),V('car'))),I(1),I(2))))
# Tests for topology boundaries, directional conflict and mode choice.
test('no-row-wrap',C('neighbor',I(127),I(0)),I(-1));test('north-boundary',C('neighbor',I(1),I(3)),I(-1))
test('opposed-straights-compatible',C('mask-conflict',C('movement-mask',I(0),I(0)),C('movement-mask',I(2),I(2))),B(False))
test('crossing-straights-conflict',C('mask-conflict',C('movement-mask',I(0),I(0)),C('movement-mask',I(1),I(1))),B(True))
test('left-turn-yields',C('mask-conflict',C('movement-mask',I(0),I(3)),C('movement-mask',I(2),I(2))),B(True))
for n,w,c,e in [('near-walk',12,15,1),('far-drive',80,36,2),('jam-walk',28,40,1),('unreachable-car',20,-1,1),('unreachable-both',-1,-1,0)]:test(n,C('choose-mode',I(w),I(c)),I(e))
# Cached walking estimates retain empty, singleton and unreachable semantics.
for label,path,cost,expected in [('empty',[],0,0),('singleton',[7],0,0),('path',[0,1,129,130],99,12),('unreachable',[0,1],-1,-1)]:
 test('walk-estimate-'+label,C('estimate',ZERO('World'),MP(),ZERO('Route',mode=I(1),path=LS('I64',*[I(x) for x in path]),cost=I(cost))),I(expected))
# Movement and population functions are appended by simulation.py.

fn('mask-union',[('a','I64'),('b','I64'),('bit','I64')],'I64',IF(lt(V('bit'),I(16)),add(IF(OR(eq(mod(div(V('a'),V('bit')),I(2)),I(1)),eq(mod(div(V('b'),V('bit')),I(2)),I(1))),V('bit'),I(0)),C('mask-union',V('a'),V('b'),mul(V('bit'),I(2)))),I(0)))
fn('mask-union-put',[('values','Numbers'),('key','I64'),('mask','I64')],'Numbers',put(V('values'),V('key'),C('mask-union',get(V('values'),V('key')),V('mask'),I(1))))
fn('reserve-space',[('values','Numbers'),('source','I64'),('target','I64'),('oldExit','I64'),('newExit','I64')],'Numbers',LET([('a',C('bump',C('bump',V('values'),V('source'),I(-1)),V('target'),I(1))),('b',IF(lt(I(0),V('oldExit')),C('bump',V('a'),sub(V('oldExit'),I(1)),I(-1)),V('a')))],IF(lt(I(0),V('newExit')),C('bump',V('b'),sub(V('newExit'),I(1)),I(1)),V('b'))))

junction_start = len(D)
from junction_flow import add_junction_flow
add_junction_flow(fn, test)
