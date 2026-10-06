# Each train visits ordered stops and preserves passengers across intermediate stations.
fn('enqueue',[('m','Move'),('r','Resident'),('tick','I64')],'Move',LET([
 ('p',plan(V('m.transit'),V('r.id'))),('l',line(V('m.transit'),V('p.line'))),
 ('direction',C('travel-direction',V('l'),V('p.board'),V('p.alight'))),
 ('next',C('set-platform',V('l'),V('p.board'),V('direction'),append('I64',C('platform',V('l'),V('p.board'),V('direction')),V('r.id'))))],
 PATCH('Move',V('m'),transit=setplan(setline(V('m.transit'),V('next')),V('r.id'),PATCH('RailPlan',V('p'),stage=I(2))),agents=mput('I64 Resident',V('m.agents'),V('r.id'),PATCH('Resident',V('r'),state=I(5),wait=I(0),ready=V('tick'),reason=I(10),elapsed=I(0),duration=I(0),**{'from':V('r.cell'),'to':V('r.cell')})))))
fn('riders',[('l','RailLine'),('index','I64'),('arrival','Bool'),('out','RailBatch')],'RailBatch',IF(lt(V('index'),llen('I64',V('l.passengers'))),LET([
 ('id',at('I64',V('l.passengers'),V('index'))),('r',C('game::agent',V('out.agents'),V('id'))),('p',plan(V('out.transit'),V('id'))),
 ('valid',AND(eq(V('r.state'),I(6)),eq(V('p.line'),V('l.id')))),
 ('alight',AND(V('arrival'),OR(eq(V('p.alight'),V('l.to')),NOT(V('l.enabled'))))),
 ('next',IF(V('valid'),PATCH('RailBatch',V('out'),
 transit=IF(V('alight'),setplan(V('out.transit'),V('id'),PATCH('RailPlan',V('p'),stage=I(4),alight=V('l.to'))),V('out.transit')),
 agents=mput('I64 Resident',V('out.agents'),V('id'),IF(V('alight'),PATCH('Resident',V('r'),state=I(1),cell=V('l.to'),route=I(0),step=I(0),elapsed=I(0),duration=I(0),wait=I(0),reason=I(8),**{'from':V('l.to'),'to':V('l.to')}),PATCH('Resident',V('r'),elapsed=add(V('r.elapsed'),I(1))))),
 passengers=IF(V('alight'),V('out.passengers'),append('I64',V('out.passengers'),V('id')))),V('out')))],
 C('riders',V('l'),add(V('index'),I(1)),V('arrival'),V('next'))),V('out')))
fn('suspend-riders',[('city','City'),('l','RailLine')],'City',LET([
 ('batch',C('riders',PATCH('RailLine',V('l'),**{'to':V('l.from')},enabled=B(False)),I(0),B(True),ZERO('RailBatch',transit=V('city.sim.transit'),agents=V('city.sim.agents'))))],
 PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),agents=V('batch.agents'),transit=setline(V('batch.transit'),PATCH('RailLine',V('l'),status=I(3),passengers=LS('I64')))))))
fn('depart',[('city','City'),('l','RailLine')],'City',LET([
 ('direction',C('service-direction',V('l'))),('destination',C('next-stop',V('l'))),
 ('queue',C('platform',V('l'),V('l.from'),V('direction'))),
 ('batch',C('board',V('queue'),I(0),V('l'),add(V('city.sim.tick'),I(1)),ZERO('RailBatch',transit=V('city.sim.transit'),agents=V('city.sim.agents'),passengers=V('l.passengers'),count=llen('I64',V('l.passengers'))))),
 ('cost',C('expense',V('l'))),('boarded',sub(V('batch.count'),llen('I64',V('l.passengers')))),
 ('next',PATCH('RailLine',C('set-platform',V('l'),V('l.from'),V('direction'),V('batch.queue')),**{'to':V('destination')},direction=V('direction'),elapsed=I(0),duration=C('ride',V('l'),V('l.from'),V('destination')),dwell=I(0),status=I(1),departures=add(V('l.departures'),I(1)),boardings=add(V('l.boardings'),V('boarded')),spent=add(V('l.spent'),V('cost')),passengers=V('batch.passengers')))],
 PATCH('City',V('city'),cash=sub(V('city.cash'),V('cost')),sim=PATCH('Sim',V('city.sim'),agents=V('batch.agents'),transit=PATCH('Transit',setline(V('batch.transit'),V('next')),spent=add(V('batch.transit.spent'),V('cost')))))))
fn('step-line',[('city','City'),('l','RailLine')],'City',IF(lt(V('l.elapsed'),V('l.duration')),
 LET([('moved',PATCH('RailLine',V('l'),elapsed=add(V('l.elapsed'),I(1)))),('arrival',eq(V('moved.elapsed'),V('moved.duration'))),
 ('batch',C('riders',V('moved'),I(0),V('arrival'),ZERO('RailBatch',transit=V('city.sim.transit'),agents=V('city.sim.agents')))),
 ('next',IF(V('arrival'),PATCH('RailLine',V('moved'),**{'from':V('moved.to')},elapsed=I(0),duration=I(0),dwell=I(3),status=I(0),passengers=V('batch.passengers')),PATCH('RailLine',V('moved'),passengers=V('batch.passengers'))))],
 PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),agents=V('batch.agents'),transit=setline(V('batch.transit'),V('next'))))),
 IF(NOT(V('l.enabled')),C('suspend-riders',V('city'),V('l')),
 IF(lt(I(1),V('l.dwell')),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),dwell=sub(V('l.dwell'),I(1)))))),
 IF(lt(V('city.cash'),C('expense',V('l'))),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),status=I(2))))),
 IF(C('blocked',V('city.sim.transit'),V('l'),I(0)),PATCH('City',V('city'),sim=PATCH('Sim',V('city.sim'),transit=setline(V('city.sim.transit'),PATCH('RailLine',V('l'),status=I(4))))),
 C('depart',V('city'),V('l'))))))))
fn('forget-platforms',[('l','RailLine'),('id','I64'),('stops','(list I64)'),('i','I64')],'RailLine',IF(lt(V('i'),llen('I64',V('stops'))),LET([
 ('station',at('I64',V('stops'),V('i'))),
 ('a',IF(eq(V('station'),V('l.b')),V('l'),C('set-platform',V('l'),V('station'),I(1),C('without',C('platform',V('l'),V('station'),I(1)),V('id'),I(0),LS('I64'))))),
 ('b',IF(eq(V('station'),V('l.a')),V('a'),C('set-platform',V('a'),V('station'),I(-1),C('without',C('platform',V('a'),V('station'),I(-1)),V('id'),I(0),LS('I64')))))],
 C('forget-platforms',V('b'),V('id'),V('stops'),add(V('i'),I(1)))),V('l')))
fn('forget',[('t','Transit'),('id','I64')],'Transit',LET([('p',plan(V('t'),V('id'))),('l',line(V('t'),V('p.line'))),('next',rmplan(V('t'),V('id')))],IF(lt(I(0),V('l.id')),setline(V('next'),PATCH('RailLine',C('forget-platforms',V('l'),V('id'),C('stops',V('l')),I(0)),passengers=C('without',V('l.passengers'),V('id'),I(0),LS('I64')))),V('next'))))
