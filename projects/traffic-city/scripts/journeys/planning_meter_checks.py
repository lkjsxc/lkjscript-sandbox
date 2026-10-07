# Counts are transient projections, never saved gameplay fields.
counts=MP('I64 Resident')
for n,(state,reason,wait) in enumerate([(1,8,0),(1,8,7),(1,8,8),(2,8,99),(1,1,12),(1,9,12),(5,10,12)],1):
 counts=mput('I64 Resident',counts,I(n),ZERO('Resident',id=I(n),state=I(state),reason=I(reason),wait=I(wait)))
fn('planning-meter-fixture',[],'Sim',ZERO('Sim',agents=counts,ids=LS('I64',*[I(i) for i in range(1,8)])))
D.append(TEST('planning-meter-empty',C('viewdata::planning-counts',MP('I64 Resident'),LS('I64'),I(0),I(0),I(0)),R(total=I(0),long=I(0))))
D.append(TEST('planning-meter-reason-and-state',C('viewdata::planning-counts',F(C('planning-meter-fixture'),'agents'),F(C('planning-meter-fixture'),'ids'),I(0),I(0),I(0)),R(total=I(3),long=I(1))))
D.append(TEST('planning-meter-eight-cycle-boundary',C('viewdata::planning-counts',F(C('planning-meter-fixture'),'agents'),F(C('planning-meter-fixture'),'ids'),I(2),I(0),I(0)),R(total=I(1),long=I(1))))
