"""Topology-first commuting paths; the exact weighted router stays as a reference.

Driving searches minimize legal hops rather than congestion-weighted journey time.
Costs are re-evaluated along the selected path for modal choice. Every traversed
edge still obeys the existing prepared topology, directions and explicit portals.
The unit-hop heuristic is consistent, so the monotone integer frontier is valid.
"""
from native import *
from frontier import add_frontier


def add_relaxed_frontier(fn):
    selected = {'relax', 'expand-slots', 'expand', 'search-loop', 'find-route'}
    names = {name: 'hop-' + name for name in selected}
    names['heuristic'] = 'hop-heuristic'

    def capture(name, params, result, body):
        if name not in selected:
            return
        if name == 'relax':
            weighted = C('edge-estimate', V('world'), V('q'), V('to'), V('mode'))
            assert body.count(weighted) == 1
            body = body.replace(weighted, I(1))
        # All other helpers, including packed topology and path extraction, stay
        # shared with the reference. Prefix only this router's recursive calls.
        for old, new in names.items():
            body = body.replace('(call ' + old + ' ', '(call ' + new + ' ')
        fn(names[name], params, result, body)

    fn('hop-heuristic', [('cell', 'I64'), ('dest', 'I64'), ('mode', 'I64'),
                         ('hx', 'Numbers'), ('hy', 'Numbers')], 'I64',
       add(C('manhattan', V('cell'), V('dest')),
           C('abs', sub(div(V('cell'), I(16384)), div(V('dest'), I(16384))))))
    add_frontier(capture)
    fn('find-commute-route', [('world', 'World'), ('q', 'Numbers'),
                             ('origin', 'I64'), ('dest', 'I64'), ('mode', 'I64')],
       'Route',
       IF(eq(V('mode'), I(2)),
          LET([('route', C('hop-find-route', V('world'), V('q'), V('origin'),
                          V('dest'), V('mode')))],
              IF(lt(V('route.cost'), I(0)), V('route'),
                 PATCH('Route', V('route'), cost=C('estimate-loop', V('world'),
                       V('q'), V('route'), I(1), I(0))))),
          C('find-route', V('world'), V('q'), V('origin'), V('dest'), V('mode'))))
