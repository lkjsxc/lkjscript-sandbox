"""Two-layer directed topology, shared by routing and actual movement.

Node identity is ground cell + 16384 * depth. Road kinds 9..12 point E,S,W,N;
13 is a ground portal. Layers connect only at explicit portals. Sidewalks ignore
one-way restrictions. Turning into a one-way road from the side is permitted;
entering against its arrow is not. Driveways are not intermediate through roads.
"""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def test(n,a,e):D.append(TEST(n,a,e))
def read(tiles,node):return mget('I64 I64',tiles,node,I(0))
def rem(a,b):return sub(a,mul(div(a,b),b))
fn('ground',[('id','I64')],'I64',rem(V('id'),I(16384)))
fn('layer',[('id','I64')],'I64',div(V('id'),I(16384)))
fn('x',[('id','I64')],'I64',rem(V('id'),I(128)))
fn('y',[('id','I64')],'I64',rem(div(V('id'),I(128)),I(128)))
fn('oneway',[('kind','I64')],'Bool',AND(le(I(9),V('kind')),le(V('kind'),I(12))))
fn('road',[('kind','I64')],'Bool',OR(eq(V('kind'),I(1)),eq(V('kind'),I(2)),AND(le(I(9),V('kind')),le(V('kind'),I(13)))))
fn('building',[('kind','I64')],'Bool',AND(le(I(3),V('kind')),le(V('kind'),I(6))))
fn('slow',[('kind','I64')],'Bool',AND(C('road',V('kind')),NOT(eq(V('kind'),I(2)))))
fn('neighbor',[('id','I64'),('direction','I64')],'I64',
 IF(eq(V('direction'),I(4)),IF(lt(V('id'),I(16384)),add(V('id'),I(16384)),sub(V('id'),I(16384))),
 IF(eq(V('direction'),I(0)),IF(lt(C('x',V('id')),I(127)),add(V('id'),I(1)),I(-1)),
 IF(eq(V('direction'),I(1)),IF(lt(C('y',V('id')),I(127)),add(V('id'),I(128)),I(-1)),
 IF(eq(V('direction'),I(2)),IF(lt(I(0),C('x',V('id'))),sub(V('id'),I(1)),I(-1)),
 IF(lt(I(0),C('y',V('id'))),sub(V('id'),I(128)),I(-1)))))))
fn('direction',[('a','I64'),('b','I64')],'I64',
 IF(eq(add(V('a'),I(1)),V('b')),I(0),IF(eq(add(V('a'),I(128)),V('b')),I(1),IF(eq(sub(V('a'),I(1)),V('b')),I(2),I(3)))))
fn('portal',[('tiles','Numbers'),('id','I64')],'Bool',eq(read(V('tiles'),C('ground',V('id'))),I(13)))
fn('passable',[('tiles','Numbers'),('id','I64'),('origin','I64'),('dest','I64'),('mode','I64')],'Bool',
 IF(AND(le(I(0),V('id')),lt(V('id'),I(32768))),LET([('kind',read(V('tiles'),V('id')))],
 OR(eq(V('id'),V('origin')),eq(V('id'),V('dest')),C('road',V('kind')),AND(eq(V('mode'),I(1)),eq(V('kind'),I(7))))),B(False)))
fn('drive-edge',[('a','I64'),('b','I64'),('direction','I64')],'Bool',
 AND(OR(NOT(C('oneway',V('a'))),eq(V('direction'),sub(V('a'),I(9))),C('building',V('b')),eq(V('b'),I(8))),
     OR(NOT(C('oneway',V('b'))),NOT(eq(V('direction'),rem(sub(V('b'),I(7)),I(4)))),C('building',V('a')),eq(V('a'),I(8)))))
