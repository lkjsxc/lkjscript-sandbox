"""Independent small native assertions and command-only presentation probe."""
from protocol import *
TYPES['StreetFixture']={'agents':'Residents','ids':'(list I64)'}
TYPES['StreetInput']={'city':'City','view':'View'}
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
for walk,cars in [(0,0),(0,200),(200,0),(3,200),(200,3),(80,80),(1,127),(127,1),(64,64),(65,63),(1024,1024)]:
 w=min(walk,max(64,128-cars));c=min(cars,128-w)
 D.append(TEST(f'street-walk-slots-{walk}-{cars}',C('actorpool::walk-slots',I(walk),I(cars)),I(w)))
 D.append(TEST(f'street-car-slots-{walk}-{cars}',C('actorpool::car-slots',I(walk),I(cars)),I(c)))
for count,slots,i in [(0,0,0),(8,8,0),(8,8,7),(200,64,0),(200,64,63),(2048,128,100)]:
 D.append(TEST(f'street-index-{count}-{slots}-{i}',C('actorpool::sample-index',I(count),I(slots),I(i)),I((2*i+1)*count//(2*slots) if slots else 0)))
view=R(x=I(1),y=I(1),w=I(3),h=I(3),layer=I(0))
tiles=put(put(put(MP(),I(130),I(1)),I(131),I(3)),I(258),I(8))
for label,state,mode,source,target,want in [
 ('walker',2,1,129,130,True),('driver',2,2,129,130,True),('rail-access',2,3,129,130,True),
 ('on-road-wait',2,2,130,130,True),('resting',0,1,129,130,False),('planning',1,1,129,130,False),
 ('inside',3,1,129,130,False),('parking',4,2,129,130,False),('platform',5,3,129,130,False),
 ('train-rider',6,3,129,130,False),('picking-up',2,2,131,131,False),('at-station',2,3,258,258,False),
 ('east-exclusive',2,1,132,133,False),('south-exclusive',2,1,513,514,False),('entering-view',2,1,128,129,True),
 ('leaving-view',2,1,131,132,True),('no-mode',2,0,129,130,False)]:
 D.append(TEST('street-eligible-'+label,C('actorpool::eligible',tiles,view,ZERO('Resident',state=I(state),mode=I(mode),**{'from':I(source),'to':I(target)})),B(want)))
# Keep large fake populations generated rather than literal proposal inflation.
fn('roster',[('i','I64'),('walk','I64'),('cars','I64'),('f','StreetFixture')],'StreetFixture',IF(le(V('i'),add(V('walk'),V('cars'))),LET([
 ('r',ZERO('Resident',id=V('i'),home=I(0),state=I(2),mode=IF(le(V('i'),V('cars')),I(2),I(1)),cell=I(130),**{'from':I(129),'to':I(130)},duration=I(4)))],
 C('roster',add(V('i'),I(1)),V('walk'),V('cars'),R(agents=mput('I64 Resident',V('f.agents'),V('i'),V('r')),ids=append('I64',V('f.ids'),V('i'))))),V('f')))
fn('fixture',[('walk','I64'),('cars','I64')],'City',LET([('f',C('roster',I(1),V('walk'),V('cars'),ZERO('StreetFixture')))],ZERO('City',world=ZERO('World',tiles=tiles),sim=ZERO('Sim',agents=V('f.agents'),ids=V('f.ids')))))
fn('sample',[('walk','I64'),('cars','I64')],'StreetSample',C('actorview::sample',C('fixture',V('walk'),V('cars')),view))
for w,c in [(8,160),(160,8),(0,0)]:
 sample=C('sample',I(w),I(c))
 D.append(TEST(f'street-full-walking-count-{w}-{c}',F(sample,'walking'),I(w)))
 D.append(TEST(f'street-full-driving-count-{w}-{c}',F(sample,'driving'),I(c)))
 D.append(TEST(f'street-sample-budget-{w}-{c}',llen('Actor',F(sample,'actors')),I(min(w+c,128))))
D.append(TEST('street-late-walker-not-starved',F(at('Actor',F(C('sample',I(8),I(160)),'actors'),I(127)),'id'),I(168)))
D.append(TEST('street-sparse-cars-still-present',F(at('Actor',F(C('sample',I(160),I(8)),'actors'),I(0)),'mode'),I(2)))
fn('run',[('input','StreetInput')],'StreetSample',C('actorview::sample',V('input.city'),V('input.view')))
D.append('(component create probe (visibility private) (port create run (type (function (StreetInput) StreetSample)) (function run)))')
# Separate cheap scalar tests, eligibility witnesses and projection fixtures.
import re
checks=[d for d in D if d.lstrip().startswith('(test create ')]
base=[d for d in D if d not in checks]
emit('streettests','streettests',base,tail=' (target create street-probe (component streettests::probe) (runner command) (port streettests::probe::run))')

quota=[d for d in checks if any(('(test create '+x) in d for x in ['street-walk-slots-','street-car-slots-','street-index-'])]
eligible=[d for d in checks if '(test create street-eligible-' in d]
actual=[d for d in checks if d not in quota and d not in eligible]
assert len(quota)==28 and len(eligible)==17 and len(actual)==11
emit('streetquotatests','streetquotatests',quota)
for i in range(0,len(eligible),6):
 name='streeteligibletests'+str(i//6+1)
 emit(name,name,eligible[i:i+6])
for i in range(0,len(actual),3):
 name='streetsampletests'+str(i//3+1)
 emit(name,name,[d.replace('(call sample ', '(call streettests::sample ') for d in actual[i:i+3]])
