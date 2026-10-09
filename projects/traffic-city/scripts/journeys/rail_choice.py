"""Rail modal search with a proof-preserving lower bound on each candidate.

The existing stop-pair heuristic and strict tie order are unchanged. A service
can be pruned only when its cheapest possible access + ride + wait + egress
cannot beat an already available alternative. The population-scaled production
search allowance is owned by traffic::planning-budget, never by this module.
"""
fn('boarding-cost',[('l','RailLine'),('board','I64'),('alight','I64')],'I64',LET([
 ('queue',llen('I64',C('platform',V('l'),V('board'),C('travel-direction',V('l'),V('board'),V('alight')))))],
 add(add(C('ride-between',V('l'),V('board'),V('alight')),div(C('period',V('l')),I(2))),mul(div(V('queue'),V('l.capacity')),C('period',V('l'))))))
fn('lower-bound',[('l','RailLine'),('origin','I64'),('dest','I64'),('pair','RailPair')],'I64',
 add(mul(add(C('game::manhattan',V('origin'),V('pair.board')),C('game::manhattan',V('pair.alight'),V('dest'))),I(4)),C('boarding-cost',V('l'),V('pair.board'),V('pair.alight'))))
fn('can-improve',[('lower','I64'),('ceiling','I64'),('choice','RailPlan')],'Bool',
 AND(OR(lt(V('ceiling'),I(0)),lt(V('lower'),V('ceiling'))),OR(eq(V('choice.line'),I(0)),lt(V('lower'),V('choice.eta')))))
fn('candidate-pair',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('l','RailLine'),('pair','RailPair'),('out','RailSearch')],'RailSearch',LET([
 ('board',V('pair.board')),('alight',V('pair.alight'))],
 IF(AND(le(C('game::manhattan',V('origin'),V('board')),I(12)),le(C('game::manhattan',V('alight'),V('dest')),I(12))),
 LET([('access',C('game::ensure-route',V('world'),V('q'),V('origin'),V('board'),I(1),V('out.plan'))),
 ('egress',C('game::ensure-route',V('world'),V('q'),V('alight'),V('dest'),I(1),V('access'))),
 ('a',C('game::route',V('egress.routes'),V('access.id'))),('b',C('game::route',V('egress.routes'),V('egress.id'))),
 ('eta',add(add(V('a.cost'),V('b.cost')),C('boarding-cost',V('l'),V('board'),V('alight')))),
 ('valid',AND(lt(I(0),V('access.id')),lt(I(0),V('egress.id')),le(I(0),V('a.cost')),le(I(0),V('b.cost'))))],
 R(plan=V('egress'),complete=AND(V('out.complete'),lt(I(0),V('access.id')),lt(I(0),V('egress.id'))),choice=IF(AND(V('valid'),OR(eq(V('out.choice.line'),I(0)),lt(V('eta'),V('out.choice.eta')))),R(line=V('l.id'),board=V('board'),alight=V('alight'),accessRoute=V('access.id'),egressRoute=V('egress.id'),stage=I(1),eta=V('eta')),V('out.choice')))),V('out'))))
# Retain the unbounded entry for diagnostic callers; production uses bounds.
fn('candidate',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('l','RailLine'),('reverse','Bool'),('out','RailSearch')],'RailSearch',
 C('candidate-pair',V('world'),V('q'),V('origin'),V('dest'),V('l'),C('pair',V('l'),V('origin'),V('dest'),I(0),I(0),R(board=V('l.a'),alight=V('l.b'),estimate=I(1000000))),V('out')))
fn('candidate-bounded',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('l','RailLine'),('ceiling','I64'),('out','RailSearch')],'RailSearch',LET([
 ('pair',C('pair',V('l'),V('origin'),V('dest'),I(0),I(0),R(board=V('l.a'),alight=V('l.b'),estimate=I(1000000))))],
 IF(C('can-improve',C('lower-bound',V('l'),V('origin'),V('dest'),V('pair')),V('ceiling'),V('out.choice')),C('candidate-pair',V('world'),V('q'),V('origin'),V('dest'),V('l'),V('pair'),V('out')),V('out'))))
fn('search-bounded',[('world','World'),('q','Numbers'),('t','Transit'),('cash','I64'),('origin','I64'),('dest','I64'),('index','I64'),('ceiling','I64'),('out','RailSearch')],'RailSearch',
 IF(lt(V('index'),llen('I64',V('t.ids'))),LET([('l',line(V('t'),at('I64',V('t.ids'),V('index')))),
 ('next',IF(AND(V('l.enabled'),le(C('expense',V('l')),V('cash'))),C('candidate-bounded',V('world'),V('q'),V('origin'),V('dest'),V('l'),V('ceiling'),V('out')),V('out')))],
 C('search-bounded',V('world'),V('q'),V('t'),V('cash'),V('origin'),V('dest'),add(V('index'),I(1)),V('ceiling'),V('next'))),V('out')))
