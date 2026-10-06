"""Native accounting. Every transfer has a source, destination and conserved balance."""
from native import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
def inc(e,k,value):return add(F(e,k),value)
def balance(e,key):return get(F(e,'wallets'),key)
fn('wallets',[('ids','(list I64)'),('index','I64'),('out','Numbers')],'Numbers',IF(lt(V('index'),llen('I64',V('ids'))),C('wallets',V('ids'),add(V('index'),I(1)),put(V('out'),at('I64',V('ids'),V('index')),I(24))),V('out')))
fn('open',[('city','City')],'City',IF(V('city.economy.active'),V('city'),PATCH('City',V('city'),economy=ZERO('Economy',active=B(True),wallets=C('wallets',V('city.sim.ids'),I(0),MP()),households=mul(llen('I64',V('city.sim.ids')),I(24)),opening=add(V('city.cash'),mul(llen('I64',V('city.sim.ids')),I(24)))))))
fn('work',[('e','Economy'),('r','Resident')],'Economy',LET([
 ('value',mx(I(30),sub(I(50),div(mx(I(0),sub(V('r.lastTime'),V('r.eta'))),I(4))))),
 ('wage',div(mul(V('value'),I(3)),I(5))),('tax',div(V('wage'),I(3))),('net',sub(V('wage'),V('tax'))),('profit',sub(V('value'),V('wage')))],
 PATCH('Economy',V('e'),wallets=put(V('e.wallets'),V('r.id'),add(get(V('e.wallets'),V('r.id')),V('net'))),firms=put(V('e.firms'),V('r.dest'),add(get(V('e.firms'),V('r.dest')),V('profit'))),exports=inc(V('e'),'exports',V('value')),wages=inc(V('e'),'wages',V('wage')),taxes=inc(V('e'),'taxes',V('tax')),periodTaxes=inc(V('e'),'periodTaxes',V('tax')),households=inc(V('e'),'households',V('net')),businesses=inc(V('e'),'businesses',V('profit')))))
fn('purchase',[('e','Economy'),('r','Resident')],'Economy',LET([
 ('amount',mn(balance(V('e'),V('r.id')),IF(eq(V('r.purpose'),I(2)),I(10),I(4)))),('tax',div(V('amount'),I(4))),('net',sub(V('amount'),V('tax')))],
 PATCH('Economy',V('e'),wallets=put(V('e.wallets'),V('r.id'),sub(balance(V('e'),V('r.id')),V('amount'))),firms=put(V('e.firms'),V('r.dest'),add(get(V('e.firms'),V('r.dest')),V('net'))),sales=inc(V('e'),'sales',V('amount')),taxes=inc(V('e'),'taxes',V('tax')),periodTaxes=inc(V('e'),'periodTaxes',V('tax')),households=sub(V('e.households'),V('amount')),businesses=inc(V('e'),'businesses',V('net')))))
fn('fare',[('e','Economy'),('id','I64')],'Economy',LET([('amount',mn(I(1),balance(V('e'),V('id'))))],PATCH('Economy',V('e'),wallets=put(V('e.wallets'),V('id'),sub(balance(V('e'),V('id')),V('amount'))),households=sub(V('e.households'),V('amount')),fares=inc(V('e'),'fares',V('amount')),periodFares=inc(V('e'),'periodFares',V('amount')),concessions=inc(V('e'),'concessions',sub(I(1),V('amount'))))))
fn('person',[('e','Economy'),('old','Resident'),('r','Resident')],'Economy',LET([
 ('done',lt(V('old.journeys'),V('r.journeys'))),
 ('next',IF(V('done'),IF(eq(V('r.purpose'),I(1)),C('work',V('e'),V('r')),IF(OR(eq(V('r.purpose'),I(2)),eq(V('r.purpose'),I(3))),C('purchase',V('e'),V('r')),V('e'))),V('e')))],
 IF(AND(eq(V('r.state'),I(6)),NOT(eq(V('old.state'),I(6)))),C('fare',V('next'),V('r.id')),V('next'))))
