"""Packed topology epochs: adjacency, static entry cost, receiving capacity.

One I64 per node. Lower 10 bits: five base-4 walking slots. Next 10 bits:
driving slots. Each slot is 0 blocked, 1 transit, 2 endpoint-only. High fields
store the static driving cost and capacity; queue cost remains live. The +1
stored representation distinguishes an admitted isolated node from no cache.
No ordinary map/list contains mutable host memory; these are native values.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
read=lambda values,key:mget('I64 I64',values,key,I(0))
fn('slots',[('a','I64'),('b','I64'),('direction','I64')],'I64',LET([
 ('road',C('roads::road',V('b'))),
 ('walk',IF(OR(V('road'),eq(V('b'),I(7))),I(1),I(2))),
 ('car',IF(C('roads::drive-edge',V('a'),V('b'),V('direction')),IF(V('road'),I(1),I(2)),I(0)))],
 IF(AND(C('roads::facility',V('a')),C('roads::facility',V('b'))),I(0),add(V('walk'),mul(V('car'),I(1024))))))
fn('surface',[('tiles','Numbers'),('a','I64'),('target','I64'),('direction','I64')],'I64',
 IF(lt(V('target'),I(0)),I(0),C('slots',V('a'),read(V('tiles'),V('target')),V('direction'))))
fn('vertical',[('tiles','Numbers'),('id','I64'),('a','I64')],'I64',
 IF(AND(lt(I(0),V('a')),C('roads::portal',V('tiles'),V('id'))),
 LET([('b',read(V('tiles'),IF(lt(V('id'),I(16384)),add(V('id'),I(16384)),sub(V('id'),I(16384)))))],
 IF(lt(I(0),V('b')),LET([('road',C('roads::road',V('b')))],
 add(IF(OR(V('road'),eq(V('b'),I(7))),I(1),I(2)),mul(IF(V('road'),I(1),I(2)),I(1024)))),I(0))),I(0)))
fn('code',[('tiles','Numbers'),('id','I64')],'I64',LET([
 ('a',read(V('tiles'),V('id'))),('x',C('roads::x',V('id'))),('y',C('roads::y',V('id'))),
 ('east',C('surface',V('tiles'),V('a'),IF(lt(V('x'),I(127)),add(V('id'),I(1)),I(-1)),I(0))),
 ('south',C('surface',V('tiles'),V('a'),IF(lt(V('y'),I(127)),add(V('id'),I(128)),I(-1)),I(1))),
 ('west',C('surface',V('tiles'),V('a'),IF(lt(I(0),V('x')),sub(V('id'),I(1)),I(-1)),I(2))),
 ('north',C('surface',V('tiles'),V('a'),IF(lt(I(0),V('y')),sub(V('id'),I(128)),I(-1)),I(3))),
 ('vertical',C('vertical',V('tiles'),V('id'),V('a'))),
 ('road',C('roads::road',V('a'))),
 ('cost',add(IF(AND(V('road'),NOT(eq(V('a'),I(2)))),I(2),I(1)),IF(C('roads::junction',V('tiles'),V('id')),I(2),I(0)))),
 ('capacity',IF(V('road'),IF(eq(V('a'),I(2)),I(2),I(1)),IF(eq(V('a'),I(4)),I(16),IF(eq(V('a'),I(5)),I(8),I(12)))))],
 add(add(add(V('east'),mul(V('south'),I(4))),add(mul(V('west'),I(16)),mul(V('north'),I(64)))),
 add(mul(V('vertical'),I(256)),add(mul(V('cost'),I(1048576)),mul(V('capacity'),I(16777216)))))))
fn('build',[('tiles','Numbers'),('ids','(list I64)'),('i','I64'),('cache','Numbers')],'Numbers',
 IF(lt(V('i'),llen('I64',V('ids'))),LET([('id',at('I64',V('ids'),V('i'))),
 ('base',IF(eq(V('i'),I(0)),mput('I64 I64',V('cache'),I(-259),I(1)),V('cache'))),
 ('marked',IF(C('roads::oneway',read(V('tiles'),V('id'))),mput('I64 I64',V('base'),I(-259),I(2)),V('base')))],
 C('build',V('tiles'),V('ids'),add(V('i'),I(1)),mput('I64 I64',V('marked'),sub(I(-1024),V('id')),add(C('code',V('tiles'),V('id')),I(1))))),
 mput('I64 I64',IF(eq(V('i'),I(0)),mput('I64 I64',V('cache'),I(-259),I(1)),V('cache')),I(-258),I(3))))
emit('roadcache','roadcache',D)
