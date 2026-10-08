"""Command-only oracle. Unlimited *test* decisions are compared at one snapshot.

The independent unpruned candidate reproduces the predecessor's ETA arithmetic.
No probe or reference is exposed through the native HTTP/session protocol.
"""
from native import *
TYPES.update({
 'PlanningQuery':{'origin':'I64','dest':'I64','mode':'I64','rail':'Bool'},
 'PlanningInput':{'city':'City','queries':'(list PlanningQuery)'},
 'PlanningDecision':{**{k:'I64' for k in 'mode line board alight eta'.split()},'access':'(list I64)','egress':'(list I64)'},
 'PlanningProof':{'expected':'PlanningDecision','actual':'PlanningDecision','referenceComplete':'Bool','boundedComplete':'Bool','referenceSearches':'I64','boundedSearches':'I64'},
})
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
# Deliberately use the predecessor's separate queue/ride/period arithmetic,
# rather than the production boarding-cost/lower-bound helper.
fn('reference-candidate',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('l','RailLine'),('out','RailSearch')],'RailSearch',LET([
 ('pair',C('railplan::pair',V('l'),V('origin'),V('dest'),I(0),I(0),R(board=V('l.a'),alight=V('l.b'),estimate=I(1000000)))),('board',V('pair.board')),('alight',V('pair.alight'))],
 IF(AND(le(C('game::manhattan',V('origin'),V('board')),I(12)),le(C('game::manhattan',V('alight'),V('dest')),I(12))),
 LET([('access',C('game::ensure-route',V('world'),V('q'),V('origin'),V('board'),I(1),V('out.plan'))),
 ('egress',C('game::ensure-route',V('world'),V('q'),V('alight'),V('dest'),I(1),V('access'))),
 ('a',C('game::route',V('egress.routes'),V('access.id'))),('b',C('game::route',V('egress.routes'),V('egress.id'))),
 ('queue',llen('I64',C('railpath::platform',V('l'),V('board'),C('railpath::travel-direction',V('l'),V('board'),V('alight'))))),
 ('eta',add(add(V('a.cost'),V('b.cost')),add(add(C('railplan::ride-between',V('l'),V('board'),V('alight')),div(C('rail::period',V('l')),I(2))),mul(div(V('queue'),V('l.capacity')),C('rail::period',V('l')))))),
 ('valid',AND(lt(I(0),V('access.id')),lt(I(0),V('egress.id')),le(I(0),V('a.cost')),le(I(0),V('b.cost'))))],
 R(plan=V('egress'),complete=AND(V('out.complete'),lt(I(0),V('access.id')),lt(I(0),V('egress.id'))),choice=IF(AND(V('valid'),OR(eq(V('out.choice.line'),I(0)),lt(V('eta'),V('out.choice.eta')))),R(line=V('l.id'),board=V('board'),alight=V('alight'),accessRoute=V('access.id'),egressRoute=V('egress.id'),stage=I(1),eta=V('eta')),V('out.choice')))),V('out'))))
fn('reference-search',[('city','City'),('origin','I64'),('dest','I64'),('index','I64'),('out','RailSearch')],'RailSearch',IF(lt(V('index'),llen('I64',V('city.sim.transit.ids'))),LET([
 ('l',C('rail::line',V('city.sim.transit'),at('I64',V('city.sim.transit.ids'),V('index')))),
 ('next',IF(AND(V('l.enabled'),le(C('rail::expense',V('l')),V('city.cash'))),C('reference-candidate',V('city.world'),V('city.sim.q'),V('origin'),V('dest'),V('l'),V('out')),V('out')))],
 C('reference-search',V('city'),V('origin'),V('dest'),add(V('index'),I(1)),V('next'))),V('out')))