fn('people',[('old','Residents'),('sim','Sim'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('I64',V('sim.ids'))),LET([('id',at('I64',V('sim.ids'),V('index')))],C('people',V('old'),V('sim'),add(V('index'),I(1)),C('person',V('e'),C('game::agent',V('old'),V('id')),C('game::agent',V('sim.agents'),V('id'))))),V('e')))
fn('business-tax',[('items','(list Pair)'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('Pair',V('items'))),LET([('p',at('Pair',V('items'),V('index'))),('tax',IF(le(I(80),V('p.value')),mn(I(10),div(V('p.value'),I(10))),I(0)))],C('business-tax',V('items'),add(V('index'),I(1)),PATCH('Economy',V('e'),firms=put(V('e.firms'),V('p.key'),sub(V('p.value'),V('tax'))),businesses=sub(V('e.businesses'),V('tax')),taxes=inc(V('e'),'taxes',V('tax')),periodTaxes=inc(V('e'),'periodTaxes',V('tax'))))),V('e')))
fn('settle',[('old','City'),('city','City')],'City',LET([
 ('opened',C('open',V('old'))),('before',V('opened.economy')),
 ('earned',C('people',V('old.sim.agents'),V('city.sim'),I(0),V('before'))),('e',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),C('business-tax',G('std::map-entries','I64 I64',V('earned.firms')),I(0),V('earned')),V('earned'))),
 ('revenue',add(sub(V('e.taxes'),V('before.taxes')),sub(V('e.fares'),V('before.fares')))),
 ('cash',add(V('city.cash'),V('revenue'))),
 ('due',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),add(V('e.upkeepDue'),mx(I(1),add(div(llen('I64',V('city.world.ids')),I(40)),div(mlen('I64 I64',V('city.sim.transit.tracks')),I(20))))),I(0))),
 ('paid',mn(V('cash'),V('due'))),('cost',add(V('paid'),sub(V('city.sim.transit.spent'),V('old.sim.transit.spent')))),
 ('next',PATCH('Economy',V('e'),operating=inc(V('e'),'operating',V('cost')),periodOperating=inc(V('e'),'periodOperating',V('cost')),upkeepDue=IF(lt(I(0),V('due')),sub(V('due'),V('paid')),V('e.upkeepDue')))),
 ('period',IF(eq(mod(V('city.sim.tick'),I(64)),I(0)),PATCH('Economy',V('next'),lastTaxes=V('next.periodTaxes'),lastFares=V('next.periodFares'),lastOperating=V('next.periodOperating'),periodTaxes=I(0),periodFares=I(0),periodOperating=I(0)),V('next')))],
 PATCH('City',V('city'),cash=sub(V('cash'),V('paid')),economy=V('period'))))
