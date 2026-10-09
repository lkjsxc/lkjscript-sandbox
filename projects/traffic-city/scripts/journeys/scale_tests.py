"""Small native witnesses for the phase-local and packed-state contracts."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def test(n,a,e):D.append(TEST(n,a,e))
# Control flow, not eager Boolean function argument evaluation. Unreached
# arithmetic is still statically typechecked, but must not execute.
unsafe=eq(div(I(1),I(0)),I(0))
test('scale-and-does-not-run-unreached-work',AND(B(False),unsafe),B(False))
test('scale-or-does-not-run-unreached-work',OR(B(True),unsafe),B(True))
for a in [False,True]:
 for b in [False,True]:
  test('scale-and-'+str(int(a))+str(int(b)),AND(B(a),B(b)),B(a and b))
  test('scale-or-'+str(int(a))+str(int(b)),OR(B(a),B(b)),B(a or b))
# These residents are already in the admitted persistent snapshot. Sleeping,
# dwelling and parking update neither the map nor any movement-side counter.
fn('person',[('state','I64')],'Resident',ZERO('Resident',id=I(7),home=I(17),cell=I(17),state=V('state'),ready=I(100)))
fn('move',[('state','I64')],'Move',ZERO('Move',agents=mput('I64 Resident',MP('I64 Resident'),I(7),C('person',V('state'))),travelTicks=I(9)))
for state in [0,3,4,6]:
 actual=C('movement::step-agent',ZERO('World'),ZERO('Sim'),ZERO('Facts'),I(1),C('person',I(state)),C('move',I(state)))
 expected=PATCH('Move',C('move',I(state)),travelTicks=I(10)) if state==6 else C('move',I(state))
 test('scale-retained-person-'+str(state),actual,expected)
# ETA projection is scoped to a fixed world/queue batch. A new batch starts
# with an empty memo; it must not inherit yesterday's congestion estimates.
fn('world',[],'World',ZERO('World',tiles=put(put(put(MP(),I(0),I(3)),I(1),I(1)),I(2),I(4))))
fn('routes',[],'Routes',mput('I64 Route',MP('I64 Route'),I(42),ZERO('Route',path=LS('I64',I(0),I(1),I(2)),mode=I(2),cost=I(3))))
fn('estimate',[('q','Numbers'),('memo','Numbers')],'I64',F(C('modeplan::car-estimate',C('world'),V('q'),C('routes'),I(42),V('memo')),'eta'))
test('scale-freeflow-estimate',C('estimate',MP(),MP()),I(27))
test('scale-cached-estimate',C('estimate',MP(),put(MP(),I(42),I(29))),I(27))
test('scale-next-phase-observes-congestion',C('estimate',put(MP(),I(1),I(4)),MP()),I(31))
test('scale-memo-does-not-add-a-missing-id',F(C('modeplan::car-estimate',C('world'),MP(),C('routes'),I(0),MP()),'values'),MP())
test('scale-unreachable-estimate-has-a-cache-entry',F(C('modeplan::car-estimate',C('world'),MP(),MP('I64 Route'),I(42),MP()),'values'),put(MP(),I(42),I(1)))
# parent+1 preserves cell zero. Largest layered cell IDs remain distinct from
# the absent predecessor sentinel. Tracing does not reconstruct distances.
test('scale-packed-parent-zero',C('game::trace',put(put(MP(),I(0),I(65536)),I(1),I(327681)),I(0),I(1),LS('I64')),LS('I64',I(0),I(1)))
test('scale-packed-parent-upper-layer',C('game::trace',put(put(MP(),I(32766),I(65536)),I(32767),I(360447)),I(32766),I(32767),LS('I64')),LS('I64',I(32766),I(32767)))
test('scale-origin-needs-no-parent',C('game::trace',put(MP(),I(0),I(65536)),I(0),I(0),LS('I64')),LS('I64',I(0)))
# Arrival identity is recorded at successful completion, not at a failed plan.
test('scale-arrival-journal',F(C('journeys::finish-journey',I(7),ZERO('Resident',id=I(7),purpose=I(4)),ZERO('Move')),'arrivals'),LS('I64',I(7)))
line=ZERO('RailLine',id=I(1),capacity=I(16),passengers=LS('I64',I(7),I(7)))
transit=ZERO('Transit',ids=LS('I64',I(1)),lines=mput('I64 RailLine',MP('I64 RailLine'),I(1),line),boardings=I(1))
test('scale-ledger-deduplicates-arrivals',C('moneycandidates::ids',LS('I64',I(5),I(5)),ZERO('Transit'),I(0)),LS('Pair',R(key=I(5),value=I(1))))
test('scale-ledger-ignores-old-riders',C('moneycandidates::ids',LS('I64',I(5)),transit,I(1)),LS('Pair',R(key=I(5),value=I(1))))
test('scale-ledger-unifies-boardings-and-arrivals',C('moneycandidates::ids',LS('I64',I(7),I(5)),transit,I(0)),LS('Pair',R(key=I(5),value=I(1)),R(key=I(7),value=I(1))))
# Missing identities retain the predecessor's neutral sentinel semantics.
for name in ['summary','admission']:
 test('scale-'+name+'-missing-id',C('facts::'+name,ZERO('World'),MP('I64 Resident'),LS('I64',I(77)),I(0),ZERO('Facts')),ZERO('Facts'))
# Equal-distance jobs keep authored list order; a full cached job is invalidated.
jobworld=ZERO('World',jobs=LS('I64',I(12),I(8)))
jobstart=ZERO('Sim',nextId=I(1),employment=put(MP(),I(12),I(15)))
fn('vacancy-seed',[],'Sim',C('people::spawn-home',jobworld,jobstart,I(10),I(0)))
test('scale-vacancy-first-tie-winner',F(C('game::agent',F(C('vacancy-seed'),'agents'),I(1)),'job'),I(12))
test('scale-vacancy-next-after-full',F(C('game::agent',F(C('vacancy-seed'),'agents'),I(2)),'job'),I(8))
test('scale-vacancy-employment-accounting',F(C('vacancy-seed'),'employment'),put(put(MP(),I(12),I(16)),I(8),I(7)))
fn('vacancy-person',[('id','I64')],'Resident',ZERO('Resident',id=V('id'),home=I(10),job=I(-1)))
people=MP('I64 Resident')
for id in [1,2,3]:people=mput('I64 Resident',people,I(id),C('vacancy-person',I(id)))
fn('vacancy-reassignment',[],'Sim',C('people::assign-jobs',jobworld,ZERO('Sim',agents=people,ids=LS('I64',I(3),I(1),I(2)),employment=put(MP(),I(12),I(15))),I(0)))
test('scale-vacancy-retains-identity-order',F(C('game::agent',F(C('vacancy-reassignment'),'agents'),I(3)),'job'),I(12))
test('scale-vacancy-reassignment-next-site',F(C('game::agent',F(C('vacancy-reassignment'),'agents'),I(1)),'job'),I(8))
# Keep every witness, but admit helpers independently and at most two tests
# per ordinary proposal. Do not increase caller budgets or drop test cases.
import re
functions=[d for d in D if '(function create ' in d]
checks=[d for d in D if '(test create ' in d]
assert len(functions)==8 and len(checks)==33 and len(functions)+len(checks)==len(D)
owners={re.search(r'\(function create ([^ ]+)',d)[1]:'scalefixtures'+str(i+1) for i,d in enumerate(functions)}
assert len(owners)==len(functions)
def qualify(d,module):
 def call(m):
  name=m[1];owner=owners.get(name)
  return '(call '+(owner+'::'+name if owner and owner!=module else name)
 return re.sub(r'\(call ([a-z0-9-]+)(?=[\s)])',call,d)
for i,d in enumerate(functions):
 module='scalefixtures'+str(i+1);emit(module,module,[qualify(d,module)])
for index in range(0,len(checks),2):
 module='scaletests'+(str(index//2+1) if index else '')
 emit(module,module,[qualify(d,module) for d in checks[index:index+2]])
