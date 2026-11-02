import {escapeHTML as esc} from './campaign-map-info.js';
const back='<button class="text-button" id="back-factions">All factions</button>';
const scope='<p>Charted context outside the five playable regions. These countries are not taking turns in the Lizeemi War.</p>';
export function surroundingFactionHTML(faction,reference,territories){
  const disputed=faction.kind==='disputed';
  const ties=reference.relations.filter(r=>r.from===faction.id||r.to===faction.id);
  return `${back}<span class="eyebrow faction-kicker">${disputed?'Disputed territory':'Surrounding country'}</span><h2 class="title">${esc(faction.name)}</h2>`+
    (faction.government?`<p>${esc(faction.government)}</p>`:'')+
    (faction.capital?`<p><strong>Capital:</strong> ${esc(faction.capital)}</p>`:'')+
    (faction.notes?`<p>${esc(faction.notes)}</p>`:'')+
    (disputed?`<h3>Contesting powers</h3>${faction.claimants.length?`<ul>${faction.claimants.map(n=>`<li>${esc(n)}</li>`).join('')}</ul>`:'<p>Claimants not yet established.</p>'}`:'')+
    (ties.length?`<h3>Relationships</h3>${ties.map(r=>`<p>${esc(r.label)}</p>`).join('')}`:'')+
    `<h3>${disputed?'Disputed':'Controlled'} charted regions</h3><ul>${territories.map(n=>`<li><button class="text-button" data-region="${esc(n)}">${esc(n)}</button></li>`).join('')}</ul>${reference.description?'<p>'+esc(reference.description)+'</p>':scope}`;
}
export function nomadicPresenceHTML(presence,description=null){
  return `${back}<span class="eyebrow faction-kicker">Nomadic people</span><h2 class="title">${esc(presence.name)}</h2><p>${esc(presence.government)}</p><p>${esc(presence.notes)}</p><p><strong>Reported location:</strong> <button class="text-button" data-region="${esc(presence.region)}">${esc(presence.region)}</button></p>${description?'<p>'+esc(description)+'</p>':scope}`;
}
