"""Author native, ephemeral paired experiments. Never simulate in this generator."""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
# Measurements are deltas against the SAME origin, including plan cancellations
# and capital cost. End-of-window outstanding trips must not vanish from a score.
fn('measure',[('origin','City'),('city','City'),('disconnected','I64')],'LabMeasure',R(
 visits=sub(V('city.sim.visits'),V('origin.sim.visits')),
 arrived=sub(V('city.sim.arrived'),V('origin.sim.arrived')),
 duration=sub(V('city.sim.totalDuration'),V('origin.sim.totalDuration')),
 waitCycles=sub(V('city.sim.waitTicks'),V('origin.sim.waitTicks')),
 disconnectedCycles=V('disconnected'),
 outstanding=sub(sub(V('city.sim.requested'),V('city.sim.arrived')),V('city.sim.cancelled')),
 cancelled=sub(V('city.sim.cancelled'),V('origin.sim.cancelled')),
 population=V('city.sim.population'),netFunds=sub(V('city.cash'),V('origin.cash')),
 operating=sub(V('city.economy.operating'),V('origin.economy.operating')),
 boardings=sub(V('city.sim.transit.boardings'),V('origin.sim.transit.boardings')),
 wealthError=C('money::conservation',V('city'))))
fn('report',[('origin','City'),('lab','Lab')],'LabView',R(
 **{k:V('lab.'+k) for k in 'phase horizon step confirmation control changed'.split()},
 realTick=V('origin.sim.tick'),planCost=IF(lt(I(0),V('lab.phase')),sub(V('origin.cash'),V('lab.plan.cash')),I(0)),
 newResidents=IF(lt(I(0),V('lab.phase')),sub(V('lab.plan.sim.born'),V('origin.sim.born')),I(0)),
 moveouts=IF(lt(I(0),V('lab.phase')),sub(V('lab.plan.sim.removed'),V('origin.sim.removed')),I(0)),
 cancelled=IF(lt(I(0),V('lab.phase')),sub(V('lab.plan.sim.cancelled'),V('origin.sim.cancelled')),I(0))))
emit('labmetrics','labmetrics',D)
D=[]
fn('empty',[],'Lab',ZERO('Lab'))
fn('open',[('city','City')],'Lab',ZERO('Lab',phase=I(1),horizon=I(64),plan=PATCH('City',V('city'),paused=B(True))))
fn('shown',[('city','City'),('lab','Lab')],'City',IF(eq(V('lab.phase'),I(0)),V('city'),IF(eq(V('lab.phase'),I(1)),V('lab.plan'),V('lab.trial'))))
fn('result',[('lab','Lab'),('notice','Text')],'LabChange',R(lab=V('lab'),notice=V('notice')))
emit('labbase','labbase',D)
D=[]
fn('advance',[('lab','Lab'),('origin','City')],'Lab',IF(OR(eq(V('lab.phase'),I(2)),eq(V('lab.phase'),I(3))),LET([
 ('next',C('traffic::tick',V('lab.trial'))),('step',add(V('lab.step'),I(1))),
 ('disconnected',add(V('lab.disconnect'),V('next.sim.disconnected'))),
 ('measure',C('labmetrics::measure',V('origin'),V('next'),V('disconnected'))),
 ('done',le(V('lab.horizon'),V('step')))],
 IF(eq(V('lab.phase'),I(2)),
  PATCH('Lab',V('lab'),control=V('measure'),phase=IF(V('done'),I(3),I(2)),step=IF(V('done'),I(0),V('step')),disconnect=IF(V('done'),I(0),V('disconnected')),trial=IF(V('done'),PATCH('City',V('lab.plan'),paused=B(False)),V('next'))),
  PATCH('Lab',V('lab'),changed=V('measure'),phase=IF(V('done'),I(4),I(3)),step=V('step'),disconnect=V('disconnected'),trial=PATCH('City',V('next'),paused=V('done'))))),V('lab')))
