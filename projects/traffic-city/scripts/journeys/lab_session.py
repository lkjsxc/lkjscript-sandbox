# Imported by session.py. All durable writes still use the existing owner-checked
# checkpoint transaction. State.city is never a simulated future.
fn('lab-start',[('state','State')],'Decision',LET([('status',C('checkpoint-retry',V('state'),I(2)))],IF(eq(V('status'),I(1)),emit(PATCH('State',C('clear-review',V('state')),lab=C('labbase::open',V('state.city')),saved=V('state.city.sim.tick'),mapVersion=I(-1),selection=I(-1)),T('City Lab: your real city is saved and frozen. Edit the plan, then compare two futures.')),emit(PATCH('State',V('state'),status=V('status')),T('The city could not be checkpointed. No experiment was started.')))),True)
fn('lab-commit',[('state','State'),('command','Command')],'Decision',IF(AND(eq(V('state.lab.phase'),I(4)),lt(I(0),V('state.lab.confirmation')),eq(V('command.x'),V('state.lab.confirmation'))),LET([
 ('candidate',PATCH('State',C('clear-review',V('state')),city=PATCH('City',V('state.lab.plan'),paused=V('state.city.paused')),lab=C('labbase::empty'),mapVersion=I(-1),selection=I(-1))),
 ('status',C('checkpoint-retry',V('candidate'),I(2)))],
 IF(eq(V('status'),I(1)),emit(PATCH('State',V('candidate'),saved=V('candidate.city.sim.tick')),T('Plan applied and saved at the original cycle. No experimental time or earnings were imported.')),emit(PATCH('State',V('state'),status=V('status')),T('The plan was not committed. Your original saved city is retained.')))),emit(V('state'),T('Review the completed experiment before applying. This confirmation is absent or expired.'))),True)
fn('lab-input',[('state','State'),('command','Command')],'Decision',LET([('change',C('lab::input',V('state.lab'),V('state.city'),V('command'),V('state.ack')))],emit(PATCH('State',V('state'),lab=V('change.lab'),mapVersion=IF(eq(V('change.lab.phase'),V('state.lab.phase')),V('state.mapVersion'),I(-1))),V('change.notice'))),True)
fn('lab-active',[('state','State'),('command','Command')],'Decision',
 IF(NOT(C('owned',V('state'))),emit(PATCH('State',V('state'),status=I(2)),T('Another tab controls this city. Your experiment cannot replace its saved city.')),
 IF(te(V('command.op'),T('lab-start')),IF(eq(V('state.lab.phase'),I(0)),C('lab-start',V('state')),emit(V('state'),T('Finish or discard the current experiment before starting another.'))),
 IF(te(V('command.op'),T('lab-discard')),emit(PATCH('State',C('clear-review',V('state')),lab=C('labbase::empty'),mapVersion=I(-1),selection=I(-1)),T('Experiment discarded. Your original city is unchanged.')),
 IF(te(V('command.op'),T('lab-apply')),C('lab-commit',V('state'),V('command')),
 IF(te(V('command.op'),T('save')),C('save-state',V('state'),T('Original city saved. City Lab plans are temporary and are not saved.')),C('lab-input',V('state'),V('command'))))))),True)
