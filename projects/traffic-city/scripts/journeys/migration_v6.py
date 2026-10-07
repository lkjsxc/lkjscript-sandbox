# Exact format-6 type shapes, captured before adding any format-7 fields.
import json,re
schema=json.loads((Path(__file__).parent/'legacy_v6_types.json').read_text())
names={n:'Legacy6'+n for n in schema}
def oldtype(t):
 for a,b in names.items():t=re.sub(r'\b'+a+r'\b',b,t)
 return t
for name,shape in schema.items():TYPES[names[name]]={k:oldtype(v) for k,v in shape.items()} if isinstance(shape,dict) else oldtype(shape)
TYPES['Legacy6Saved']={'format':'I64','owner':'Text','serial':'I64','city':'Legacy6City'}
fn('line-v6',[('l','Legacy6RailLine')],'RailLine',R(**{k:V('l.'+k) for k in schema['RailLine']},path=C('railpath::segment',V('l.a'),V('l.b'),LS('I64')),stops=LS('I64',V('l.a'),V('l.b')),direction=IF(eq(V('l.from'),V('l.a')),I(1),I(-1)),queues=mput('I64 (list I64)',mput('I64 (list I64)',MP('I64 (list I64)'),C('railpath::queue-key',V('l.a'),I(1)),V('l.queueA')),C('railpath::queue-key',V('l.b'),I(-1)),V('l.queueB'))))
fn('lines-v6',[('old','Legacy6Transit'),('i','I64'),('out','Transit')],'Transit',IF(lt(V('i'),llen('I64',V('old.ids'))),LET([('id',at('I64',V('old.ids'),V('i'))),('l',C('line-v6',mget('I64 Legacy6RailLine',V('old.lines'),V('id'),ZERO('Legacy6RailLine'))))],C('lines-v6',V('old'),add(V('i'),I(1)),PATCH('Transit',V('out'),lines=mput('I64 RailLine',V('out.lines'),V('id'),V('l')),tracks=C('railpath::track-put',V('l.path'),I(0),V('out.tracks'))))),V('out')))
fn('transit-v6',[('old','Legacy6Transit')],'Transit',C('lines-v6',V('old'),I(0),R(**{k:V('old.'+k) for k in schema['Transit'] if k!='lines'},lines=MP('I64 RailLine'),tracks=MP())))
fn('city-v6',[('old','Legacy6City')],'City',C('money::open',R(**{k:V('old.'+k) for k in schema['City'] if k!='sim'},sim=R(**{k:V('old.sim.'+k) for k in schema['Sim'] if k!='transit'},transit=C('transit-v6',V('old.sim.transit'))),economy=ZERO('Economy'),landscape=I(0))))
legacy6=LET([('old6',G('std::data-decode-or','Legacy6Saved',V('bytes'),ZERO('Legacy6Saved',format=I(-1))))],IF(eq(V('old6.format'),I(6)),R(format=I(8),owner=V('old6.owner'),serial=V('old6.serial'),city=C('city-v6',V('old6.city'))),C('decode-v5',V('bytes'))))
fn('decode-v6',[('bytes','Bytes')],'Saved',legacy6)
fixture=ZERO('Legacy6City',cash=I(4321),originX=I(50),originY=I(54),paused=B(True))
fn('v6-example',[],'City',C('city-v6',fixture))
D.append(TEST('v6-treasury-preserved',F(C('v6-example'),'cash'),I(4321)))
D.append(TEST('v6-origin-preserved',F(C('v6-example'),'originX'),I(50)))
D.append(TEST('v6-opening-ledger-balanced',C('money::conservation',C('v6-example')),I(0)))
line6=ZERO('Legacy6RailLine',id=I(4),a=I(128),b=I(140),**{'from':I(140),'to':I(128)},duration=I(3),elapsed=I(2),passengers=LS('I64',I(19)),boardings=I(87),spent=I(42))
fn('v6-train-example',[],'RailLine',C('line-v6',line6))
D.append(TEST('v6-paid-leg-duration-preserved',F(C('v6-train-example'),'duration'),I(3)))
D.append(TEST('v6-passengers-preserved',F(C('v6-train-example'),'passengers'),LS('I64',I(19))))
D.append(TEST('v6-track-path-preserved',llen('I64',F(C('v6-train-example'),'path')),I(13)))
