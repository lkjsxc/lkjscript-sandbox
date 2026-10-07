"""Pure admission for modal enumeration; no route work when it cannot be used."""
from native import *
D=[]
args=[('origin','Bool'),('returnCar','Bool'),('budget','I64'),('needWalk','Bool'),('walk','I64'),('needCar','Bool'),('car','I64')]
body=AND(V('origin'),NOT(V('returnCar')),OR(lt(I(0),V('budget')),AND(OR(NOT(V('needWalk')),lt(I(0),V('walk'))),OR(NOT(V('needCar')),lt(I(0),V('car'))))))
D.append(FN('admitted',args,'Bool',body))
# With no budget, ensure-route can only revise Plan.id. Missing a required
# surface route unconditionally waits before any rail choice can be committed.
# All cached surface routes must still enumerate rail, including a zero budget.
import itertools
for i,(origin,returning,budget,need_walk,walk,need_car,car) in enumerate(itertools.product([False,True],repeat=7)):
 expected=origin and not returning and (budget or ((not need_walk or walk) and (not need_car or car)))
 D.append(TEST('planning-admission-'+str(i),C('admitted',B(origin),B(returning),I(int(budget)),B(need_walk),I(int(walk)),B(need_car),I(int(car))),B(expected)))
emit('planninggate','planninggate',D)
