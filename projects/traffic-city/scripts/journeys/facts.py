"""Demand-specific native facts; full facts remain an independent regression oracle."""
from native import *


def add_derived_facts(fn, test):
    travelling = eq(V('r.state'), I(2))
    driving = AND(OR(V('travelling'), AND(eq(V('r.state'), I(1)), C('road', get(V('world.tiles'), V('r.cell'))))), eq(V('r.mode'), I(2)))
    inside = IF(OR(eq(V('r.state'), I(3)), eq(V('r.state'), I(4)), AND(eq(V('r.state'), I(2)), C('building', get(V('world.tiles'), V('r.cell'))))), C('bump', V('f.inside'), V('r.cell'), I(1)), V('f.inside'))
    summary_fields = dict(
        q=IF(V('driving'), C('bump', V('f.q'), V('r.cell'), I(1)), V('f.q')),
        walkq=IF(AND(V('travelling'), NOT(eq(V('r.mode'), I(2)))), C('bump', V('f.walkq'), V('r.cell'), I(1)), V('f.walkq')),
        inside=inside,
        employment=IF(le(I(0), V('r.job')), C('bump', V('f.employment'), V('r.job'), I(1)), V('f.employment')),
        waiting=add(V('f.waiting'), IF(le(I(8), V('r.wait')), I(1), I(0))),
        disconnected=add(V('f.disconnected'), IF(AND(eq(V('r.state'), I(1)), OR(eq(V('r.reason'), I(1)), eq(V('r.reason'), I(9)))), I(1), I(0))),
        moving=add(V('f.moving'), IF(OR(V('travelling'), eq(V('r.state'), I(6))), I(1), I(0))),
    )
    fn('summary-agent', [('world', 'World'), ('r', 'Resident'), ('f', 'Facts')], 'Facts',
       LET([('travelling', travelling), ('driving', driving)], PATCH('Facts', V('f'), **summary_fields)))

    # Only vehicles consume lane/head/conflict reservations. In particular, a
    # driver replanning on a road still occupies it, and an exit reservation is
    # counted separately. Pedestrians retain the original building occupancy.
    admission_fields = dict(
        occ=C('bump', IF(lt(I(0), V('r.exitKey')), C('bump', V('f.occ'), sub(V('r.exitKey'), I(1)), I(1)), V('f.occ')), V('key'), I(1)),
        heads=IF(OR(eq(V('oldhead'), I(0)), lt(V('r.ready'), get(V('f.headReady'), V('key'))), AND(eq(V('r.ready'), get(V('f.headReady'), V('key'))), lt(V('r.id'), V('oldhead')))), put(V('f.heads'), V('key'), V('r.id')), V('f.heads')),
        headReady=IF(OR(eq(V('oldhead'), I(0)), lt(V('r.ready'), get(V('f.headReady'), V('key')))), put(V('f.headReady'), V('key'), V('r.ready')), V('f.headReady')),
        busy=IF(AND(le(I(0), V('junction')), lt(V('r.elapsed'), V('r.duration'))), C('flow-put', V('f.busy'), V('junction'), IF(lt(I(0), V('r.mask')), V('r.mask'), I(15))), V('f.busy')),
        inside=inside,
    )
    fn('admission-agent', [('world', 'World'), ('r', 'Resident'), ('f', 'Facts')], 'Facts',
       LET([('travelling', travelling), ('driving', driving)], IF(V('driving'),
           LET([
               ('key', C('resident-lane', V('r'))),
               ('oldhead', get(V('f.heads'), V('key'))),
               ('junction', IF(lt(I(0), get(V('world.junctions'), V('r.cell'))), C('junction-key', V('world'), V('r.cell')), IF(AND(lt(V('r.elapsed'), V('r.duration')), lt(I(0), get(V('world.junctions'), V('r.from')))), C('junction-key', V('world'), V('r.from')), I(-1)))),
           ], PATCH('Facts', V('f'), **admission_fields)),
           PATCH('Facts', V('f'), inside=inside))))
    # map-get-or is eager: construct its unchanged sentinel once per traversal,
    # not once per resident. Keep original identity order and missing-ID meaning.
    for name in ['summary', 'admission']:
        params = [('world', 'World'), ('agents', 'Residents'), ('ids', '(list I64)'), ('index', 'I64'), ('f', 'Facts')]
        fn(name + '-scan', params + [('missing', 'Resident')], 'Facts',
           IF(lt(V('index'), llen('I64', V('ids'))), C(name + '-scan', V('world'), V('agents'), V('ids'), add(V('index'), I(1)), C(name + '-agent', V('world'), mget('I64 Resident', V('agents'), at('I64', V('ids'), V('index')), V('missing')), V('f')), V('missing')), V('f')))
        fn(name, params, 'Facts', C(name + '-scan', V('world'), V('agents'), V('ids'), V('index'), V('f'), C('empty-agent')))

    # Compare the complete projected result, not just a few counters. Cover all
    # resident states/modes and FIFO ties, lingering crossings, reservations,
    # waiting thresholds, disconnected reasons, jobs and occupied buildings.
    world = ZERO('World', tiles=put(put(put(MP(), I(129), I(1)), I(130), I(4)), I(131), I(7)), junctions=put(MP(), I(128), I(1)))
    fn('facts-world', [], 'World', world)
    # Build a resident shape once instead of embedding its full structural type
    # twenty-one times in the proposal's witness. The pinned authoring budget
    # remains unchanged; all states and modes still execute in native checks.
    fn('facts-resident', [('id', 'I64'), ('state', 'I64'), ('mode', 'I64')], 'Resident',
       ZERO('Resident', id=V('id'), state=V('state'), mode=V('mode'),
            cell=IF(eq(V('mode'), I(2)), I(129), IF(eq(V('mode'), I(1)), I(130), I(131))), **{'from': I(128)},
            job=IF(eq(V('mode'), I(3)), I(-1), I(130)), ready=IF(eq(V('state'), I(1)), I(7), sub(I(9), V('state'))),
            wait=IF(eq(V('mode'), I(1)), I(7), I(8)), elapsed=IF(eq(V('mode'), I(1)), I(1), I(0)), duration=I(1),
            mask=mod(V('state'), I(2)), exitKey=IF(eq(mod(V('state'), I(2)), I(1)), I(1041), I(0)),
            reason=IF(eq(V('mode'), I(1)), I(1), IF(eq(V('mode'), I(2)), I(9), I(8)))))
    fixture = MP('I64 Resident')
    ids = []
    for state in range(7):
        for mode in range(1, 4):
            ident = state * 3 + mode
            ids.append(I(ident))
            fixture = mput('I64 Resident', fixture, I(ident), C('facts-resident', I(ident), I(state), I(mode)))
    fn('facts-residents', [], 'Residents', fixture)
    fn('facts-ids', [], '(list I64)', LS('I64', *reversed(ids)))
    for name, fields in [('summary', summary_fields), ('admission', admission_fields)]:
        for label, selection in [('empty', LS('I64')), ('mixed', C('facts-ids'))]:
            actual = C(name, C('facts-world'), C('facts-residents'), selection, I(0), ZERO('Facts'))
            expected = LET([('full', C('facts', C('facts-world'), C('facts-residents'), selection, I(0), ZERO('Facts')))], ZERO('Facts', **{key: V('full.' + key) for key in fields}))
            test('derived-' + name + '-' + label, actual, expected)
        for state in range(7):
            selection = LS('I64', *[I(state * 3 + mode) for mode in range(1, 4)])
            actual = C(name, C('facts-world'), C('facts-residents'), selection, I(0), ZERO('Facts'))
            expected = LET([('full', C('facts', C('facts-world'), C('facts-residents'), selection, I(0), ZERO('Facts')))], ZERO('Facts', **{key: V('full.' + key) for key in fields}))
            test('derived-' + name + '-state-' + str(state), actual, expected)
