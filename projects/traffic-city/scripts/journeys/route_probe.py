"""Command-only routing experiments; the native graph computes every path.

Cold route-probe constructs its world once. route-world prepares immutable
adjacency for route-warm, which tests the common many-queries-per-topology case.
The ordinary World is returned for reproducibility, never a live player save.
"""
from native import *
TYPES['RouteQuery']={k:'I64' for k in ['origin','dest','mode']}
TYPES['RouteProbe']={'tiles':'Numbers','q':'Numbers','queries':'(list RouteQuery)'}
TYPES['WarmProbe']={'world':'World','q':'Numbers','queries':'(list RouteQuery)'}
D=[]
D.append(FN('batch',[('world','World'),('q','Numbers'),('queries','(list RouteQuery)'),('i','I64'),('out','(list Route)')],'(list Route)',
 IF(lt(V('i'),llen('RouteQuery',V('queries'))),LET([('query',at('RouteQuery',V('queries'),V('i')))],
 C('batch',V('world'),V('q'),V('queries'),add(V('i'),I(1)),append('Route',V('out'),
 C('game::find-route',V('world'),V('q'),V('query.origin'),V('query.dest'),V('query.mode'))))),V('out'))))
D.append(FN('run',[('input','RouteProbe')],'(list Route)',
 C('batch',C('game::world',V('input.tiles'),MP(),I(1)),V('input.q'),V('input.queries'),I(0),LS('Route'))))
D.append(FN('prepare',[('tiles','Numbers')],'World',C('game::world',V('tiles'),MP(),I(1))))
D.append(FN('warm',[('input','WarmProbe')],'(list Route)',
 C('batch',V('input.world'),V('input.q'),V('input.queries'),I(0),LS('Route'))))
# Test both planners in the same native artifact and prepared world.
D.append(D[0].replace('function create batch ', 'function create commute-batch ').replace('(call batch ', '(call commute-batch ').replace('game::find-route', 'game::find-commute-route'))
D.append(FN('commute-run',[('input','RouteProbe')],'(list Route)', C('commute-batch',C('game::world',V('input.tiles'),MP(),I(1)),V('input.q'),V('input.queries'),I(0),LS('Route'))))
D.append(FN('commute-warm',[('input','WarmProbe')],'(list Route)', C('commute-batch',V('input.world'),V('input.q'),V('input.queries'),I(0),LS('Route'))))
for component,input_type,output,function in [('harness','RouteProbe','(list Route)','run'),('preparer','Numbers','World','prepare'),('prepared','WarmProbe','(list Route)','warm'),('commute-harness','RouteProbe','(list Route)','commute-run'),('commute-prepared','WarmProbe','(list Route)','commute-warm')]:
 D.append(f'(component create {component} (visibility private) (port create run (type (function ({input_type}) {output})) (function {function})))')
tail=' '.join(f'(target create {target} (component routeprobe::{component}) (runner command) (port routeprobe::{component}::run))' for target,component in [('route-probe','harness'),('route-world','preparer'),('route-warm','prepared'),('commute-route-probe','commute-harness'),('commute-route-warm','commute-prepared')])
emit('routeprobe','routeprobe',D,tail=tail)
