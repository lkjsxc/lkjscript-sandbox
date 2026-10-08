"""Read-only street populations and deterministic, mode-separated sampling.

The same 128-actor budget is shared fairly. Sparse modes lend unused slots;
within each mode spread samples over the complete resident order, not its prefix.
Counts always describe the complete eligible viewport population, not samples.
"""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('visible',[('view','View'),('cell','I64')],'Bool',AND(le(V('view.x'),C('game::x',V('cell'))),lt(C('game::x',V('cell')),add(V('view.x'),V('view.w'))),le(V('view.y'),C('game::y',V('cell'))),lt(C('game::y',V('cell')),add(V('view.y'),V('view.h')))))
fn('eligible',[('tiles','Numbers'),('view','View'),('r','Resident')],'Bool',AND(eq(V('r.state'),I(2)),OR(eq(V('r.mode'),I(1)),eq(V('r.mode'),I(2)),eq(V('r.mode'),I(3))),OR(NOT(eq(V('r.from'),V('r.to'))),NOT(OR(C('game::building',get(V('tiles'),V('r.to'))),eq(get(V('tiles'),V('r.to')),I(8))))),OR(C('visible',V('view'),V('r.from')),C('visible',V('view'),V('r.to')))))
fn('collect',[('tiles','Numbers'),('agents','Residents'),('ids','(list I64)'),('view','View'),('i','I64'),('pool','StreetPool')],'StreetPool',IF(lt(V('i'),llen('I64',V('ids'))),LET([('r',C('game::agent',V('agents'),at('I64',V('ids'),V('i')))),('next',IF(C('eligible',V('tiles'),V('view'),V('r')),IF(eq(V('r.mode'),I(2)),R(walk=V('pool.walk'),cars=append('I64',V('pool.cars'),V('r.id'))),R(walk=append('I64',V('pool.walk'),V('r.id')),cars=V('pool.cars'))),V('pool')))],C('collect',V('tiles'),V('agents'),V('ids'),V('view'),add(V('i'),I(1)),V('next'))),V('pool')))
fn('walk-slots',[('walk','I64'),('cars','I64')],'I64',mn(V('walk'),mx(I(64),sub(I(128),V('cars')))))
fn('car-slots',[('walk','I64'),('cars','I64')],'I64',mn(V('cars'),sub(I(128),C('walk-slots',V('walk'),V('cars')))))
# Midpoint strata are distinct whenever count >= slots. Stable for unchanged
# snapshots, including same-cycle view/inspect/save replies; no tick RNG.
fn('sample-index',[('count','I64'),('slots','I64'),('i','I64')],'I64',IF(lt(I(0),V('slots')),div(mul(add(mul(V('i'),I(2)),I(1)),V('count')),mul(I(2),V('slots'))),I(0)))
emit('actorpool','actorpool',D)
