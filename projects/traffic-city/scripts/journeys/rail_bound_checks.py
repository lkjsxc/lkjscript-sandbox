# Equality must prune: the surface choice and earlier service win strict ties.
for label,lower,ceiling,incumbent,expected in [
 ('no-incumbent',50,-1,-1,True),('surface-better',51,50,-1,False),
 ('surface-tie',50,50,-1,False),('surface-worse',49,50,-1,True),
 ('rail-tie',40,-1,40,False),('rail-better',39,-1,40,True),
 ('both-limits',41,100,40,False),('unreachable-surface',40,-1,-1,True),
 ('zero-surface',1,0,-1,False),('empty-rail-zero-is-not-bound',1,2,-1,True),
]:
 D.append(TEST('rail-bound-'+label,C('railplan::can-improve',I(lower),I(ceiling),ZERO('RailPlan',line=I(0 if incumbent<0 else 1),eta=I(max(0,incumbent)))),B(expected)))
