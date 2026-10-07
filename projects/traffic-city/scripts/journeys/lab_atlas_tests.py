"""Native boundary tests include replacement IDs and mixed effects at one home."""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('resident',[('id','I64'),('home','I64')],'Resident',ZERO('Resident',id=V('id'),home=V('home')))
fn('origin',[],'Sim',ZERO('Sim',ids=LS('I64',*[I(i) for i in [1,2,3,4,5]]),agents=mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',MP('I64 Resident'),I(1),C('resident',I(1),I(100))),I(2),C('resident',I(2),I(100))),I(3),C('resident',I(3),I(100))),I(4),C('resident',I(4),I(200))),I(5),C('resident',I(5),I(300)))))
fn('plan',[],'Sim',ZERO('Sim',ids=LS('I64',*[I(i) for i in [1,2,3,5,6]]),agents=mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',mput('I64 Resident',MP('I64 Resident'),I(1),C('resident',I(1),I(100))),I(2),C('resident',I(2),I(100))),I(3),C('resident',I(3),I(100))),I(5),C('resident',I(5),I(301))),I(6),C('resident',I(6),I(200)))))
for label,times in [('control',[40,10,5,100,80]),('changed',[10,40,5,0,1])]:
 ledger=MP('I64 AtlasSample')
 for i,time in enumerate(times,1):ledger=mput('I64 AtlasSample',ledger,I(i),R(time=I(time),wait=I(i),lost=I(i*2)))
 fn(label,[],'AtlasLedger',ledger)
fn('report',[],'AtlasView',C('atlasreport::report',C('origin'),C('plan'),C('control'),C('changed')))
fn('home',[('id','I64')],'AtlasHome',mget('I64 AtlasHome',C('atlascohort::planned',C('plan'),I(0),C('atlascohort::originals',C('origin'),C('plan'),C('control'),C('changed'),I(0),MP('I64 AtlasHome'))),V('id'),ZERO('AtlasHome')))
# Legal population limit, completely replaced: 256 old homes + 256 new homes.
fn('population',[('index','I64'),('offset','I64'),('out','Sim')],'Sim',IF(lt(V('index'),I(2048)),LET([('id',add(add(V('index'),V('offset')),I(1))),('r',C('resident',V('id'),div(add(V('index'),V('offset')),I(8))))],C('population',add(V('index'),I(1)),V('offset'),PATCH('Sim',V('out'),ids=append('I64',V('out.ids'),V('id')),agents=mput('I64 Resident',V('out.agents'),V('id'),V('r'))))),V('out')))
fn('max-union',[],'AtlasView',C('atlasreport::report',C('population',I(0),I(0),ZERO('Sim')),C('population',I(0),I(2048),ZERO('Sim')),MP('I64 AtlasSample'),MP('I64 AtlasSample')))
emit('atlasfixtures','atlasfixtures',D)
D=[]
def test(n,a,b):D.append(TEST('atlas-'+n,a,b))
def call(n,*args):return C('atlasfixtures::'+n,*args)
for state in range(7):
 test('journey-state-'+str(state),F(C('atlassample::observation',ZERO('Resident',state=I(state))),'time'),I(0 if state in [0,3] else 1))
emit('atlasstatetests','atlasstatetests',D)
D=[]
for wait in [0,7,8,9]:
 test('long-wait-'+str(wait),F(C('atlassample::observation',ZERO('Resident',state=I(2),wait=I(wait))),'wait'),I(1 if wait>=8 else 0))
for state,reason in [(1,1),(1,9),(1,8),(2,1),(5,10),(6,11)]:
 test(f'disconnected-{state}-{reason}',F(C('atlassample::observation',ZERO('Resident',state=I(state),reason=I(reason))),'lost'),I(1 if state==1 and reason in [1,9] else 0))
emit('atlaswaittests','atlaswaittests',D)
D=[]
for k,n in [('same',3),('less',1),('more',1),('equal',1),('removed',2),('added',2),('baseTime',55),('planTime',55),('baseWait',6),('planWait',6),('baseLost',12),('planLost',12)]:test('matched-'+k,F(call('report'),k),I(n))
emit('atlascohorttests','atlascohorttests',D)
D=[]
for k,n in [('before',1),('after',1),('same',0),('less',0),('more',0),('baseTime',0),('planTime',0)]:test('replacement-'+k,F(call('home',I(200)),k),I(n))
test('moved-home-not-matched',F(call('home',I(300)),'same'),I(0))
test('new-home-included',F(call('home',I(301)),'after'),I(1))
test('new-home-no-false-improvement',F(call('home',I(301)),'less'),I(0))
test('full-report-four-homes',llen('AtlasHome',F(call('report'),'homes')),I(4))
emit('atlasidentitytests','atlasidentitytests',D)
D=[]
test('empty-roster',C('atlasreport::report',ZERO('Sim'),ZERO('Sim'),MP('I64 AtlasSample'),MP('I64 AtlasSample')),ZERO('AtlasView'))
test('maximum-roster-union',llen('AtlasHome',F(call('max-union'),'homes')),I(512))
test('wire-row-width',llen('I64',at('AtlasWireHome',F(C('atlasreport::wire',call('report'),B(True)),'homes'),I(0))),I(13))
test('wire-metadata-without-repeat',F(C('atlasreport::wire',call('report'),B(False)),'homes'),LS('AtlasWireHome'))
test('repeat-retains-counts',F(C('atlasreport::wire',call('report'),B(False)),'same'),I(3))
# A surviving unfinished journey counts every observed cycle, not just on arrival.
sim=ZERO('Sim',ids=LS('I64',I(1)),agents=mput('I64 Resident',MP('I64 Resident'),I(1),ZERO('Resident',id=I(1),state=I(1),wait=I(9),reason=I(1))))
actual=C('atlassample::sample',sim,I(0),C('atlassample::sample',sim,I(0),MP('I64 AtlasSample')))
test('unfinished-counts-repeated-observations',mget('I64 AtlasSample',actual,I(1),ZERO('AtlasSample')),R(time=I(2),wait=I(2),lost=I(2)))
emit('atlastests','atlastests',D)
