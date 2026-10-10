"""Development-only authoring of a bounded, native aggregate traffic model.

People are integer mass, not individually allocated agents. Each cohort is a
bidirectional district corridor sharing road and transit receiving capacity.
Home/work residence and travel use leaky compartments rather than exact clocks.
This is intentionally approximate and independent of the legacy City/save type.
"""
from native import *

TYPES.clear()
TYPES['MesoCohort'] = {k: 'I64' for k in (
    'id population home queuedOut outbound work queuedBack inbound road rail '
    'travel requested arrived visits roadTrips railTrips waitTicks travelTicks'
).split()}
TYPES['MesoCity'] = {'cohorts': '(list MesoCohort)', 'tick': 'I64', 'population': 'I64'}
TYPES['MesoTotals'] = {k: 'I64' for k in (
    'tick groups population home queued outbound work inbound requested arrived '
    'outstanding visits roadTrips railTrips waitTicks travelTicks massError journeyError'
).split()}
TYPES['MesoInput'] = {k: 'I64' for k in 'population groups ticks capacity rail closedFrom closedUntil'.split()}
TYPES['MesoResult'] = {'state': 'MesoCity', 'initial': 'MesoTotals', 'final': 'MesoTotals'}

def lo(a, b): return C('mesomath::min', a, b)
def hi(a, b): return C('mesomath::max', a, b)
def rem(a, b): return C('mesomath::mod', a, b)
def sumv(*values):
    value = I(0)
    for item in values: value = add(value, item)
    return value

def declarations():
    definitions = []
    def function(name, params, result, body): definitions.append(FN(name, params, result, body))
    return definitions, function

D, fn = declarations()
fn('min', [('a', 'I64'), ('b', 'I64')], 'I64', IF(lt(V('a'), V('b')), V('a'), V('b')))
fn('max', [('a', 'I64'), ('b', 'I64')], 'I64', IF(lt(V('a'), V('b')), V('b'), V('a')))
fn('mod', [('a', 'I64'), ('b', 'I64')], 'I64', sub(V('a'), mul(div(V('a'), V('b')), V('b'))))
fn('release', [('people', 'I64'), ('duration', 'I64')], 'I64',
   lo(V('people'), hi(I(1), div(V('people'), hi(I(1), V('duration'))))))
for people, duration, expected in [(0, 10, 0), (1, 10, 1), (100, 10, 10), (10, 0, 10)]:
    D.append(TEST('release-' + str(people) + '-' + str(duration), C('release', I(people), I(duration)), I(expected)))
emit('mesomath', 'mesomath', D)

D, fn = declarations()
fn('mass', [('c', 'MesoCohort')], 'I64', sumv(*[V('c.' + k) for k in 'home queuedOut outbound work queuedBack inbound'.split()]))
fn('outstanding', [('c', 'MesoCohort')], 'I64', sumv(*[V('c.' + k) for k in 'queuedOut outbound queuedBack inbound'.split()]))
fn('seed', [('id', 'I64'), ('population', 'I64'), ('groups', 'I64'), ('road', 'I64'), ('rail', 'I64')], 'MesoCohort',
   LET([('people', add(div(V('population'), V('groups')), IF(lt(V('id'), rem(V('population'), V('groups'))), I(1), I(0))))],
       ZERO('MesoCohort', id=V('id'), population=V('people'), home=V('people'), road=V('road'),
            rail=IF(eq(rem(V('id'), I(4)), I(0)), V('rail'), I(0)), travel=add(I(8), rem(mul(V('id'), I(7)), I(25))))))
