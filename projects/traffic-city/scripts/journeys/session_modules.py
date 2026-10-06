# Ordinary staged declarations keep each request within the public authoring
# budgets. A typed bootstrap is never targeted; its exact transition identity
# and parameters are edited after the real callback helpers have been created.
component=next(d for d in D if d.startswith('(component create service '))
bootstrap=FN('transition',[('state','(option State)'),('event','std::SessionEvent')],'Decision',C('view::finish'),effect='(task (requirement service::data) (requirement service::streams) (requirement service::config))')
write_source('session-capabilities','live',[bootstrap,component])
sets={
 'persist':{'invalid-save','hex-loop','token-valid','claim','checkpoint','claim-retry','checkpoint-retry','owned','has-undo','replace-saved','replace-retry'},
 'management':{'save-state','clear-review','review-remove','apply-remove','review-city','manage-city','review-scenario','active-input'},
}
owners={}
for d in D:
 m=re.search(r'\(function create ([^ ]+)',d)
 if m:owners[m.group(1)]=next((module for module,names in sets.items() if m.group(1) in names),'live')
for source,module in [('persistence','persist'),('management','management'),('session','live')]:
 defs=[]
 for d in D:
  if d.startswith('(component create service '):continue
  m=re.search(r'\(function create ([^ ]+)',d)
  owner=owners[m.group(1)] if m else 'persist'
  if owner!=module:continue
  def qualify(match):
   name=match.group(1);owner=owners.get(name)
   return '(call '+(owner+'::'+name if owner and owner!=module else name)+' '
  d=re.sub(r'\(call ([^ :()]+) ',qualify,d).replace('service::','live::service::')
  if module=='live':
   if m and m.group(1)=='transition':
    d=d.replace('(function create transition ','(function edit __TRANSITION_OWNER__ transition ')
    d=d.replace('(parameter create state ','(parameter edit __STATE_PARAMETER__ state ')
    d=d.replace('(parameter create event ','(parameter edit __EVENT_PARAMETER__ event ')
  defs.append(d)
 if module=='live':
  tail=' (target create live (component live::service) (runner interactive) (port live::service::live))'
  (ROOT/'src'/'session.lkjc').write_text('declarations.begin\n(units\n (use std builtin)\n'+aliases()+'\n (module edit __LIVE_MODULE__ live\n'+''.join(defs)+')\n'+tail+')\ndeclarations.end\n')
 else:write_source(source,module,defs)
