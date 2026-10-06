# Independent boundary witnesses for the ephemeral route-position index.
fn('pair-curved',[],'RailLine',ZERO('RailLine',a=I(0),b=I(258),path=LS('I64',I(0),I(1),I(2),I(130),I(258)),stops=LS('I64',I(0),I(2),I(258))))
fn('pair-legacy',[],'RailLine',ZERO('RailLine',a=I(0),b=I(16)))
fn('pair-eight',[],'RailLine',ZERO('RailLine',a=I(0),b=I(28),path=LS('I64',*[I(x) for x in range(29)]),stops=LS('I64',*[I(x) for x in range(0,29,4)])))
# A repeated origin must use its first position: 14 edges, not the final two.
fn('pair-repeated',[],'RailLine',ZERO('RailLine',a=I(0),b=I(256),path=LS('I64',*[I(x) for x in [0,1,2,3,4,5,6,5,4,3,2,1,0,128,256]]),stops=LS('I64',I(0),I(256))))
fn('pair-missing',[],'RailLine',ZERO('RailLine',a=I(0),b=I(130),path=LS('I64',I(0),I(1),I(2)),stops=LS('I64',I(0),I(130))))
for name,fixture,origin,dest,bound,expected in [
 ('curved-forward','curved',0,258,1000000,(0,258,4)),
 ('curved-reverse','curved',258,0,1000000,(258,0,4)),
 ('intermediate','curved',2,258,1000000,(2,258,1)),
 ('strict-tie','curved',0,258,4,(99,98,4)),
 ('better-incumbent','curved',0,258,1,(99,98,1)),
 ('out-of-range','curved',1806,258,1000000,(99,98,1000000)),
 ('legacy-empty-path','legacy',0,16,1000000,(0,16,4)),
 ('walk-boundary','legacy',1536,16,1000000,(0,16,40)),
 ('walk-too-far','legacy',1664,16,1000000,(99,98,1000000)),
 ('eight-stops','eight',0,28,1000000,(0,28,25)),
 ('first-position','repeated',0,256,1000000,(0,256,4)),
 ('missing-position','missing',0,130,1000000,(0,130,1)),
]:
 result=C('railplan::pair',C('pair-'+fixture),I(origin),I(dest),I(0),I(0),R(board=I(99),alight=I(98),estimate=I(bound)))
 a,b,t=expected
 D.append(TEST('rail-pair-'+name,result,R(board=I(a),alight=I(b),estimate=I(t))))
