"""Native synchronous movement for closed, full lane cycles; no teleport or extra capacity."""
from native import *
def add_cycle_functions(fn):
 # Only completed movements between ordinary road cells qualify. Junction crossing
 # conflicts and exit reservations are handled by the normal admission controller.
 fn('cycle-next',[('world','World'),('sim','Sim'),('f','Facts'),('r','Resident')],'I64',
  IF(AND(eq(V('r.state'),I(2)),eq(V('r.mode'),I(2)),le(V('r.duration'),V('r.elapsed')),le(I(8),V('r.wait')),eq(V('r.exitKey'),I(0)),C('road',get(V('world.tiles'),V('r.cell'))),eq(get(V('world.junctions'),V('r.cell')),I(0)),eq(get(V('f.heads'),C('resident-lane',V('r'))),V('r.id'))),
   LET([('route',C('route',V('sim.routes'),V('r.route'))),('step',add(V('r.step'),I(1)))],
    IF(lt(V('step'),llen('I64',V('route.path'))),LET([('next',at('I64',V('route.path'),V('step'))),('kind',get(V('world.tiles'),V('next'))),('key',C('lane-key',V('next'),C('direction',V('r.cell'),V('next')),C('lane',V('kind'),V('r.id'))))],
     IF(AND(C('road',V('kind')),eq(C('manhattan',V('r.cell'),V('next')),I(1)),eq(get(V('world.junctions'),V('next')),I(0)),eq(get(V('f.occ'),V('key')),I(3))),get(V('f.heads'),V('key')),I(0))),I(0))),I(0)))
 fn('cycle-dependencies',[('world','World'),('sim','Sim'),('f','Facts'),('index','I64'),('deps','Numbers')],'Numbers',
  IF(lt(V('index'),llen('I64',V('sim.ids'))),LET([('id',at('I64',V('sim.ids'),V('index'))),('next',C('cycle-next',V('world'),V('sim'),V('f'),C('agent',V('sim.agents'),V('id'))))],
   C('cycle-dependencies',V('world'),V('sim'),V('f'),add(V('index'),I(1)),IF(lt(I(0),V('next')),put(V('deps'),V('id'),V('next')),V('deps')))),V('deps')))
 fn('cycle-mark',[('ids','(list I64)'),('index','I64'),('marked','Numbers')],'Numbers',
  IF(lt(V('index'),llen('I64',V('ids'))),C('cycle-mark',V('ids'),add(V('index'),I(1)),put(V('marked'),at('I64',V('ids'),V('index')),I(1))),V('marked')))
 fn('cycle-walk',[('deps','Numbers'),('id','I64'),('path','(list I64)'),('positions','Numbers'),('scan','CycleScan')],'CycleScan',
  LET([('position',get(V('positions'),V('id')))],
   IF(lt(I(0),V('position')),R(done=C('cycle-mark',V('path'),I(0),V('scan.done')),members=C('cycle-mark',V('path'),sub(V('position'),I(1)),V('scan.members'))),
    IF(OR(eq(get(V('deps'),V('id')),I(0)),lt(I(0),get(V('scan.done'),V('id')))),PATCH('CycleScan',V('scan'),done=C('cycle-mark',V('path'),I(0),V('scan.done'))),
     C('cycle-walk',V('deps'),get(V('deps'),V('id')),append('I64',V('path'),V('id')),put(V('positions'),V('id'),add(llen('I64',V('path')),I(1))),V('scan'))))))
 fn('cycle-scan',[('ids','(list I64)'),('deps','Numbers'),('index','I64'),('scan','CycleScan')],'CycleScan',
  IF(lt(V('index'),llen('I64',V('ids'))),LET([('id',at('I64',V('ids'),V('index')))],
   C('cycle-scan',V('ids'),V('deps'),add(V('index'),I(1)),IF(AND(lt(I(0),get(V('deps'),V('id'))),eq(get(V('scan.done'),V('id')),I(0))),C('cycle-walk',V('deps'),V('id'),LS('I64'),MP(),V('scan')),V('scan')))),V('scan')))
 fn('cycle-rotate',[('world','World'),('original','Sim'),('members','Numbers'),('index','I64'),('result','Sim')],'Sim',
  IF(lt(V('index'),llen('I64',V('original.ids'))),LET([('id',at('I64',V('original.ids'),V('index'))),('r',C('agent',V('original.agents'),V('id')))],
   C('cycle-rotate',V('world'),V('original'),V('members'),add(V('index'),I(1)),
    IF(lt(I(0),get(V('members'),V('id'))),LET([('route',C('route',V('original.routes'),V('r.route'))),('step',add(V('r.step'),I(1))),('next',at('I64',V('route.path'),V('step')))],
     PATCH('Sim',V('result'),agents=mput('I64 Resident',V('result.agents'),V('id'),PATCH('Resident',V('r'),cell=V('next'),**{'from':V('r.cell'),'to':V('next')},step=V('step'),prior=V('r.dir'),dir=C('direction',V('r.cell'),V('next')),lane=C('lane',get(V('world.tiles'),V('next')),V('id')),slot=I(2),elapsed=I(0),duration=C('edge-time',V('world'),V('next'),I(2)),wait=I(0),ready=V('original.tick'),reason=I(0),zone=I(0),mask=I(0))),flow=C('bump',V('result.flow'),V('r.cell'),I(1)),waitTicks=mx(I(0),sub(V('result.waitTicks'),I(1))))),V('result')))),V('result')))
 fn('resolve-cycles',[('world','World'),('sim','Sim')],'Sim',
  IF(eq(mod(V('sim.tick'),I(16)),I(0)),LET([('facts',C('facts',V('world'),V('sim.agents'),V('sim.ids'),I(0),ZERO('Facts'))),('deps',C('cycle-dependencies',V('world'),V('sim'),V('facts'),I(0),MP())),('scan',C('cycle-scan',V('sim.ids'),V('deps'),I(0),ZERO('CycleScan')))],C('cycle-rotate',V('world'),V('sim'),V('scan.members'),I(0),V('sim'))),V('sim')))