fn('decision',[('search','RailSearch'),('mode','I64'),('eta','I64'),('surface','Route')],'PlanningDecision',LET([
 ('p',V('search.choice')),('rail',AND(lt(I(0),V('p.line')),OR(lt(V('eta'),I(0)),lt(V('p.eta'),V('eta')))))],
 IF(V('rail'),R(mode=I(3),line=V('p.line'),board=V('p.board'),alight=V('p.alight'),eta=V('p.eta'),access=F(C('game::route',V('search.plan.routes'),V('p.accessRoute')),'path'),egress=F(C('game::route',V('search.plan.routes'),V('p.egressRoute')),'path')),
 R(mode=IF(lt(V('eta'),I(0)),I(0),V('mode')),line=I(0),board=I(-1),alight=I(-1),eta=V('eta'),access=V('surface.path'),egress=LS('I64')))))
fn('one',[('city','City'),('query','PlanningQuery')],'PlanningProof',LET([
 # At most two surface + four pairs of access/egress searches. This budget is
 # confined to the oracle; the production simulation still has two per cycle.
 ('p0',R(routes=V('city.sim.routes'),lookup=V('city.sim.lookup'),nextRoute=V('city.sim.nextRoute'),budget=I(10),id=I(0))),
 ('walk',IF(eq(V('query.mode'),I(2)),V('p0'),C('game::ensure-route',V('city.world'),V('city.sim.q'),V('query.origin'),V('query.dest'),I(1),V('p0')))),
 ('car',IF(eq(V('query.mode'),I(1)),PATCH('Plan',V('walk'),id=I(0)),C('game::ensure-route',V('city.world'),V('city.sim.q'),V('query.origin'),V('query.dest'),I(2),V('walk')))),
 ('wr',C('game::route',V('car.routes'),V('walk.id'))),('cr',C('game::route',V('car.routes'),V('car.id'))),
 ('ew',C('game::estimate',V('city.world'),V('city.sim.q'),V('wr'))),('ec',C('game::estimate',V('city.world'),V('city.sim.q'),V('cr'))),
 ('mode',IF(lt(I(0),V('query.mode')),V('query.mode'),C('game::choose-mode',V('ew'),V('ec')))),
 ('eta',IF(eq(V('mode'),I(1)),V('ew'),V('ec'))),('surface',IF(eq(V('mode'),I(1)),V('wr'),V('cr'))),
 ('out',R(plan=V('car'),choice=ZERO('RailPlan'),complete=B(True))),
 ('reference',IF(V('query.rail'),C('reference-search',V('city'),V('query.origin'),V('query.dest'),I(0),V('out')),V('out'))),
 ('bounded',IF(V('query.rail'),C('railplan::search-bounded',V('city.world'),V('city.sim.q'),V('city.sim.transit'),V('city.cash'),V('query.origin'),V('query.dest'),I(0),V('eta'),V('out')),V('out')))],
 R(expected=C('decision',V('reference'),V('mode'),V('eta'),V('surface')),actual=C('decision',V('bounded'),V('mode'),V('eta'),V('surface')),referenceComplete=V('reference.complete'),boundedComplete=V('bounded.complete'),referenceSearches=sub(I(10),V('reference.plan.budget')),boundedSearches=sub(I(10),V('bounded.plan.budget')))))
fn('run-all',[('input','PlanningInput'),('index','I64'),('out','(list PlanningProof)')],'(list PlanningProof)',IF(lt(V('index'),llen('PlanningQuery',V('input.queries'))),C('run-all',V('input'),add(V('index'),I(1)),append('PlanningProof',V('out'),C('one',V('input.city'),at('PlanningQuery',V('input.queries'),V('index'))))),V('out')))
fn('run',[('input','PlanningInput')],'(list PlanningProof)',C('run-all',V('input'),I(0),LS('PlanningProof')))
D.append('(component create probe (visibility private) (port create run (type (function (PlanningInput) (list PlanningProof))) (function run)))')
emit('planningproof','planningproof',D,tail=' (target create planning-proof (component planningproof::probe) (runner command) (port planningproof::probe::run))')
