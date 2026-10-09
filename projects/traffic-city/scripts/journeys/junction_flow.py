"""Directional crossing reservations with FIFO platoons and demand aging.

The low four busy bits still describe occupied quadrants. Higher bits record
which exact movements own them. Cars in the same movement may follow at lane
headway; all other conflicting movements wait. Portal mask 15 is exclusive.
Demand ages use negative headReady keys, disjoint from nonnegative lane keys.
These are per-tick facts, not new persistent City or Resident fields.
"""
from native import *


def add_junction_flow(fn, test):
    weight = I(16384)
    for mask in reversed(range(1, 15)):
        weight = IF(eq(V('mask'), I(mask)), I(2 ** (mask - 1)), weight)
    fn('flow-bit', [('mask', 'I64')], 'I64', weight)
    fn('flow-reserve', [('busy', 'I64'), ('mask', 'I64')], 'I64', LET([
        ('bits', div(V('busy'), I(16))), ('bit', C('flow-bit', V('mask'))),
        ('new', IF(eq(mod(div(V('bits'), V('bit')), I(2)), I(0)), add(V('bits'), V('bit')), V('bits'))),
    ], add(C('mask-union', mod(V('busy'), I(16)), V('mask'), I(1)), mul(V('new'), I(16)))))
    fn('flow-put', [('values', 'Numbers'), ('key', 'I64'), ('mask', 'I64')], 'Numbers',
       put(V('values'), V('key'), C('flow-reserve', get(V('values'), V('key')), V('mask'))))
    fn('flow-other', [('bits', 'I64'), ('mask', 'I64'), ('i', 'I64'), ('bit', 'I64')], 'Bool',
       IF(le(V('i'), I(15)), OR(
           AND(NOT(eq(V('i'), V('mask'))), eq(mod(div(V('bits'), V('bit')), I(2)), I(1)), C('mask-conflict', V('i'), V('mask'))),
           C('flow-other', V('bits'), V('mask'), add(V('i'), I(1)), mul(V('bit'), I(2)))), B(False)))
    fn('flow-conflict', [('busy', 'I64'), ('mask', 'I64')], 'Bool',
       AND(C('mask-conflict', mod(V('busy'), I(16)), V('mask')), OR(
           eq(V('mask'), I(15)), eq(div(V('busy'), I(16)), I(0)),
           AND(NOT(eq(div(V('busy'), I(16)), C('flow-bit', V('mask')))),
               C('flow-other', div(V('busy'), I(16)), V('mask'), I(1), I(1))))))
    fn('flow-mask', [('world', 'World'), ('node', 'I64'), ('incoming', 'I64'), ('outgoing', 'I64')], 'I64',
       IF(C('roads::portal', V('world.tiles'), V('node')), I(15), C('movement-mask', V('incoming'), V('outgoing'))))
    fn('flow-key', [('zone', 'I64'), ('mask', 'I64')], 'I64', sub(I(-1), add(mul(V('zone'), I(16)), V('mask'))))
    fn('flow-older', [('ages', 'Numbers'), ('zone', 'I64'), ('mask', 'I64'), ('age', 'I64'), ('i', 'I64')], 'Bool',
       IF(le(V('i'), I(15)), OR(
           AND(NOT(eq(V('i'), V('mask'))), C('mask-conflict', V('i'), V('mask')),
               LET([('older', get(V('ages'), C('flow-key', V('zone'), V('i'))))],
                   AND(le(I(5), V('older')), lt(V('age'), V('older'))))),
           C('flow-older', V('ages'), V('zone'), V('mask'), V('age'), add(V('i'), I(1)))), B(False)))
    # Only a ready lane head with a usable receiving lane can stop a platoon.
    demand = LET([
        ('route', C('route', V('sim.routes'), V('r.route'))), ('step', add(V('r.step'), I(1))),
    ], IF(AND(lt(V('step'), llen('I64', V('route.path'))), le(I(0), V('r.step')),
              eq(at('I64', V('route.path'), V('r.step')), V('r.cell'))), LET([
        ('next', at('I64', V('route.path'), V('step'))),
        ('direction', IF(eq(C('roads::ground', V('r.cell')), C('roads::ground', V('next'))), V('r.dir'), C('direction', V('r.cell'), V('next')))),
        ('beyond', IF(lt(add(V('step'), I(1)), llen('I64', V('route.path'))), at('I64', V('route.path'), add(V('step'), I(1))), V('next'))),
        ('out', IF(eq(C('roads::ground', V('next')), C('roads::ground', V('beyond'))), V('direction'), C('direction', V('next'), V('beyond')))),
        ('kind', get(V('world.tiles'), V('next'))), ('exitKind', get(V('world.tiles'), V('beyond'))),
        ('key', C('lane-key', V('next'), V('direction'), C('lane', V('kind'), V('r.id')))),
        ('exit', C('lane-key', V('beyond'), V('out'), C('lane', V('exitKind'), V('r.id')))),
        ('mask', C('flow-mask', V('world'), V('next'), V('direction'), V('out'))),
        ('ageKey', C('flow-key', C('junction-key', V('world'), V('next')), V('mask'))),
    ], IF(AND(lt(I(0), get(V('world.junctions'), V('next'))),
              C('can-step', V('world.tiles'), V('r.cell'), V('next'), V('r.cell'), V('route.dest'), I(2)),
              C('signal-allows', get(V('world.signals'), V('next')), V('direction'), V('r.wait'), add(V('sim.tick'), I(1))),
              lt(sub(get(V('f.occ'), V('key')), IF(eq(V('r.exitKey'), add(V('key'), I(1))), I(1), I(0))), C('storage', V('kind'))),
              OR(C('building', V('exitKind')), lt(get(V('f.occ'), V('exit')), I(2)))),
           PATCH('Facts', V('f'), headReady=put(V('f.headReady'), V('ageKey'), mx(get(V('f.headReady'), V('ageKey')), add(V('r.wait'), I(1))))), V('f'))), V('f')))
    fn('flow-demand', [('world', 'World'), ('sim', 'Sim'), ('r', 'Resident'), ('f', 'Facts')], 'Facts',
       IF(AND(eq(V('r.mode'), I(2)), eq(V('r.state'), I(2)), le(V('r.duration'), add(V('r.elapsed'), I(1))),
              eq(get(V('f.heads'), C('lane-key', V('r.cell'), V('r.dir'), V('r.lane'))), V('r.id'))), demand, V('f')))
    fn('flow-demands-scan', [('world', 'World'), ('sim', 'Sim'), ('i', 'I64'), ('f', 'Facts'), ('missing', 'Resident')], 'Facts',
       IF(lt(V('i'), llen('I64', V('sim.ids'))),
          C('flow-demands-scan', V('world'), V('sim'), add(V('i'), I(1)),
            C('flow-demand', V('world'), V('sim'), mget('I64 Resident', V('sim.agents'), at('I64', V('sim.ids'), V('i')), V('missing')), V('f')), V('missing')), V('f')))
    fn('flow-demands', [('world', 'World'), ('sim', 'Sim'), ('f', 'Facts')], 'Facts',
       C('flow-demands-scan', V('world'), V('sim'), I(0), V('f'), C('empty-agent')))
    for mask in [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14, 15]:
        busy = C('flow-reserve', I(0), I(mask))
        test('flow-repeat-' + str(mask), C('flow-reserve', busy, I(mask)), busy)
        test('flow-headway-' + str(mask), C('flow-conflict', busy, I(mask)), B(mask == 15))
    for a, b in [(6, 9), (4, 8), (6, 12), (7, 9), (15, 4), (4, 15)]:
        test(f'flow-pair-{a}-{b}', C('flow-conflict', C('flow-reserve', I(0), I(a)), I(b)), B(bool(a & b)))
    test('flow-mixed-does-not-hide-conflict', C('flow-conflict', C('flow-reserve', C('flow-reserve', I(0), I(4)), I(3)), I(6)), B(True))
    test('flow-legacy-busy-is-conservative', C('flow-conflict', I(4), I(4)), B(True))
    aged = put(MP(), C('flow-key', I(9), I(12)), I(8))
    test('flow-aged-crossing-drains-platoon', C('flow-older', aged, I(9), I(6), I(1), I(1)), B(True))
    test('flow-older-head-keeps-priority', C('flow-older', aged, I(9), I(6), I(9), I(1)), B(False))
