"""Bounded native viewport projection for aggregate traffic, not legacy frames."""
from mesoscopic import *
TYPES['MesoView']={k:'I64' for k in 'x y w h'.split()}
TYPES['MesoRow']='(list I64)'
TYPES['MesoFrame']={'stats':'MesoTotals','view':'MesoView','level':'I64','drawLimit':'I64','rows':'(list MesoRow)'}
TYPES['MesoViewInput']={'model':'MesoInput','view':'MesoView'}
TYPES['MesoViewResult']={'frame':'MesoFrame','city':'MesoCity'}
D,fn=declarations()
fn('view',[('view','MesoView')],'MesoView',LET([
 ('x',lo(I(15),hi(I(0),V('view.x')))),('y',lo(I(31),hi(I(0),V('view.y')))),
],R(x=V('x'),y=V('y'),w=lo(sub(I(16),V('x')),hi(I(1),V('view.w'))),h=lo(sub(I(32),V('y')),hi(I(1),V('view.h'))))))
fn('visible',[('id','I64'),('view','MesoView')],'Bool',LET([
 ('x',rem(V('id'),I(16))),('y',div(V('id'),I(16))),
],AND(le(V('view.x'),V('x')),lt(V('x'),add(V('view.x'),V('view.w'))),le(V('view.y'),V('y')),lt(V('y'),add(V('view.y'),V('view.h'))))))
fn('rows',[('cohorts','(list MesoCohort)'),('view','MesoView'),('index','I64'),('out','(list MesoRow)')],'(list MesoRow)',
 IF(lt(V('index'),llen('MesoCohort',V('cohorts'))),LET([('c',at('MesoCohort',V('cohorts'),V('index')))],
 C('rows',V('cohorts'),V('view'),add(V('index'),I(1)),IF(C('visible',V('c.id'),V('view')),append('MesoRow',V('out'),LS('I64',*[V('c.'+k) for k in 'id population home queuedOut outbound work queuedBack inbound road rail travel'.split()])),V('out')))),V('out')))
fn('frame',[('city','MesoCity'),('requested','MesoView')],'MesoFrame',LET([
 ('view',C('view',V('requested'))),('area',mul(V('view.w'),V('view.h'))),('level',IF(le(V('area'),I(16)),I(2),IF(le(V('area'),I(96)),I(1),I(0)))),
],R(stats=C('mesoprobe::totals',V('city')),view=V('view'),level=V('level'),drawLimit=IF(eq(V('level'),I(2)),I(1536),IF(eq(V('level'),I(1)),I(640),I(256))),rows=C('rows',V('city.cohorts'),V('view'),I(0),LS('MesoRow')))))
fn('run',[('input','MesoViewInput')],'MesoViewResult',LET([('result',C('mesoprobe::run',V('input.model')))],R(frame=C('frame',V('result.state'),V('input.view')),city=V('result.state'))))
for id,view,expected in [(0,(0,0,1,1),True),(16,(0,0,1,1),False),(255,(15,15,1,1),True),(256,(0,16,1,1),True),(17,(0,0,1,1),False)]:
 D.append(TEST('viewport-'+str(id),C('visible',I(id),R(**{k:I(v) for k,v in zip('x y w h'.split(),view)})),B(expected)))
D.append('(component create projection (visibility private) (port create run (type (function (MesoViewInput) MesoViewResult)) (function run)))')
emit('mesoview','mesoview',D,tail=' (target create meso-view (component mesoview::projection) (runner command) (port mesoview::projection::run))')