# Arrival grants are explicit external capital. Departing households take their savings.
fn('new-wallets',[('sim','Sim'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('I64',V('sim.ids'))),LET([('id',at('I64',V('sim.ids'),V('index'))),('known',mget('I64 I64',V('e.wallets'),V('id'),I(-1)))],C('new-wallets',V('sim'),add(V('index'),I(1)),IF(lt(V('known'),I(0)),PATCH('Economy',V('e'),wallets=put(V('e.wallets'),V('id'),I(24)),grants=inc(V('e'),'grants',I(24)),households=inc(V('e'),'households',I(24))),V('e')))),V('e')))
fn('departed-wallets',[('city','City'),('items','(list Pair)'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('Pair',V('items'))),LET([('p',at('Pair',V('items'),V('index'))),('r',C('game::agent',V('city.sim.agents'),V('p.key')))],C('departed-wallets',V('city'),V('items'),add(V('index'),I(1)),IF(eq(V('r.id'),I(0)),PATCH('Economy',V('e'),wallets=G('std::map-remove','I64 I64',V('e.wallets'),V('p.key')),withdrawn=inc(V('e'),'withdrawn',V('p.value')),households=sub(V('e.households'),V('p.value'))),V('e')))),V('e')))
fn('closed-firms',[('world','World'),('items','(list Pair)'),('index','I64'),('e','Economy')],'Economy',IF(lt(V('index'),llen('Pair',V('items'))),LET([('p',at('Pair',V('items'),V('index'))),('kind',get(V('world.tiles'),V('p.key')))],C('closed-firms',V('world'),V('items'),add(V('index'),I(1)),IF(AND(le(I(4),V('kind')),le(V('kind'),I(6))),V('e'),PATCH('Economy',V('e'),firms=G('std::map-remove','I64 I64',V('e.firms'),V('p.key')),withdrawn=inc(V('e'),'withdrawn',V('p.value')),businesses=sub(V('e.businesses'),V('p.value')))))),V('e')))
fn('command',[('old','City'),('city','City')],'City',LET([
 ('opened',C('open',V('old'))),('base',C('new-wallets',V('city.sim'),I(0),V('opened.economy'))),
 ('people',C('departed-wallets',V('city'),G('std::map-entries','I64 I64',V('base.wallets')),I(0),V('base'))),
 ('firms',C('closed-firms',V('city.world'),G('std::map-entries','I64 I64',V('people.firms')),I(0),V('people'))),
 ('change',sub(V('city.cash'),V('old.cash')))],
 PATCH('City',V('city'),economy=PATCH('Economy',V('firms'),salvage=inc(V('firms'),'salvage',mx(I(0),V('change'))),construction=inc(V('firms'),'construction',mx(I(0),sub(I(0),V('change'))))))))
fn('conservation',[('city','City')],'I64',LET([('e',V('city.economy'))],sub(add(add(V('city.cash'),V('e.households')),V('e.businesses')),sub(add(add(add(V('e.opening'),V('e.grants')),V('e.exports')),V('e.salvage')),add(add(V('e.construction'),V('e.operating')),V('e.withdrawn'))))))
initial=ZERO('Economy',active=B(True),wallets=put(MP(),I(1),I(24)),households=I(24),opening=I(924))
r=ZERO('Resident',id=I(1),dest=I(17),purpose=I(1),eta=I(10),lastTime=I(10))
fn('work-example',[],'Economy',C('work',initial,r))
D.append(TEST('wage-net-to-household',F(C('work-example'),'households'),I(44)))
D.append(TEST('work-export-source',F(C('work-example'),'exports'),I(50)))
D.append(TEST('payroll-tax-to-city',F(C('work-example'),'taxes'),I(10)))
D.append(TEST('business-retains-profit',F(C('work-example'),'businesses'),I(20)))
fn('purchase-example',[],'Economy',C('purchase',ZERO('Economy'),ZERO('Resident',id=I(1),dest=I(17),purpose=I(2),eta=I(10),lastTime=I(10))))
D.append(TEST('purchase-cannot-overdraw',F(C('purchase-example'),'households'),I(0)))
fn('fare-example',[],'Economy',C('fare',ZERO('Economy'),I(1)))
D.append(TEST('zero-wallet-concession',F(C('fare-example'),'concessions'),I(1)))
# Split normal proposals under the released compiler's witness budget.
import re
groups={'money':{'wallets','open','conservation'},'moneytrade':{'work','purchase','fare','person'},'moneytests':{'work-example'},'moneyedgecases':{'purchase-example','fare-example'},'moneyflow':{'people','settle','business-tax'},'moneyedit':{'new-wallets','departed-wallets','closed-firms','command'}}
owners={n:m for m,names in groups.items() for n in names}
for module,names in groups.items():
 out=[]
 for d in D:
  m=re.search(r'\(function create ([^ ]+)',d)
  owner=owners[m.group(1)] if m else ('moneyedgecases' if 'purchase-cannot-overdraw' in d or 'zero-wallet-concession' in d else 'moneytests')
  if owner!=module:continue
  def qualify(match):
   n=match.group(1);owner=owners.get(n)
   return '(call '+(owner+'::'+n if owner and owner!=module else n)+' '
  out.append(re.sub(r'\(call ([^ :()]+) ',qualify,d))
 emit(module,module,out)
