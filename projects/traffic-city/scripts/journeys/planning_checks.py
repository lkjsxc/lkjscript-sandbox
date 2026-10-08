"""Small independent native regression modules, within authored witness limits."""
from protocol import *
D=[]
def fn(n,p,r,b):D.append(FN(n,p,r,b))
exec((Path(__file__).parent/'rail_bound_checks.py').read_text())
emit('railboundtests','railboundtests',D)
D=[]
exec((Path(__file__).parent/'planning_meter_checks.py').read_text())
emit('planningmetertests','planningmetertests',D)
