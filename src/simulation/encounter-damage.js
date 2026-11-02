// Damage is an audited tactical contribution, not additional army casualties.
// Scenarios supply health from their unit roster. The fallback preserves older
// independent fixtures which do not declare a tactical stat system.
export function encounterDamageBudget(rules,remaining,commanders,faction){
  return remaining*(rules.encounterSoldierHealth??50)+Object.entries(commanders??{})
    .filter(([side,c])=>side!==faction&&c.status==='active').reduce((sum,[,c])=>sum+c.hp,0);
}
