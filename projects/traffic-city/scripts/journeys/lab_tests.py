from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('origin',[],'City',C('town::initial'))
fn('opened',[],'Lab',C('labbase::open',C('origin')))
fn('command',[('op','Text'),('kind','I64')],'Command',ZERO('Command',op=V('op'),kind=V('kind')))
fn('run',[('horizon','I64')],'Lab',F(C('labrun::run',C('opened'),C('origin'),V('horizon')),'lab'))
fn('ready',[],'Lab',PATCH('Lab',C('opened'),phase=I(4)))
fn('input',[('lab','Lab'),('op','Text'),('kind','I64')],'Lab',F(C('lab::input',V('lab'),C('origin'),C('command',V('op'),V('kind')),I(37)),'lab'))
fn('short-run',[],'Lab',PATCH('Lab',C('opened'),phase=I(2),horizon=I(1),trial=PATCH('City',C('origin'),paused=B(False))))
fn('after-control',[],'Lab',C('labstep::advance',C('short-run'),C('origin')))
fn('after-both',[],'Lab',C('labstep::advance',C('after-control'),C('origin')))
fn('edited',[],'Lab',LET([('origin',C('origin')),('out',C('town::command',V('origin'),ZERO('Command',op=T('build'),x=I(14),y=I(10),x2=I(14),y2=I(10),kind=I(1))))],PATCH('Lab',C('opened'),plan=V('out.city'))))
fn('measure',[],'LabMeasure',LET([('origin',ZERO('City',cash=I(100),sim=ZERO('Sim',visits=I(5),arrived=I(7),requested=I(10),cancelled=I(1),waitTicks=I(8)))),('city',PATCH('City',V('origin'),cash=I(76),sim=PATCH('Sim',V('origin.sim'),visits=I(9),arrived=I(12),requested=I(20),cancelled=I(3),waitTicks=I(19))))],C('labmetrics::measure',V('origin'),V('city'),I(11))))
emit('labfixtures','labfixtures',D)
D=[]
def test(n,a,b):D.append(TEST(n,a,b))
def call(n,*args):return C('labfixtures::'+n,*args)
for n,a,b in [
 ('inactive-phase',F(C('labbase::empty'),'phase'),I(0)),
 ('opens-in-planning',F(call('opened'),'phase'),I(1)),
 ('plan-starts-paused',F(F(call('opened'),'plan'),'paused'),B(True)),
 ('plan-cash-not-minted',F(F(call('opened'),'plan'),'cash'),F(call('origin'),'cash')),
 ('inactive-view-is-real-city',C('labbase::shown',call('origin'),C('labbase::empty')),call('origin')),
 ('default-window-64',F(call('opened'),'horizon'),I(64)),
 ('accept-window-64',F(call('run',I(64)),'phase'),I(2)),
 ('accept-window-128',F(call('run',I(128)),'phase'),I(2)),
 ('accept-window-256',F(call('run',I(256)),'phase'),I(2)),
 ('reject-window-zero',F(call('run',I(0)),'phase'),I(1)),
 ('reject-window-negative',F(call('run',I(-1)),'phase'),I(1)),
 ('reject-window-63',F(call('run',I(63)),'phase'),I(1)),
 ('reject-window-large',F(call('run',I(4096)),'phase'),I(1)),
 ('control-before-candidate',F(call('after-control'),'phase'),I(3)),
 ('candidate-starts-original-clock',F(F(F(call('after-control'),'trial'),'sim'),'tick'),F(F(call('origin'),'sim'),'tick')),
 ('one-tick-per-branch',F(F(F(call('after-both'),'trial'),'sim'),'tick'),add(F(F(call('origin'),'sim'),'tick'),I(1))),
 ('ends-after-both',F(call('after-both'),'phase'),I(4)),
 ('no-change-exact-measurement',F(call('after-both'),'control'),F(call('after-both'),'changed')),
 ('completed-trial-paused',F(F(call('after-both'),'trial'),'paused'),B(True)),
 ('reject-management-command',F(call('input',call('opened'),T('reset-city'),I(0)),'plan'),F(call('opened'),'plan')),
 ('reject-editing-measured-future',call('input',call('ready'),T('build'),I(3)),call('ready')),
 ('reject-incomplete-review',F(call('input',call('opened'),T('lab-review'),I(0)),'confirmation'),I(0)),
 ('review-bound-to-command',F(call('input',call('ready'),T('lab-review'),I(0)),'confirmation'),I(37)),
 ('return-to-edit-invalidates-review',F(call('input',call('input',call('ready'),T('lab-review'),I(0)),T('lab-edit'),I(0)),'confirmation'),I(0)),
 ('plan-cost-accounted',F(C('labmetrics::report',call('origin'),call('edited')),'planCost'),I(8)),
 ('visit-delta-not-total',F(call('measure'),'visits'),I(4)),
 ('waiting-person-cycles',F(call('measure'),'waitCycles'),I(11)),
 ('unfinished-excludes-cancelled',F(call('measure'),'outstanding'),I(5)),
 ('cancellations-not-arrivals',F(call('measure'),'cancelled'),I(2)),
 ('costs-in-net-funds',F(call('measure'),'netFunds'),I(-24)),
 ('disconnected-person-cycles',F(call('measure'),'disconnectedCycles'),I(11)),
]:test('lab-'+n,a,b)
emit('labtests','labtests',D)
