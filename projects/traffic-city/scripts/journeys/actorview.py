from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('visible',[('view','View'),('cell','I64')],'Bool',AND(le(V('view.x'),C('game::x',V('cell'))),lt(C('game::x',V('cell')),add(V('view.x'),V('view.w'))),le(V('view.y'),C('game::y',V('cell'))),lt(C('game::y',V('cell')),add(V('view.y'),V('view.h')))))
# Presentation metadata is derived from authoritative routes and current FIFO order.
# It never changes saved Resident/City records or admission/capacity decisions.
fn('actor-out',[('city','City'),('r','Resident')],'I64',LET([('route',C('game::route',V('city.sim.routes'),V('r.route'))),('next',add(V('r.step'),I(1)))],IF(lt(V('next'),llen('I64',V('route.path'))),C('game::direction',V('r.to'),at('I64',V('route.path'),V('next'))),V('r.dir'))))
fn('actor-key',[('city','City'),('r','Resident')],'I64',IF(C('game::road',get(V('city.world.tiles'),V('r.to'))),C('game::lane-key',V('r.to'),C('actor-out',V('city'),V('r')),V('r.lane')),add(I(200000),V('r.to'))))
# Routes and lane keys are only needed for moving drivers, never parked people.
fn('actor-buckets',[('city','City'),('index','I64'),('buckets','Buckets')],'Buckets',IF(lt(V('index'),llen('I64',V('city.sim.ids'))),LET([('r',C('game::agent',V('city.sim.agents'),at('I64',V('city.sim.ids'),V('index'))))],C('actor-buckets',V('city'),add(V('index'),I(1)),IF(AND(eq(V('r.state'),I(2)),eq(V('r.mode'),I(2))),LET([('key',C('actor-key',V('city'),V('r')))],mput('I64 (list I64)',V('buckets'),V('key'),append('I64',mget('I64 (list I64)',V('buckets'),V('key'),LS('I64')),V('r.id')))),V('buckets')))),V('buckets')))
fn('actor-rank',[('agents','Residents'),('r','Resident'),('ids','(list I64)'),('index','I64')],'I64',IF(lt(V('index'),llen('I64',V('ids'))),LET([('other',C('game::agent',V('agents'),at('I64',V('ids'),V('index'))))],add(IF(OR(lt(V('other.ready'),V('r.ready')),AND(eq(V('other.ready'),V('r.ready')),lt(V('other.id'),V('r.id')))),I(1),I(0)),C('actor-rank',V('agents'),V('r'),V('ids'),add(V('index'),I(1))))),I(0)))
fn('actor',[('city','City'),('r','Resident'),('buckets','Buckets')],'Actor',R(**{k:V('r.'+k) for k in TYPES['Actor'] if k not in ['out','rank']},out=C('actor-out',V('city'),V('r')),rank=IF(eq(V('r.mode'),I(2)),C('actor-rank',V('city.sim.agents'),V('r'),mget('I64 (list I64)',V('buckets'),C('actor-key',V('city'),V('r')),LS('I64')),I(0)),I(0))))
fn('actor-loop',[('city','City'),('view','View'),('buckets','Buckets'),('index','I64'),('result','(list Actor)')],'(list Actor)',IF(AND(lt(V('index'),llen('I64',V('city.sim.ids'))),lt(llen('Actor',V('result')),I(128))),LET([('r',C('game::agent',V('city.sim.agents'),at('I64',V('city.sim.ids'),V('index'))))],C('actor-loop',V('city'),V('view'),V('buckets'),add(V('index'),I(1)),IF(AND(eq(V('r.state'),I(2)),OR(C('visible',V('view'),V('r.from')),C('visible',V('view'),V('r.to')))),append('Actor',V('result'),C('actor',V('city'),V('r'),V('buckets'))),V('result')))),V('result')))
fn('actors',[('city','City'),('view','View'),('index','I64'),('result','(list Actor)')],'(list Actor)',C('actor-loop',V('city'),V('view'),C('actor-buckets',V('city'),I(0),MP('I64 (list I64)')),V('index'),V('result')))
# Equal admission slots are deliberately ignored: rank follows ready-time, then identity.
rankagents=MP('I64 Resident')
for id,ready in [(1,10),(2,8),(3,8)]:
 rankagents=mput('I64 Resident',rankagents,I(id),ZERO('Resident',id=I(id),ready=I(ready),slot=I(2)))
fn('rank-fixture',[],'Residents',rankagents)
for id,expected in [(1,2),(2,0),(3,1)]:
 D.append(TEST('actor-fifo-rank-'+str(id),C('actor-rank',C('rank-fixture'),C('game::agent',C('rank-fixture'),I(id)),LS('I64',I(1),I(2),I(3)),I(0)),I(expected)))

emit('actorview','actorview',D)
