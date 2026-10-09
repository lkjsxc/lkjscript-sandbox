"""Sparse monetary settlement over native movement/boarding events.

Arrival IDs are a tick-local journal, not saved data. Boarding candidates come
from at most four bounded trains, and only when the boarding counter advances.
A set unifies both sources so one resident can be charged at most once.
The predecessor's full resident scan remains intact in moneyflow::settle.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def inc(e,k,value):return add(F(e,k),value)
fn('add',[('ids','(list I64)'),('index','I64'),('out','Numbers')],'Numbers',IF(lt(V('index'),llen('I64',V('ids'))),C('add',V('ids'),add(V('index'),I(1)),put(V('out'),at('I64',V('ids'),V('index')),I(1))),V('out')))
fn('riders',[('transit','Transit'),('index','I64'),('out','Numbers')],'Numbers',IF(lt(V('index'),llen('I64',V('transit.ids'))),LET([('line',C('rail::line',V('transit'),at('I64',V('transit.ids'),V('index'))))],C('riders',V('transit'),add(V('index'),I(1)),C('add',V('line.passengers'),I(0),V('out')))),V('out')))
fn('ids',[('arrivals','(list I64)'),('transit','Transit'),('previousBoardings','I64')],'(list Pair)',LET([('ids',C('add',V('arrivals'),I(0),MP())),('all',IF(lt(V('previousBoardings'),V('transit.boardings')),C('riders',V('transit'),I(0),V('ids')),V('ids')))],G('std::map-entries','I64 I64',V('all'))))
emit('moneycandidates','moneycandidates',D)
D=[]
fn('people',[('old','Residents'),('sim','Sim'),('ids','(list Pair)'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('Pair',V('ids'))),LET([('id',F(at('Pair',V('ids'),V('index')),'key'))],C('people',V('old'),V('sim'),V('ids'),add(V('index'),I(1)),C('moneytrade::person',V('e'),C('game::agent',V('old'),V('id')),C('game::agent',V('sim.agents'),V('id'))))),V('e')))
# The arithmetic below is deliberately the predecessor's settlement arithmetic;
# only earned's candidate source changes. Taxes, debt, public funds, concessions
# and period boundaries are not approximated or aggregated across residents.
fn('settle',[('old','City'),('city','City'),('arrivals','(list I64)')],'City',LET([
 ('opened',C('money::open',V('old'))),('before',V('opened.economy')),
 ('earned',C('people',V('old.sim.agents'),V('city.sim'),C('moneycandidates::ids',V('arrivals'),V('city.sim.transit'),V('old.sim.transit.boardings')),I(0),V('before'))),('e',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),C('moneyflow::business-tax',G('std::map-entries','I64 I64',V('earned.firms')),I(0),V('earned')),V('earned'))),
 ('revenue',add(sub(V('e.taxes'),V('before.taxes')),sub(V('e.fares'),V('before.fares')))),
 ('cash',add(V('city.cash'),V('revenue'))),
 ('due',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),add(V('e.upkeepDue'),mx(I(1),add(div(llen('I64',V('city.world.ids')),I(40)),div(mlen('I64 I64',V('city.sim.transit.tracks')),I(20))))),I(0))),
 ('paid',mn(V('cash'),V('due'))),('cost',add(V('paid'),sub(V('city.sim.transit.spent'),V('old.sim.transit.spent')))),
 ('next',PATCH('Economy',V('e'),operating=inc(V('e'),'operating',V('cost')),periodOperating=inc(V('e'),'periodOperating',V('cost')),upkeepDue=IF(lt(I(0),V('due')),sub(V('due'),V('paid')),V('e.upkeepDue')))),
 ('period',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),PATCH('Economy',V('next'),lastTaxes=V('next.periodTaxes'),lastFares=V('next.periodFares'),lastOperating=V('next.periodOperating'),periodTaxes=I(0),periodFares=I(0),periodOperating=I(0)),V('next')))],
 PATCH('City',V('city'),cash=sub(V('cash'),V('paid')),economy=V('period'))))
emit('moneychanges','moneychanges',D)