emit('labstep','labstep',D)
D=[]
fn('run',[('lab','Lab'),('origin','City'),('horizon','I64')],'LabChange',IF(AND(OR(eq(V('lab.phase'),I(1)),eq(V('lab.phase'),I(4))),NOT(V('lab.quote.valid')),OR(eq(V('horizon'),I(64)),eq(V('horizon'),I(128)),eq(V('horizon'),I(256)))),C('labbase::result',PATCH('Lab',V('lab'),phase=I(2),horizon=V('horizon'),step=I(0),disconnect=I(0),trial=PATCH('City',V('origin'),paused=B(False)),control=ZERO('LabMeasure'),changed=ZERO('LabMeasure'),confirmation=I(0)),T('Comparing two futures from the same cycle. Your real city stays frozen.')),C('labbase::result',V('lab'),T('Finish any removal review, then choose 64, 128 or 256 cycles in City Lab.'))))
emit('labrun','labrun',D)
D=[]
fn('edit',[('lab','Lab'),('command','Command'),('ack','I64')],'LabChange',
 IF(NOT(eq(V('lab.phase'),I(1))),C('labbase::result',V('lab'),T('Return to Edit plan before changing this experiment.')),
 IF(te(V('command.op'),T('review-remove')),LET([('quote',C('remove::quote',V('lab.plan'),V('command'),V('ack')))],C('labbase::result',PATCH('Lab',V('lab'),quote=V('quote'),confirmation=I(0)),IF(V('quote.valid'),T('Review removal in your experimental plan only. Your real city is unchanged.'),T('Select a non-empty rectangle inside the map, up to 256 tiles.')))),
 IF(te(V('command.op'),T('apply-remove')),IF(AND(V('lab.quote.valid'),eq(V('command.x'),V('lab.quote.id'))),LET([('out',C('remove::apply',V('lab.plan'),V('lab.quote')))],C('labbase::result',PATCH('Lab',V('lab'),plan=C('moneyedit::command',V('lab.plan'),V('out.city')),quote=ZERO('EditQuote'),confirmation=I(0)),V('out.notice'))),C('labbase::result',PATCH('Lab',V('lab'),quote=ZERO('EditQuote')),T('This experimental removal review expired. Select the area again.'))),
 IF(OR(*[te(V('command.op'),T(op)) for op in ['build','signal','build-track','build-station','create-service','build-rail','rail-service','rail-stop','grow']]),LET([('out',C('town::command',V('lab.plan'),V('command')))],C('labbase::result',PATCH('Lab',V('lab'),plan=V('out.city'),quote=ZERO('EditQuote'),confirmation=I(0)),V('out.notice'))),C('labbase::result',V('lab'),T('Use the construction tools to edit this plan, or leave City Lab to manage your real city.')))))))
emit('labedit','labedit',D)
D=[]
fn('input',[('lab','Lab'),('origin','City'),('command','Command'),('ack','I64')],'LabChange',
 IF(te(V('command.op'),T('lab-run')),C('labrun::run',V('lab'),V('origin'),V('command.kind')),
 IF(te(V('command.op'),T('lab-edit')),C('labbase::result',PATCH('Lab',V('lab'),phase=I(1),step=I(0),disconnect=I(0),trial=ZERO('City'),control=ZERO('LabMeasure'),changed=ZERO('LabMeasure'),quote=ZERO('EditQuote'),confirmation=I(0)),T('Edit your plan. The comparison has been cleared; your real city is unchanged.')),
 IF(te(V('command.op'),T('lab-review')),IF(AND(eq(V('lab.phase'),I(4)),eq(V('lab.control.wealthError'),I(0)),eq(V('lab.changed.wealthError'),I(0))),C('labbase::result',PATCH('Lab',V('lab'),confirmation=V('ack')),T('Review applying the plan at the original cycle. Experimental time and earnings will not be imported.')),C('labbase::result',V('lab'),T('Complete a valid comparison before applying the plan.'))),
 IF(te(V('command.op'),T('cancel-review')),C('labbase::result',PATCH('Lab',V('lab'),quote=ZERO('EditQuote'),confirmation=I(0)),T('')),
 IF(te(V('command.op'),T('set-running')),C('labbase::result',V('lab'),IF(eq(V('command.kind'),I(0)),T(''),T('Use Compare in City Lab. The real city remains frozen.'))),C('labedit::edit',V('lab'),V('command'),V('ack'))))))))
emit('lab','lab',D)
