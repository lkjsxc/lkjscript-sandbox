"""Native measurements only: a paired, identity-matched journey burden atlas."""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
# Observe once AFTER each ordinary tick. Resting and destination activity do not
# count. Planning, surface travel, parking, platform queues and riding all do.
fn('observation',[('r','Resident')],'AtlasSample',R(
 time=IF(OR(*[eq(V('r.state'),I(i)) for i in [1,2,4,5,6]]),I(1),I(0)),
 wait=IF(le(I(8),V('r.wait')),I(1),I(0)),
 lost=IF(AND(eq(V('r.state'),I(1)),OR(eq(V('r.reason'),I(1)),eq(V('r.reason'),I(9)))),I(1),I(0))))
fn('sample',[('sim','Sim'),('index','I64'),('ledger','AtlasLedger')],'AtlasLedger',
 IF(lt(V('index'),llen('I64',V('sim.ids'))),LET([
 ('id',at('I64',V('sim.ids'),V('index'))),('old',mget('I64 AtlasSample',V('ledger'),V('id'),ZERO('AtlasSample'))),
 ('now',C('observation',C('game::agent',V('sim.agents'),V('id'))))],
 C('sample',V('sim'),add(V('index'),I(1)),mput('I64 AtlasSample',V('ledger'),V('id'),R(**{k:add(V('old.'+k),V('now.'+k)) for k in ['time','wait','lost']})))),V('ledger')))
emit('atlassample','atlassample',D)
D=[]
fn('resident',[('r','Resident'),('other','Resident'),('a','AtlasSample'),('b','AtlasSample'),('row','AtlasHome')],'AtlasHome',
 LET([('same',AND(eq(V('r.id'),V('other.id')),eq(V('r.home'),V('other.home')))),('delta',sub(V('b.time'),V('a.time')))],
 PATCH('AtlasHome',V('row'),home=V('r.home'),before=add(V('row.before'),I(1)),
 same=add(V('row.same'),IF(V('same'),I(1),I(0))),
 less=add(V('row.less'),IF(AND(V('same'),lt(V('delta'),I(0))),I(1),I(0))),
 more=add(V('row.more'),IF(AND(V('same'),lt(I(0),V('delta'))),I(1),I(0))),
 equal=add(V('row.equal'),IF(AND(V('same'),eq(V('delta'),I(0))),I(1),I(0))),
 **{prefix+label:add(V('row.'+prefix+label),IF(V('same'),V(source+'.'+key),I(0))) for prefix,source in [('base','a'),('plan','b')] for label,key in [('Time','time'),('Wait','wait'),('Lost','lost')]})))
fn('originals',[('origin','Sim'),('plan','Sim'),('control','AtlasLedger'),('changed','AtlasLedger'),('index','I64'),('rows','AtlasHomes')],'AtlasHomes',
 IF(lt(V('index'),llen('I64',V('origin.ids'))),LET([
 ('id',at('I64',V('origin.ids'),V('index'))),('r',C('game::agent',V('origin.agents'),V('id'))),
 ('row',mget('I64 AtlasHome',V('rows'),V('r.home'),ZERO('AtlasHome'))),
 ('next',C('resident',V('r'),C('game::agent',V('plan.agents'),V('id')),mget('I64 AtlasSample',V('control'),V('id'),ZERO('AtlasSample')),mget('I64 AtlasSample',V('changed'),V('id'),ZERO('AtlasSample')),V('row')))],
 C('originals',V('origin'),V('plan'),V('control'),V('changed'),add(V('index'),I(1)),mput('I64 AtlasHome',V('rows'),V('r.home'),V('next')))),V('rows')))
fn('planned',[('plan','Sim'),('index','I64'),('rows','AtlasHomes')],'AtlasHomes',
 IF(lt(V('index'),llen('I64',V('plan.ids'))),LET([
 ('r',C('game::agent',V('plan.agents'),at('I64',V('plan.ids'),V('index')))),
 ('row',mget('I64 AtlasHome',V('rows'),V('r.home'),ZERO('AtlasHome')))],
 C('planned',V('plan'),add(V('index'),I(1)),mput('I64 AtlasHome',V('rows'),V('r.home'),PATCH('AtlasHome',V('row'),home=V('r.home'),after=add(V('row.after'),I(1)))))),V('rows')))
emit('atlascohort','atlascohort',D)
D=[]
fn('totals',[('entries','(list AtlasHomePair)'),('index','I64'),('out','AtlasView')],'AtlasView',
 IF(lt(V('index'),llen('AtlasHomePair',V('entries'))),LET([('row',F(at('AtlasHomePair',V('entries'),V('index')),'value'))],
 C('totals',V('entries'),add(V('index'),I(1)),PATCH('AtlasView',V('out'),homes=append('AtlasHome',V('out.homes'),V('row')),
 removed=add(V('out.removed'),sub(V('row.before'),V('row.same'))),added=add(V('out.added'),sub(V('row.after'),V('row.same'))),
 **{k:add(V('out.'+k),V('row.'+k)) for k in 'same less more equal baseTime planTime baseWait planWait baseLost planLost'.split()}))),V('out')))
fn('report',[('origin','Sim'),('plan','Sim'),('control','AtlasLedger'),('changed','AtlasLedger')],'AtlasView',LET([
 ('before',C('atlascohort::originals',V('origin'),V('plan'),V('control'),V('changed'),I(0),MP('I64 AtlasHome'))),
 ('both',C('atlascohort::planned',V('plan'),I(0),V('before')))],C('totals',G('std::map-entries','I64 AtlasHome',V('both')),I(0),ZERO('AtlasView'))))
fn('pack',[('rows','(list AtlasHome)'),('index','I64'),('out','(list AtlasWireHome)')],'(list AtlasWireHome)',
 IF(lt(V('index'),llen('AtlasHome',V('rows'))),LET([('r',at('AtlasHome',V('rows'),V('index')))],C('pack',V('rows'),add(V('index'),I(1)),append('AtlasWireHome',V('out'),LS('I64',*[V('r.'+k) for k in TYPES['AtlasHome']])))),V('out')))
fn('wire',[('atlas','AtlasView'),('full','Bool')],'AtlasWire',R(homes=IF(V('full'),C('pack',V('atlas.homes'),I(0),LS('AtlasWireHome')),LS('AtlasWireHome')),**{k:V('atlas.'+k) for k in TYPES['AtlasView'] if k!='homes'}))
emit('atlasreport','atlasreport',D)
