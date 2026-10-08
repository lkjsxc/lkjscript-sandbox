"""Command-only integrated probes use the ordinary native game/edit/save code.

No host simulator or store bypass is involved. These runners let external tests
compare every field and exercise captured demolition reviews and format readers.
"""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
TYPES['ConstructionInput']={'city':'City','command':'Command'}
TYPES['RoadReviewInput']={'city':'City','command':'Command','quote':'EditQuote','apply':'Bool'}
TYPES['RoadReviewResult']={'quote':'EditQuote','outcome':'Outcome'}
fn('construction',[('input','ConstructionInput')],'Outcome',C('town::command',V('input.city'),V('input.command')))
fn('review',[('input','RoadReviewInput')],'RoadReviewResult',IF(V('input.apply'),LET([('out',C('remove::apply',V('input.city'),V('input.quote')))],R(quote=V('input.quote'),outcome=R(city=C('moneyedit::command',V('input.city'),V('out.city')),notice=V('out.notice')))),R(quote=C('remove::quote',V('input.city'),V('input.command'),I(701)),outcome=R(city=V('input.city'),notice=T('Review only.')))))
fn('migration',[('input','Saved')],'Saved',C('migrate::decode',G('std::data-encode','Saved',V('input'))))
# Portal cells share a conflict domain without merging the two physical lanes.
tiles=put(put(put(MP(),I(129),I(13)),I(16513),I(1)),I(16514),I(1))
world=C('game::world',tiles,MP(),I(1))
for node,expected in [(129,129),(16513,129),(16514,16514)]:
 D.append(TEST('portal-conflict-domain-'+str(node),C('game::junction-key',world,I(node)),I(expected)))
D.append(TEST('underground-lane-distinct',eq(C('game::lane-key',I(129),I(0),I(0)),C('game::lane-key',I(16513),I(0),I(0))),B(False)))
D.append(TEST('review-ground-excludes-under',C('remove::within',ZERO('EditQuote',x=I(1),y=I(1),x2=I(1),y2=I(1),layer=I(0)),I(16513)),B(False)))
D.append(TEST('review-under-excludes-ground',C('remove::within',ZERO('EditQuote',x=I(1),y=I(1),x2=I(1),y2=I(1),layer=I(1)),I(129)),B(False)))
D.append(TEST('review-under-includes-under',C('remove::within',ZERO('EditQuote',x=I(1),y=I(1),x2=I(1),y2=I(1),layer=I(1)),I(16513)),B(True)))
for name,param,result,func in [('construction-probe','ConstructionInput','Outcome','construction'),('removal-probe','RoadReviewInput','RoadReviewResult','review'),('migration-probe','Saved','Saved','migration')]:
 D.append(f'(component create {name} (visibility private) (port create run (type (function ({param}) {result})) (function {func})))')
emit('roadintegration','roadintegration',D,tail=' '.join(f'(target create {n} (component roadintegration::{n}) (runner command) (port roadintegration::{n}::run))' for n in ['construction-probe','removal-probe','migration-probe']))
