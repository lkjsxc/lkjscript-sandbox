"""Keep employment stable across infrastructure-only topology edits.

World job lists are unique, derived lists. Equal counts plus retention of every
old job site establish set equality without relying on map enumeration order.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
fn('sites-remain',[('tiles','Numbers'),('jobs','(list I64)'),('i','I64')],'Bool',
 IF(lt(V('i'),llen('I64',V('jobs'))),AND(
 eq(get(V('tiles'),at('I64',V('jobs'),V('i'))),I(4)),
 C('sites-remain',V('tiles'),V('jobs'),add(V('i'),I(1)))),B(True)))
fn('same-sites',[('before','World'),('after','World')],'Bool',
 AND(eq(llen('I64',V('before.jobs')),llen('I64',V('after.jobs'))),
 C('sites-remain',V('after.tiles'),V('before.jobs'),I(0))))
# Recount IDs, not an old employment map: demolition has already removed people.
fn('counts',[('sim','Sim'),('i','I64'),('out','Numbers')],'Numbers',
 IF(lt(V('i'),llen('I64',V('sim.ids'))),LET([
 ('r',C('game::agent',V('sim.agents'),at('I64',V('sim.ids'),V('i'))))],
 C('counts',V('sim'),add(V('i'),I(1)),IF(le(I(0),V('r.job')),
 C('game::bump',V('out'),V('r.job'),I(1)),V('out')))),V('out')))
fn('reset',[('sim','Sim'),('i','I64')],'Sim',
 IF(lt(V('i'),llen('I64',V('sim.ids'))),LET([
 ('id',at('I64',V('sim.ids'),V('i'))),('r',C('game::agent',V('sim.agents'),V('id')))],
 C('reset',PATCH('Sim',V('sim'),agents=mput('I64 Resident',V('sim.agents'),V('id'),
 PATCH('Resident',V('r'),job=I(-1)))),add(V('i'),I(1)))),
 PATCH('Sim',V('sim'),employment=MP())))
fn('prepare',[('before','World'),('after','World'),('sim','Sim')],'Sim',
 IF(C('same-sites',V('before'),V('after')),
 PATCH('Sim',V('sim'),employment=C('counts',V('sim'),I(0),MP())),
 C('reset',V('sim'),I(0))))
for label,old,new,expected in [('empty',[],[],True),('unchanged',[129],[129],True),('added',[129],[129,130],False),('removed',[129],[],False),('replaced',[129],[130],False)]:
 before=ZERO('World',jobs=LS('I64',*[I(n) for n in old]))
 tiles=MP()
 for n in new:tiles=put(tiles,I(n),I(4))
 after=ZERO('World',jobs=LS('I64',*[I(n) for n in new]),tiles=tiles)
 D.append(TEST('job-sites-'+label,C('same-sites',before,after),B(expected)))
emit('employment','employment',D)
