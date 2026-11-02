// New scenario characters; these are not claimed to be manuscript figures.
export const LIZEEM_CHAMPIONS=Object.freeze({
  west:Object.freeze({id:'meret-voss',faction:'west',origin:'nethereum',company:'Ovesos Free Company',name:'Captain Meret Voss',home:'Ovesos',
    design:'A broad, copper-haired veteran in sea-green armor, a cream shoulder mantle and an oak-leaf badge.',
    look:Object.freeze({build:'broad',headgear:'bare',hairStyle:'shaved-sides',hair:0x995132,facialHair:'trimmed',garment:'single-pauldron',marks:['scar']}),
    words:'The western councils must be free to govern. I would rather face one worthy opponent than bury another company. Meet me here; your staff and sorcery are welcome.'}),
  east:Object.freeze({id:'serevan-dain',faction:'east',origin:'caricas',company:'Nesdor River Guard',name:'Captain Serevan Dain',home:'Nesdor',
    design:'A tall, dark-haired captain in red and ivory, with a crested bronze helm and a sun clasp.',
    look:Object.freeze({build:'tall-lean',headgear:'iron-skullcap',hairStyle:'cropped',hair:0x302725,facialHair:'moustache',garment:'gambeson',marks:[]}),
    words:'Without a common law, these river towns will tear each other apart. I stand for the eastern league. Face me here, wizard; bring your staff and sorcery.'}),
});
export const championFor=pending=>LIZEEM_CHAMPIONS[pending.duel?.enemy];
export const commanderFor=(pending,side)=>pending.commanders?.[side]?.status==='active'?pending.commanders[side]:null;
export function duelEffect(duel){if(duel?.armyCommander)return duel.outcome==='success'?'The champion yielded and retreated. Two rally guards fell back; your morale rises by 20 and theirs falls by 20. No enemy soldiers died in the duel.':'Your challenge ended without a victory. Their morale rises by 10 and yours falls by 10; the opposing captain must still be faced in the assault.';return duel?.outcome==='success'?'The champion yielded. Two rally guards fell back; no enemy soldiers died in the duel.':'The challenge ended without a morale advantage. No enemy soldiers died in the duel.';}
