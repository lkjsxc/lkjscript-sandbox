"""Exact integer A* with a packed persistent LIFO frontier per f-cost.

No weighted heuristic, approximate route, mutable host state, or queue truncation.
The linked frontier is an append-only persistent vector. Each I64 contains a cell
and the previous head index; a bucket stores only its current head. Same-f nodes
are consumed immediately, avoiding the predecessor's breadth-first plateaus.
"""
from native import *

SEARCH_TYPE = {'hx':'Numbers', 'hy':'Numbers', 'buckets':'Numbers',
               'dist':'Numbers', 'parent':'Numbers', 'pending':'I64',
               'links':'(list I64)'}

def state(value, **changes):
    return R(**{key:changes.get(key, F(value,key)) for key in SEARCH_TYPE})

def add_frontier(fn):
    fn('frontier-push', [('cell','I64'),('priority','I64'),('s','Search')], 'Search',
       LET([('head',get(V('s.buckets'),V('priority'))),
            ('link',add(V('cell'),mul(V('head'),I(65536))))],
           state(V('s'), buckets=put(V('s.buckets'),V('priority'),add(llen('I64',V('s.links')),I(1))),
                 links=append('I64',V('s.links'),V('link')),pending=add(V('s.pending'),I(1)))))
    fn('relax', [('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),
                 ('mode','I64'),('from','I64'),('to','I64'),('cost','I64'),('s','Search')], 'Search',
       LET([('cost2',add(V('cost'),C('edge-estimate',V('world'),V('q'),V('to'),V('mode')))),
               ('known',get(V('s.dist'),V('to')))],
              IF(OR(eq(V('known'),I(0)),lt(add(V('cost2'),I(1)),V('known'))),
                 C('frontier-push',V('to'),add(V('cost2'),C('heuristic',V('to'),V('dest'),V('mode'),V('s.hx'),V('s.hy'))),
                   state(V('s'),dist=put(V('s.dist'),V('to'),add(V('cost2'),I(1))),
                         parent=put(V('s.parent'),V('to'),V('from')))),V('s'))))
    # Checked topology slots need only arithmetic offsets in the hot loop.
    offset = IF(eq(V('direction'),I(0)),add(V('from'),I(1)),
        IF(eq(V('direction'),I(1)),add(V('from'),I(128)),
        IF(eq(V('direction'),I(2)),sub(V('from'),I(1)),
        IF(eq(V('direction'),I(3)),sub(V('from'),I(128)),
        IF(lt(V('from'),I(16384)),add(V('from'),I(16384)),sub(V('from'),I(16384)))))))
    admitted = LET([('to',offset)],
        IF(OR(eq(V('slot'),I(1)),eq(V('to'),V('dest')),eq(V('to'),V('origin'))),
            C('relax',V('world'),V('q'),V('origin'),V('dest'),V('mode'),V('from'),V('to'),V('cost'),V('s')),V('s')))
    fn('expand-slots', [('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),
                  ('mode','I64'),('from','I64'),('cost','I64'),('direction','I64'),
                  ('divisor','I64'),('mask','I64'),('s','Search')], 'Search',
       IF(le(I(0),V('direction')),
          LET([('slot',mod(div(V('mask'),V('divisor')),I(4))),
               ('next',IF(eq(V('slot'),I(0)),V('s'),admitted))],
          C('expand-slots',V('world'),V('q'),V('origin'),V('dest'),V('mode'),V('from'),V('cost'),
            sub(V('direction'),I(1)),div(V('divisor'),I(4)),V('mask'),V('next'))),V('s')))
    fn('expand', [('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),
                  ('mode','I64'),('from','I64'),('cost','I64'),('s','Search')], 'Search',
       LET([('packed',get(V('world.junctions'),sub(I(-1024),V('from')))),
            ('code',IF(lt(I(0),V('packed')),sub(V('packed'),I(1)),C('roadcache::code',V('world.tiles'),V('from')))),
            ('mask',mod(IF(eq(V('mode'),I(1)),V('code'),div(V('code'),I(1024))),I(1024))),
            ('portal',le(I(256),V('mask')))],
       C('expand-slots',V('world'),V('q'),V('origin'),V('dest'),V('mode'),V('from'),V('cost'),
         IF(V('portal'),I(4),I(3)),IF(V('portal'),I(256),I(64)),V('mask'),V('s'))))
    fn('reverse',[('items','(list I64)'),('index','I64'),('result','(list I64)')],'(list I64)',
       IF(le(I(0),V('index')),C('reverse',V('items'),sub(V('index'),I(1)),append('I64',V('result'),at('I64',V('items'),V('index')))),V('result')))
    fn('trace',[('parent','Numbers'),('origin','I64'),('cell','I64'),('result','(list I64)')],'(list I64)',
       LET([('result2',append('I64',V('result'),V('cell')))],
           IF(eq(V('cell'),V('origin')),C('reverse',V('result2'),sub(llen('I64',V('result2')),I(1)),LS('I64')),
              C('trace',V('parent'),V('origin'),get(V('parent'),V('cell')),V('result2')))))
    args=[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('mode','I64'),('cost','I64'),('s','Search')]
    def loop(s, cost=None):
        return C('search-loop',V('world'),V('q'),V('origin'),V('dest'),V('mode'),cost or V('cost'),s)
    step=LET([('link',at('I64',V('s.links'),sub(V('head'),I(1)))),
              ('cell',mod(V('link'),I(65536))),('previous',div(V('link'),I(65536))),
              ('g',sub(get(V('s.dist'),V('cell')),I(1))),
              ('remaining',state(V('s'),buckets=C('qput',V('s.buckets'),V('cost'),V('previous')),pending=sub(V('s.pending'),I(1))))],
             IF(eq(add(V('g'),C('heuristic',V('cell'),V('dest'),V('mode'),V('s.hx'),V('s.hy'))),V('cost')),
                IF(eq(V('cell'),V('dest')),
                   R(path=C('trace',V('s.parent'),V('origin'),V('cell'),LS('I64')),cost=V('g'),
                     version=V('world.version'),origin=V('origin'),dest=V('dest'),mode=V('mode')),
                   loop(C('expand',V('world'),V('q'),V('origin'),V('dest'),V('mode'),V('cell'),V('g'),V('remaining')))),
                loop(V('remaining'))))
    fn('search-loop',args,'Route',IF(le(V('s.pending'),I(0)),C('empty-route'),
       LET([('head',get(V('s.buckets'),V('cost')))],IF(lt(I(0),V('head')),step,loop(V('s'),add(V('cost'),I(1)))))))
    fn('find-route',[('world','World'),('q','Numbers'),('origin','I64'),('dest','I64'),('mode','I64')],'Route',
       IF(AND(le(I(0),V('origin')),lt(V('origin'),I(32768)),le(I(0),V('dest')),lt(V('dest'),I(32768)),OR(eq(V('mode'),I(1)),eq(V('mode'),I(2))),lt(I(0),get(V('world.tiles'),V('dest')))),
          LET([('cached',C('cache-world',V('world'))),
               ('priority',C('heuristic',V('origin'),V('dest'),V('mode'),V('cached.junctions'),V('cached.junctions'))),
               ('s',R(hx=V('cached.junctions'),hy=V('cached.junctions'),buckets=put(MP(),V('priority'),I(1)),
                      dist=put(MP(),V('origin'),I(1)),parent=MP(),pending=I(1),links=LS('I64',V('origin'))))],
              C('search-loop',V('cached'),V('q'),V('origin'),V('dest'),V('mode'),V('priority'),V('s'))),C('empty-route')))
