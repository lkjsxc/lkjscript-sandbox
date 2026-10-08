"""Bounded car-return admission, reusing the normal topology-versioned cache.

Missing work budget is not a negative path. Never abandon/teleport a car: the
extra check happens before a flexible outbound choice, not during fixed-mode
travel or return. Unknown predecessor metadata is conservative.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('required',[('flexible','Bool'),('features','I64'),('walk','I64'),('car','I64')],'Bool',
 IF(V('flexible'),IF(eq(V('features'),I(1)),B(False),eq(C('game::choose-mode',V('walk'),V('car')),I(2))),B(False)))
fn('check',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('walk','I64'),('car','I64'),('p','Plan'),('flexible','Bool')],'ReturnCheck',
 IF(C('required',V('flexible'),get(V('world.junctions'),I(-259)),V('walk'),V('car')),
 LET([('back',C('game::ensure-route',V('world'),V('q'),V('dest'),V('origin'),I(2),V('p'))),
      ('ready',lt(I(0),V('back.id')))],
 R(plan=V('back'),complete=V('ready'),car=IF(V('ready'),IF(lt(F(C('game::route',V('back.routes'),V('back.id')),'cost'),I(0)),I(-1),V('car')),V('car')))),
 R(plan=V('p'),complete=B(True),car=V('car'))))
for features in [0,1,2]:
 for flexible in [False,True]:
  for walk,car in [(80,30),(20,30),(-1,30),(30,-1),(-1,-1)]:
   expected=flexible and features!=1 and car>=0 and (walk<0 or car<walk)
   D.append(TEST(f'return-needed-{features}-{flexible}-{walk}-{car}',C('required',B(flexible),I(features),I(walk),I(car)),B(expected)))
emit('returnplan','returnplan',D,extra={'ReturnCheck':{'plan':'Plan','complete':'Bool','car':'I64'}})
