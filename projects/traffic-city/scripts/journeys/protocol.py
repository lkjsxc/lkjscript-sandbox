from native import *
TYPES.update({
'View':{k:'I64' for k in 'x y w h layer'.split()},
'Cell':{k:'I64' for k in 'id kind q walk flow inside junction control'.split()},
'Seen':'(map I64 Cell)','Picture':{'seen':'Seen','changed':'(list Cell)'},
'RailView':{**{k:'I64' for k in 'id a b from to elapsed duration dwell status cost capacity rideTicks departures boardings spent occupancy waitingA waitingB expense'.split()},'enabled':'Bool'},
'Actor':{k:'I64' for k in 'id home dest purpose state from to dir prior lane slot elapsed duration mode wait reason ready out rank'.split()},
'Saved':{'format':'I64','owner':'Text','serial':'I64','city':'City'},
'Claim':{'status':'I64','saved':'Saved'},
'State':{'city':'City','view':'View','seen':'Seen','seq':'I64','ack':'I64','saved':'I64','token':'Text','owner':'Text','status':'I64','mapVersion':'I64','selection':'I64','quote':'EditQuote','management':'I64','confirmation':'I64','undo':'Bool'},
'Stats':{**{k:'I64' for k in 'tick cash level permits requested arrived population visits workVisits shopVisits leisureVisits moving waiting disconnected walkTrips carTrips average growthTarget growthCost progress healthy version tiles phase routes originX originY cancelled railLines railBoardings railCompleted railSpent railWaiting'.split()},'paused':'Bool','growth':'Bool'},
'Frame':{'view':'View','persistent':'Bool','seq':'I64','ack':'I64','reset':'Bool','cells':'(list Cell)','actors':'(list Actor)','overview':'(list I64)','mapChanged':'Bool','heat':'(list I64)','stats':'Stats','notice':'Text','saved':'I64','status':'I64','inspect':'Resident','detail':'Bool','actorLimit':'I64','quote':'EditQuote','management':'I64','confirmation':'I64','undo':'Bool','rails':'(list RailView)','inspectRail':'RailPlan'},
'Input':{'id':'I64','action':'Command','token':'Text','owner':'Text'},
'Header':{'name':'Text','value':'Bytes'},'HeaderValue':{'count':'I64','value':'Text'},'Open':{'headers':'(list Header)','path':'Text','query':'Text'},
'Message':{'body':'(stream Bytes)','kind':'std::SessionMessageKind'},'PeerClose':{'code':'(option I64)','reason':'Text'},
'Decision':{'closing':'(option std::SessionClose)','kind':'std::SessionDecisionKind','messages':'(list std::SessionOutbound)','rejection':'(option std::SessionReject)','state':'(option State)'},
})
def te(a,b):return C('std::text-equal',a,b)
def some(t,a):return G('std::option-some',t,a)
def none(t):return G('std::option-none',t)
def variant(t,a=None):return '(variant '+t+(' '+a if a else '')+')'

ECONOMY_FIELDS='households businesses opening grants exports salvage construction operating withdrawn wages sales taxes fares concessions upkeepDue periodTaxes periodFares periodOperating lastTaxes lastFares lastOperating'.split()
TYPES['Stats'].update({'eco'+k[0].upper()+k[1:]:'I64' for k in ECONOMY_FIELDS})
TYPES['Stats']['wealthError']='I64'
# Derived frame observations only; City and Saved remain format 8.
TYPES['PlanningCounts']={'total':'I64','long':'I64'}
TYPES['Stats'].update({'planning':'I64','planningLong':'I64'})
TYPES['Frame']['inspectFunds']='I64'
TYPES['Frame']['tracks']='(list I64)'
TYPES['Frame']['river']='(list I64)'
TYPES['Frame']['riverWidth']='I64'
TYPES['RailView'].update({'path':'(list I64)','stops':'(list I64)','direction':'I64'})

TYPES['RailPlatform']={k:'I64' for k in 'station forward reverse'.split()}
TYPES['RailView']['platforms']='(list RailPlatform)'

# Session-only counterfactuals. Saved/City stay format 7; no lab data is persisted.
TYPES['LabMeasure']={k:'I64' for k in 'visits arrived duration waitCycles disconnectedCycles outstanding cancelled population netFunds operating boardings wealthError'.split()}
TYPES['Lab']={'phase':'I64','horizon':'I64','step':'I64','disconnect':'I64','plan':'City','trial':'City','control':'LabMeasure','changed':'LabMeasure','quote':'EditQuote','confirmation':'I64'}
TYPES['LabChange']={'lab':'Lab','notice':'Text'}
TYPES['LabView']={**{k:'I64' for k in 'phase horizon step realTick planCost newResidents moveouts cancelled confirmation'.split()},'control':'LabMeasure','changed':'LabMeasure'}
TYPES['State']['lab']='Lab'
TYPES['Frame']['lab']='LabView'

# Transient observations are private to the experiment, not City/Saved data.
TYPES['AtlasSample']={k:'I64' for k in 'time wait lost'.split()}
TYPES['AtlasLedger']='(map I64 AtlasSample)'
TYPES['AtlasHome']={k:'I64' for k in 'home before after same less more equal baseTime planTime baseWait planWait baseLost planLost'.split()}
TYPES['AtlasHomes']='(map I64 AtlasHome)'
TYPES['AtlasHomePair']={'key':'I64','value':'AtlasHome'}
TYPES['AtlasView']={'homes':'(list AtlasHome)',**{k:'I64' for k in 'same less more equal removed added baseTime planTime baseWait planWait baseLost planLost'.split()}}
TYPES['Lab'].update({'controlAtlas':'AtlasLedger','changedAtlas':'AtlasLedger','atlas':'AtlasView'})
TYPES['AtlasWireHome']='(list I64)'
TYPES['AtlasWire']={**TYPES['AtlasView'],'homes':'(list AtlasWireHome)'}
TYPES['Lab']['atlasSent']='Bool'
TYPES['LabView']['atlas']='AtlasWire'
TYPES['LabView']['atlasChanged']='Bool'

# Read-only viewport projections, absent from City/Saved.
TYPES['StreetPool']={'walk':'(list I64)','cars':'(list I64)'}
TYPES['StreetSample']={'actors':'(list Actor)','walking':'I64','driving':'I64'}
TYPES['Frame'].update({'streetWalkers':'I64','streetDrivers':'I64'})