# All transfers use the previous cohort and one shared receiving budget. We do
# not claim microscopic car-following, fixed travel-time or individual identity.
fn('step', [('c', 'MesoCohort'), ('tick', 'I64'), ('closed', 'Bool')], 'MesoCohort', LET([
    ('homeLeave', C('mesomath::release', V('c.home'), I(72))),
    ('workLeave', C('mesomath::release', V('c.work'), I(40))),
    ('outArrive', C('mesomath::release', V('c.outbound'), V('c.travel'))),
    ('backArrive', C('mesomath::release', V('c.inbound'), V('c.travel'))),
    ('outQueue', add(V('c.queuedOut'), V('homeLeave'))),
    ('backQueue', add(V('c.queuedBack'), V('workLeave'))),
    ('nominal', add(V('c.road'), V('c.rail'))),
    ('storage', mul(mul(V('nominal'), V('c.travel')), I(2))),
    ('occupied', sub(add(V('c.outbound'), V('c.inbound')), add(V('outArrive'), V('backArrive')))),
    ('capacity', IF(V('closed'), I(0), lo(V('nominal'), hi(I(0), sub(V('storage'), V('occupied')))))),
    ('outCap', hi(div(add(V('capacity'), rem(V('tick'), I(2))), I(2)), sub(V('capacity'), V('backQueue')))),
    ('outLeave', lo(V('outQueue'), V('outCap'))),
    ('backLeave', lo(V('backQueue'), sub(V('capacity'), V('outLeave')))),
    ('departures', add(V('outLeave'), V('backLeave'))),
    ('railDepartures', IF(eq(V('nominal'), I(0)), I(0), div(mul(V('departures'), V('c.rail')), V('nominal')))),
], PATCH('MesoCohort', V('c'),
    home=add(sub(V('c.home'), V('homeLeave')), V('backArrive')),
    queuedOut=sub(V('outQueue'), V('outLeave')),
    outbound=sub(add(V('c.outbound'), V('outLeave')), V('outArrive')),
    work=add(sub(V('c.work'), V('workLeave')), V('outArrive')),
    queuedBack=sub(V('backQueue'), V('backLeave')),
    inbound=sub(add(V('c.inbound'), V('backLeave')), V('backArrive')),
    requested=sumv(V('c.requested'), V('homeLeave'), V('workLeave')),
    arrived=sumv(V('c.arrived'), V('outArrive'), V('backArrive')),
    visits=add(V('c.visits'), V('outArrive')),
    roadTrips=add(V('c.roadTrips'), sub(V('departures'), V('railDepartures'))),
    railTrips=add(V('c.railTrips'), V('railDepartures')),
    waitTicks=sumv(V('c.waitTicks'), V('outQueue'), V('backQueue')),
    travelTicks=sumv(V('c.travelTicks'), V('c.outbound'), V('c.inbound')),
)))
emit('mesocohort', 'mesocohort', D)

D, fn = declarations()
fn('seed-loop', [('population', 'I64'), ('groups', 'I64'), ('road', 'I64'), ('rail', 'I64'), ('id', 'I64'), ('cohorts', '(list MesoCohort)')], '(list MesoCohort)',
   IF(lt(V('id'), V('groups')), C('seed-loop', V('population'), V('groups'), V('road'), V('rail'), add(V('id'), I(1)),
       append('MesoCohort', V('cohorts'), C('mesocohort::seed', V('id'), V('population'), V('groups'), V('road'), V('rail')))), V('cohorts')))
fn('seed', [('input', 'MesoInput')], 'MesoCity', LET([
    ('population', lo(I(1000000), hi(I(0), V('input.population')))),
    ('groups', lo(I(512), hi(I(1), V('input.groups')))),
    ('road', lo(I(1000), hi(I(0), V('input.capacity')))),
    ('rail', lo(I(1000), hi(I(0), V('input.rail')))),
], R(cohorts=C('seed-loop', V('population'), V('groups'), V('road'), V('rail'), I(0), LS('MesoCohort')), tick=I(0), population=V('population'))))
fn('step-loop', [('cohorts', '(list MesoCohort)'), ('tick', 'I64'), ('closed', 'Bool'), ('id', 'I64'), ('out', '(list MesoCohort)')], '(list MesoCohort)',
   IF(lt(V('id'), llen('MesoCohort', V('cohorts'))), C('step-loop', V('cohorts'), V('tick'), V('closed'), add(V('id'), I(1)),
       append('MesoCohort', V('out'), C('mesocohort::step', at('MesoCohort', V('cohorts'), V('id')), V('tick'), V('closed')))), V('out')))
