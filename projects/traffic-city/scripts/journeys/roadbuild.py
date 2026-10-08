"""Atomic native tunnel/portal construction. Ground and underground are distinct.

All authoring costs, bounds, occupancy restrictions and tile limits are checked
before publishing a replacement world. Construction never advances traffic.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def te(a,b):return C('std::text-equal',a,b)
fn('out',[('city','City'),('notice','Text')],'Outcome',R(city=V('city'),notice=V('notice')))
fn('valid-kind',[('kind','I64')],'Bool',OR(eq(V('kind'),I(1)),eq(V('kind'),I(2)),eq(V('kind'),I(7)),C('roads::oneway',V('kind'))))
fn('bounds',[('c','Command')],'Bool',AND(*[AND(le(I(0),V('c.'+k)),lt(V('c.'+k),I(128))) for k in ['x','y','x2','y2']],OR(eq(V('c.x'),V('c.x2')),eq(V('c.y'),V('c.y2'))),lt(add(C('game::abs',sub(V('c.x'),V('c.x2'))),C('game::abs',sub(V('c.y'),V('c.y2')))),I(64))))
fn('occupied',[('city','City'),('cell','I64'),('i','I64')],'Bool',
 IF(lt(V('i'),llen('I64',V('city.sim.ids'))),LET([('r',C('game::agent',V('city.sim.agents'),at('I64',V('city.sim.ids'),V('i'))))],
 OR(eq(V('r.cell'),V('cell')),AND(eq(V('r.state'),I(2)),OR(eq(V('r.from'),V('cell')),eq(V('r.to'),V('cell')),AND(lt(I(0),V('r.exitKey')),eq(div(sub(V('r.exitKey'),I(1)),I(8)),V('cell'))))),C('occupied',V('city'),V('cell'),add(V('i'),I(1))))),B(False)))
fn('portal-safe',[('city','City'),('id','I64')],'Bool',LET([('old',get(V('city.world.tiles'),V('id')))],
 AND(NOT(C('terrain::water',V('city'),V('id'))),OR(eq(V('old'),I(0)),C('game::road',V('old')),eq(V('old'),I(7))),
 IF(AND(NOT(eq(V('old'),I(13))),lt(I(0),V('old'))),NOT(C('occupied',V('city'),V('id'),I(0))),B(True)))))
fn('stroke',[('city','City'),('x','I64'),('y','I64'),('x2','I64'),('y2','I64'),('kind','I64'),('b','TrackBuild')],'TrackBuild',
 LET([('id',add(C('game::id',V('x'),V('y')),I(16384))),('old',get(V('city.world.tiles'),V('id'))),
 ('ok',OR(eq(V('old'),I(0)),C('valid-kind',V('old')))),
 ('clear',IF(AND(lt(I(0),V('old')),NOT(eq(V('old'),V('kind')))),NOT(C('occupied',V('city'),V('id'),I(0))),B(True))),
 ('next',R(tiles=put(V('b.tiles'),V('id'),V('kind')),cost=add(V('b.cost'),IF(eq(V('old'),V('kind')),I(0),C('roads::underground-price',V('kind')))),valid=AND(V('b.valid'),V('ok'),V('clear'))))],
 IF(lt(V('x'),V('x2')),C('stroke',V('city'),add(V('x'),I(1)),V('y'),V('x2'),V('y2'),V('kind'),V('next')),
 IF(lt(V('y'),V('y2')),C('stroke',V('city'),V('x'),add(V('y'),I(1)),V('x2'),V('y2'),V('kind'),V('next')),V('next')))))
fn('portal-signals',[('tiles','Numbers'),('entries','(list Pair)'),('i','I64'),('signals','Numbers')],'Numbers',IF(lt(V('i'),llen('Pair',V('entries'))),LET([('id',F(at('Pair',V('entries'),V('i')),'key'))],C('portal-signals',V('tiles'),V('entries'),add(V('i'),I(1)),IF(C('roads::portal',V('tiles'),V('id')),G('std::map-remove','I64 I64',V('signals'),V('id')),V('signals')))),V('signals')))
fn('publish',[('city','City'),('b','TrackBuild'),('notice','Text')],'Outcome',
 IF(NOT(V('b.valid')),C('out',V('city'),T('Tunnel portals need dry empty land or clear roads/paths. Changed underground tiles must be clear. Buildings and stations are never replaced.')),
 IF(lt(I(8192),mlen('I64 I64',V('b.tiles'))),C('out',V('city'),T('The combined ground and underground network exceeds 8,192 tiles.')),
 IF(lt(V('city.cash'),V('b.cost')),C('out',V('city'),T('Not enough funds for the complete underground construction. Nothing was changed.')),
 IF(eq(V('b.cost'),I(0)),C('out',V('city'),T('This underground network already matches.')),
 C('out',C('traffic::replace-world',V('city'),V('b.tiles'),C('portal-signals',V('b.tiles'),G('std::map-entries','I64 I64',V('city.world.signals')),I(0),V('city.world.signals')),V('b.cost'),I(0)),V('notice')))))))
fn('line',[('city','City'),('c','Command'),('portals','Bool')],'Outcome',
 IF(AND(C('bounds',V('c')),C('valid-kind',V('c.kind'))),LET([
 ('x',mn(V('c.x'),V('c.x2'))),('y',mn(V('c.y'),V('c.y2'))),('x2',mx(V('c.x'),V('c.x2'))),('y2',mx(V('c.y'),V('c.y2'))),
 ('a',C('game::id',V('x'),V('y'))),('z',C('game::id',V('x2'),V('y2'))),
 ('length',add(I(1),add(sub(V('x2'),V('x')),sub(V('y2'),V('y'))))),
 ('b',C('stroke',V('city'),V('x'),V('y'),V('x2'),V('y2'),V('c.kind'),R(tiles=V('city.world.tiles'),cost=I(0),valid=B(True)))),
 ('complete',IF(V('portals'),R(tiles=put(put(V('b.tiles'),V('a'),I(13)),V('z'),I(13)),
 cost=add(V('b.cost'),add(IF(eq(get(V('city.world.tiles'),V('a')),I(13)),I(0),I(60)),IF(eq(get(V('city.world.tiles'),V('z')),I(13)),I(0),I(60)))),
 valid=AND(V('b.valid'),le(I(3),V('length')),C('portal-safe',V('city'),V('a')),C('portal-safe',V('city'),V('z')))),V('b')))],
 C('publish',V('city'),V('complete'),IF(V('portals'),T('Tunnel built with two ground portals. Only the portals connect it to the surface.'),T('Underground network updated. Use a portal to connect it to the ground.')))),
 C('out',V('city'),T('Draw a straight underground road or footpath inside the map, at most 64 tiles. A complete tunnel needs at least three tiles.'))))
fn('portal',[('city','City'),('c','Command')],'Outcome',
 IF(AND(le(I(0),V('c.x')),lt(V('c.x'),I(128)),le(I(0),V('c.y')),lt(V('c.y'),I(128))),
 LET([('id',C('game::id',V('c.x'),V('c.y'))),('under',get(V('city.world.tiles'),add(V('id'),I(16384))))],
 C('publish',V('city'),R(tiles=put(V('city.world.tiles'),V('id'),I(13)),cost=IF(eq(get(V('city.world.tiles'),V('id')),I(13)),I(0),I(60)),valid=AND(C('valid-kind',V('under')),C('portal-safe',V('city'),V('id')))),T('Portal built. This is the only connection between the ground and underground at this tile.'))),
 C('out',V('city'),T('Choose a dry ground tile above an existing underground road or footpath.'))))
fn('command',[('city','City'),('c','Command')],'Outcome',IF(te(V('c.op'),T('build-portal')),C('portal',V('city'),V('c')),C('line',V('city'),V('c'),te(V('c.op'),T('build-tunnel')))))
emit('roadbuild','roadbuild',D)