fn('can-step',[('tiles','Numbers'),('from','I64'),('to','I64'),('origin','I64'),('dest','I64'),('mode','I64')],'Bool',
 IF(AND(le(I(0),V('from')),lt(V('from'),I(32768)),C('passable',V('tiles'),V('to'),V('origin'),V('dest'),V('mode'))),
 IF(eq(C('layer',V('from')),C('layer',V('to'))),
 LET([('d',C('direction',V('from'),V('to')))],
 IF(eq(C('neighbor',V('from'),V('d')),V('to')),
 IF(eq(V('mode'),I(2)),C('drive-edge',read(V('tiles'),V('from')),read(V('tiles'),V('to')),V('d')),B(True)),B(False))),
 AND(eq(C('ground',V('from')),C('ground',V('to'))),C('portal',V('tiles'),V('from')),
     lt(I(0),read(V('tiles'),V('from'))),lt(I(0),read(V('tiles'),V('to'))))),B(False)))
fn('degree',[('tiles','Numbers'),('id','I64')],'I64',
 add(add(*[IF(C('road',read(V('tiles'),C('neighbor',V('id'),I(d)))),I(1),I(0)) for d in [0,1]]),
     add(*[IF(C('road',read(V('tiles'),C('neighbor',V('id'),I(d)))),I(1),I(0)) for d in [2,3]])))
fn('junction',[('tiles','Numbers'),('id','I64')],'Bool',
 AND(C('road',read(V('tiles'),V('id'))),OR(le(I(3),C('degree',V('tiles'),V('id'))),C('portal',V('tiles'),V('id')))))
fn('underground-price',[('kind','I64')],'I64',IF(eq(V('kind'),I(7)),I(24),IF(eq(V('kind'),I(2)),I(72),IF(C('oneway',V('kind')),I(60),I(48)))))
# Independent table expectations for every direction and side entrance.
for d in range(4):
    k=9+d
    for step in range(4):
        test(f'oneway-exit-{d}-{step}',C('drive-edge',I(k),I(1),I(step)),B(step==d))
        test(f'oneway-entry-{d}-{step}',C('drive-edge',I(1),I(k),I(step)),B(step!=(d+2)%4))
    test(f'oneway-driveway-{d}',C('drive-edge',I(k),I(3),I((d+1)%4)),B(True))
for node,d in [(127,0),(16383,1),(16384+127,0),(32767,1),(16384,2),(16384,3)]:
    test(f'bounded-{node}-{d}',C('neighbor',I(node),I(d)),I(-1))
for node in [0,127,16383]:
    test(f'layer-roundtrip-{node}',C('neighbor',C('neighbor',I(node),I(4)),I(4)),I(node))
# Map literals avoid calling any game code from this early topology module.
def tiles(pairs):
    value=MP()
    for key,kind in pairs:value=mput('I64 I64',value,I(key),I(kind))
    return value
for label,pairs,mode,expected in [
 ('no-portal',[(129,1),(16513,1)],2,False),
 ('road-portal',[(129,13),(16513,1)],2,True),
 ('walk-portal',[(129,13),(16513,7)],1,True),
 ('no-car-foot-tunnel',[(129,13),(16513,7)],2,False),
 ('missing-under',[(129,13)],1,False),
]:
 test(label,C('can-step',tiles(pairs),I(129),I(16513),I(128),I(16514),I(mode)),B(expected))
test('no-vertical-teleport',C('can-step',tiles([(129,13),(16514,1)]),I(129),I(16514),I(128),I(16515),I(2)),B(False))
test('oneway-sidewalk-reverse',C('can-step',tiles([(129,9),(130,9)]),I(130),I(129),I(131),I(128),I(1)),B(True))
test('oneway-car-reverse-blocked',C('can-step',tiles([(129,9),(130,9)]),I(130),I(129),I(131),I(128),I(2)),B(False))
checks=[d for d in D if '(test create ' in d]
emit('roads','roads',[d for d in D if d not in checks])
import re
owners={re.search(r'\(function create ([^ ]+)',d)[1] for d in D if '(function create ' in d}
def qualify(m):return '(call '+('roads::'+m[1] if m[1] in owners else m[1])
emit('roadtests','roadtests',[re.sub(r'\(call ([^ :()]+)(?=[ )])',qualify,d) for d in checks])