fn('tick', [('city', 'MesoCity'), ('closed', 'Bool')], 'MesoCity',
   R(cohorts=C('step-loop', V('city.cohorts'), V('city.tick'), V('closed'), I(0), LS('MesoCohort')), tick=add(V('city.tick'), I(1)), population=V('city.population')))
fn('advance', [('city', 'MesoCity'), ('remaining', 'I64'), ('closedFrom', 'I64'), ('closedUntil', 'I64')], 'MesoCity',
   IF(lt(I(0), V('remaining')), C('advance', C('tick', V('city'), AND(le(V('closedFrom'), V('city.tick')), lt(V('city.tick'), V('closedUntil')))),
       sub(V('remaining'), I(1)), V('closedFrom'), V('closedUntil')), V('city')))
emit('mesocity', 'mesocity', D)

D, fn = declarations()
changes = {k: add(V('sum.' + k), V('c.' + k)) for k in 'population home outbound work inbound requested arrived visits roadTrips railTrips waitTicks travelTicks'.split()}
changes.update(groups=add(V('sum.groups'), I(1)), queued=sumv(V('sum.queued'), V('c.queuedOut'), V('c.queuedBack')),
               outstanding=add(V('sum.outstanding'), C('mesocohort::outstanding', V('c'))),
               massError=add(V('sum.massError'), sub(C('mesocohort::mass', V('c')), V('c.population'))),
               journeyError=add(V('sum.journeyError'), sub(sub(V('c.requested'), V('c.arrived')), C('mesocohort::outstanding', V('c')))))
fn('add', [('sum', 'MesoTotals'), ('c', 'MesoCohort')], 'MesoTotals', PATCH('MesoTotals', V('sum'), **changes))
fn('loop', [('cohorts', '(list MesoCohort)'), ('id', 'I64'), ('sum', 'MesoTotals')], 'MesoTotals',
   IF(lt(V('id'), llen('MesoCohort', V('cohorts'))), C('loop', V('cohorts'), add(V('id'), I(1)), C('add', V('sum'), at('MesoCohort', V('cohorts'), V('id')))), V('sum')))
fn('totals', [('city', 'MesoCity')], 'MesoTotals', C('loop', V('city.cohorts'), I(0), ZERO('MesoTotals', tick=V('city.tick'))))
fn('run', [('input', 'MesoInput')], 'MesoResult', LET([
    ('seed', C('mesocity::seed', V('input'))),
    ('city', C('mesocity::advance', V('seed'), lo(I(4096), hi(I(0), V('input.ticks'))), V('input.closedFrom'), V('input.closedUntil'))),
], R(state=V('city'), initial=C('totals', V('seed')), final=C('totals', V('city')))))
# Small embedded tests; scale and timings are measured by the separate benchmark.
for population in [0, 1, 100003]:
    for closed in [False, True]:
        input = ZERO('MesoInput', population=I(population), groups=I(4), ticks=I(12), capacity=I(3), rail=I(5), closedFrom=I(0), closedUntil=I(12 if closed else 0))
        run = C('run', input)
        tag = str(population) + '-' + str(closed).lower()
        for field in ['massError', 'journeyError']:
            D.append(TEST(field + '-' + tag, F(F(run, 'final'), field), I(0)))
        D.append(TEST('population-' + tag, F(F(run, 'final'), 'population'), I(population)))
D.append('(component create probe (visibility private) (port create run (type (function (MesoInput) MesoResult)) (function run)))')
emit('mesoprobe', 'mesoprobe', D, tail=' (target create meso-benchmark (component mesoprobe::probe) (runner command) (port mesoprobe::probe::run))')
print('Emitted independent native mesoscopic model and conservation tests.')
