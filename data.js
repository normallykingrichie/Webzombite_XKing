/* Webzombite - game data: items, recipes, loot tables, zombie stats. Edit numbers here to rebalance. */
window.WZ = window.WZ || {};
(function (WZ) {
  'use strict';

  var I = {};
  function item(id, ic, name, desc, extra) { var o = { id: id, ic: ic, name: name, desc: desc, type: 'material' }; for (var k in (extra || {})) o[k] = extra[k]; I[id] = o; }

  /* ---------- raw materials and junk ---------- */
  item('wood', '🪵', 'Wood', 'Raw wood from a felled tree. Used for blocks, sticks and a furnace.');
  item('stone', '🪨', 'Stone', 'Mined from rocks. Used for stone blocks and a furnace.');
  item('wood_sticks', '🥢', 'Wood Sticks', 'Straight sticks. The handle of every tool.');
  item('gravel', '⚪', 'Gravel', 'Small hard stones. Good for crafting basic tools.');
  item('soil', '🟤', 'Soil', 'A handful of dirt. Nothing useful yet.');
  item('broken_plastic_bottle', '🧴', 'Broken Plastic Bottle', 'Cracked and useless. Someone could recycle it one day.');
  item('dirty_plastic_bottle', '🧴', 'Dirty Plastic Bottle', 'Needs a lot of cleaning before it holds anything.');
  item('dirty_box_food', '📦', 'Dirty Box Food', 'An old food box. Better not to open it.');
  item('broken_tin_can', '🥫', 'Broken Tin Can', 'Dented, empty and sharp on the edges.');
  item('dirty_aluminium_foil', '🪙', 'Dirty Aluminium Foil', 'Crumpled foil with a faint shine under the dirt.');
  item('dirty_paper', '📄', 'Dirty Paper', 'Stained paper. The writing is gone.');
  item('broken_leather_cloth', '🟫', 'Broken Leather Cloth', 'Torn leather. It might still be good for something.');
  item('broken_fabric_cloth', '🧵', 'Broken Fabric Cloth', 'Ripped fabric, dirty but usable as a rag.');
  item('broken_floppy_drive', '💾', 'Broken Floppy Disk Drive', 'I wish can play Pac-Man from this Floppy Disk Drive, anythings games I still want here are useful than nothings.', { note: 'Needs the Computering Bench to repair (coming soon).' });
  item('iron_nugget', '🔩', 'Iron Nugget', 'hhmmm, maybe can be forge to be more useful? even it was small??', { note: '20 nuggets melt into 1 Iron Ingot in a Melter Furnace.' });
  item('broken_copper_wire', '🪢', 'Broken Copper Wire', 'Looks like these wire still can holding voltage? Oh no it is was broken anyways...', { note: 'Cannot be repaired. 50 wires melt into 1 Copper Ingot in a Melter Furnace.' });
  item('broken_cardboards', '📦', 'Broken Cardboards', 'Soggy flattened cardboard.');
  item('broken_wood_planks', '🪵', 'Broken Wood Planks', 'Splintered planks. Still solid enough to hit something.');
  item('iron_ingot', '🧱', 'Iron Ingot', 'A real bar of iron. Now we are talking.');
  item('copper_ingot', '🟧', 'Copper Ingot', 'A bar of copper. Nothing uses it yet.');
  /* tier 3 drafts (coming soon) */
  item('broken_dvd_player', '📀', 'Broken DVD Player', 'I wish can... play my DVD again...', { note: 'Cannot be repaired. Can be taken apart (coming soon).' });
  item('broken_cd', '💿', 'Broken CD', 'Ohh nooo... I can\'t play video games again...');
  item('broken_dvd', '📀', 'Broken DVD', '');
  item('broken_old_tv', '📺', 'Broken Old TV', 'Was to late tech, but who said that?? Today thats is useful to get any information even news about this apocalypse!');
  item('metal_casing', '🔲', 'Metal Casing', 'metal casing so useful to make tech in apocalypse! even just a casing...');

  /* ---------- food and drink (eat: seconds, hunger, thirst, comfort, poison chance, stomachache chance) ---------- */
  item('leftover_food', '🍲', 'Leftover Food', 'Yuckss... These leftover foods... still can be eat... Even during this apocalypse...', { type: 'food', eat: { t: 2, h: 4, th: -2, poison: 0.30 } });
  item('contaminated_veg', '🥬', 'Contaminated Vegetables', 'mmm... can\'t be eat?', { type: 'food', eat: { t: 4, h: 6, th: 1, poison: 0.50 } });
  item('dirty_veg', '🥦', 'Dirty Vegetables', 'Ohh man, so dirty, but I wish there still have vitamins...', { type: 'food', eat: { t: 4, h: 7, th: 2, stomach: 0.20 } });
  item('contaminated_fruits', '🍎', 'Contaminated Fruits', 'mmm... can\'t be eat?', { type: 'food', eat: { t: 4, h: 6, th: 1, poison: 0.50 } });
  item('dirty_fruits', '🍐', 'Dirty Fruits', 'Ohh man, so dirty, but I wish there still have vitamins...', { type: 'food', eat: { t: 4, h: 7, th: 2, stomach: 0.20 } });
  item('plastic_bottled_water', '💧', 'Plastic Bottled Water', 'Not been purified yet, just enough to recover your thirst!', { type: 'drink', eat: { t: 5, h: 0, th: 20, poison: 0.02 } });

  /* ---------- tools and weapons (bd = Break Damage per swing on trees, rocks and blocks; dmg = damage to zombies) ---------- */
  item('rusty_axe', '🪓', 'Rusty Axe', 'Old, but it still bites into wood.', { type: 'tool', tool: 'axe', bd: 2, dmg: 6 });
  item('rusty_pickaxe', '⛏️', 'Rusty Pickaxe', 'Old, but it still cracks stone.', { type: 'tool', tool: 'pick', bd: 2, dmg: 5 });
  item('crude_axe', '🪓', 'Crude Axe', 'Homemade and rough. Chops faster than the rusty one.', { type: 'tool', tool: 'axe', bd: 4, dmg: 9 });
  item('crude_pickaxe', '⛏️', 'Crude Pickaxe', 'Homemade and rough. Breaks stone faster.', { type: 'tool', tool: 'pick', bd: 4, dmg: 7 });
  item('iron_axe', '🪓', 'Iron Axe', 'A proper iron axe. Trees fall quickly.', { type: 'tool', tool: 'axe', bd: 8, dmg: 16 });
  item('iron_pickaxe', '⛏️', 'Iron Pickaxe', 'A proper iron pickaxe. Rocks and ore break quickly.', { type: 'tool', tool: 'pick', bd: 8, dmg: 12 });
  item('wood_club', '🏏', 'Wood Club', 'Broken planks tied together. Hits hard enough to matter.', { type: 'tool', tool: 'club', bd: 1, dmg: 14 });
  item('fists', '✊', 'Fists', 'Better than nothing.', { type: 'tool', tool: 'fist', bd: 1, dmg: 4 });

  /* ---------- placeable ---------- */
  item('wood_block', '🟫', 'Wood Block', 'A 1 m building block. Weak, but cheap. Right click to place.', { type: 'block', vox: 1, hp: 30 });
  item('stone_block', '⬜', 'Stone Block', 'A 1 m building block. Much stronger than wood.', { type: 'block', vox: 2, hp: 90 });
  item('furnace', '🔥', 'Melter Furnace', 'Melts nuggets and wire into ingots. Place it, then stand next to it and press E.', { type: 'block', vox: 3, hp: 80 });

  /* ---------- recipes ---------- */
  var R = [
    { id: 'sticks', out: ['wood_sticks', 2], cost: { wood: 1 } },
    { id: 'gravel', out: ['gravel', 2], cost: { stone: 1 } },
    { id: 'wood_block', out: ['wood_block', 2], cost: { wood: 1 } },
    { id: 'stone_block', out: ['stone_block', 2], cost: { stone: 1 } },
    { id: 'crude_axe', out: ['crude_axe', 1], cost: { wood_sticks: 4, gravel: 2 } },
    { id: 'crude_pickaxe', out: ['crude_pickaxe', 1], cost: { wood_sticks: 4, gravel: 3 } },
    { id: 'wood_club', out: ['wood_club', 1], cost: { broken_wood_planks: 3, broken_cardboards: 2 } },
    { id: 'furnace', out: ['furnace', 1], cost: { stone: 20, wood: 6 } },
    { id: 'iron_axe', out: ['iron_axe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'iron_pickaxe', out: ['iron_pickaxe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'melt_iron', out: ['iron_ingot', 1], cost: { iron_nugget: 20 }, furnace: true, label: 'Melt Iron Ingot' },
    { id: 'melt_copper', out: ['copper_ingot', 1], cost: { broken_copper_wire: 50 }, furnace: true, label: 'Melt Copper Ingot' }
  ];

  /* ---------- loot tables: [item, percent]. Each table adds up to 100. ---------- */
  var LOOT = {
    trash1: { name: 'Trash (Tier 1)', rolls: 1, enabled: true, t: [['broken_plastic_bottle', 20], ['dirty_plastic_bottle', 20], ['dirty_box_food', 15], ['broken_tin_can', 10], ['leftover_food', 15], ['gravel', 15], ['soil', 5]] },
    trash2: { name: 'Trash (Tier 2)', rolls: 1, enabled: true, t: [['dirty_aluminium_foil', 15], ['dirty_paper', 20], ['broken_leather_cloth', 5], ['broken_fabric_cloth', 10], ['gravel', 5], ['broken_floppy_drive', 1], ['iron_nugget', 7], ['broken_copper_wire', 7], ['broken_cardboards', 15], ['broken_wood_planks', 15]] },
    /* DRAFT, coming soon: the percentages for Broken Old TV were not decided yet, so this table is switched off. */
    trash3: { name: 'Trash (Tier 3)', rolls: 1, enabled: false, t: [['broken_dvd_player', 2], ['broken_cd', 3], ['broken_dvd', 5], ['broken_old_tv', null]] },
    /* Duplicate "Dirty Vegetables" in the brief was read as Dirty Fruits. */
    crate1: { name: 'Wooden Crate (Tier 1)', rolls: 3, enabled: true, t: [['contaminated_veg', 20], ['dirty_veg', 20], ['contaminated_fruits', 15], ['dirty_fruits', 15], ['plastic_bottled_water', 20], ['wood_sticks', 10]] }
  };

  /* ---------- zombies: hp, spd (x2.2 m/s), dmg, def, tier ---------- */
  var Z = {
    walker:  { name: 'Walker',  hp: 80,  spd: 1.1, dmg: 5,  def: 0, tier: 1, scale: 1.0,  color: 0x6d7a5a, cd: 1.0, w: 40 },
    runner:  { name: 'Runner',  hp: 50,  spd: 1.6, dmg: 5,  def: 0, tier: 1, scale: 0.92, color: 0x8a6a52, cd: 0.8, w: 22 },
    big:     { name: 'Big',     hp: 150, spd: 0.8, dmg: 8,  def: 0, tier: 1, scale: 1.3,  color: 0x56654f, cd: 1.1, w: 12 },
    bomber:  { name: 'Bomber',  hp: 60,  spd: 1.2, dmg: 60, def: 0, tier: 1, scale: 1.05, color: 0x9a5a2a, cd: 0,   w: 10, splash: 4 },
    brute:   { name: 'Brute',   hp: 275, spd: 0.5, dmg: 12, def: 0, tier: 2, scale: 1.55, color: 0x4a3f55, cd: 1.3, w: 6 },
    soldier: { name: 'Soldier', hp: 100, spd: 1.0, dmg: 9,  def: 2, tier: 2, scale: 1.05, color: 0x3d5a3a, cd: 1.0, w: 8 }
  };

  WZ.ITEMS = I; WZ.RECIPES = R; WZ.LOOT = LOOT; WZ.ZOMBIES = Z;
  WZ.rollLoot = function (key, rnd) {
    var t = LOOT[key].t, r = rnd() * 100, acc = 0;
    for (var i = 0; i < t.length; i++) { if (t[i][1] == null) continue; acc += t[i][1]; if (r < acc) return t[i][0]; }
    return t[0][0];
  };
})(window.WZ);
