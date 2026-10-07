"""Inserted into native people module before leave-node, sharing its helpers."""
# Individual route stages use actual walking routes and retain one final destination.
fn('rail-leg',[('world','World'),('sim','Sim'),('tick','I64'),('r','Resident'),('m','Move')],'Move',LET([
 ('p',C('rail::plan',V('m.transit'),V('r.id'))),('target',IF(eq(V('p.stage'),I(1)),V('p.board'),V('r.dest'))),
 ('search',C('ensure-route',V('world'),V('sim.q'),V('r.cell'),V('target'),I(1),R(routes=V('m.routes'),lookup=V('m.lookup'),nextRoute=V('m.nextRoute'),budget=V('m.budget'),id=I(0)))),
 ('next',PATCH('Move',V('m'),routes=V('search.routes'),lookup=V('search.lookup'),nextRoute=V('search.nextRoute'),budget=V('search.budget'))),
 ('route',C('route',V('search.routes'),V('search.id')))],
 IF(eq(V('search.id'),I(0)),C('wait-agent',V('next'),V('r'),I(8)),
 IF(lt(V('route.cost'),I(0)),C('wait-agent',V('next'),V('r'),I(1)),
 C('apply-agent',V('next'),PATCH('Resident',V('r'),state=I(2),mode=I(3),step=I(0),route=V('search.id'),elapsed=I(0),duration=I(0),wait=I(0),reason=I(0),ready=V('tick'),**{'from':V('r.cell'),'to':V('r.cell')}))))))
# Native modal choice is performed only at a journey origin. Mid-route replans
# retain the current surface mode, and a car must return with its driver.
fn('plan-choice',[('world','World'),('sim','Sim'),('tick','I64'),('r','Resident'),('m','Move')],'Move',LET([
 ('dest',C('destination',V('world'),V('r'))),('r2',PATCH('Resident',V('r'),dest=V('dest')))],
 IF(lt(V('dest'),I(0)),C('wait-agent',V('m'),V('r2'),I(9)),LET([
 ('origin',C('building',get(V('world.tiles'),V('r.cell')))),
 ('returnCar',AND(eq(V('r.purpose'),I(4)),eq(V('r.mode'),I(2)))),
 # A returning driver already owns the car choice; a returning walker cannot
 # invent a car at work. Mid-route edits retain their established surface mode.
 # Do not consume the shared search budget for a mode they cannot select.
 ('fixedMode',IF(AND(NOT(V('origin')),lt(I(0),V('r.mode'))),V('r.mode'),IF(V('returnCar'),I(2),IF(eq(V('r.purpose'),I(4)),I(1),I(0))))),
 ('needWalk',NOT(eq(V('fixedMode'),I(2)))),('needCar',NOT(eq(V('fixedMode'),I(1)))),
 ('p0',R(routes=V('m.routes'),lookup=V('m.lookup'),nextRoute=V('m.nextRoute'),budget=V('m.budget'),id=I(0))),
 ('walk',IF(V('needWalk'),C('ensure-route',V('world'),V('sim.q'),V('r.cell'),V('dest'),I(1),V('p0')),V('p0'))),
 ('car',IF(V('needCar'),C('ensure-route',V('world'),V('sim.q'),V('r.cell'),V('dest'),I(2),V('walk')),PATCH('Plan',V('walk'),id=I(0)))) ,
 ('search',IF(AND(V('origin'),NOT(V('returnCar'))),C('railplan::search',V('world'),V('sim.q'),V('m.transit'),V('m.cash'),V('r.cell'),V('dest'),I(0),R(plan=V('car'),choice=ZERO('RailPlan'),complete=B(True))),R(plan=V('car'),choice=ZERO('RailPlan'),complete=B(True)))),
 ('m2',PATCH('Move',V('m'),routes=V('search.plan.routes'),lookup=V('search.plan.lookup'),nextRoute=V('search.plan.nextRoute'),budget=V('search.plan.budget'))),
 ('etaWalk',IF(lt(I(0),V('walk.id')),C('estimate',V('world'),V('sim.q'),C('route',V('search.plan.routes'),V('walk.id'))),I(-1))),
 ('etaCar',IF(lt(I(0),V('car.id')),C('estimate',V('world'),V('sim.q'),C('route',V('search.plan.routes'),V('car.id'))),I(-1))),
 ('surface',IF(lt(I(0),V('fixedMode')),V('fixedMode'),C('choose-mode',V('etaWalk'),V('etaCar')))),
 ('surfaceEta',IF(eq(V('surface'),I(1)),V('etaWalk'),V('etaCar'))),
 ('byRail',AND(lt(I(0),V('search.choice.line')),OR(lt(V('surfaceEta'),I(0)),lt(V('search.choice.eta'),V('surfaceEta'))))),
 ('mode',IF(V('byRail'),I(3),V('surface'))),
 ('planned',PATCH('Resident',V('r2'),etaWalk=V('etaWalk'),etaCar=V('etaCar'))),
 ('counted',lt(I(0),get(V('m.transit.choices'),V('r.id'))))],
 IF(OR(AND(V('needWalk'),eq(V('walk.id'),I(0))),AND(V('needCar'),eq(V('car.id'),I(0))),NOT(V('search.complete'))),C('wait-agent',V('m2'),V('planned'),I(8)),
 IF(OR(eq(V('mode'),I(0)),AND(eq(V('mode'),I(1)),lt(V('etaWalk'),I(0))),AND(eq(V('mode'),I(2)),lt(V('etaCar'),I(0)))),C('wait-agent',V('m2'),V('planned'),I(1)),
 LET([('transit',IF(V('byRail'),PATCH('Transit',V('m2.transit'),plans=mput('I64 RailPlan',V('m2.transit.plans'),V('r.id'),V('search.choice'))),V('m2.transit')))],
 C('apply-agent',PATCH('Move',V('m2'),
 transit=IF(V('counted'),V('transit'),C('rail::choice',V('transit'),V('r.id'),V('mode'))),
 walkTrips=add(V('m2.walkTrips'),IF(AND(NOT(V('counted')),eq(V('mode'),I(1))),I(1),I(0))),
 carTrips=add(V('m2.carTrips'),IF(AND(NOT(V('counted')),eq(V('mode'),I(2))),I(1),I(0))),
 occ=IF(AND(eq(V('mode'),I(2)),NOT(C('road',get(V('world.tiles'),V('r.cell'))))),C('bump',V('m2.occ'),C('lane-key',V('r.cell'),V('r.dir'),I(0)),I(1)),V('m2.occ'))),
 PATCH('Resident',V('planned'),state=I(2),step=I(0),exitKey=I(0),zone=I(0),
 route=IF(V('byRail'),V('search.choice.accessRoute'),IF(eq(V('mode'),I(1)),V('walk.id'),V('car.id'))),mode=V('mode'),
 eta=IF(V('byRail'),V('search.choice.eta'),IF(eq(V('mode'),I(1)),V('etaWalk'),V('etaCar'))),elapsed=I(0),
 duration=IF(AND(eq(V('mode'),I(2)),V('origin')),I(6),I(0)),**{'from':V('r.cell'),'to':V('r.cell')},wait=I(0),reason=IF(eq(V('mode'),I(2)),I(6),I(0)),lane=I(0),ready=V('tick'))))))))))
