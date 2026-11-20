/* data.js - Webzombite */
window.WZ = window.WZ || {};
(function (WZ) {
  'use strict';

  var I = {};
  function item(id, ic, name, desc, extra) {
    var o = { id: id, ic: ic, name: name, desc: desc, type: 'material' };
    for (var k in (extra || {})) o[k] = extra[k];
    I[id] = o;
  }

  /* ---------- Raw materials and junk ---------- */
  item('wood', '🪵', 'Wood Log', 'A raw log from a chopped tree. Used for wood log blocks, sticks, charcoal and fuel. Cut it into Wood Planks at a Sawmill.');
  item('stone', '🪨', 'Stone', 'Mined from rocks. Used for stone blocks and the smelting furnace.');
  item('wood_sticks', '🥢', 'Wooden Stick', 'A straight wooden stick. The basic handle for tools and the frame of wooden armor.');
  item('gravel', '⚪', 'Gravel', 'Small hard stones. Good for making simple tools.');
  item('soil', '🟤', 'Soil', 'A handful of soil. Not useful for now.');
  item('broken_plastic_bottle', '🧴', 'Broken Plastic Bottle', 'Cracked and unusable. Maybe it can be recycled one day.');
  item('dirty_plastic_bottle', '🧴', 'Dirty Plastic Bottle', 'Needs to be cleaned before it can hold water.');
  item('dirty_box_food', '📦', 'Dirty Box Food', 'An old, dirty food box. Better not to open it.');
  item('broken_tin_can', '🥫', 'Broken Tin Can', 'Dented, empty and sharp around the edges.');
  item('dirty_aluminium_foil', '🪙', 'Dirty Aluminium Foil', 'Crumpled foil with a faint shine under the dirt.');
  item('dirty_paper', '📄', 'Dirty Paper', 'Stained paper. The writing is long gone.');
  item('broken_leather_cloth', '🟫', 'Broken Leather Cloth', 'Torn leather. Maybe it can still be useful for something.');
  item('broken_fabric_cloth', '🧵', 'Broken Fabric Cloth', 'Dirty torn cloth, useful for making beds, couches and armor padding.');
  item('broken_floppy_drive', '💾', 'Broken Floppy Disk Drive', 'If only I could play Pac-Man from this drive... anything here is still better than nothing.', { note: 'Needs a Computer Bench to repair (coming soon).' });
  item('iron_nugget', '🔩', 'Iron Ore', 'Raw iron ore. It becomes useful once smelted.', { note: '8 ore smelt into 1 Iron Bar in a Furnace (40 heat power). Mined underground only.' });
  item('broken_copper_wire', '🪢', 'Copper Ore', 'Raw copper ore (also found as broken copper wire).', { note: '25 ore smelt into 1 Copper Bar in a Furnace (30 heat power).' });
  item('broken_cardboards', '📦', 'Broken Cardboards', 'Flat, damp cardboard.');
  item('broken_wood_planks', '🪵', 'Broken Wood Planks', 'A split wooden plank. Still sturdy enough to hit things with.');
  item('iron_ingot', '🧱', 'Iron Bar', 'A bar of pure iron. Used for iron tools, sinks, anvils and iron armor.');
  item('copper_ingot', '🟧', 'Copper Bar', 'A bar of pure copper. Used for the copper tools and armor.');
  item('feather', '🪶', 'Feather', 'Light and soft. Perfect for the tail of an arrow.');
  item('string', '🧶', 'String', 'A tough thin string. Used for bows and fishing rods.');
  item('iron_chain', '⛓️', 'Iron Chain', 'A short chain of iron links. Made at an Iron Anvil.');
  item('iron_stick', '📏', 'Iron Stick', 'A straight iron rod. Made at an Iron Anvil.');
  item('rope', '🪢', 'Rope', 'A thick rope twisted from strings. Used for the Stone Sword.');
  item('coal', '⚫', 'Coal', 'A black lump of coal. Mined from dark rocks. Used for campfires.');
  item('golden_nugget', '🟡', 'Gold Ore', 'Shiny raw gold ore mined deep underground.', { note: '12 ore smelt into 1 Golden Bar in a Furnace (50 heat power).' });
  item('golden_ingot', '🥇', 'Golden Bar', 'A bar of pure gold. Used for the Golden Watch.');
  item('golden_chain', '⛓️', 'Golden Chain', 'A delicate golden chain. Made at an Iron Anvil.');
  item('golden_stick', '📏', 'Golden Stick', 'A straight golden rod. Made at an Iron Anvil.');

  /* Tier 3 drafts (coming soon) */
  item('broken_dvd_player', '📀', 'Broken DVD Player', 'If only it could still play my favorite DVD...', { note: 'Cannot be repaired. Can be dismantled into components (coming soon).' });
  item('broken_cd', '💿', 'Broken CD', 'Well... no more video games...');
  item('broken_dvd', '📀', 'Broken DVD', 'A badly scratched DVD.');
  item('broken_old_tv', '📺', 'Broken Old Tube TV', 'Old technology, but who knows, it may still help you find news about this apocalypse!');
  item('metal_casing', '🔲', 'Iron Casing', 'An iron casing is very useful for assembling technology in the apocalypse!');

  /* Electronics */
  item('mini_led_lamp', '💡', 'Mini LED Lamp', 'A tiny LED lamp. Barely bigger than a grain of rice.');
  item('rgb_lamp', '🌈', 'RGB Lamp', 'A small lamp that cycles through every color.');
  item('black_screen_cover', '⬛', 'Black Screen Cover', 'A black cover for a screen. Looks boring, but it is needed.');
  item('plastic_paper_package', '🧾', 'Plastic Paper Package', 'A clean plastic and paper package for sealing small electronics.');
  item('signal_chip', '📡', 'Signal Finder Component Chip', 'A tiny chip that can pick up signals from far away.');
  item('gpu_chip', '🧠', 'Low-End GPU Component Chip', 'A weak little graphics chip. Still enough to draw a map!');
  item('medium_battery', '🔋', 'Medium Battery', 'A medium-sized battery that powers small devices.');
  item('ips_led', '🖥️', 'IPS LED', 'Bright IPS LED, annoy you when you see it... have an insomnia day!');

  /* ---------- Food, drinks & medical ---------- */
  item('leftover_food', '🍲', 'Leftover Food', 'Eww... this leftover food is still edible... at least enough to survive the apocalypse...', { type: 'food', eat: { t: 2, h: 4, th: -2, poison: 0.30 } });
  item('contaminated_veg', '🥬', 'Contaminated Vegetables', 'Mmm... is this still safe to eat?', { type: 'food', eat: { t: 4, h: 6, th: 1, poison: 0.50 } });
  item('dirty_veg', '🥦', 'Dirty Vegetables', 'So dirty! Wash them in a Sink to get Fresh Vegetables!', { type: 'food', eat: { t: 4, h: 7, th: 2, stomach: 0.20 } });
  item('contaminated_fruits', '🍎', 'Contaminated Fruits', 'Mmm... is this fruit still fit to eat?', { type: 'food', eat: { t: 4, h: 6, th: 1, poison: 0.50 } });
  item('dirty_fruits', '🍐', 'Dirty Fruits', 'So dirty! Wash them in a Sink to get Fresh Fruits!', { type: 'food', eat: { t: 4, h: 7, th: 2, stomach: 0.20 } });
  item('fresh_veg', '🥗', 'Fresh Vegetables', 'Vegetables washed clean in a Sink. Healthy, safe and refreshing!', { type: 'food', eat: { t: 3, h: 12, th: 5, comfort: 5 } });
  item('fresh_fruits', '🍇', 'Fresh Fruits', 'Fresh fruits washed clean in a Sink. Sweet, healthy and good for your comfort!', { type: 'food', eat: { t: 3, h: 12, th: 6, comfort: 6 } });
  item('plastic_bottled_water', '💧', 'Plastic Bottled Water', 'Not fully sterilized, but enough to cure your thirst!', { type: 'drink', eat: { t: 5, h: 0, th: 20, poison: 0.02 } });
  item('medical_bag', '🩹', 'Medical Bag', 'Emergency first aid kit. Hold left click for 2.5 seconds to restore 30 HP.', { type: 'med', eat: { t: 2.5, heal: 30 } });
  item('contaminated_fish', '🐟', 'Contaminated Fish', 'Nooo... theres no go blue again anymore...', { type: 'food', eat: { t: 3, h: 8, th: 2, wpoison: 0.10 } });
  item('fresh_fish', '🐠', 'Fresh Fish', 'safe this one, before it get go black...', { type: 'food', eat: { t: 3, h: 15, th: 8 } });
  item('cooked_fish', '🍣', 'Cooked Fish', 'Eat this, and be smart as a fish not as a zombie', { type: 'food', eat: { t: 4, h: 22, th: 1, energy: 20, comfort: 18 } });

  /* ---------- Tools and weapons ---------- */
  item('rusty_axe', '🪓', 'Rusty Axe', 'Old, but still sharp enough to chop wood.', { type: 'tool', tool: 'axe', bd: 2, dmg: 6 });
  item('rusty_pickaxe', '⛏️', 'Rusty Pickaxe', 'Old, but still strong enough to break rocks.', { type: 'tool', tool: 'pick', bd: 2, dmg: 5 });
  item('crude_axe', '🪓', 'Crude Axe', 'Homemade and rough. Chops faster than the rusty axe.', { type: 'tool', tool: 'axe', bd: 4, dmg: 9 });
  item('crude_pickaxe', '⛏️', 'Crude Pickaxe', 'Homemade and rough. Breaks rocks faster.', { type: 'tool', tool: 'pick', bd: 4, dmg: 7 });
  item('iron_axe', '🪓', 'Iron Axe', 'A quality iron axe. Trees fall very fast.', { type: 'tool', tool: 'axe', bd: 8, dmg: 16 });
  item('iron_pickaxe', '⛏️', 'Iron Pickaxe', 'A quality iron pickaxe. Rocks and ore crumble quickly.', { type: 'tool', tool: 'pick', bd: 8, dmg: 12 });
  item('wood_club', '🏏', 'Wood Club', 'Broken planks tied tightly together. Hard enough to smash zombies.', { type: 'tool', tool: 'club', bd: 1, dmg: 14 });
  item('wood_sword', '🗡️', 'Wooden Sword', 'Quiet powerful for newbie...', { type: 'tool', tool: 'sword', bd: 1, dmg: 8 });
  item('stone_sword', '🗡️', 'Stone Sword', 'Better one can slash anythings in your front... Even it is on stone ages!', { type: 'tool', tool: 'sword', bd: 1, dmg: 10 });
  item('iron_sword', '⚔️', 'Iron Sword', 'Have a good day on medieval ages! Zombies!', { type: 'tool', tool: 'sword', bd: 1, dmg: 14 });
  /* [TIER TAG] copper set (tier 'copper') and golden set (tier 'golden'): sword, pickaxe, axe, 4 armor pieces */
  item('copper_axe', '🪓', 'Copper Axe', 'A copper axe. Between crude and iron.', { type: 'tool', tool: 'axe', bd: 6, dmg: 12 });
  item('copper_pickaxe', '⛏️', 'Copper Pickaxe', 'A copper pickaxe. Mines ore faster than crude tools.', { type: 'tool', tool: 'pick', bd: 6, dmg: 9 });
  item('copper_sword', '🗡️', 'Copper Sword', 'A reddish copper blade. Better than stone, a bit under iron.', { type: 'tool', tool: 'sword', bd: 1, dmg: 12 });
  item('golden_axe', '🪓', 'Golden Axe', 'Soft but extremely fast at chopping trees.', { type: 'tool', tool: 'axe', bd: 10, dmg: 11 });
  item('golden_pickaxe', '⛏️', 'Golden Pickaxe', 'Soft but extremely fast at mining.', { type: 'tool', tool: 'pick', bd: 10, dmg: 8 });
  item('golden_sword', '🗡️', 'Golden Sword', 'A shiny golden blade. Looks great, cuts fine.', { type: 'tool', tool: 'sword', bd: 1, dmg: 11 });
  item('wood_bow', '🏹', 'Wooden Bow', 'Quiet cheap, but extremely good for you and newbies that trying hunting out zombies without getting closer...', { type: 'tool', tool: 'bow', bd: 0, dmg: 5, note: 'Needs Arrows in your bag. Hold left click to shoot.' });
  item('arrow', '➴', 'Arrow', 'If you have bow, but don\'t have this, then your life are already dead! since 999 years ago!!', { note: 'Ammo for the Wooden Bow. No extra buff.' });
  item('wood_rod', '🎣', 'Wooden Fishing Rod', 'Survive from apocalypse not from killing zombie through, but also fishing!', { type: 'tool', tool: 'rod', bd: 0, dmg: 2, power: 5, note: 'Fishing Power: 5%. Aim at a lake and left click to cast.' });
  item('fists', '✊', 'Bare Hands', 'Still better than not fighting at all.', { type: 'tool', tool: 'fist', bd: 1, dmg: 4 });

  /* ---------- Wooden & Iron Armor ---------- */
  item('wood_helmet', '🪖', 'Wooden Helmet', 'Lightweight wooden head protection. Buff: +3% Speed, saves Energy & Comfort.', { type: 'armor', slot: 'head', tier: 'wood', def: 1 });
  item('wood_chest', '🦺', 'Wooden Chestplate', 'Lightweight wooden chest protection. Buff: +3% Speed, saves Energy & Comfort.', { type: 'armor', slot: 'chest', tier: 'wood', def: 1 });
  item('wood_legs', '👖', 'Wooden Leggings', 'Lightweight wooden leg protection. Buff: +3% Speed, saves Energy & Comfort.', { type: 'armor', slot: 'legs', tier: 'wood', def: 1 });
  item('wood_boots', '🥾', 'Wooden Boots', 'Sturdy yet light wooden boots. Buff: +3% Speed, saves Energy & Comfort.', { type: 'armor', slot: 'boots', tier: 'wood', def: 1 });

  item('iron_helmet', '🪖', 'Iron Helmet', 'A strong steel helmet. Buff: +5 Max HP and +6% Melee Damage.', { type: 'armor', slot: 'head', tier: 'iron', def: 2 });
  item('iron_chest', '🛡️', 'Iron Chestplate', 'Thick iron chest protection. Buff: +5 Max HP and +6% Melee Damage.', { type: 'armor', slot: 'chest', tier: 'iron', def: 3 });
  item('iron_legs', '👖', 'Iron Leggings', 'Sturdy steel leg protection. Buff: +5 Max HP and +6% Melee Damage.', { type: 'armor', slot: 'legs', tier: 'iron', def: 2 });
  item('iron_boots', '🥾', 'Iron Boots', 'Heavy steel boots. Buff: +5 Max HP and +6% Melee Damage.', { type: 'armor', slot: 'boots', tier: 'iron', def: 2 });
  item('copper_helmet', '🪖', 'Copper Helmet', 'A copper helmet. Buff: +3 Max HP and +3% Melee Damage.', { type: 'armor', slot: 'head', tier: 'copper', def: 1 });
  item('copper_chest', '🛡️', 'Copper Chestplate', 'Copper chest protection. Buff: +3 Max HP and +3% Melee Damage.', { type: 'armor', slot: 'chest', tier: 'copper', def: 2 });
  item('copper_legs', '👖', 'Copper Leggings', 'Copper leg protection. Buff: +3 Max HP and +3% Melee Damage.', { type: 'armor', slot: 'legs', tier: 'copper', def: 1 });
  item('copper_boots', '🥾', 'Copper Boots', 'Copper boots. Buff: +3 Max HP and +3% Melee Damage.', { type: 'armor', slot: 'boots', tier: 'copper', def: 1 });
  item('golden_helmet', '👑', 'Golden Helmet', 'A golden helmet. Buff: +3% Move Speed and +4% Melee Damage.', { type: 'armor', slot: 'head', tier: 'golden', def: 2 });
  item('golden_chest', '🛡️', 'Golden Chestplate', 'Golden chest protection. Buff: +3% Move Speed and +4% Melee Damage.', { type: 'armor', slot: 'chest', tier: 'golden', def: 2 });
  item('golden_legs', '👖', 'Golden Leggings', 'Golden leg protection. Buff: +3% Move Speed and +4% Melee Damage.', { type: 'armor', slot: 'legs', tier: 'golden', def: 2 });
  item('golden_boots', '🥾', 'Golden Boots', 'Golden boots. Buff: +3% Move Speed and +4% Melee Damage.', { type: 'armor', slot: 'boots', tier: 'golden', def: 1 });
  item('iron_bucket', '🪣', 'Iron Bucket', 'ey! super multifunction bucket allow you to carry liquid or if you need more armor just equip it on your head!', { type: 'armor', slot: 'head', tier: 'bucket', def: 3, note: 'Head slot. Halves the chance of getting Water Poison.' });

  /* ---------- Accessories ---------- */
  item('iron_watch', '⌚', 'Iron Watch', 'Watch your time before get back to the home', { type: 'acc', note: 'Accessory. Shows the hour only (minutes are shown as 0).' });
  item('golden_watch', '⌚', 'Golden Watch', 'Show off your time to zombie, and prove they\'re wrong time to come to you!', { type: 'acc', note: 'Accessory. Shows hours and minutes.' });
  item('radar', '📡', 'Radar', 'Detect zombies around you, and if you have GPS It will show they location!!!', { type: 'acc', note: 'Accessory. Shows the zombie count around you. With a GPS, zombies appear on the map.' });
  item('gps', '🗺️', 'GPS', 'I know where I am!', { type: 'acc', note: 'Accessory. Shows the map with your location.' });

  /* ---------- Placeable blocks & furniture ---------- */
  item('wood_block', '🟫', 'Wood Log Block', '1 m building block made of logs. A bit fragile, but cheap. Right click to place.', { type: 'block', vox: 1, hp: 30 });
  item('stone_block', '⬜', 'Stone Block', '1 m building block. Much stronger than a wood block.', { type: 'block', vox: 2, hp: 90 });
  item('furnace', '🔥', 'Smelting Furnace', 'Smelts ore into metal bars and logs into charcoal. Place it, then press E near it.', { type: 'block', vox: 3, hp: 80 });
  item('bed_block', '🛏️', 'Cozy Bed', 'A clean homemade bed. Sleep with [E] and dismantle it again anytime.', { type: 'block', vox: 4, hp: 50 });
  item('couch_block', '🛋️', 'Cozy Couch', 'A clean homemade couch to restore Comfort with [E]. Can be dismantled.', { type: 'block', vox: 5, hp: 45 });
  item('sink_block', '🚰', 'Sink', 'Washes Dirty Vegetables/Fruits into Fresh ones for free! Place it, then press [E].', { type: 'block', vox: 6, hp: 60 });
  item('campfire', '🏕️', 'Campfire', 'Let\'s camping during this apocalypse!', { type: 'block', vox: 7, hp: 40, note: 'Cooks Fresh Fish into Cooked Fish (25 s each). Stay near it while cooking.' });
  item('anvil_block', '⚒️', 'Iron Anvil', 'A heavy iron anvil for forging swords, chains, sticks, buckets and watches.', { type: 'block', vox: 8, hp: 120 });
  item('computer_bench', '🖥️', 'Computer Bench', 'A workbench for assembling electronics: batteries, LEDs, radars and GPS.', { type: 'block', vox: 9, hp: 70 });
  item('wood_plank', '🟧', 'Wood Plank', 'A clean cut plank. Made from Wood Logs at a Sawmill.');
  item('failed_craft_wood', '🥀', 'Failed Craft Wood', 'A badly cut piece of wood. Useless... or is it?');
  item('charcoal', '⬛', 'Charcoal', 'Burnt wood. A strong, steady fuel.', { note: 'Fuel: burns 10 s, 10 heat power.' });
  item('cannon_ball', '⚫', 'Cannon Ball', 'Ammo for cannons. 1 Stone makes 4 cannon balls.', {});
  item('wood_plank_block', '🟨', 'Wood Plank Block', '1 m building block. 20% tougher than a Wood Log Block.', { type: 'block', vox: 10, hp: 36 });
  item('wood_plank_basket', '🧺', 'Wood Plank Basket', 'A wooden plank shaped into a backpack. Keep it in your bag: +6 inventory slots.', { pack: 6, note: 'Backpack: +6 bag slots while you carry it.' });
  item('sawmill', '🪚', 'Sawmill', 'Cuts Wood Logs into Wood Planks and builds all handmade furniture. Place it, then press [E] near it.', { type: 'block', vox: 11, hp: 90 });
  item('turret_bench', '🔧', 'Turret Workbench', 'A bench for building cannons. Each piece is a puzzle. Place it, then press [E] near it.', { type: 'block', vox: 12, hp: 80 });
  item('handmade_cannon', '💣', 'Handmade Cannon', 'A crude auto-cannon. DMG 16 · Range 6 m · Delay 2 s · HP 150 · holds 20 cannon balls · Tier 1. Place it, then load it with [E].', { type: 'block', vox: 13, hp: 150, turret: { dmg: 16, rng: 6, dly: 2, cap: 20 } });
  item('cannon_turret', '🛡️', 'Cannon', 'An auto-cannon. DMG 20 · Range 10 m · Delay 1.5 s · HP 275 · holds 40 cannon balls · Tier 1. Load it with [E].', { type: 'block', vox: 14, hp: 275, turret: { dmg: 20, rng: 10, dly: 1.5, cap: 40 } });
  item('manual_cannon', '🎯', 'Manual Cannon', 'A powerful cannon you aim yourself. DMG 60 · Range 24 m · Delay 3 s · HP 500 · 1-shot clip, 2 s reload · Tier 2. Press [E] to man it, then Left Click to fire.', { type: 'block', vox: 15, hp: 500, turret: { dmg: 60, rng: 24, dly: 3, cap: 1, manual: true, reload: 2 } });

  /* ---------- Crafting recipes ---------- */
  /* [RECIPE TAG] st = crafting station: hand | sawmill | furnace | campfire | anvil | sink | turret | computer.
     A recipe is only SHOWN when the player is at its station AND already carries every ingredient type (see WZ.REVEAL).
     heat = heat power needed (furnace/campfire). puz = minigame: {k:'img',n:N} sliding picture puzzle, {k:'mask',shape} non-rectangular puzzle, {k:'saw'} sawmill line, {k:'wire'} wire game. */
  var R = [
    { id: 'sticks', st: 'hand', out: ['wood_sticks', 2], cost: { wood: 1 } },
    { id: 'gravel', st: 'hand', out: ['gravel', 2], cost: { stone: 1 } },
    { id: 'cannon_ball', st: 'hand', out: ['cannon_ball', 4], cost: { stone: 1 } },
    { id: 'wood_block', st: 'hand', out: ['wood_block', 2], cost: { wood: 1 } },
    { id: 'stone_block', st: 'hand', out: ['stone_block', 2], cost: { stone: 1 } },
    { id: 'crude_axe', st: 'hand', out: ['crude_axe', 1], cost: { wood_sticks: 4, gravel: 2 } },
    { id: 'crude_pickaxe', st: 'hand', out: ['crude_pickaxe', 1], cost: { wood_sticks: 4, gravel: 3 } },
    { id: 'wood_club', st: 'hand', out: ['wood_club', 1], cost: { broken_wood_planks: 3, broken_cardboards: 2 } },
    { id: 'wood_sword', st: 'hand', out: ['wood_sword', 1], cost: { wood_sticks: 2, wood: 6 } },
    { id: 'stone_sword', st: 'hand', out: ['stone_sword', 1], cost: { stone: 6, gravel: 2, rope: 1, wood_sticks: 4 } },
    { id: 'rope', st: 'hand', out: ['rope', 1], cost: { string: 3 } },
    { id: 'wood_bow', st: 'hand', out: ['wood_bow', 1], cost: { wood_sticks: 30, string: 6 } },
    { id: 'arrow', st: 'hand', out: ['arrow', 20], cost: { wood_sticks: 4, feather: 1 } },
    { id: 'wood_rod', st: 'hand', out: ['wood_rod', 1], cost: { wood: 2, wood_sticks: 30, string: 4 } },
    { id: 'furnace', st: 'hand', out: ['furnace', 1], cost: { stone: 20, wood: 6 } },
    { id: 'campfire', st: 'hand', out: ['campfire', 1], cost: { gravel: 10, wood: 30, coal: 3 } },
    { id: 'anvil_block', st: 'hand', out: ['anvil_block', 1], cost: { iron_ingot: 18 } },
    { id: 'computer_bench', st: 'hand', out: ['computer_bench', 1], cost: { iron_ingot: 10, metal_casing: 6, wood: 10, broken_copper_wire: 30 } },
    { id: 'sawmill', st: 'hand', out: ['sawmill', 1], cost: { wood: 12, iron_ingot: 4, iron_chain: 2 } },
    { id: 'turret_bench', st: 'hand', out: ['turret_bench', 1], cost: { wood: 12, copper_ingot: 4, iron_ingot: 6 } },
    { id: 'handmade_cannon', st: 'hand', out: ['handmade_cannon', 1], cost: { wood: 16, stone: 8, broken_copper_wire: 4 } },
    { id: 'iron_axe', st: 'hand', out: ['iron_axe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'iron_pickaxe', st: 'hand', out: ['iron_pickaxe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'wood_helmet', st: 'hand', out: ['wood_helmet', 1], cost: { wood: 4, wood_sticks: 2 } },
    { id: 'wood_chest', st: 'hand', out: ['wood_chest', 1], cost: { wood: 7, wood_sticks: 2 } },
    { id: 'wood_legs', st: 'hand', out: ['wood_legs', 1], cost: { wood: 5, wood_sticks: 2 } },
    { id: 'wood_boots', st: 'hand', out: ['wood_boots', 1], cost: { wood: 4, wood_sticks: 2 } },
    { id: 'iron_helmet', st: 'hand', out: ['iron_helmet', 1], cost: { iron_ingot: 4 } },
    { id: 'iron_chest', st: 'hand', out: ['iron_chest', 1], cost: { iron_ingot: 7 } },
    { id: 'iron_legs', st: 'hand', out: ['iron_legs', 1], cost: { iron_ingot: 5 } },
    { id: 'iron_boots', st: 'hand', out: ['iron_boots', 1], cost: { iron_ingot: 4 } },
    { id: 'copper_axe', st: 'hand', out: ['copper_axe', 1], cost: { copper_ingot: 3, wood_sticks: 2 } },
    { id: 'copper_pickaxe', st: 'hand', out: ['copper_pickaxe', 1], cost: { copper_ingot: 3, wood_sticks: 2 } },
    { id: 'copper_helmet', st: 'hand', out: ['copper_helmet', 1], cost: { copper_ingot: 4 } },
    { id: 'copper_chest', st: 'hand', out: ['copper_chest', 1], cost: { copper_ingot: 7 } },
    { id: 'copper_legs', st: 'hand', out: ['copper_legs', 1], cost: { copper_ingot: 5 } },
    { id: 'copper_boots', st: 'hand', out: ['copper_boots', 1], cost: { copper_ingot: 4 } },
    { id: 'golden_axe', st: 'hand', out: ['golden_axe', 1], cost: { golden_ingot: 3, wood_sticks: 2 } },
    { id: 'golden_pickaxe', st: 'hand', out: ['golden_pickaxe', 1], cost: { golden_ingot: 3, wood_sticks: 2 } },
    { id: 'golden_helmet', st: 'hand', out: ['golden_helmet', 1], cost: { golden_ingot: 4 } },
    { id: 'golden_chest', st: 'hand', out: ['golden_chest', 1], cost: { golden_ingot: 7 } },
    { id: 'golden_legs', st: 'hand', out: ['golden_legs', 1], cost: { golden_ingot: 5 } },
    { id: 'golden_boots', st: 'hand', out: ['golden_boots', 1], cost: { golden_ingot: 4 } },
    /* Sawmill (line-cutting minigame per piece; a failed cut gives Failed Craft Wood) */
    { id: 'wood_plank', st: 'sawmill', out: ['wood_plank', 2], cost: { wood: 1 }, puz: { k: 'saw', d: 1 }, label: 'Cut Wood Log into Wood Planks' },
    { id: 'wood_plank_block', st: 'sawmill', out: ['wood_plank_block', 1], cost: { wood_plank: 4 }, puz: { k: 'saw', d: 1 } },
    { id: 'wood_plank_basket', st: 'sawmill', out: ['wood_plank_basket', 1], cost: { wood_plank: 10 }, puz: { k: 'saw', d: 2 } },
    { id: 'bed_block', st: 'sawmill', out: ['bed_block', 1], cost: { wood: 6, broken_fabric_cloth: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'couch_block', st: 'sawmill', out: ['couch_block', 1], cost: { wood: 5, broken_fabric_cloth: 2, broken_cardboards: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'sink_block', st: 'sawmill', out: ['sink_block', 1], cost: { iron_ingot: 10, wood: 5 }, puz: { k: 'saw', d: 3 } },
    /* Anvil */
    { id: 'iron_sword', st: 'anvil', out: ['iron_sword', 1], cost: { iron_ingot: 6, broken_copper_wire: 2, iron_nugget: 4, wood_sticks: 8 } },
    { id: 'copper_sword', st: 'anvil', out: ['copper_sword', 1], cost: { copper_ingot: 5, wood_sticks: 6 } },
    { id: 'golden_sword', st: 'anvil', out: ['golden_sword', 1], cost: { golden_ingot: 5, wood_sticks: 6 } },
    { id: 'iron_chain', st: 'anvil', out: ['iron_chain', 1], cost: { iron_ingot: 2 } },
    { id: 'iron_stick', st: 'anvil', out: ['iron_stick', 1], cost: { iron_ingot: 1 } },
    { id: 'iron_bucket', st: 'anvil', out: ['iron_bucket', 1], cost: { iron_ingot: 2, iron_chain: 1 } },
    { id: 'golden_chain', st: 'anvil', out: ['golden_chain', 1], cost: { golden_ingot: 2 } },
    { id: 'golden_stick', st: 'anvil', out: ['golden_stick', 1], cost: { golden_ingot: 1 } },
    { id: 'iron_watch', st: 'anvil', out: ['iron_watch', 1], cost: { iron_ingot: 2, iron_chain: 1, iron_stick: 1 } },
    { id: 'golden_watch', st: 'anvil', out: ['golden_watch', 1], cost: { golden_ingot: 2, golden_chain: 1, golden_stick: 1 } },
    /* Turret Workbench (picture puzzle per piece, harder at higher tier) */
    { id: 'cannon_turret', st: 'turret', out: ['cannon_turret', 1], cost: { wood: 8, stone: 20, copper_ingot: 8, iron_ingot: 2 }, puz: { k: 'img', n: 3 }, tier: 1 },
    { id: 'manual_cannon', st: 'turret', out: ['manual_cannon', 1], cost: { wood: 24, stone: 10, copper_ingot: 6, iron_ingot: 4 }, puz: { k: 'img', n: 4 }, tier: 2 },
    /* Computer Bench */
    { id: 'medium_battery', st: 'computer', out: ['medium_battery', 1], cost: { iron_nugget: 2, broken_copper_wire: 75, plastic_paper_package: 1 }, puz: { k: 'wire' } },
    { id: 'ips_led', st: 'computer', out: ['ips_led', 1], cost: { mini_led_lamp: 50, broken_copper_wire: 120, rgb_lamp: 3, black_screen_cover: 5 }, puz: { k: 'mask', shape: 'plus' } },
    { id: 'radar', st: 'computer', out: ['radar', 1], cost: { signal_chip: 1, medium_battery: 1, metal_casing: 10, ips_led: 2 }, puz: { k: 'mask', shape: 'ring' } },
    { id: 'gps', st: 'computer', out: ['gps', 1], cost: { ips_led: 4, black_screen_cover: 2, metal_casing: 16, medium_battery: 2, signal_chip: 1, gpu_chip: 1 }, puz: { k: 'mask', shape: 'diamond' } },
    /* Furnace (needs fuel: heat power) */
    { id: 'melt_iron', st: 'furnace', out: ['iron_ingot', 1], cost: { iron_nugget: 8 }, heat: 40, label: 'Smelt Iron Bar' },
    { id: 'melt_copper', st: 'furnace', out: ['copper_ingot', 1], cost: { broken_copper_wire: 25 }, heat: 30, label: 'Smelt Copper Bar' },
    { id: 'melt_gold', st: 'furnace', out: ['golden_ingot', 1], cost: { golden_nugget: 12 }, heat: 50, label: 'Smelt Golden Bar' },
    { id: 'make_charcoal', st: 'furnace', out: ['charcoal', 1], cost: { wood: 1 }, heat: 25, label: 'Burn Wood Log into Charcoal' },
    /* Sink */
    { id: 'wash_veg', st: 'sink', out: ['fresh_veg', 1], cost: { dirty_veg: 1 }, label: 'Wash Dirty Vegetables → Fresh' },
    { id: 'wash_fruits', st: 'sink', out: ['fresh_fruits', 1], cost: { dirty_fruits: 1 }, label: 'Wash Dirty Fruits → Fresh' },
    /* Campfire (cooking, needs fuel) */
    { id: 'cook_fish', st: 'campfire', out: ['cooked_fish', 1], cost: { fresh_fish: 1 }, heat: 20, label: 'Cook Fresh Fish → Cooked Fish' }
  ];

  /* Temporary schematics (coming soon) */
  WZ.SCHEMATICS = ['Engine Bench', 'Vehicle Body Bench', 'Wheel Bench', 'Arms Robot', 'Sunlight Electric Generator', 'Wind Electric Generator', 'Coal Electric Generator', 'Pumpjack', 'Vehicle Assemblery Machine', 'Big Battery (100,000 mAh)', 'Giant Battery (500,000 mAh)', 'Huge Battery (2,500,000 mAh)', 'Mega Industrial Battery (15,000,000 mAh)'];

  /* ---------- Loot tables (total percent = 100) ---------- */
  var LOOT = {
    trash1: { name: 'Trash (Tier 1)', rolls: 1, enabled: true, t: [['broken_plastic_bottle', 20], ['dirty_plastic_bottle', 20], ['dirty_box_food', 15], ['broken_tin_can', 10], ['leftover_food', 15], ['gravel', 10], ['soil', 5], ['feather', 5]] },
    trash2: { name: 'Trash (Tier 2)', rolls: 1, enabled: true, t: [['dirty_aluminium_foil', 15], ['dirty_paper', 16], ['broken_leather_cloth', 5], ['broken_fabric_cloth', 10], ['gravel', 5], ['broken_floppy_drive', 1], ['iron_nugget', 7], ['broken_copper_wire', 7], ['broken_cardboards', 10], ['broken_wood_planks', 10], ['medical_bag', 4], ['feather', 10]] },
    trash3: { name: 'Trash (Tier 3)', rolls: 1, enabled: false, t: [['broken_dvd_player', 2], ['broken_cd', 3], ['broken_dvd', 5], ['broken_old_tv', null]] },
    table4: { name: 'Above Table (Tier 4)', rolls: 2, enabled: true, t: [['mini_led_lamp', 22], ['rgb_lamp', 8], ['black_screen_cover', 12], ['metal_casing', 18], ['plastic_paper_package', 15], ['broken_copper_wire', 15], ['gpu_chip', 5], ['iron_nugget', 5]] },
    crate1: { name: 'Wooden Crate (Tier 1)', rolls: 3, enabled: true, t: [['contaminated_veg', 20], ['dirty_veg', 20], ['contaminated_fruits', 15], ['dirty_fruits', 15], ['plastic_bottled_water', 20], ['wood_sticks', 10]] },
    /* [LOOT TAG] truck trunk = "Iron Crate (Tier N)" (N = world tier, max 5): always 3 random picks from a modest (not high-end) list. Tier 3+ worlds use truck3 (adds iron/copper bars). */
    truck:  { name: 'Iron Crate', rolls: 3, enabled: true, t: [['medical_bag', 12], ['plastic_bottled_water', 18], ['fresh_fruits', 10], ['fresh_veg', 10], ['iron_nugget', 18], ['broken_copper_wire', 14], ['coal', 10], ['wood_sticks', 8]] },
    truck3: { name: 'Iron Crate', rolls: 3, enabled: true, t: [['medical_bag', 12], ['plastic_bottled_water', 14], ['fresh_fruits', 5], ['iron_nugget', 18], ['broken_copper_wire', 14], ['iron_ingot', 8], ['copper_ingot', 4], ['metal_casing', 10], ['coal', 10], ['wood_sticks', 5]] },
    crate3: { name: 'Reinforced Wooden Crate (Tier 3)', rolls: 3, enabled: true, t: [['medical_bag', 15], ['plastic_bottled_water', 15], ['fresh_veg', 10], ['fresh_fruits', 10], ['iron_nugget', 20], ['broken_copper_wire', 15], ['metal_casing', 10], ['mini_led_lamp', 5]] },
    crate4: { name: 'Iron Crate (Tier 4)', rolls: 3, enabled: true, t: [['medical_bag', 15], ['iron_nugget', 20], ['broken_copper_wire', 20], ['metal_casing', 15], ['mini_led_lamp', 10], ['plastic_paper_package', 10], ['black_screen_cover', 5], ['rgb_lamp', 5]] },
    crate5: { name: 'Iron Crate (Tier 5)', rolls: 3, enabled: true, t: [['medical_bag', 10], ['iron_ingot', 15], ['iron_nugget', 15], ['broken_copper_wire', 15], ['metal_casing', 15], ['rgb_lamp', 10], ['black_screen_cover', 8], ['gpu_chip', 6], ['mini_led_lamp', 6]] },
    crate2: { name: 'Wooden Crate (Tier 2)', rolls: 3, enabled: true, t: [['medical_bag', 20], ['plastic_bottled_water', 20], ['fresh_veg', 15], ['fresh_fruits', 15], ['iron_nugget', 15], ['broken_fabric_cloth', 15]] }
  };

  /* ---------- Fishing: fishing point (FP) per catch. Lake table = 100% ---------- */
  WZ.FISH = {
    lake: [
      { id: 'zombie_fish', pct: 5, fp: 135, name: 'Zombie Fish' },
      { id: 'contaminated_fish', pct: 35, fp: 90 },
      { id: 'broken_tin_can', pct: 20, fp: 50 },
      { id: 'crate_t1', pct: 25, fp: 160, name: 'Floating Wooden Crate (Tier 1)' },
      { id: 'fresh_fish', pct: 15, fp: 75 }
    ]
  };

  /* ---------- Zombies ----------
     Every mob has a [MOB TAG] comment line so any AI/dev can read the rules quickly.
     rarity: common | rare (1/4 of normal spawn) | epic (1/10) | legendary (1/25) | mythical (1/100) | boss (spawns only by rule) | miniboss (manual spawn only, none yet)
     tier  : world tier needed before it can spawn (world tier is by day, see WZ.TIER_DAYS)
     biome : 'desert' = only spawns on the desert side; undefined = anywhere
     coin  : [kills needed, coins given]
     nospawn: never spawned by the normal spawner (boss / special spawns) */
  var Z = {
    /* [MOB TAG] id=walker | rarity=common | tier=T1 | biome=any | coin=3 kills -> 1 coin */
    walker:  { name: 'Walker',   hp: 80,  spd: 1.1, dmg: 5,  def: 0, tier: 1, rarity: 'common', scale: 1.0,  color: 0x6d7a5a, cd: 1.0, w: 40, coin: [3, 1] },
    /* [MOB TAG] id=runner | rarity=common | tier=T1 | biome=any | coin=2 kills -> 1 coin */
    runner:  { name: 'Runner',   hp: 50,  spd: 1.6, dmg: 5,  def: 0, tier: 1, rarity: 'common', scale: 0.92, color: 0x8a6a52, cd: 0.8, w: 22, coin: [2, 1] },
    /* [MOB TAG] id=big | rarity=common | tier=T1 | biome=any | coin=1 kill -> 1 coin */
    big:     { name: 'Big',      hp: 150, spd: 0.8, dmg: 8,  def: 0, tier: 1, rarity: 'common', scale: 1.3,  color: 0x56654f, cd: 1.1, w: 12, coin: [1, 1] },
    /* [MOB TAG] id=bomber | rarity=common | tier=T1 | biome=any | coin=1 kill -> 2 coins (from the earlier spec) */
    bomber:  { name: 'Bomber',   hp: 60,  spd: 1.2, dmg: 60, def: 0, tier: 1, rarity: 'common', scale: 1.05, color: 0x9a5a2a, cd: 0,   w: 10, splash: 4, coin: [1, 2] },
    /* [MOB TAG] id=brute | rarity=common | tier=T2 | biome=any | coin=1 kill -> 2 coins */
    brute:   { name: 'Brute',    hp: 275, spd: 0.5, dmg: 12, def: 0, tier: 2, rarity: 'common', scale: 1.55, color: 0x4a3f55, cd: 1.3, w: 6, coin: [1, 2] },
    /* [MOB TAG] id=soldier | rarity=common | tier=T2 | biome=any | coin=1 kill -> 3 coins */
    soldier: { name: 'Soldier',  hp: 100, spd: 1.0, dmg: 9,  def: 2, tier: 2, rarity: 'common', scale: 1.05, color: 0x3d5a3a, cd: 1.0, w: 8, coin: [1, 3] },
    /* [MOB TAG] id=spider | rarity=common | tier=T1 | biome=any | coin=none | drops String 33.33% */
    spider:  { name: 'Spider',   hp: 40,  spd: 1.5, dmg: 5,  def: 1, tier: 1, rarity: 'common', scale: 0.7,  color: 0x3b3340, cd: 0.8, w: 8 },
    /* [MOB TAG] id=antlion | AntlionZ | rarity=common | tier=T3 | biome=DESERT ONLY | coin=1 kill -> 4 coins | skill: moves 2x faster when HP < 20% */
    antlion: { name: 'AntlionZ', hp: 75,  spd: 1.2, dmg: 7,  def: 3, tier: 3, rarity: 'common', biome: 'desert', scale: 1.0, color: 0xe07a1a, cd: 0.9, w: 10, coin: [1, 4], rage: true },
    /* [MOB TAG] id=zcorpion | Zcorpionz | rarity=RARE | tier=T4 | biome=DESERT ONLY | coin=1 kill -> 6 coins | RNG 1.2 (reach x1.2) | skill: shoots "Acidic Poison", each hit makes the poison 3x deadlier (stacks up to 3) */
    zcorpion:{ name: 'Zcorpionz', hp: 90, spd: 1.1, dmg: 18, def: 2, tier: 4, rarity: 'rare', biome: 'desert', scale: 1.0, color: 0xc9a050, cd: 1.0, w: 10, coin: [1, 6], rng: 1.2, ranged: 'acid', acidic: true },
    /* [MOB TAG] id=programmer | Programmer Zombie | rarity=RARE | tier=T4 | biome=any | coin=1 kill -> 7 coins | shoots Keybind Error Virus | drops Signal Finder Chip 10% */
    programmer: { name: 'Programmer Zombie', hp: 70, spd: 0.9, dmg: 10, def: -5, tier: 4, rarity: 'rare', scale: 1.0, color: 0x35506b, cd: 1.0, w: 10, ranged: 'virus', coin: [1, 7] },
    /* [MOB TAG] id=miner | Miner Zombie Walker | rarity=special | spawns only inside the mineshaft | coin=none */
    miner:   { name: 'Miner Zombie Walker', hp: 90, spd: 0.8, dmg: 12, def: 3, tier: 2, rarity: 'common', scale: 1.05, color: 0x7a6a3a, cd: 1.0, w: 0, nospawn: true },
    /* [MOB TAG] id=zfish | Zombie Fish | rarity=special (fishing only) | tier=T-Flexible | coin=1 kill -> 1 coin | attack gives Water Poison */
    zfish:   { name: 'Zombie Fish', hp: 30, spd: 0.9, dmg: 4, def: -1, tier: 1, rarity: 'common', scale: 0.55, color: 0x3a8f87, cd: 1.0, w: 0, nospawn: true, wpoison: true, coin: [1, 1] },
    /* [MOB TAG] id=gigantus | Gigantus Zombie | rarity=BOSS (tier 1 -> 2) | spawns ONCE at day 10 | coin=1 kill -> 25 coins | SPLASH 1 | weakness: attacks 3x slower than normal zombies (cd 1.0 x3) */
    gigantus:{ name: 'Gigantus Zombie', hp: 500, spd: 0.4, dmg: 20, def: 0, tier: 2, rarity: 'boss', scale: 2.3, color: 0x4f5a44, cd: 3.0, w: 0, nospawn: true, boss: true, splash: 1, coin: [1, 25] },
    /* [MOB TAG] id=armored | Armored-Full Zombie Mk-1 | rarity=BOSS (tier 2 -> 3) | spawns ONCE at day 30 | coin=1 kill -> 100 coins | weakness: attacks 4x slower than normal zombies (cd 1.0 x4) */
    armored: { name: 'Armored-Full Zombie Mk-1', hp: 1000, spd: 0.25, dmg: 35, def: 7, tier: 3, rarity: 'boss', scale: 1.8, color: 0x6c7077, cd: 4.0, w: 0, nospawn: true, boss: true, coin: [1, 100] }
    /* [MOB TAG] miniboss: none defined yet. A Mini-Boss must carry rarity:'miniboss' + nospawn:true and is only spawned manually by the developer. */
  };

  /* World tier by day: tier N is reached on day WZ.TIER_DAYS[N-1] (T2 = day 10, T3 = day 30 as requested; T4+ are placeholders) */
  WZ.TIER_DAYS = [1, 10, 30, 60, 100, 150, 210, 280, 360, 450];
  /* Blood Moon chance (percent) per day by world tier T1..T10 (capped at T10) */
  WZ.BLOOD = [0, 1, 2, 3, 4, 6, 8, 10, 12.5, 15];
  /* Spawn weight of a rarity group relative to the whole common spawn */
  WZ.RARITY = { common: 1, rare: 1 / 4, epic: 1 / 10, legendary: 1 / 25, mythical: 1 / 100 };

  WZ.ITEMS = I;
  WZ.RECIPES = R;
  /* Recipe reveal rule: 'all' = shown only when the player has at least 1 of EVERY ingredient (and is at the station). Set to 'any' to show it when at least one ingredient is owned. */
  WZ.REVEAL = 'all';
  /* Fuel: t = burn seconds per item, p = heat power per item */
  WZ.FUEL = { coal: { t: 15, p: 10 }, wood: { t: 5, p: 4 }, charcoal: { t: 10, p: 10 } };
  /* Bag rules: 24 slots; stacks of 50; tools, armor and accessories do not stack. */
  WZ.BAG_SLOTS = 24;
  WZ.maxStack = function (id) { var it = I[id]; if (!it) return 50; if (it.type === 'tool' || it.type === 'armor' || it.type === 'acc' || it.pack || it.type === 'block' && it.turret) return 1; return 50; };
  /* Turret blocks: a destroyed turret (by zombies) drops 20% of its crafting materials */
  WZ.TURRET_VOX = { 13: 'handmade_cannon', 14: 'cannon_turret', 15: 'manual_cannon' };
  WZ.LOOT = LOOT;
  WZ.ZOMBIES = Z;
  WZ.ZTYPE_LIST = ['walker', 'runner', 'big', 'bomber', 'brute', 'soldier', 'spider', 'programmer', 'miner', 'zfish', 'antlion', 'zcorpion', 'gigantus', 'armored'];
  WZ.rollLoot = function (key, rnd) {
    var t = LOOT[key].t, r = rnd() * 100, acc = 0;
    for (var i = 0; i < t.length; i++) {
      if (t[i][1] == null) continue;
      acc += t[i][1];
      if (r < acc) return t[i][0];
    }
    return t[0][0];
  };
})(window.WZ);
/* end data.js */