# A zero-budget planning turn cannot allocate or alter a route. At a facility,
# a missing required surface route forces the original planner to wait before
# committing any rail choice. Preserve its destination and ETA observations,
# and avoid enumerating every train for the hundreds of other waiting residents.
# Fully cached choices, mid-route travel and returning drivers use the original
# planner unchanged. The complete-state replay checks this fast path, not totals.
fn('plan-choice-fast',[('world','World'),('sim','Sim'),('tick','I64'),('r','Resident'),('m','Move')],'Move',IF(AND(le(V('m.budget'),I(0)),C('building',get(V('world.tiles'),V('r.cell'))),NOT(AND(eq(V('r.purpose'),I(4)),eq(V('r.mode'),I(2))))),LET([
 ('dest',C('destination',V('world'),V('r'))),('needCar',NOT(eq(V('r.purpose'),I(4))))],IF(lt(V('dest'),I(0)),C('plan-choice',V('world'),V('sim'),V('tick'),V('r'),V('m')),LET([
 ('p0',R(routes=V('m.routes'),lookup=V('m.lookup'),nextRoute=V('m.nextRoute'),budget=V('m.budget'),id=I(0))),
 ('walk',C('ensure-route',V('world'),V('sim.q'),V('r.cell'),V('dest'),I(1),V('p0'))),
 ('car',IF(V('needCar'),C('ensure-route',V('world'),V('sim.q'),V('r.cell'),V('dest'),I(2),V('walk')),PATCH('Plan',V('walk'),id=I(0))))],
 IF(C('planninggate::admitted',B(True),B(False),V('car.budget'),B(True),V('walk.id'),V('needCar'),V('car.id')),C('plan-choice',V('world'),V('sim'),V('tick'),V('r'),V('m')),
 LET([('etaWalk',IF(lt(I(0),V('walk.id')),C('estimate',V('world'),V('sim.q'),C('route',V('car.routes'),V('walk.id'))),I(-1))),('etaCar',IF(lt(I(0),V('car.id')),C('estimate',V('world'),V('sim.q'),C('route',V('car.routes'),V('car.id'))),I(-1)))],C('wait-agent',V('m'),PATCH('Resident',V('r'),dest=V('dest'),etaWalk=V('etaWalk'),etaCar=V('etaCar')),I(8))))))),C('plan-choice',V('world'),V('sim'),V('tick'),V('r'),V('m'))))
fn('plan-agent',[('world','World'),('sim','Sim'),('tick','I64'),('r','Resident'),('m','Move')],'Move',LET([
 ('p',C('rail::plan',V('m.transit'),V('r.id'))),('l',C('rail::line',V('m.transit'),V('p.line')))],
 IF(lt(I(0),V('p.line')),
 IF(AND(eq(V('p.stage'),I(1)),OR(eq(V('l.id'),I(0)),NOT(V('l.enabled')))),C('plan-choice-fast',V('world'),V('sim'),V('tick'),PATCH('Resident',V('r'),mode=I(1)),PATCH('Move',V('m'),transit=C('rail::forget',V('m.transit'),V('r.id')))),C('rail-leg',V('world'),V('sim'),V('tick'),V('r'),V('m'))),
 C('plan-choice-fast',V('world'),V('sim'),V('tick'),V('r'),V('m')))))
fn('wait-train',[('r','Resident'),('m','Move')],'Move',IF(C('railtrain::fallback',V('m.transit'),V('r')),C('apply-agent',PATCH('Move',V('m'),transit=C('rail::forget',V('m.transit'),V('r.id'))),PATCH('Resident',V('r'),state=I(1),mode=I(1),route=I(0),step=I(0),elapsed=I(0),duration=I(0),wait=I(0),reason=I(8))),C('wait-agent',V('m'),V('r'),I(10))))
