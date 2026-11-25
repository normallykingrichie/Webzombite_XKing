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
  item('copper_ore', '🟠', 'Copper Ore', 'Raw copper ore mined from rocks. Smelt it into bars, or mill it into wire.', { note: '25 ore smelt into 1 Copper Bar in a Furnace (30 heat power).' });
  item('copper_wire', '〰️', 'Copper Wire', 'Thin copper wire. Made from Copper Ore at the Manual Milling.', { note: '1 Copper Ore makes 4 Copper Wire at a Manual Milling.' });
  item('broken_cardboards', '📦', 'Broken Cardboards', 'Flat, damp cardboard.');
  item('broken_wood_planks', '🪵', 'Broken Wood Planks', 'A split wooden plank. Still sturdy enough to hit things with.');
  item('iron_ingot', '🧱', 'Iron Bar', 'A bar of pure iron. Used for iron tools, sinks, anvils and iron armor.');
  item('copper_ingot', '🟧', 'Copper Bar', 'A bar of pure copper. Used for the copper tools and armor. Can also replace the job of the Electro bar!');
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
  item('gpu_chip', '🎞️', 'Low-End GPU', 'A weak little graphics chip. Still enough to draw a map! Used in computers and GPS.');
  item('medium_battery', '🔋', 'Medium Battery', 'A medium-sized battery that powers small devices.');
  item('ips_led', '🖥️', 'IPS LED', 'Bright IPS LED, annoy you when you see it... have an insomnia day!');

  /* ---------- Food, drinks & medical ---------- */
  item('leftover_food', '🍲', 'Leftover Food', 'Eww... this leftover food is still edible... at least enough to survive the apocalypse...', { type: 'food', eat: { t: 2, h: 4, th: -2, poison: 0.30 } });
  /* [FRUIT/VEG TAGS] Dirty = wash at a Sink -> Clean. Contaminated = risky to eat (cannot be washed). Clean = safe. */
  var FRUITS = [['apple', 'Apple', '🍎'], ['mango', 'Mango', '🥭'], ['orange', 'Orange', '🍊'], ['lemon', 'Lemon', '🍋'], ['watermelon', 'Watermelon', '🍉'], ['pumpkin', 'Pumpkin', '🎃']];
  var VEGS = [['cabbage', 'Cabbage', '🥬'], ['cucumber', 'Cucumber', '🥒'], ['sweet_potato', 'Sweet Potato', '🍠'], ['corn', 'Corn', '🌽'], ['potato', 'Potato', '🥔']];
  WZ.GROUPS = { dirty_fruit: [], cont_fruit: [], clean_fruit: [], dirty_veg: [], cont_veg: [], clean_veg: [] };
  [[FRUITS, 'fruit'], [VEGS, 'veg']].forEach(function (g) {
    g[0].forEach(function (f) {
      var big = f[0] === 'watermelon' || f[0] === 'pumpkin';
      item('dirty_' + f[0], f[2], 'Dirty ' + f[1], 'So dirty! Wash it in a Sink to get a clean ' + f[1] + '.', { type: 'food', eat: { t: 4, h: big ? 9 : 7, th: 2, stomach: 0.20 }, cat: 'dirty_' + g[1] });
      item('contaminated_' + f[0], f[2], 'Contaminated ' + f[1], 'Mmm... is this still safe to eat?', { type: 'food', eat: { t: 4, h: 6, th: 1, poison: 0.50 }, cat: 'contaminated_' + g[1] });
      item(f[0], f[2], f[1], 'A clean, safe ' + f[1] + '. Healthy and refreshing!', { type: 'food', eat: { t: 3, h: big ? 15 : 12, th: f[0] === 'watermelon' ? 12 : 5, comfort: 5 }, cat: 'clean_' + g[1] });
      WZ.GROUPS['dirty_' + g[1]].push('dirty_' + f[0]); WZ.GROUPS['cont_' + g[1]].push('contaminated_' + f[0]); WZ.GROUPS['clean_' + g[1]].push(f[0]);
    });
  });
  WZ.VILLAGE_ONLY = { dirty_watermelon: 1, dirty_pumpkin: 1, contaminated_watermelon: 1, contaminated_pumpkin: 1, watermelon: 1, pumpkin: 1 };
  /* berries (from bushes) */
  item('contaminated_blueberry', '🫐', 'Contaminated Blueberry', 'Looks edible... mostly.', { type: 'food', eat: { t: 2, h: 3, th: 1, poison: 0.40 } });
  item('contaminated_redberry', '🍓', 'Contaminated Redberry', 'Looks edible... mostly.', { type: 'food', eat: { t: 2, h: 3, th: 1, poison: 0.40 } });
  item('contaminated_sweetberry', '🍒', 'Contaminated Sweet Berry', 'Looks edible... mostly.', { type: 'food', eat: { t: 2, h: 3, th: 1, poison: 0.40 } });
  item('blueberry', '🫐', 'Blueberry', 'Fresh and safe.', { type: 'food', eat: { t: 2, h: 6, th: 3, comfort: 2 } });
  item('redberry', '🍓', 'Redberry', 'Fresh and safe.', { type: 'food', eat: { t: 2, h: 6, th: 3, comfort: 2 } });
  item('sweetberry', '🍒', 'Sweet Berry', 'Fresh and safe.', { type: 'food', eat: { t: 2, h: 6, th: 3, comfort: 2 } });
  item('golden_berry', '🌟', 'Golden Berry', 'Five times stronger than a normal berry! Grants Goldy Skin (+4 DEF), Goldy Resistance (-10% damage taken), Goldy Regeneration (+1 HP/s) and Goldy Strike (+10% damage) for 2 minutes.', { type: 'food', eat: { t: 2, h: 30, th: 15, comfort: 10, golden: true } });
  item('mysterious_box', '🎁', 'Mysterious Box', 'What is inside? Open it with [Left Click]. Gives 5 items from an Iron Crate of your world tier.', { type: 'food', eat: { t: 1.5, box: true } });
  item('clover_leaf', '🍀', 'Clover Leaf', 'A rare four-leaf clover. Used for Lucky Rings.');
  item('plastic_bottled_water', '💧', 'Plastic Bottled Water', 'Not fully sterilized, but enough to cure your thirst!', { type: 'drink', eat: { t: 5, h: 0, th: 20, poison: 0.02 } });
  item('life_fruit', '🍎', 'Life Fruit', 'COMING SOON. Permanently adds +10 Max HP each time it is eaten. Max stack 10. How to obtain: not known yet.', { type: 'food', soon: true });
  item('aegis_fruit', '🍏', 'Aegis Fruit', 'COMING SOON. Permanently adds +5 Max Hunger each time it is eaten. Max stack 10. How to obtain: not known yet.', { type: 'food', soon: true });
  item('magic_purify_water', '✨', 'Magic Fresh Super Purify Water', 'COMING SOON. Permanently adds +5 Max Thirst each time it is drunk. Max stack 10. How to obtain: not known yet.', { type: 'drink', soon: true });
  item('medical_bag', '🩹', 'Band Aid', 'A quick bandage. Hold left click for 1.5 seconds to restore 10 HP.', { type: 'med', eat: { t: 1.5, heal: 10 } });
  item('carton_sheet', '📄', 'Carton Sheet', 'A flat sheet of cardboard. Made by reprocessing Broken Cardboards at a Manual Milling.');
  item('carton_box', '📦', 'Carton Box', 'A small sturdy box. 6 Carton Sheets folded together. Used to build a Band Aid Box.');
  item('band_aid_box', '🧰', 'Band Aid Box', 'Portable medical box with 30 uses. Each use (hold left click) restores 11 HP. Max stack 20.', { type: 'med', eat: { t: 1.5, heal: 11, uses: 30 } });
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
  item('iron_bucket', '🪣', 'Iron Bucket', 'ey! super multifunction bucket allow you to carry liquid or if you need more armor just equip it on your head!', { type: 'armor', slot: 'head', tier: 'bucket', def: 3, note: 'Head slot. Halves the chance of getting Water Poison. Cannot carry Lava (it would melt): use a Titanium Bucket.' });

  /* ---------- Accessories ---------- */
  item('iron_watch', '⌚', 'Iron Watch', 'Watch your time before get back to the home', { type: 'acc', note: 'Accessory. Shows the hour only (minutes are shown as 0).' });
  item('golden_watch', '⌚', 'Golden Watch', 'Show off your time to zombie, and prove they\'re wrong time to come to you!', { type: 'acc', note: 'Accessory. Shows hours and minutes.' });
  item('radar', '📡', 'Radar', 'Detect zombies around you, and if you have GPS It will show they location!!!', { type: 'acc', note: 'Accessory. Shows the zombie count around you. With a GPS, zombies appear on the map.' });
  item('gps', '🗺️', 'GPS', 'I know where I am!', { type: 'acc', note: 'Accessory. Shows the map with your location.' });

  /* ---------- Placeable blocks & furniture ---------- */
  item('wood_block', '🟫', 'Wood Log Block', '1 m building block made of logs. A bit fragile, but cheap. Right click to place.', { type: 'block', vox: 1, hp: 30 });
  item('stone_block', '⬜', 'Stone Block', '1 m building block. Much stronger than a wood block.', { type: 'block', vox: 2, hp: 90 });
  item('furnace', '🔥', 'Smelting Furnace', 'Smelts ore into metal bars and logs into charcoal. Place it, then press E near it.', { type: 'block', vox: 3, hp: 80, size: [1, 1, 2] });
  item('bed_block', '🛏️', 'Cozy Bed', 'A clean homemade bed. Sleep with [E] and dismantle it again anytime.', { type: 'block', vox: 4, hp: 50, size: [2, 1, 1] });
  item('couch_block', '🛋️', 'Cozy Couch', 'A clean homemade couch to restore Comfort with [E]. Can be dismantled.', { type: 'block', vox: 5, hp: 45, size: [2, 1, 1] });
  item('sink_block', '🚰', 'Sink', 'Washes Dirty Vegetables/Fruits into Fresh ones for free! Place it, then press [E].', { type: 'block', vox: 6, hp: 60, size: [1, 1, 2] });
  item('campfire', '🏕️', 'Campfire', 'Let\'s camping during this apocalypse!', { type: 'block', vox: 7, hp: 40, size: [2, 2, 2], note: 'Cooks Fresh Fish into Cooked Fish (25 s each). Stay near it while cooking.' });
  item('anvil_block', '⚒️', 'Iron Anvil', 'A heavy iron anvil for forging swords, chains, sticks, buckets and watches.', { type: 'block', vox: 8, hp: 120 });
  item('computer_bench', '🖥️', 'Computer Bench', 'A workbench for assembling electronics: batteries, LEDs, radars and GPS.', { type: 'block', vox: 9, hp: 70, size: [3, 1, 2] });
  item('leaf', '🍃', 'Leaf', 'A green leaf. 4 leaves twist into 1 Rope at a Manual Milling.');
  item('cactus', '🌵', 'Cactus', 'A prickly cactus chunk from the desert. Not a log!');
  item('pine_log', '🪵', 'Pine Log', 'A log from a snow pine. Works like a Wood Log but 1.1x tougher.');
  item('palm_log', '🪵', 'Palm Log', 'A log from a beach palm. Works like a Wood Log but 1.1x tougher.');
  item('sand', '🏖️', 'Sand', 'Desert sand. Smelt 2 sand into Glass; also used for bombs.');
  item('flint', '🔥', 'Flint', 'A sparking stone. Made by rubbing gravel at a Manual Milling (25% chance).');
  item('gunpowder', '💥', 'Gunpowder', 'Black powder. Dropped by Bomber Zombies (5%).');
  item('glass', '🔷', 'Glass', 'Transparent also deadly...', { note: 'Smelt 2 Sand in a Furnace (75 heat power).' });
  item('copper_stick', '📏', 'Copper Stick', 'A straight copper rod. Made at an Iron Anvil.');
  item('manual_press', '🗜️', 'Manual Pressing', 'Presses bars into plates by hand-cranking. Iron, Coated-Iron, Copper and Gold only. Size 2x1x2.', { type: 'block', vox: 29, hp: 90, size: [2, 1, 2] });
  item('casing_crafter', '🚗', 'Manual Casing & Frame Crafter', 'Cranks plates and bars into vehicle casings and frames. Size 3x1x2.', { type: 'block', vox: 30, hp: 100, size: [3, 1, 2] });
  item('trap_bench', '🪤', 'Trap Bench', 'Builds spikes, barbed wire and other traps. Place it, then press [E] near it.', { type: 'block', vox: 31, hp: 90, size: [2, 1, 2] });
  item('mason_bench', '🧱', 'Mason Workbench', 'Cuts stone and bricks into building blocks. Size 3x1x2.', { type: 'block', vox: 32, hp: 100, size: [3, 1, 2] });
  item('wood_cogwheel', '⚙️', 'Wood Cogwheel', 'A wooden gear. Used for hand-cranked machines.');
  item('golden_plate', '▭', 'Golden Plate', 'Pressed gold.');
  item('coated_iron_ingot', '🔩', 'Coated-Iron Bar', 'Iron bar with a protective coating. Used for vehicle bodies.');
  item('coated_iron_plate', '▭', 'Coated-Iron Plate', 'Pressed coated iron.');
  item('coated_iron_car_casing', '🚘', 'Coated-Iron Car Casing', 'Main body material for vehicles.');
  item('zinc_ore', '🔘', 'Zinc Ore', 'Bluish-grey raw zinc. Mined underground. Smelt it into Zinc Bars.', { note: '8 ore smelt into 1 Zinc Bar in a Furnace (40 heat power).' });
  item('zinc_ingot', '🔘', 'Zinc Bar', 'A bar of zinc. Used with Iron Bar to coat iron.');
  item('clay_ore', '🟤', 'Clay Ore', 'Sticky clay from the sea, lakes and rivers. Smelt it into Red Bricks.', { note: 'Smelts into 1 Red Brick in a Furnace (20 heat power).' });
  item('red_brick', '🧱', 'Red Brick', 'A fired clay brick. 4 Red Bricks make a Red Bricks Block at the Mason Workbench.');
  item('unprocessed_iron_coater', '🔩', 'Unprocessed Iron Coater', 'Iron and zinc pressed together. Smelt it to finish the Coated-Iron Bar.');
  item('granite_ore', '🪨', 'Granite Ore', 'Raw granite rock, found underground only. Smelt it into Smooth Granite.', { note: 'Smelts into 1 Smooth Granite in a Furnace (40 heat power).' });
  item('smooth_granite', '▫️', 'Smooth Granite', 'Polished Granite. Craft 2 into a Smooth Granite Block.');
  item('andesite_ore', '🪨', 'Andesite Ore', 'Raw andesite rock, found underground only. Smelt it into Smooth Andesite.', { note: 'Smelts into 1 Smooth Andesite in a Furnace (40 heat power).' });
  item('smooth_andesite', '▫️', 'Smooth Andesite', 'Polished Andesite. Craft 2 into a Smooth Andesite Block.');
  item('diorite_ore', '🪨', 'Diorite Ore', 'Raw diorite rock, found underground only. Smelt it into Smooth Diorite.', { note: 'Smelts into 1 Smooth Diorite in a Furnace (40 heat power).' });
  item('smooth_diorite', '▫️', 'Smooth Diorite', 'Polished Diorite. Craft 2 into a Smooth Diorite Block.');
  item('calcite_ore', '🪨', 'Calcite Ore', 'Raw calcite rock, found underground only. Smelt it into Smooth Calcite.', { note: 'Smelts into 1 Smooth Calcite in a Furnace (40 heat power).' });
  item('smooth_calcite', '▫️', 'Smooth Calcite', 'Polished Calcite. Craft 2 into a Smooth Calcite Block.');
  item('smooth_granite_block', '⬜', 'Smooth Granite Block', '1 m building block of polished Granite. HP 75.', { type: 'block', vox: 33, hp: 75 });
  item('smooth_andesite_block', '⬜', 'Smooth Andesite Block', '1 m building block of polished Andesite. HP 75.', { type: 'block', vox: 34, hp: 75 });
  item('smooth_diorite_block', '⬜', 'Smooth Diorite Block', '1 m building block of polished Diorite. HP 75.', { type: 'block', vox: 35, hp: 75 });
  item('smooth_calcite_block', '⬜', 'Smooth Calcite Block', '1 m building block of polished Calcite. HP 75.', { type: 'block', vox: 36, hp: 75 });
  item('stone_bricks_block', '🧱', 'Stone Bricks Block', 'Stone bricks. HP 100.', { type: 'block', vox: 37, hp: 100 });
  item('red_bricks_block', '🧱', 'Red Bricks Block', 'Classic red bricks. HP 100.', { type: 'block', vox: 38, hp: 100 });
  item('granite_bricks_block', '🧱', 'Granite Bricks Block', 'Granite bricks. HP 90.', { type: 'block', vox: 39, hp: 90 });
  item('andesite_bricks_block', '🧱', 'Andesite Bricks Block', 'Andesite bricks. HP 90.', { type: 'block', vox: 40, hp: 90 });
  item('diorite_bricks_block', '🧱', 'Diorite Bricks Block', 'Diorite bricks. HP 90.', { type: 'block', vox: 41, hp: 90 });
  item('calcite_bricks_block', '🧱', 'Calcite Bricks Block', 'Calcite bricks. HP 90.', { type: 'block', vox: 42, hp: 90 });
  item('titanium_ore', '🔷', 'Titanium Ore', 'Very hard bluish-silver ore found only in the Deeper Underground. Needs a Blast Smelter.', { note: '8 ore smelt into 1 Titanium Bar in a Blast Smelter only.' });
  item('titanium_ingot', '🔷', 'Titanium Bar', 'A bar of titanium. Light, extremely strong. Titanium items are made at an Iron Anvil.');
  item('titanium_stick', '📏', 'Titanium Stick', 'A straight titanium rod. Made at an Iron Anvil.');
  item('titanium_axe', '🪓', 'Titanium Axe', 'Titanium cuts through trees like butter.', { type: 'tool', tool: 'axe', bd: 12, dmg: 20 });
  item('titanium_pickaxe', '⛏️', 'Titanium Pickaxe', 'Mines even the hardest ore at high speed.', { type: 'tool', tool: 'pick', bd: 12, dmg: 16 });
  item('titanium_sword', '⚔️', 'Titanium Sword', 'Light and brutal.', { type: 'tool', tool: 'sword', bd: 1, dmg: 20 });
  item('titanium_helmet', '🪖', 'Titanium Helmet', 'Titanium head protection. Buff: +8 Max HP and +9% Melee Damage.', { type: 'armor', slot: 'head', tier: 'titanium', def: 3 });
  item('titanium_chest', '🛡️', 'Titanium Chestplate', 'Titanium chest protection. Buff: +8 Max HP and +9% Melee Damage.', { type: 'armor', slot: 'chest', tier: 'titanium', def: 5 });
  item('titanium_legs', '👖', 'Titanium Leggings', 'Titanium leg protection. Buff: +8 Max HP and +9% Melee Damage.', { type: 'armor', slot: 'legs', tier: 'titanium', def: 3 });
  item('titanium_boots', '🥾', 'Titanium Boots', 'Titanium boots. Buff: +8 Max HP and +9% Melee Damage.', { type: 'armor', slot: 'boots', tier: 'titanium', def: 3 });
  item('titanium_bucket', '🪣', 'Titanium Bucket', 'A bucket that carries liquid, or wear it as a helmet. Halves Water Poison chance.', { type: 'armor', slot: 'head', tier: 'bucket', def: 5, note: 'Head slot. Halves the chance of getting Water Poison. The only bucket that can carry Lava.' });
  item('brass_ingot', '🟨', 'Brass Bar', 'Copper and zinc alloy.');
  item('brass_plate', '▭', 'Brass Plate', 'Pressed brass.');
  item('blast_smelter', '🔥', 'Blast Smelter', 'Smelts twice as fast as a Smelter and handles advanced ore like Titanium. Place it, then press [E] near it.', { type: 'block', vox: 43, hp: 120, size: [1, 1, 2] });
  item('stock_car_battery', '🔋', 'Stock Car Battery 12V 50AH', 'Vehicle battery, 12 V / 50 Ah. Charge it at a Computer Bench. Fits most cars.', { soon: true });
  item('plastic_cap', '⚪', 'Plastic Cap', 'Coming soon.', { soon: true });
  item('plastic_sheet', '⬜', 'Plastic Sheet', 'Coming soon.', { soon: true });
  item('palm_wood_stick', '🥢', 'Palm Wood Stick', 'A straight stick from a palm log.');
  item('wooden_spike', '🌵', 'Wooden Spike', 'A trap. HP 40, very fragile; it vanishes without a trace when destroyed. Deals 8 damage to every zombie that hits or crosses it.', { type: 'block', vox: 44, hp: 40, note: 'DMG 8' });
  item('sharp_palm_root', '🌴', 'Sharp Palm Fibrous Root', 'Who said wood are brokest weapon and trap??? Then what is this???', { type: 'block', vox: 45, hp: 60, note: 'HP 60. DMG 16. 40% chance the trap takes no damage from a hit.' });
  item('iron_barbed_wire', '➰', 'Iron Circular Barbed Wire', 'Trap. HP 200, DEF 2. DMG 24 and makes zombies bleed for 5 s.', { type: 'block', vox: 46, hp: 200, note: 'DMG 24 + Bleeding 5 s' });
  item('ivy_grass', '🌿', 'Ivy Grass', 'If zombie ussually flow on one ways, use this traps, guaranted not to died but kinda fragile and still helpful!', { type: 'block', vox: 47, hp: 25, note: 'HP 25 (-1 per zombie pass). DMG 4, 10% chance of Bleeding 3 s. Zombie AI cannot detect it.' });
  item('titanium_barbed_wire', '➰', 'Titanium Barbed Wire', 'Titanium is strong... immune to anythings, even ZOMBIESSSSS!!!!!!!!!', { type: 'block', vox: 48, hp: 400, note: 'HP 400, DEF 4. DMG 48 + Over Bleeding (2x faster) 5 s' });
  item('cactus_helmet', '🌵', 'Cactus Helmet', 'Thorn: deals 1 damage to a zombie each time it hits you.', { type: 'armor', slot: 'head', tier: 'cactus', def: 1, note: 'Thorn 1' });
  item('cactus_chest', '🌵', 'Cactus Chestplate', 'Thorn: deals 3 damage to a zombie each time it hits you.', { type: 'armor', slot: 'chest', tier: 'cactus', def: 2, note: 'Thorn 3' });
  item('cactus_legs', '🌵', 'Cactus Leggings', 'Thorn: deals 2 damage to a zombie each time it hits you.', { type: 'armor', slot: 'legs', tier: 'cactus', def: 1, note: 'Thorn 2' });
  item('cactus_boots', '🌵', 'Cactus Boots', 'Thorn: deals 1 damage to a zombie each time it hits you.', { type: 'armor', slot: 'boots', tier: 'cactus', def: 1, note: 'Thorn 1' });
  item('permafrost_ore', '🧊', 'Permafrost Ore', 'Glittering blue-white ore with a gradient shine. Found in the Mountain biome. Needs a Blast Smelter.', { note: '8 ore smelt into 1 Permafrost Bar in a Blast Smelter (heat 100).' });
  item('permafrost_ingot', '🧊', 'Permafrost Bar', 'A frozen alloy bar. Permafrost gear splits its defense 50% physical, 30% Frost, 20% Fire.');
  item('permafrost_stick', '📏', 'Permafrost Stick', 'A straight permafrost rod. Made at an Iron Anvil.');
  item('permafrost_axe', '🪓', 'Permafrost Axe', 'Frozen edge. Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'tool', tool: 'axe', bd: 11, dmg: 18 });
  item('permafrost_pickaxe', '⛏️', 'Permafrost Pickaxe', 'Frozen pick. Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'tool', tool: 'pick', bd: 11, dmg: 14 });
  item('permafrost_sword', '⚔️', 'Permafrost Sword', 'A glittering frozen blade.', { type: 'tool', tool: 'sword', bd: 1, dmg: 18 });
  item('permafrost_helmet', '🪖', 'Permafrost Helmet', 'Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'armor', slot: 'head', tier: 'permafrost', def: 2, note: 'Set: Frost resist 30%, Fire resist 20%' });
  item('permafrost_chest', '🛡️', 'Permafrost Chestplate', 'Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'armor', slot: 'chest', tier: 'permafrost', def: 3, note: 'Set: Frost resist 30%, Fire resist 20%' });
  item('permafrost_legs', '👖', 'Permafrost Leggings', 'Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'armor', slot: 'legs', tier: 'permafrost', def: 2, note: 'Set: Frost resist 30%, Fire resist 20%' });
  item('permafrost_boots', '🥾', 'Permafrost Boots', 'Defense split: 50% physical, 30% Frost, 20% Fire.', { type: 'armor', slot: 'boots', tier: 'permafrost', def: 1, note: 'Set: Frost resist 30%, Fire resist 20%' });
  item('cobweb', '🕸️', 'Cobweb', 'Sticky spider web. Dropped by Zpiders.');
  item('tri_iron_fan', '🌀', 'Tri-Iron Fan', 'A three-blade iron fan.');
  item('iron_pipe', '🔧', 'Iron Pipe', 'A hollow iron pipe. Made at a Liquiders Workbench.');
  item('nature_cooler', '❄️', 'Portable Nature Cooler', 'A small cooling unit. Accessory.', { type: 'acc', note: 'Accessory. Lowers your body temperature by 5-10 degrees.' });
  item('berserkers_boots', '👟', 'Berserkers Boots', 'Only dropped by Berserk Zombies (5%).', { type: 'acc', note: 'Accessory. +10% move speed, -2% melee attack delay.' });
  item('toughs_string', '🧵', 'Toughs String', 'Stretches your reach, slows your swing.', { type: 'acc', note: 'Accessory. Melee range +50%, melee attack delay +100%.' });
  item('sewing_table', '🧵', 'Sewing Table', 'Sews strings and cloth. Size 3x2x2. Place it, then press [E] near it.', { type: 'block', vox: 50, hp: 90, size: [3, 2, 2] });
  item('liquiders_workbench', '🧪', 'Liquiders Workbench', 'Builds pipes and liquid machines. Place it, then press [E] near it.', { type: 'block', vox: 49, hp: 100, size: [3, 1, 2] });
  /* [CUT/STATUE TAG] Cutting Board (kept, not consumed) + sliced foods; Statue of God block. */
  item('cutting_board', '🪵', 'Cutting Board', 'Keep it in your bag to cut food by hand. It is not used up.', {});
  item('statue_god', '🗿', 'Statue of God', 'Place it, then press [E] to ask for a Blessing: Unlethal, Zombie Weaks or Zombie Weak Foot. Size 1x3x1.', { type: 'block', vox: 51, hp: 150, size: [1, 3, 1] });
  item('fish_fillet', '🍣', 'Fish Fillet', 'Fresh fish cut into a neat fillet.', { type: 'food', eat: { t: 2, h: 8, th: 4 } });
  ['apple', 'mango', 'orange', 'lemon', 'watermelon', 'pumpkin', 'cabbage', 'cucumber', 'sweet_potato', 'potato'].forEach(function (f) {
    var b = I[f]; if (!b || !b.eat) return; var e = {}; for (var kk in b.eat) e[kk] = b.eat[kk]; if (e.t) e.t = Math.max(1, e.t * 0.6); ['h', 'th'].forEach(function (q) { if (e[q]) e[q] = Math.max(1, Math.round(e[q] * 0.55)); });
    item('sliced_' + f, b.ic, 'Sliced ' + b.name, 'A neat slice. Two slices give a bit more than the whole thing.', { type: 'food', eat: e });
  });
  item('diamond', '💎', 'Diamond', 'A brilliant gem. Mined from mountain stone.', { type: 'material' });
  item('ruby', '🔴', 'Ruby', 'A deep red gem.', { type: 'material' });
  item('emerald', '🟢', 'Emerald', 'A vivid green gem.', { type: 'material' });
  item('amethyst', '🟣', 'Amethyst', 'A purple crystal gem.', { type: 'material' });
  item('sapphire', '🔵', 'Sapphire', 'A blue gem found in shipwrecks and deep stone.', { type: 'material' });
  item('hard_statue', '🗿', 'Zombie Statue', 'Interact to summon the Hard Zombie.');
  item('iron_plate', '▭', 'Iron Plate', 'Pressed iron. Made at Manual Pressing (or Pressing Machine, coming soon).');
  item('copper_plate', '▭', 'Copper Plate', 'Pressed copper. Made at Manual Pressing (or Pressing Machine, coming soon).');
  item('cactus_club', '🏏', 'Cactus Club', 'Sooo...?? FIGHT YOUR ZOMBIE WITH THIS!!! LET THE ZOMBIES FEEL OUT THE ULTRA BLEEDINGGGGG!!!!!', { type: 'tool', tool: 'weapon', bd: 1, dmg: 6, cd: 1.0, bleed: { dur: 5, tick: 0.25, dmg: 1 }, note: 'DMG 6 · Delay 1 s · Bleeding: 1 damage every 0.25 s for 5 s (ignores DEF). Tier 1.' });
  item('cactus_hammer', '🔨', 'Cactus Hammer', 'Wishing to be a superhero in desert?? Then... This is the solution for you!!', { type: 'tool', tool: 'weapon', bd: 2, dmg: 18, cd: 1.5, splash: 1.6, note: 'DMG 18 · Delay 1.5 s · Splash 1.6 m (diameter).' });
  item('cactus_block', '🟩', 'Cactus Block', 'If you wish to see how it merge with blocks and traps then look at this!!', { type: 'block', vox: 27, hp: 24, thorn: 4, note: 'Zombies that break it take 4 damage each time.' });
  item('simple_bomb', '💣', 'Simple Bomb', 'Heyy!! Overcrowded by zombie? Simply throw this to your zombie face! then it blows!!!', { type: 'tool', tool: 'bomb', bd: 0, dmg: 24, cd: 0.2, splash: 4, note: 'DMG 24 · Splash 4 m · Throw delay 0.2 s. One use.' });
  item('dynamite', '🧨', 'Dynamite', 'Powerful practice dynamite, ussually used for mining, but... in this day apocalypse, this also used to explode and blow up the zombie... ehhmmm, better to not throw yourself base...', { type: 'tool', tool: 'bomb', bd: 0, dmg: 38, cd: 0.4, splash: 8, note: 'DMG 38 · Splash 8 m · Throw delay 0.4 s. Dropped by Miner Zombies (15%). No recipe yet.' });
  item('tnt_block', '🧱', 'TNT Block', 'hhmmm, for mining only... uhh wait... for kill mini-boss.....', { type: 'block', vox: 28, hp: 20, tnt: { dmg: 120, splash: 16, fuse: 3 }, note: 'Place it, then hit it to light a 3 s fuse. DMG 120 · Splash 16 m.' });
  item('glass_bottle', '🍶', 'Glass Bottle', 'Reuseable glass free BPA though...');
  item('glass_dart', '🎯', 'Glass Dart', 'Powerful damage also wasting glass...', { type: 'tool', tool: 'dart', bd: 0, dmg: 12, cd: 0.4, range: 30, bleed: { dur: 5, tick: 0.25, dmg: 1 }, note: 'DMG 12 · Range 30 · Causes Bleeding. One use.' });
  item('glass_spike_ball', '🔮', 'Glass Spike Ball', 'Cactus + Glass = Dead', { type: 'tool', tool: 'bomb', bd: 0, dmg: 26, cd: 0.5, splash: 6, bleed: { dur: 5, tick: 0.125, dmg: 1 }, note: 'DMG 26 · Splash 6 m · Combo Bleeding: 1 damage every 0.125 s. One use.' });
  item('glass_block', '🪟', 'Glass Block', 'Watch out on the outside, to know how many zombies outside your base over there!', { type: 'block', vox: 26, hp: 20 });
  item('flashlight', '🔦', 'Flashlight', "I don't scare exploring night again with this one!", { type: 'acc', slot: 'acc', flashlight: true, note: 'Accessory: lets you switch the flashlight on and off with [F].' });
  item('lucky_ring', '💍', 'Lucky Rings', 'Have a lucky days with zombies!', { type: 'acc', slot: 'acc', luck: 0.15, note: 'Accessory: +15% Luck (better loot rolls).' });
  item('manual_milling', '⚙️', 'Manual Milling', 'Grinds ore into wire, twists leaves into rope and rubs gravel into flint. Size 3x2x2.', { type: 'block', vox: 16, hp: 90, size: [3, 2, 2] });
  item('bomb_bench', '🧰', 'Bomb Workbench', 'Craft bombs here. Size 2x1x2.', { type: 'block', vox: 17, hp: 90, size: [2, 1, 2] });
  item('glass_kiln', '🏺', 'Glass Kiln', 'Craft glass items here. Size 2x2x3.', { type: 'block', vox: 18, hp: 100, size: [2, 2, 3] });
  item('craft_bench', '🛠️', 'Crafting Workbench', 'A general workbench for blocks and chests. Size 3x1x2.', { type: 'block', vox: 19, hp: 90, size: [3, 1, 2] });
  item('work_bench', '🔨', 'Working Workbench', 'A workbench for jewelry. Size 2x1x2.', { type: 'block', vox: 20, hp: 90, size: [2, 1, 2] });
  item('wooden_chest', '📦', 'Wooden Chest', 'Stores 5 slots of items. Size 2x1x1.', { type: 'block', vox: 21, hp: 80, size: [2, 1, 1], chest: 5 });
  item('ironcased_chest', '🗄️', 'Iron-Cased Chest', 'Stores 10 slots of items. Size 2x1x1.', { type: 'block', vox: 22, hp: 150, size: [2, 1, 1], chest: 10 });
  item('iron_chest', '🗄️', 'Iron Chest', 'Stores 20 slots of items. DEF 2. Size 2x1x1.', { type: 'block', vox: 23, hp: 285, size: [2, 1, 1], chest: 20, bdef: 2 });
  item('coppercased_chest', '🗃️', 'Copper-Cased Chest', 'Stores 8 slots of items. Size 2x1x1.', { type: 'block', vox: 24, hp: 120, size: [2, 1, 1], chest: 8 });
  item('copper_chest', '🗃️', 'Copper Chest', 'Stores 15 slots of items. DEF 1. Size 2x1x1.', { type: 'block', vox: 25, hp: 185, size: [2, 1, 1], chest: 15, bdef: 1 });
  item('wood_plank', '🟧', 'Wood Plank', 'A clean cut plank. Made from Wood Logs at a Sawmill.');
  item('failed_craft_wood', '🥀', 'Failed Craft Wood', 'A badly cut piece of wood. Useless... or is it?');
  item('charcoal', '⬛', 'Charcoal', 'Burnt wood. A strong, steady fuel.', { note: 'Fuel: burns 10 s, 10 heat power.' });
  item('cannon_ball', '⚫', 'Cannon Ball', 'Ammo for cannons. 1 Stone makes 4 cannon balls.', {});
  item('wood_plank_block', '🟨', 'Wood Plank Block', '1 m building block. 20% tougher than a Wood Log Block.', { type: 'block', vox: 10, hp: 36 });
  item('wood_plank_basket', '🧺', 'Wood Plank Basket', 'A wooden plank shaped into a backpack. Keep it in your bag: +6 inventory slots.', { pack: 6, note: 'Backpack: +6 bag slots while you carry it.' });
  item('sawmill', '🪚', 'Sawmill', 'Cuts Wood Logs into Wood Planks and builds all handmade furniture. Place it, then press [E] near it.', { type: 'block', vox: 11, hp: 90, size: [3, 1, 2] });
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
    { id: 'computer_bench', st: 'hand', out: ['computer_bench', 1], cost: { iron_ingot: 10, metal_casing: 6, wood: 10, copper_wire: 30 } },
    { id: 'sawmill', st: 'hand', out: ['sawmill', 1], cost: { wood: 12, iron_ingot: 4, iron_chain: 2 } },
    { id: 'turret_bench', st: 'hand', out: ['turret_bench', 1], cost: { wood: 12, copper_ingot: 4, iron_ingot: 6 } },
    { id: 'handmade_cannon', st: 'hand', out: ['handmade_cannon', 1], cost: { wood: 16, stone: 8, copper_ore: 4 } },
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
    /* Manual Milling */
    { id: 'mill_wire', st: 'milling', out: ['copper_wire', 4], cost: { copper_ore: 1 }, label: 'Mill Copper Ore into Copper Wire' },
    { id: 'mill_rope', st: 'milling', out: ['rope', 1], cost: { leaf: 4 }, label: 'Twist Leaves into Rope' },
    { id: 'mill_carton', st: 'milling', out: ['carton_sheet', 2], extra: 0.5, cost: { broken_cardboards: 1 }, label: 'Reprocess Broken Cardboard into 2-3 Carton Sheets' },
    { id: 'carton_box', st: 'hand', out: ['carton_box', 1], cost: { carton_sheet: 6 } },
    { id: 'band_aid_box', st: 'hand', out: ['band_aid_box', 1], cost: { carton_box: 1, medical_bag: 30 } },
    { id: 'mill_flint', st: 'milling', out: ['flint', 1], cost: { gravel: 1 }, chance: 0.25, label: 'Rub Gravel into Flint (25% chance)' },
    { id: 'cactus_club', st: 'hand', out: ['cactus_club', 1], cost: { cactus: 8, wood_sticks: 2, rope: 2 } },
    { id: 'cactus_block', st: 'hand', out: ['cactus_block', 1], cost: { cactus: 2 } },
    { id: 'cactus_hammer', st: 'anvil', out: ['cactus_hammer', 1], cost: { iron_ingot: 8, iron_stick: 4, cactus: 20, copper_ingot: 2 } },
    { id: 'copper_stick', st: 'anvil', out: ['copper_stick', 1], cost: { copper_ingot: 1 } },
    { id: 'make_glass', st: 'furnace', out: ['glass', 1], cost: { sand: 2 }, heat: 75, label: 'Smelt Sand into Glass' },
    { id: 'simple_bomb', st: 'bomb', out: ['simple_bomb', 2], cost: { gunpowder: 3, sand: 2, rope: 1, flint: 1 } },
    { id: 'tnt_block', st: 'bomb', out: ['tnt_block', 1], cost: { dynamite: 4, rope: 3, flint: 1 } },
    { id: 'glass_bottle', st: 'kiln', out: ['glass_bottle', 1], cost: { glass: 1 } },
    { id: 'glass_dart', st: 'kiln', out: ['glass_dart', 10], cost: { glass: 1 } },
    { id: 'glass_spike_ball', st: 'kiln', out: ['glass_spike_ball', 4], cost: { glass: 1, cactus: 1, wood_sticks: 4 } },
    { id: 'glass_block', st: 'craft', out: ['glass_block', 1], cost: { glass: 2 } },
    { id: 'smelt_granite', st: 'furnace', out: ['smooth_granite', 1], cost: { granite_ore: 1 }, heat: 40, label: 'Smelt Granite Ore into Smooth Granite' },
    { id: 'blk_granite', st: 'hand', out: ['smooth_granite_block', 1], cost: { smooth_granite: 2 } },
    { id: 'brk_granite', st: 'mason', out: ['granite_bricks_block', 1], cost: { smooth_granite_block: 1 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'smelt_andesite', st: 'furnace', out: ['smooth_andesite', 1], cost: { andesite_ore: 1 }, heat: 40, label: 'Smelt Andesite Ore into Smooth Andesite' },
    { id: 'blk_andesite', st: 'hand', out: ['smooth_andesite_block', 1], cost: { smooth_andesite: 2 } },
    { id: 'brk_andesite', st: 'mason', out: ['andesite_bricks_block', 1], cost: { smooth_andesite_block: 1 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'smelt_diorite', st: 'furnace', out: ['smooth_diorite', 1], cost: { diorite_ore: 1 }, heat: 40, label: 'Smelt Diorite Ore into Smooth Diorite' },
    { id: 'blk_diorite', st: 'hand', out: ['smooth_diorite_block', 1], cost: { smooth_diorite: 2 } },
    { id: 'brk_diorite', st: 'mason', out: ['diorite_bricks_block', 1], cost: { smooth_diorite_block: 1 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'smelt_calcite', st: 'furnace', out: ['smooth_calcite', 1], cost: { calcite_ore: 1 }, heat: 40, label: 'Smelt Calcite Ore into Smooth Calcite' },
    { id: 'blk_calcite', st: 'hand', out: ['smooth_calcite_block', 1], cost: { smooth_calcite: 2 } },
    { id: 'brk_calcite', st: 'mason', out: ['calcite_bricks_block', 1], cost: { smooth_calcite_block: 1 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'brk_stone', st: 'mason', out: ['stone_bricks_block', 1], cost: { stone_block: 1 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'brk_red', st: 'mason', out: ['red_bricks_block', 1], cost: { red_brick: 4 }, puz: { k: 'saw', d: 1, flat: 1 } },
    { id: 'cutting_board', st: 'sawmill', out: ['cutting_board', 1], cost: { wood_plank: 4 }, puz: { k: 'saw', d: 1 } },
    { id: 'statue_god', st: 'mason', out: ['statue_god', 1], cost: { stone_bricks_block: 60 }, puz: { k: 'saw', d: 3, flat: 1 } },
    { id: 'cut_fish', st: 'cutting', out: ['fish_fillet', 2], cost: { fresh_fish: 1 }, label: 'Cut Fresh Fish' },
    { id: 'cut_apple', st: 'cutting', out: ['sliced_apple', 2], cost: { apple: 1 }, label: 'Slice Apple' },
    { id: 'cut_mango', st: 'cutting', out: ['sliced_mango', 2], cost: { mango: 1 }, label: 'Slice Mango' },
    { id: 'cut_orange', st: 'cutting', out: ['sliced_orange', 2], cost: { orange: 1 }, label: 'Slice Orange' },
    { id: 'cut_lemon', st: 'cutting', out: ['sliced_lemon', 2], cost: { lemon: 1 }, label: 'Slice Lemon' },
    { id: 'cut_watermelon', st: 'cutting', out: ['sliced_watermelon', 2], cost: { watermelon: 1 }, label: 'Slice Watermelon' },
    { id: 'cut_pumpkin', st: 'cutting', out: ['sliced_pumpkin', 2], cost: { pumpkin: 1 }, label: 'Slice Pumpkin' },
    { id: 'cut_cabbage', st: 'cutting', out: ['sliced_cabbage', 2], cost: { cabbage: 1 }, label: 'Slice Cabbage' },
    { id: 'cut_cucumber', st: 'cutting', out: ['sliced_cucumber', 2], cost: { cucumber: 1 }, label: 'Slice Cucumber' },
    { id: 'cut_sweet_potato', st: 'cutting', out: ['sliced_sweet_potato', 2], cost: { sweet_potato: 1 }, label: 'Slice Sweet Potato' },
    { id: 'cut_potato', st: 'cutting', out: ['sliced_potato', 2], cost: { potato: 1 }, label: 'Slice Potato' },
    { id: 'mason_bench', st: 'sawmill', out: ['mason_bench', 1], cost: { iron_ingot: 4, wood_plank: 24, wood_sticks: 12, copper_ingot: 2 }, puz: { k: 'saw', d: 3 } },
    { id: 'melt_titanium', st: 'blast', out: ['titanium_ingot', 1], cost: { titanium_ore: 8 }, heat: 100, label: 'Smelt Titanium Bar (Blast Smelter)' },
    { id: 'melt_brass', st: 'furnace', out: ['brass_ingot', 1], cost: { copper_ingot: 1, zinc_ingot: 1 }, heat: 50, label: 'Smelt Brass Bar' },
    { id: 'press_brass', st: 'press', out: ['brass_plate', 1], cost: { brass_ingot: 1 }, puz: { k: 'crank', n: 5 } },
    { id: 'blast_smelter', st: 'craft', out: ['blast_smelter', 1], cost: { iron_plate: 8, brass_plate: 3, iron_stick: 4, furnace: 1 } },
    { id: 'titanium_stick', st: 'anvil', out: ['titanium_stick', 1], cost: { titanium_ingot: 1 } },
    { id: 'titanium_axe', st: 'anvil', out: ['titanium_axe', 1], cost: { titanium_ingot: 3, wood_sticks: 2 } },
    { id: 'titanium_pickaxe', st: 'anvil', out: ['titanium_pickaxe', 1], cost: { titanium_ingot: 3, wood_sticks: 2 } },
    { id: 'titanium_sword', st: 'anvil', out: ['titanium_sword', 1], cost: { titanium_ingot: 5, wood_sticks: 6 } },
    { id: 'titanium_helmet', st: 'anvil', out: ['titanium_helmet', 1], cost: { titanium_ingot: 4 } },
    { id: 'titanium_chest', st: 'anvil', out: ['titanium_chest', 1], cost: { titanium_ingot: 7 } },
    { id: 'titanium_legs', st: 'anvil', out: ['titanium_legs', 1], cost: { titanium_ingot: 5 } },
    { id: 'titanium_boots', st: 'anvil', out: ['titanium_boots', 1], cost: { titanium_ingot: 4 } },
    { id: 'titanium_bucket', st: 'anvil', out: ['titanium_bucket', 1], cost: { titanium_ingot: 2, iron_chain: 1 } },
    { id: 'stock_car_battery', st: 'computer', out: ['stock_car_battery', 1], cost: { copper_wire: 120, plastic_cap: 6, plastic_sheet: 10 }, puz: { k: 'wire' } },
    { id: 'wooden_spike', st: 'trapb', out: ['wooden_spike', 1], cost: { wood_sticks: 10 } },
    { id: 'sharp_palm_root', st: 'trapb', out: ['sharp_palm_root', 1], cost: { palm_wood_stick: 20 } },
    { id: 'iron_barbed_wire', st: 'trapb', out: ['iron_barbed_wire', 1], cost: { iron_stick: 20 } },
    { id: 'ivy_grass', st: 'trapb', out: ['ivy_grass', 1], cost: { leaf: 10 } },
    { id: 'titanium_barbed_wire', st: 'trapb', out: ['titanium_barbed_wire', 1], cost: { titanium_stick: 20 } },
    { id: 'palm_sticks', st: 'sawmill', out: ['palm_wood_stick', 4], cost: { palm_log: 1 } },
    { id: 'cactus_helmet', st: 'hand', out: ['cactus_helmet', 1], cost: { cactus: 12, rope: 2 } },
    { id: 'cactus_chest', st: 'hand', out: ['cactus_chest', 1], cost: { cactus: 24, rope: 3 } },
    { id: 'cactus_legs', st: 'hand', out: ['cactus_legs', 1], cost: { cactus: 18, rope: 3 } },
    { id: 'cactus_boots', st: 'hand', out: ['cactus_boots', 1], cost: { cactus: 12, rope: 2 } },
    { id: 'sewing_table', st: 'sawmill', out: ['sewing_table', 1], cost: { wood_plank: 18, copper_ingot: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'liquiders_workbench', st: 'sawmill', out: ['liquiders_workbench', 1], cost: { wood_plank: 16, iron_ingot: 6, copper_ingot: 4, iron_chain: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'toughs_string', st: 'sewing', out: ['toughs_string', 1], cost: { cobweb: 35 }, puz: { k: 'crank', n: 6 } },
    { id: 'tri_iron_fan', st: 'computer', out: ['tri_iron_fan', 1], cost: { iron_plate: 3 }, puz: { k: 'wire' } },
    { id: 'iron_pipe', st: 'liquiders', out: ['iron_pipe', 1], cost: { iron_ingot: 2 }, puz: { k: 'crank', n: 4 } },
    { id: 'nature_cooler', st: 'computer', out: ['nature_cooler', 1], cost: { permafrost_ingot: 8, tri_iron_fan: 1, iron_pipe: 6 }, puz: { k: 'wire' } },
    { id: 'melt_permafrost', st: 'blast', out: ['permafrost_ingot', 1], cost: { permafrost_ore: 8 }, heat: 100, label: 'Smelt Permafrost Bar (Blast Smelter)' },
    { id: 'permafrost_stick', st: 'anvil', out: ['permafrost_stick', 1], cost: { permafrost_ingot: 1 } },
    { id: 'permafrost_axe', st: 'anvil', out: ['permafrost_axe', 1], cost: { permafrost_ingot: 3, wood_sticks: 2 } },
    { id: 'permafrost_pickaxe', st: 'anvil', out: ['permafrost_pickaxe', 1], cost: { permafrost_ingot: 3, wood_sticks: 2 } },
    { id: 'permafrost_sword', st: 'anvil', out: ['permafrost_sword', 1], cost: { permafrost_ingot: 5, wood_sticks: 6 } },
    { id: 'permafrost_helmet', st: 'anvil', out: ['permafrost_helmet', 1], cost: { permafrost_ingot: 4 } },
    { id: 'permafrost_chest', st: 'anvil', out: ['permafrost_chest', 1], cost: { permafrost_ingot: 7 } },
    { id: 'permafrost_legs', st: 'anvil', out: ['permafrost_legs', 1], cost: { permafrost_ingot: 5 } },
    { id: 'permafrost_boots', st: 'anvil', out: ['permafrost_boots', 1], cost: { permafrost_ingot: 4 } },
    { id: 'manual_press', st: 'sawmill', out: ['manual_press', 1], cost: { wood_plank: 12, iron_ingot: 6, copper_ingot: 2, iron_chain: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'casing_crafter', st: 'sawmill', out: ['casing_crafter', 1], cost: { copper_ingot: 2, iron_ingot: 8, wood_plank: 20, wood_cogwheel: 2 }, puz: { k: 'saw', d: 3 } },
    { id: 'trap_bench', st: 'sawmill', out: ['trap_bench', 1], cost: { wood_plank: 12, copper_ingot: 4, iron_ingot: 2, wood_sticks: 4 }, puz: { k: 'saw', d: 2 } },
    { id: 'wood_cogwheel', st: 'craft', out: ['wood_cogwheel', 1], cost: { wood_plank: 2, wood_sticks: 4 } },
    { id: 'unproc_coater', st: 'craft', out: ['unprocessed_iron_coater', 1], cost: { iron_ingot: 1, zinc_ingot: 1 } },
    { id: 'coat_iron', st: 'furnace', out: ['coated_iron_ingot', 1], cost: { unprocessed_iron_coater: 1 }, heat: 60, label: 'Smelt Unprocessed Iron Coater into Coated-Iron Bar' },
    { id: 'melt_zinc', st: 'furnace', out: ['zinc_ingot', 1], cost: { zinc_ore: 8 }, heat: 40, label: 'Smelt Zinc Bar' },
    { id: 'melt_clay', st: 'furnace', out: ['red_brick', 1], cost: { clay_ore: 1 }, heat: 20, label: 'Smelt Clay Ore into Red Brick' },
    { id: 'press_iron', st: 'press', out: ['iron_plate', 1], cost: { iron_ingot: 1 }, puz: { k: 'crank', n: 5 } },
    { id: 'press_copper', st: 'press', out: ['copper_plate', 1], cost: { copper_ingot: 1 }, puz: { k: 'crank', n: 5 } },
    { id: 'press_gold', st: 'press', out: ['golden_plate', 1], cost: { golden_ingot: 1 }, puz: { k: 'crank', n: 5 } },
    { id: 'press_coated', st: 'press', out: ['coated_iron_plate', 1], cost: { coated_iron_ingot: 1 }, puz: { k: 'crank', n: 5 } },
    { id: 'coated_casing', st: 'casing', out: ['coated_iron_car_casing', 1], cost: { coated_iron_plate: 24, coated_iron_ingot: 8 }, puz: { k: 'crank', n: 8 } },
    { id: 'manual_milling', st: 'sawmill', out: ['manual_milling', 1], cost: { wood: 16, wood_plank: 6, copper_ingot: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'bomb_bench', st: 'sawmill', out: ['bomb_bench', 1], cost: { gunpowder: 4, rope: 2, copper_ingot: 6, wood_plank: 12 }, puz: { k: 'saw', d: 2 } },
    { id: 'craft_bench', st: 'sawmill', out: ['craft_bench', 1], cost: { wood_plank: 12, iron_ingot: 4, copper_ingot: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'work_bench', st: 'sawmill', out: ['work_bench', 1], cost: { wood_plank: 20, stone: 4, copper_ingot: 8, iron_ingot: 4 }, puz: { k: 'saw', d: 3 } },
    { id: 'glass_kiln', st: 'hand', out: ['glass_kiln', 1], cost: { iron_ingot: 16, copper_ingot: 4, coal: 4 } },
    { id: 'wooden_chest', st: 'sawmill', out: ['wooden_chest', 1], cost: { wood_plank: 18, copper_ingot: 1 }, puz: { k: 'saw', d: 2 } },
    { id: 'ironcased_chest', st: 'sawmill', out: ['ironcased_chest', 1], cost: { iron_stick: 6, wood_plank: 24, iron_ingot: 1 }, puz: { k: 'saw', d: 3 } },
    { id: 'coppercased_chest', st: 'sawmill', out: ['coppercased_chest', 1], cost: { copper_stick: 6, wood_plank: 24, copper_ingot: 1 }, puz: { k: 'saw', d: 3 } },
    { id: 'iron_chest', st: 'craft', out: ['iron_chest', 1], cost: { iron_plate: 6 } },
    { id: 'copper_chest', st: 'craft', out: ['copper_chest', 1], cost: { copper_plate: 6 } },
    { id: 'flashlight', st: 'computer', out: ['flashlight', 1], cost: { medium_battery: 1, glass: 2, metal_casing: 1 }, puz: { k: 'mask', shape: 'plus' } },
    { id: 'lucky_ring', st: 'work', out: ['lucky_ring', 1], cost: { golden_stick: 1, clover_leaf: 1 } },
    /* Sawmill (line-cutting minigame per piece; a failed cut gives Failed Craft Wood) */
    { id: 'wood_plank', st: 'sawmill', out: ['wood_plank', 2], cost: { wood: 1 }, puz: { k: 'saw', d: 1 }, label: 'Cut Wood Log into Wood Planks' },
    { id: 'wood_plank_block', st: 'sawmill', out: ['wood_plank_block', 1], cost: { wood_plank: 4 }, puz: { k: 'saw', d: 1 } },
    { id: 'wood_plank_basket', st: 'sawmill', out: ['wood_plank_basket', 1], cost: { wood_plank: 10 }, puz: { k: 'saw', d: 2 } },
    { id: 'bed_block', st: 'sawmill', out: ['bed_block', 1], cost: { wood: 6, broken_fabric_cloth: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'couch_block', st: 'sawmill', out: ['couch_block', 1], cost: { wood: 5, broken_fabric_cloth: 2, broken_cardboards: 2 }, puz: { k: 'saw', d: 2 } },
    { id: 'sink_block', st: 'sawmill', out: ['sink_block', 1], cost: { iron_ingot: 10, wood: 5 }, puz: { k: 'saw', d: 3 } },
    /* Anvil */
    { id: 'iron_sword', st: 'anvil', out: ['iron_sword', 1], cost: { iron_ingot: 6, copper_wire: 2, iron_nugget: 4, wood_sticks: 8 } },
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
    { id: 'medium_battery', st: 'computer', out: ['medium_battery', 1], cost: { iron_nugget: 2, copper_wire: 75, plastic_paper_package: 1 }, puz: { k: 'wire' } },
    { id: 'ips_led', st: 'computer', out: ['ips_led', 1], cost: { mini_led_lamp: 50, copper_wire: 120, rgb_lamp: 3, black_screen_cover: 5 }, puz: { k: 'mask', shape: 'plus' } },
    { id: 'radar', st: 'computer', out: ['radar', 1], cost: { signal_chip: 1, medium_battery: 1, metal_casing: 10, ips_led: 2 }, puz: { k: 'mask', shape: 'ring' } },
    { id: 'gps', st: 'computer', out: ['gps', 1], cost: { ips_led: 4, black_screen_cover: 2, metal_casing: 16, medium_battery: 2, signal_chip: 1, gpu_chip: 1 }, puz: { k: 'mask', shape: 'diamond' } },
    /* Furnace (needs fuel: heat power) */
    { id: 'melt_iron', st: 'furnace', out: ['iron_ingot', 1, 3], cost: { iron_nugget: 8 }, heat: 40, label: 'Smelt Iron Bar' },
    { id: 'melt_copper', st: 'furnace', out: ['copper_ingot', 1], cost: { copper_ore: 8 }, heat: 30, label: 'Smelt Copper Bar' },
    { id: 'melt_gold', st: 'furnace', out: ['golden_ingot', 1], cost: { golden_nugget: 12 }, heat: 50, label: 'Smelt Golden Bar' },
    { id: 'make_charcoal', st: 'furnace', out: ['charcoal', 1], cost: { wood: 1 }, heat: 25, label: 'Burn Wood Log into Charcoal' },
    /* Sink */
    /*WASH*/
    /* Campfire (cooking, needs fuel) */
    { id: 'cook_fish', st: 'campfire', out: ['cooked_fish', 1], cost: { fresh_fish: 1 }, heat: 20, label: 'Cook Fresh Fish → Cooked Fish' }
  ];

  /* Temporary schematics (coming soon) */
  WZ.SCHEMATICS = ['Life Fruit (+10 Max HP, permanent)', 'Aegis Fruit (+5 Max Hunger, permanent)', 'Magic Fresh Super Purify Water (+5 Max Thirst, permanent)', 'AMC i4 Car Engine', 'AMC 3-Speed Manual Gearbox', 'Stock Lubrication-Oil Tank', 'Stock i4 Fuel Tank', 'Leather Seat', 'AMC i4-Car Gauge', 'Stock Wheel', 'Stock Water Coolant', 'Press Machine', 'Engine Bench', 'Vehicle Body Bench', 'Wheel Bench', 'Arms Robot', 'Sunlight Electric Generator', 'Wind Electric Generator', 'Coal Electric Generator', 'Pumpjack', 'Vehicle Assemblery Machine', 'Big Battery (100,000 mAh)', 'Giant Battery (500,000 mAh)', 'Huge Battery (2,500,000 mAh)', 'Mega Industrial Battery (15,000,000 mAh)'];

  /* ---------- Loot tables (total percent = 100) ---------- */
  var LOOT = {
    trash1: { name: 'Trash (Tier 1)', rolls: 1, enabled: true, t: [['broken_plastic_bottle', 20], ['dirty_plastic_bottle', 20], ['dirty_box_food', 15], ['broken_tin_can', 10], ['leftover_food', 15], ['gravel', 10], ['soil', 5], ['feather', 5]] },
    trash2: { name: 'Trash (Tier 2)', rolls: 1, enabled: true, t: [['dirty_aluminium_foil', 15], ['dirty_paper', 16], ['broken_leather_cloth', 5], ['broken_fabric_cloth', 10], ['gravel', 5], ['broken_floppy_drive', 1], ['iron_nugget', 7], ['broken_cardboards', 10], ['broken_wood_planks', 10], ['medical_bag', 4], ['feather', 10]] },
    trash3: { name: 'Trash (Tier 3)', rolls: 1, enabled: false, t: [['broken_dvd_player', 2], ['broken_cd', 3], ['broken_dvd', 5], ['broken_old_tv', null]] },
    table4: { name: 'Above Table (Tier 4)', rolls: 2, enabled: true, t: [['mini_led_lamp', 22, 3], ['rgb_lamp', 8, 4], ['black_screen_cover', 12, 4], ['metal_casing', 18, 2], ['plastic_paper_package', 15], ['gpu_chip', 5, 4], ['iron_nugget', 5]] },
    crate1: { name: 'Wooden Crate (Tier 1)', rolls: 3, enabled: true, t: [['@cont_veg', 20], ['@dirty_veg', 20], ['@cont_fruit', 15], ['@dirty_fruit', 15], ['plastic_bottled_water', 20], ['wood_sticks', 10]] },
    /* [LOOT TAG] truck trunk = "Iron Crate (Tier N)" (N = world tier, max 5): always 3 random picks from a modest (not high-end) list. Tier 3+ worlds use truck3 (adds iron/copper bars). */
    truck:  { name: 'Iron Crate', rolls: 3, enabled: true, t: [['medical_bag', 12], ['plastic_bottled_water', 18], ['@clean_fruit', 10], ['@clean_veg', 10], ['iron_nugget', 18], ['coal', 10], ['wood_sticks', 8]] },
    truck3: { name: 'Iron Crate', rolls: 3, enabled: true, t: [['medical_bag', 12], ['plastic_bottled_water', 14], ['@clean_fruit', 5], ['iron_nugget', 18], ['iron_ingot', 8, 3], ['copper_ingot', 4, 3], ['metal_casing', 10, 2], ['coal', 10], ['wood_sticks', 5]] },
    crate3: { name: 'Reinforced Wooden Crate (Tier 3)', rolls: 3, enabled: true, t: [['medical_bag', 15], ['plastic_bottled_water', 15], ['@clean_veg', 10], ['@clean_fruit', 10], ['iron_nugget', 20], ['metal_casing', 10, 2], ['mini_led_lamp', 5, 3]] },
    crate4: { name: 'Iron Crate (Tier 4)', rolls: 3, enabled: true, t: [['medical_bag', 15], ['iron_nugget', 20], ['metal_casing', 15, 2], ['mini_led_lamp', 10, 3], ['plastic_paper_package', 10], ['black_screen_cover', 5, 4], ['rgb_lamp', 5, 4]] },
    crate5: { name: 'Iron Crate (Tier 5)', rolls: 3, enabled: true, t: [['medical_bag', 10], ['iron_ingot', 15, 3], ['iron_nugget', 15], ['metal_casing', 15, 2], ['rgb_lamp', 10, 4], ['black_screen_cover', 8, 4], ['gpu_chip', 6, 4], ['mini_led_lamp', 6, 3]] },
    wreck: { name: 'Shipwreck Chest', rolls: 3, enabled: true, t: [['rope', 18], ['wood_plank', 20], ['iron_nugget', 12], ['golden_nugget', 8], ['coal', 10], ['broken_leather_cloth', 8], ['clay_ore', 6], ['sand', 15], ['sapphire', 3]] },
    crate2: { name: 'Wooden Crate (Tier 2)', rolls: 3, enabled: true, t: [['medical_bag', 20], ['plastic_bottled_water', 20], ['@clean_veg', 15], ['@clean_fruit', 15], ['iron_nugget', 15], ['broken_fabric_cloth', 15]] }
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
    big:     { name: 'Big',      hp: 150, spd: 0.8, dmg: 8,  def: 0, tier: 1, rarity: 'common', scale: 1.3,  color: 0x677459, cd: 1.1, w: 12, coin: [1, 1] },
    /* [MOB TAG] id=bomber | rarity=common | tier=T1 | biome=any | coin=1 kill -> 2 coins (from the earlier spec) */
    bomber:  { name: 'Bomber',   hp: 60,  spd: 1.2, dmg: 60, def: 0, tier: 1, rarity: 'common', scale: 1.05, color: 0x6f7c5c, cd: 0,   w: 10, splash: 4, coin: [1, 2] },
    /* [MOB TAG] id=brute | rarity=common | tier=T2 | biome=any | coin=1 kill -> 2 coins */
    brute:   { name: 'Brute',    hp: 275, spd: 0.5, dmg: 12, def: 0, tier: 2, rarity: 'common', scale: 1.55, color: 0x6a7258, cd: 1.3, w: 6, coin: [1, 2] },
    /* [MOB TAG] id=soldier | rarity=common | tier=T2 | biome=any | coin=1 kill -> 3 coins */
    soldier: { name: 'Soldier',  hp: 100, spd: 1.0, dmg: 9,  def: 2, tier: 2, rarity: 'common', scale: 1.05, color: 0x3d5a3a, cd: 1.0, w: 8, coin: [1, 3] },
    /* [MOB TAG] id=spider | rarity=common | tier=T1 | biome=any | coin=none | drops String 33.33% */
    spider:  { name: 'Spider',   hp: 40,  spd: 1.5, dmg: 5,  def: 1, tier: 1, rarity: 'common', scale: 0.7,  color: 0x4f7d3a, cd: 0.8, w: 8 },
    /* [MOB TAG] id=jacket | Jacket Zombie | T1 | biome=mountain | = Walker + DEF 1 */
    jacket:  { name: 'Jacket Zombie', hp: 80, spd: 1.0, dmg: 5, def: 1, tier: 1, rarity: 'common', biome: 'mountain', scale: 1.0, color: 0x6d7a5a, cd: 1.0, w: 10, coin: [1, 1] },
    /* [MOB TAG] id=pfwalker | Overgrown Permafrost Walker | T5 | biome=mountain | HP 100 DMG 10 (Frost: ignores armor DEF) DLY 1 RNG 1 SPD 1.2 DEF 5 | 1 kill = 5 coins | 10% permafrost ore */
    pfwalker:{ name: 'Overgrown Permafrost Walker', hp: 100, spd: 1.2, dmg: 10, def: 5, tier: 5, rarity: 'uncommon', biome: 'mountain', scale: 1.05, color: 0x7fa6c4, cd: 1.0, w: 8, coin: [1, 5], elem: 'frost' },
    /* [MOB TAG] id=berserk | Berserk Zombie | T3 | biome=desert | HP 100 DEF 3 DMG 12 DLY 3 SPD 3 until its first successful hit, then 1.5 | skill Rush Hour | 3 coins | 5% Berserkers Boots */
    berserk: { name: 'Berserk Zombie', hp: 100, spd: 1.5, dmg: 12, def: 3, tier: 3, rarity: 'uncommon', biome: 'desert', scale: 1.05, color: 0xb0583e, cd: 3.0, w: 8, coin: [1, 3], rush: true },
    /* [MOB TAG] id=mutanoider | Mutanoiders Zombos | BOSS T3->T4 | HP 3600 DMG 18 DLY 0.4 DEF 0 (10 while its tentacles and wings guard, then it cannot attack) SPD 0.6 (0.1 guarding) | 60 coins */
    mutanoider:{ name: 'Mutanoiders Zombos', hp: 3600, spd: 0.6, dmg: 18, def: 0, tier: 4, rarity: 'boss', scale: 2.6, color: 0x3c4a2f, cd: 0.4, w: 0, nospawn: true, boss: true, splash: 3, coin: [1, 60], wingguard: true },
    /* [MOB TAG] id=hardzombie | Hard Zombie | summoned at the statue next to the surface mineshaft (100 coins, 2 h real-time cooldown) | HP 350 DMG 36 SPLASH 8 (diameter) DLY 4 | drops 120 coins */
    hardzombie:{ name: 'Hard Zombie', hp: 350, spd: 1.0, dmg: 36, def: 0, tier: 1, rarity: 'boss', scale: 1.35, color: 0x5a6350, cd: 4.0, w: 0, nospawn: true, splash: 4, coin: [1, 120] },
    /* [MOB TAG] id=mutant | Mutant Zombie | rarity=uncommon | tier=T3 | biome=any | HP 120, RNG 2x walker, DMG 2x walker, SPD 1.6 (0.8 while guarding with tentacles), DEF 0 (4 while guarding), attacks 4 blocks at once, attack delay 2x slower */
    mutant:  { name: 'Mutant Zombie', hp: 120, spd: 1.6, dmg: 10, def: 0, tier: 3, rarity: 'uncommon', scale: 1.05, color: 0x3a4a34, cd: 2.0, w: 7, coin: [1, 4], rng: 2, mutant: true, aoe: 4, splash: 2 },
    /* [MOB TAG] id=tough | Tough Zombie | rarity=uncommon | tier=T2 | HP 100, RNG 1x, DMG 1.2x walker, SPD 1.1, DEF 1 | skill: growl "gggrrrrr..." radius 10 (diameter 10 -> r 5... see game.js) gives +10% damage for 5 s, cooldown 10 s, a new growl replaces the running buff */
    tough:   { name: 'Tough Zombie', hp: 100, spd: 1.1, dmg: 6, def: 1, tier: 2, rarity: 'uncommon', scale: 1.05, color: 0x4f5846, cd: 1.0, w: 8, coin: [1, 3], growl: true },
    /* [MOB TAG] id=antlion | AntlionZ | rarity=common | tier=T3 | biome=DESERT ONLY | coin=1 kill -> 4 coins | skill: moves 2x faster when HP < 20% */
    antlion: { name: 'AntlionZ', hp: 75,  spd: 1.2, dmg: 7,  def: 3, tier: 3, rarity: 'common', biome: 'desert', scale: 1.0, color: 0xe07a1a, cd: 0.9, w: 10, coin: [1, 4], rage: true },
    /* [MOB TAG] id=zcorpion | Zcorpionz | rarity=RARE | tier=T4 | biome=DESERT ONLY | coin=1 kill -> 6 coins | RNG 1.2 (reach x1.2) | skill: shoots "Acidic Poison", each hit makes the poison 3x deadlier (stacks up to 3) */
    zcorpion:{ name: 'Zcorpionz', hp: 90, spd: 1.1, dmg: 18, def: 2, tier: 4, rarity: 'rare', biome: 'desert', scale: 1.0, color: 0xc9a050, cd: 1.0, w: 10, coin: [1, 6], rng: 1.2, ranged: 'acid', acidic: true },
    /* [MOB TAG] id=programmer | Programmer Zombie | rarity=RARE | tier=T4 | biome=any | coin=1 kill -> 7 coins | shoots Keybind Error Virus | drops Signal Finder Chip 10% */
    programmer: { name: 'Programmer Zombie', hp: 70, spd: 0.9, dmg: 10, def: -5, tier: 4, rarity: 'rare', scale: 1.0, color: 0x35506b, cd: 1.0, w: 10, ranged: 'virus', coin: [1, 7] },
    /* [MOB TAG] id=miner | Miner Zombie Walker | rarity=special | spawns only inside the mineshaft | coin=none */
    miner:   { name: 'Miner Zombie Walker', hp: 90, spd: 0.8, dmg: 12, def: 3, tier: 2, rarity: 'common', scale: 1.05, color: 0x7a6a3a, cd: 1.0, w: 0, nospawn: true },
    /* [MOB TAG] id=zfish | Zombie Fish | rarity=special (fishing only) | tier=T-Flexible | coin=1 kill -> 1 coin | attack gives Water Poison */
    /* [MOB TAG] id=floater | Floater Zombie | T1 | biome=sea (surface only) | HP 70 SPD 0.9 DLY 1 DMG 5 | counts as a Walker kill */
    floater: { name: 'Floater Zombie', hp: 70, spd: 0.9, dmg: 5, def: 0, tier: 1, rarity: 'common', scale: 1.0, color: 0x6d7a5a, cd: 1.0, w: 0, nospawn: true, coin: [3, 1] },
    drowned: { name: 'Drowned Zombie', hp: 60, spd: 0.75, dmg: 6, def: 0, tier: 1, rarity: 'common', scale: 1.0, color: 0x3f7f86, cd: 1.1, w: 0, nospawn: true, coin: [1, 2] },
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
  WZ.RARITY = { common: 1, uncommon: 1 / 2, rare: 1 / 4, epic: 1 / 10, legendary: 1 / 25, mythical: 1 / 100 };

  /* Weapon types: Sword (default), Spear (reach 3x, DMG 0.8x, delay 1.1x, sticks x5, bar -1), Greatsword (DMG 2x, reach 0.8x, delay 2x, bars & sticks x1.2) */
  Object.keys(I).filter(function (k) { return /_sword$/.test(k) && I[k].tool === 'sword'; }).forEach(function (k) {
    var sw = I[k], base = k.replace('_sword', ''), nm = sw.name.replace(' Sword', ''), rec0 = null; for (var i = 0; i < R.length; i++) if (R[i].id === k) { rec0 = R[i]; break; }
    if (!rec0) return; var isBar = function (c) { return /(ingot|^wood$|^stone$)/.test(c); }, isStick = function (c) { return /stick/.test(c); };
    var cs = {}, cg = {}; Object.keys(rec0.cost).forEach(function (c) { var n = rec0.cost[c]; cs[c] = isStick(c) ? n * 5 : isBar(c) ? Math.max(1, n - 1) : n; cg[c] = (isStick(c) || isBar(c)) ? Math.ceil(n * 1.2) : n; });
    item(base + '_spear', '🔱', nm + ' Spear', 'Long reach (3x), 0.8x damage, 1.1x slower than a sword. Good against long-range zombies or when you are scared to get close.', { type: 'tool', tool: 'sword', bd: 1, dmg: Math.round(sw.dmg * 0.8), reach: 3, dly: 1.1, wtype: 'spear', note: 'Spear: reach 3x, DMG 0.8x, delay 1.1x' });
    item(base + '_greatsword', '🗡️', nm + ' Greatsword', 'Double damage, 0.8x reach, twice as slow. Made for tanky zombies and rhino-thick defense.', { type: 'tool', tool: 'sword', bd: 1, dmg: sw.dmg * 2, reach: 0.8, dly: 2, wtype: 'great', note: 'Greatsword: DMG 2x, reach 0.8x, delay 2x' });
    var st0 = rec0.st; R.push({ id: base + '_spear', st: st0, out: [base + '_spear', 1], cost: cs }); R.push({ id: base + '_greatsword', st: st0, out: [base + '_greatsword', 1], cost: cg });
  });
    /* [FURNITURE TAG] Wood / Palm / Pine furniture sets. vox ids 52-69 (piece*3+wood) and 70-71 (Palm/Pine bed). */
  item('cotton', '☁️', 'Cotton', 'Soft fibre found in bushes. Used for sofas, couches and beds. Also fits your armor, if you wish to be softer...');
  item('palm_plank', '🟨', 'Palm Plank', 'A plank cut from a Palm Log at a Sawmill.');
  item('pine_plank', '🟫', 'Pine Plank', 'A plank cut from a Pine Log at a Sawmill.');
  item('pine_stick', '🥢', 'Pine Stick', 'A straight stick from a pine log.');
  var FW = [['wood', 'Wood', 'wood_sticks', 'wood_plank'], ['palm', 'Palm', 'palm_wood_stick', 'palm_plank'], ['pine', 'Pine', 'pine_stick', 'pine_plank']];
  var FP = [['chair', 'Chair', 8, 6, 0, [1, 1, 1], 'Sit with [E]. No Comfort, but restores Energy +5 per second.'], ['table', 'Table', 12, 10, 0, [2, 1, 1], 'Put an object on top with [E] (even Fragile ones). A Cutting Board on a table turns it into a cutting station.'], ['sofa', 'Sofa', 8, 12, 10, [2, 1, 1], 'Sit and relax with [E]. Restores Energy +8 every 0.5 s and Comfort.'], ['couch', 'Couch Sofa', 8, 6, 5, [1, 1, 1], 'A single-seat sofa. Restores Energy +8 every 0.5 s and Comfort.'], ['standlamp', 'Standing Bulb Lamp', 6, 3, 0, [1, 1, 1], 'A warm bulb lamp on a stand. Lights up the room at night.'], ['hanglamp', 'Hanging Bulb Lamp', 4, 2, 0, [1, 1, 1], 'A bulb lamp that hangs on a cord. Lights up the room at night.']];
  FP.forEach(function (pc, pi) { FW.forEach(function (w, wi) {
    var id = pc[0] + '_' + w[0], cost = {}; cost[w[2]] = pc[2]; cost[w[3]] = pc[3]; if (pc[4]) cost.cotton = pc[4]; if (pc[0] === 'standlamp') cost.copper_ingot = 2; if (pc[0] === 'hanglamp') { cost.rope = 2; cost.copper_ingot = 1; cost.cotton = 2; }
    item(id, pc[0] === 'chair' ? '🪑' : pc[0] === 'table' ? '🪵' : pc[0] === 'sofa' || pc[0] === 'couch' ? '🛋️' : '💡', w[1] + ' ' + pc[1], pc[6] + ' Size ' + pc[5].join('x') + '.', { type: 'block', vox: 52 + pi * 3 + wi, hp: 50, size: pc[5] });
    R.push({ id: id, st: 'sawmill', out: [id, 1], cost: cost, puz: { k: 'saw', d: 2 } });
  }); });
  [['palm', 'Palm', 'palm_wood_stick', 'palm_plank'], ['pine', 'Pine', 'pine_stick', 'pine_plank']].forEach(function (w, wi) { var c = {}; c[w[2]] = 10; c[w[3]] = 14; c.cotton = 12; item('bed_' + w[0], '🛏️', w[1] + ' Bed', 'A comfy bed. Sleep with [E] and dismantle it again anytime. Size 2x1x1.', { type: 'block', vox: 70 + wi, hp: 55, size: [2, 1, 1] }); R.push({ id: 'bed_' + w[0], st: 'sawmill', out: ['bed_' + w[0], 1], cost: c, puz: { k: 'saw', d: 2 } }); });
  R.push({ id: 'pine_sticks', st: 'sawmill', out: ['pine_stick', 4], cost: { pine_log: 1 }, puz: { k: 'saw', d: 1 }, label: 'Cut Pine Log into Pine Sticks' }, { id: 'palm_planks', st: 'sawmill', out: ['palm_plank', 2], cost: { palm_log: 1 }, puz: { k: 'saw', d: 1 }, label: 'Cut Palm Log into Palm Planks' }, { id: 'pine_planks', st: 'sawmill', out: ['pine_plank', 2], cost: { pine_log: 1 }, puz: { k: 'saw', d: 1 }, label: 'Cut Pine Log into Pine Planks' });

  /* [BENCH+LIQUID TAG] Generic station blocks (vox 72-78): [stationKey, name, listName, colour, emoji, label, size]. Pools = liquids found in the world. */
  WZ.GST = {
    72: ['wfilter', 'Water Filtering Machine', 'wfilters', '#2f6f8a', '🚰', 'FILTER', [2, 1, 1]],
    73: ['distill', 'Distillation Machine', 'distills', '#6a6a7a', '⚗️', 'DISTILL', [2, 1, 1]],
    74: ['cwork', 'Computer Workbench', 'cworks', '#2e3a52', '🖥️', 'COMP WB', [2, 1, 2]],
    75: ['seng', 'Simple Engineering Bench', 'sengs', '#6a5a2e', '🔌', 'SIMPLE ENG', [2, 1, 2]],
    76: ['eng', 'Engineering Bench', 'engs', '#3a4a6a', '⚡', 'ENGINEER', [2, 1, 2]],
    77: ['drive', 'Drivetrain Workbench', 'drives', '#4a4a4a', '⚙️', 'DRIVETRAIN', [3, 1, 2]],
    78: ['vbench', 'Vehicle Bench', 'vbenchs', '#5a2a2a', '🚗', 'VEHICLE', [3, 1, 2]],
    85: ['gunb', 'Gun Bench', 'gunbs', '#2e2e32', '🔫', 'GUNS', [2, 1, 2]],
    86: ['cpot', 'Cooking Pot', 'cpots', '#4a3a2a', '🍲', 'COOK', [2, 2, 3]],
    126: ['shaper', 'Manual Iron Shaper Table', 'shapers', '#6e4a28', '🔨', 'SHAPER', [3, 1, 2]],
    127: ['tanker', 'Tanker Workbench', 'tankers', '#5a5f66', '🛢️', 'TANKER', [3, 1, 2]]
  };
  Object.keys(WZ.GST).forEach(function (t) { var g = WZ.GST[t], id = { wfilter: 'water_filter', distill: 'distiller', cwork: 'computer_workbench', seng: 'simple_eng_bench', eng: 'eng_bench', drive: 'drivetrain_bench', vbench: 'vehicle_bench', gunb: 'gun_bench', cpot: 'cooking_pot', shaper: 'manual_iron_shaper', tanker: 'tanker_workbench' }[g[0]]; g.id = id;
    item(id, g[4], g[1], g[1] + '. Place it, then press [E] near it. Size ' + g[6].join('x') + '.', { type: 'block', vox: +t, hp: 90, size: g[6] }); });
  /* Liquids carried in an Iron Bucket (the empty bucket comes back after use). */
  WZ.LIQ = { contaminated: ['Contaminated Water', '🟢', { t: 3, th: 10, wp: 0.9 }], dirty: ['Dirty Water', '🟤', { t: 3, th: 15, wp: 0.5 }], slightly: ['Slightly Dirty Water', '💧', { t: 3, th: 20, wp: 0.2 }], acceptable: ['Acceptable Water', '💧', { t: 3, th: 28, wp: 0.03 }], purify: ['Purify Water', '💦', { t: 3, th: 45, heal: 5 }],
    lava: ['Lava', '🌋', { t: 2, th: 0, burn: 60 }], honey: ['Honey', '🍯', { t: 4, th: 5, h: 25, energy: 10 }], acid: ['Acid', '🧪', { t: 2, th: 0, corr: 1 }], oil: ['Crude Oil', '🛢️', { t: 3, th: -10, wp: 1 }] };
  Object.keys(WZ.LIQ).forEach(function (k) { var L = WZ.LIQ[k], e = {}; for (var f in L[2]) e[f] = L[2][f]; e.ret = k === 'lava' ? 'titanium_bucket' : 'iron_bucket';
    item('ib_' + k, L[1], (k === 'lava' ? 'Titanium Bucket (' : 'Iron Bucket (') + L[0] + ')', 'Special-Material tag: ' + (k === 'lava' ? 'a Titanium Bucket (only titanium survives the heat; an Iron Bucket would melt)' : 'an Iron Bucket') + ' filled with ' + L[0] + '. When emptied it turns back into the empty ' + (k === 'lava' ? 'Titanium' : 'Iron') + ' Bucket. Hold it and drink with Left Click; you get the empty bucket back.' + (k === 'contaminated' ? ' Sea water: high Water Poison chance.' : k === 'lava' ? ' Do NOT drink this.' : k === 'acid' ? ' Gives Corrosive (1 HP every 0.2 s for 20 s).' : ''), { type: 'drink', eat: e, tag: 'bucket' }); });
  item('low_end_cpu', '🧠', 'Low-End CPU', 'A slow processor.'); item('low_end_ram', '🧩', 'Low-End RAM', 'A small memory stick.'); item('low_end_psu', '🔋', 'Low-End PSU', 'A weak power supply unit.'); item('low_end_motherboard', '🟩', 'Low-End Motherboard', 'A basic motherboard.');
  item('iron_casing', '🔲', 'Iron Casing', 'A small iron shell for machines and electronics.'); item('electric_power_provider', '⚡', 'Electric Power Provider', 'Supplies electricity to engineering machines.');
  item('manual_crank_charger', '🔄', 'Manual Crank-Charger', 'A hand-cranked charger. Made at Handmade.');
  item('small_iron_cogwheel', '⚙️', 'Iron Cogwheel', 'A small iron gear.'); item('large_iron_cogwheel', '⚙️', 'Large Iron Cogwheel', 'A large iron gear.'); item('iron_spiral', '🌀', 'Iron Spiral', 'A coiled iron spring.');
  item('fiber_glass', '🧵', 'Fiber Glass', 'Glass fibres used for brake linings.'); item('cast_iron_plate', '▭', 'Cast Iron Plate', 'A thick cast iron plate.');
  item('drum_brake_casing', '🛞', 'Drum Brake Casing', 'The iron housing of a drum brake.', { note: 'Vehicle part.' });
  item('drum_brake', '🛑', 'Drum Brake', 'Usually attached to almost every normal vehicle. Brake Power 20.', { note: 'Brake Power: 20. Vehicle part (cannot be installed yet).' });
  item('stock_car_suspension', '🔩', 'Stock Car Suspension', 'Commonly attached to cars. Softness 20, Shock Absorbant 50.', { note: 'Softness 20 (higher = the car bounces more). Shock Absorbant 50 (higher = the drivetrain takes less damage from bumps). Vehicle part.' });
  item('rwd_car_drivetrain', '🚙', 'RWD Car Drivetrain', 'Commonly attached to SUVs. The wheel movement is at the rear.', { note: 'Rear-wheel drive: the driven wheels are at the back. Vehicle part.' });
  item('scout_ii_car_casing', '🚘', 'Scout II Car Casing', 'The body of the Scout II SUV. Place it on a large flat area to start assembling.', { note: 'Vehicle part.' });
  item('amc_i4_engine', '🔧', 'AMC i4 Car Engine', 'A 4-cylinder car engine.', { note: 'Vehicle part.' }); item('amc_3sp_gearbox', '🕹️', 'AMC 3-Speed Manual Gearbox', 'Goes under the engine.', { note: 'Vehicle part.' });
  item('amc_i4_gauge', '⏲️', 'AMC i4-Car Gauge', 'Dashboard gauges.', { note: 'Vehicle part.' }); item('stock_water_coolant', '🌡️', 'Stock Water Coolant', 'Engine coolant system.', { note: 'Vehicle part.' });
  item('leather_seat', '💺', 'Leather Seat', 'A vehicle seat.', { note: 'Vehicle part.' }); item('stock_wheel', '🛞', 'Stock Wheel', 'Wheel and tire for the Scout II.', { note: 'Vehicle part.' });
  /* Sprite-sheet icons (icons/atlas0.webp + icons/atlas.json, 20x20 cells). WZ.spr(key) returns an <i> that shows one cell, or null. */
  WZ.spr = function (key, style) { var A = window.WZ_ATLAS, p = A && A.icons[key]; if (!p) return null; return '<i class="ico sp sp' + p[0] + '" style="background-position:' + (p[1] * 100 / (A.cols - 1)) + '% ' + (p[2] * 100 / (A.rows - 1)) + '%;' + (style || '') + '"></i>'; };

  /* [FARM TAG] Farming: Hoe / Shovel in every tool set, Wooden Bucket, seeds, farmland blocks (vox 79-84). */
  [['rusty', 'Rusty', 1.0, 2, '🧱'], ['crude', 'Crude', 1.3, 4, ''], ['copper', 'Copper', 1.7, 6, ''], ['iron', 'Iron', 2.0, 8, ''], ['golden', 'Golden', 2.6, 10, ''], ['titanium', 'Titanium', 3.0, 12, ''], ['permafrost', 'Permafrost', 2.8, 11, '']].forEach(function (s) {
    item(s[0] + '_hoe', '⛏️', s[1] + ' Hoe', 'Hold Left Click on farmland to till it for planting. Hoe Power ' + s[2] + ' (tilling takes about ' + (4 / s[2]).toFixed(1) + ' s).', { type: 'tool', tool: 'hoe', bd: s[3], dmg: Math.round(s[3] * 0.7), hoeP: s[2], note: 'Hoe Power: ' + s[2] + '. Tills a farmland in ' + (4 / s[2]).toFixed(1) + ' s.' });
    item(s[0] + '_shovel', '🥄', s[1] + ' Shovel', 'Digs soft tiles: soil, sand and snow.', { type: 'tool', tool: 'shovel', bd: s[3], dmg: Math.round(s[3] * 0.8), note: 'Works on soft tiles (Soil, Sand, Snow) like a pickaxe works on rocks.' }); });
  item('wooden_bucket', '🪣', 'Wooden Bucket', 'Holds water only. Hold a water bucket and press [E] on tilled farmland to water it, if you poor to find watering can... Crafted at a Furniture Table, so you do not need to craft using a machine, though it was simple.', { note: 'Can only hold water (any quality). Works as a watering can.' });
  WZ.WOOD_WATER = {}; ['contaminated', 'dirty', 'slightly', 'acceptable', 'purify'].forEach(function (q) { var L = WZ.LIQ[q], e = {}; for (var f in L[2]) e[f] = L[2][f]; e.ret = 'wooden_bucket'; WZ.WOOD_WATER[q] = 1; item('wb_' + q, L[1], 'Wooden Bucket (' + L[0] + ')', 'Special-Material tag: a Wooden Bucket filled with ' + L[0] + '. It turns back into an empty Wooden Bucket when used up.', { type: 'drink', eat: e, tag: 'bucket' }); });
  item('any_water', '💧', '1 Bucket of Water (any)', 'Any bucket filled with water. The empty bucket is returned.', { type: 'material', hidden: true });
  item('wheat', '🌾', 'Wheat', 'Grown from Wheat Seeds.'); item('rice_raw', '🍚', 'Rice (Raw)', 'Needs cooking in a Cooking Pot with a Wooden Bowl. Though you have to get it by peeling Rice Panicle... Hurtful if you peel it manually using hands...', { tier: 1 }); item('rice_panicle', '🌾', 'Rice Panicle', 'The grain head of a rice plant. Peel it on a Furniture Table to get Rice (Raw). Coming soon: how to harvest it.', { soon: true });
  item('wheat_seeds', '🟢', 'Wheat Seeds', 'Plant on tilled, wet farmland. Grows in 120 s (pauses when the soil dries).', { type: 'material', note: 'Grows in 120 s. Needs tilled, wet soil farmland.' });
  item('pumpkin_seeds', '🟠', 'Pumpkin Seeds', 'Plant on tilled, wet farmland. Grows in 180 s; the pumpkin ripens on the plant.', { type: 'material', note: 'Grows in 180 s. Needs tilled, wet soil farmland.' });
  item('watermelon_seeds', '⚫', 'Watermelon Seeds', 'Plant on tilled, wet farmland. Grows in 180 s; the watermelon ripens on the plant.', { type: 'material', note: 'Grows in 180 s. Needs tilled, wet soil farmland.' });
  item('rice_seeds', '🟡', 'Rice Seeds', 'Plant on Shallow Water Farmland. Grows by itself in 200 s, but pests will pause it until you remove them.', { type: 'material', note: 'Grows in 200 s on Shallow Water Farmland. Pests pause it ([E] removes them).' });
  WZ.FARM = { 79: ['farmland_s', 'Farmland (Small)', 1, false, '#6b4a2b'], 80: ['farmland_m', 'Farmland (Medium)', 2, false, '#6b4a2b'], 81: ['farmland_l', 'Farmland (Large)', 3, false, '#6b4a2b'], 82: ['swfarm_s', 'Shallow Water Farmland (Small)', 1, true, '#3f6f86'], 83: ['swfarm_m', 'Shallow Water Farmland (Medium)', 2, true, '#3f6f86'], 84: ['swfarm_l', 'Shallow Water Farmland (Large)', 3, true, '#3f6f86'] };
  Object.keys(WZ.FARM).forEach(function (t) { var f = WZ.FARM[t]; item(f[0], f[3] ? '🌊' : '🟫', f[1], (f[3] ? 'A shallow pool for rice. ' : 'Soil bed: till it with a Hoe, then water it. ') + 'Area ' + f[2] + 'x' + f[2] + '.', { type: 'block', vox: +t, hp: 40, size: [f[2], 1, f[2]], note: f[3] ? 'Rice grows here automatically.' : 'Needs a Hoe before planting.' }); });
  WZ.CROPS = { wheat_seeds: { crop: 'wheat', time: 120, water: false, y: [2, 3], vis: 'stalk', col: 0xd8b94a }, pumpkin_seeds: { crop: 'pumpkin', time: 180, water: false, y: [1, 1], vis: 'ball', col: 0xd9731a }, watermelon_seeds: { crop: 'watermelon', time: 180, water: false, y: [1, 1], vis: 'ball', col: 0x2f8a3a }, rice_seeds: { crop: 'rice_raw', time: 200, water: true, y: [2, 3], vis: 'stalk', col: 0xe3c24a } };
  WZ.WATER_BUCKETS = [['ib_contaminated', 'iron_bucket'], ['ib_dirty', 'iron_bucket'], ['ib_slightly', 'iron_bucket'], ['ib_acceptable', 'iron_bucket'], ['ib_purify', 'iron_bucket'], ['wb_contaminated', 'wooden_bucket'], ['wb_dirty', 'wooden_bucket'], ['wb_slightly', 'wooden_bucket'], ['wb_acceptable', 'wooden_bucket'], ['wb_purify', 'wooden_bucket']];
  /* [ICON TAG] XKing Studio logos: only items whose logo clearly matches. ':d' = dirty tint, ':c' = contaminated tint. Others keep their emoji. */
  (function () { var M = {"wooden_bucket": "3_3", "wooden_bowl": "4_21", "rice_raw": "2_15", "cooked_rice": "2_16", "cotton": "2_17", "diamond": "4_3", "emerald": "4_4", "amethyst": "4_17", "soil": "1_15", "golden_nugget": "4_7", "iron_ingot": "4_8", "titanium_ingot": "4_9", "copper_ingot": "4_10", "golden_ingot": "4_6", "coal": "4_1", "charcoal": "4_2", "feather": "4_13", "rope": "4_12", "gunpowder": "4_14", "red_brick": "4_18", "cactus": "1_9", "potato": "1_2", "dirty_potato": "1_2:d", "contaminated_potato": "1_2:c", "watermelon": "1_4", "dirty_watermelon": "1_4:d", "contaminated_watermelon": "1_4:c", "pumpkin": "1_5", "dirty_pumpkin": "1_5:d", "contaminated_pumpkin": "1_5:c", "fresh_fish": "2_9", "contaminated_fish": "2_9:c", "cooked_fish": "2_10", "iron_bucket": "3_5", "titanium_bucket": "3_9", "revolver": "3_16", "arrow": "3_15", "wood_bow": "3_29", "simple_bomb": "3_21", "signal_chip": "3_27", "gpu_chip": "4_20", "broken_leather_cloth": "4_15:d", "leaf": "6_16", "clay_ore": "4_0", "ib_contaminated": "3_6:c", "ib_dirty": "3_6:d", "ib_slightly": "3_6", "ib_acceptable": "3_6", "ib_purify": "3_6", "ib_lava": "3_12", "ib_honey": "3_7"};
    Object.keys(M).forEach(function (id) { var it = I[id]; if (!it) return; var a = M[id].split(':'), f = a[1] === 'd' ? ' style="filter:sepia(.7) brightness(.75)"' : a[1] === 'c' ? ' style="filter:hue-rotate(70deg) saturate(.9) brightness(.7)"' : ''; var sp = WZ.spr('s' + a[0], a[1] === 'd' ? 'filter:sepia(.7) brightness(.75)' : a[1] === 'c' ? 'filter:hue-rotate(70deg) saturate(.9) brightness(.7)' : ''); if (!sp) return; it.emoji = it.ic; it.ic = sp; }); })();
  WZ.ITEMS = I;
  FRUITS.concat(VEGS).forEach(function (f) { R.push({ id: 'wash_' + f[0], st: 'sink', out: [f[0], 1], cost: (function () { var o = {}; o['dirty_' + f[0]] = 1; return o; })(), label: 'Wash Dirty ' + f[1] + ' → ' + f[1] }); });
  /* Press Machine is coming soon */
  [{ id: 'manual_crank_charger', st: 'hand', out: ['manual_crank_charger', 1], cost: { wood_cogwheel: 1, wood_sticks: 4, copper_wire: 6 } },
    { id: 'computer_workbench', st: 'sawmill', out: ['computer_workbench', 1], cost: { low_end_cpu: 1, low_end_ram: 1, low_end_psu: 1, low_end_motherboard: 1, gpu_chip: 1, iron_casing: 16, wood_plank: 12 }, puz: { k: 'saw', d: 3 } },
    { id: 'simple_eng_bench', st: 'tablecraft', out: ['simple_eng_bench', 1], cost: { wood_plank: 12, copper_wire: 8, manual_crank_charger: 1 } },
    { id: 'eng_bench', st: 'tablecraft', out: ['eng_bench', 1], cost: { simple_eng_bench: 1, electric_power_provider: 1, iron_plate: 6, copper_wire: 20 } },
    { id: 'water_filter', st: 'liquiders', out: ['water_filter', 1], cost: { iron_pipe: 6, iron_plate: 4, cotton: 6 }, puz: { k: 'crank', n: 5 } },
    { id: 'distiller', st: 'liquiders', out: ['distiller', 1], cost: { iron_pipe: 8, iron_plate: 6, copper_ingot: 4, coal: 4 }, puz: { k: 'crank', n: 6 } },
    { id: 'stock_car_suspension', st: 'drive', out: ['stock_car_suspension', 1], cost: { iron_spiral: 16, iron_plate: 4 } },
    { id: 'rwd_car_drivetrain', st: 'drive', out: ['rwd_car_drivetrain', 1], cost: { iron_plate: 8, iron_ingot: 20, iron_stick: 40, small_iron_cogwheel: 4, large_iron_cogwheel: 2, iron_chain: 4 } },
    { id: 'drum_brake', st: 'drive', out: ['drum_brake', 1], cost: { drum_brake_casing: 1, fiber_glass: 20 } },
    { id: 'drum_brake_casing', st: 'drive', out: ['drum_brake_casing', 1], cost: { cast_iron_plate: 12 } },
    { id: 'scout_ii_car_casing', st: 'vbench', out: ['scout_ii_car_casing', 1], cost: { coated_iron_plate: 50, glass: 10, iron_stick: 20 } },
    { id: 'filt_c', st: 'wfilter', out: ['ib_dirty', 1], cost: { ib_contaminated: 1, cotton: 1 }, label: 'Filter Contaminated -> Dirty' },
    { id: 'filt_d', st: 'wfilter', out: ['ib_slightly', 1], cost: { ib_dirty: 1, cotton: 1 }, label: 'Filter Dirty -> Slightly Dirty' },
    { id: 'dist_s', st: 'distill', out: ['ib_acceptable', 1], cost: { ib_slightly: 1, coal: 1 }, label: 'Distill Slightly Dirty -> Acceptable' },
    { id: 'dist_a', st: 'distill', out: ['ib_purify', 1], cost: { ib_acceptable: 1, coal: 1 }, label: 'Distill Acceptable -> Purify' }].forEach(function (r) { R.push(r); });
  [{ id: 'rusty_hoe', st: 'hand', out: ['rusty_hoe', 1], cost: { wood_sticks: 3, gravel: 2 } }, { id: 'crude_hoe', st: 'hand', out: ['crude_hoe', 1], cost: { wood_sticks: 4, gravel: 3 } }, { id: 'copper_hoe', st: 'hand', out: ['copper_hoe', 1], cost: { copper_ingot: 2, wood_sticks: 2 } }, { id: 'iron_hoe', st: 'hand', out: ['iron_hoe', 1], cost: { iron_ingot: 2, wood_sticks: 2 } }, { id: 'golden_hoe', st: 'hand', out: ['golden_hoe', 1], cost: { golden_ingot: 2, wood_sticks: 2 } }, { id: 'titanium_hoe', st: 'anvil', out: ['titanium_hoe', 1], cost: { titanium_ingot: 2, wood_sticks: 2 } }, { id: 'permafrost_hoe', st: 'anvil', out: ['permafrost_hoe', 1], cost: { permafrost_ingot: 2, wood_sticks: 2 } },
    { id: 'rusty_shovel', st: 'hand', out: ['rusty_shovel', 1], cost: { wood_sticks: 3, gravel: 2 } }, { id: 'crude_shovel', st: 'hand', out: ['crude_shovel', 1], cost: { wood_sticks: 4, gravel: 3 } }, { id: 'copper_shovel', st: 'hand', out: ['copper_shovel', 1], cost: { copper_ingot: 1, wood_sticks: 2 } }, { id: 'iron_shovel', st: 'hand', out: ['iron_shovel', 1], cost: { iron_ingot: 1, wood_sticks: 2 } }, { id: 'golden_shovel', st: 'hand', out: ['golden_shovel', 1], cost: { golden_ingot: 1, wood_sticks: 2 } }, { id: 'titanium_shovel', st: 'anvil', out: ['titanium_shovel', 1], cost: { titanium_ingot: 1, wood_sticks: 2 } }, { id: 'permafrost_shovel', st: 'anvil', out: ['permafrost_shovel', 1], cost: { permafrost_ingot: 1, wood_sticks: 2 } },
    { id: 'wooden_bucket', st: 'tablecraft', out: ['wooden_bucket', 1], cost: { wood_plank: 4, copper_ingot: 2, copper_stick: 1 } },
    { id: 'farmland_s', st: 'hand', out: ['farmland_s', 1], cost: { soil: 4, wood_plank: 2 } }, { id: 'farmland_m', st: 'hand', out: ['farmland_m', 1], cost: { soil: 15, wood_plank: 4 } }, { id: 'farmland_l', st: 'hand', out: ['farmland_l', 1], cost: { soil: 60, wood_plank: 8 } },
    { id: 'swfarm_s', st: 'hand', out: ['swfarm_s', 1], cost: { any_water: 1, gravel: 4 } }, { id: 'swfarm_m', st: 'hand', out: ['swfarm_m', 1], cost: { any_water: 3, gravel: 10 } }, { id: 'swfarm_l', st: 'hand', out: ['swfarm_l', 1], cost: { any_water: 7, gravel: 18 } }].forEach(function (r) { R.push(r); });
  item('scuba_tank', '🤿', 'Scuba Tank', 'Compressed air on your back. Oxygen lasts 5x longer underwater.', { type: 'acc', note: 'Accessory. Underwater oxygen drains 5x slower.' });
  R.push({ id: 'scuba_tank', st: 'craft', out: ['scuba_tank', 1], cost: { iron_plate: 4, iron_stick: 2, rope: 2, glass: 1 }, puz: { k: 'img', n: 3 }, tier: 1 });
  /* [GUN TAG] Gun Bench + Revolver. Every gun is a picture puzzle with 3x the normal shuffle (puz.mult). */
  item('iron_coil', '🌀', 'Iron Coil', 'A tight coil of iron wire for springs and triggers. Forged at the Iron Anvil.');
  R.push({ id: 'iron_coil', st: 'anvil', out: ['iron_coil', 2], cost: { iron_ingot: 1 } });
  R.push({ id: 'gun_bench', st: 'craft', out: ['gun_bench', 1], cost: { wood_plank: 16, iron_stick: 4, iron_ingot: 8, titanium_ingot: 1, copper_plate: 4 }, puz: { k: 'saw', d: 2 } });
  item('revolver_bullet', '🔸', 'Revolver Bullet', 'Ammo for the Revolver. Made at the Gun Bench.', { note: 'Ammo for the Revolver.' });
  R.push({ id: 'revolver_bullet', st: 'gunb', out: ['revolver_bullet', 12], cost: { gunpowder: 2, copper_ingot: 1, iron_stick: 1 } });
  item('revolver', '🔫', 'Revolver', 'A six-shooter. Hold Left Click to fire, press [R] to reload. Needs Revolver Bullets in your bag.', { type: 'tool', tool: 'gun', dmg: 16, dly: 0.6, rng: 36, clip: 6, reload: 1.6, ammo: 'revolver_bullet', tier: 3, note: 'Ammunition Clip 6 · Reload Time 1.6 s · Range 36 m. Crafted at the Gun Bench (picture puzzle at 3x difficulty).' });
  R.push({ id: 'revolver', st: 'gunb', out: ['revolver', 1], cost: { iron_coil: 4, wood_plank: 4, iron_stick: 6, iron_ingot: 4, copper_ingot: 2 }, puz: { k: 'img', n: 4, mult: 3 }, tier: 2 });
  /* [COOK TAG] Cooking Pot: heat jobs like a campfire (needs fuel in the bag). Containers (Wooden Bowl) are consumed into the meal. */
  R.push({ id: 'cooking_pot', st: 'craft', out: ['cooking_pot', 1], cost: { campfire: 1, iron_stick: 2, iron_ingot: 6, coal: 2 }, puz: { k: 'saw', d: 2 } });
  item('wooden_bowl', '🥣', 'Wooden Bowl', 'A container for soups and rice. Used up when you cook a meal in it. Ohhh... Dirty?? No worries... You can upgrade your bowl to marble if you rich...'); R.push({ id: 'wooden_bowl', st: 'hand', out: ['wooden_bowl', 2], cost: { wood_plank: 2 } }, { id: 'peel_rice', st: 'tablecraft', out: ['rice_raw', 2], cost: { rice_panicle: 1 }, label: 'Peel Rice Panicle' });
  item('cooked_rice', '🍚', 'Cooked Rice', 'Rice cooked in a Cooking Pot, served in a Wooden Bowl. Warm serve, fills you up fully!', { type: 'food', eat: { t: 5, h: 38, th: -2, energy: 25, comfort: 20 }, note: 'Restores 38 Hunger, 25 Energy.' });
  R.push({ id: 'cook_rice', st: 'cpot', out: ['cooked_rice', 1], cost: { rice_raw: 2, wooden_bowl: 1 }, heat: 45, pot: true, label: 'Cook Rice (Raw) into Cooked Rice' });
  item('pumpkin_soup', '🍲', 'Pumpkin Soup', 'Warm soup, served in a Wooden Bowl.', { type: 'food', eat: { t: 5, h: 30, th: 8, energy: 18, comfort: 25 }, note: 'Restores 30 Hunger, 8 Thirst.' });
  R.push({ id: 'cook_pumpkin_soup', st: 'cpot', out: ['pumpkin_soup', 1], cost: { pumpkin: 2, wooden_bowl: 1 }, heat: 40, pot: true, label: 'Cook Pumpkin Soup' });
  item('wheat_porridge', '🥣', 'Wheat Porridge', 'Boiled wheat, served in a Wooden Bowl.', { type: 'food', eat: { t: 5, h: 28, th: 0, energy: 16, comfort: 15 }, note: 'Restores 28 Hunger.' });
  R.push({ id: 'cook_porridge', st: 'cpot', out: ['wheat_porridge', 1], cost: { wheat: 3, wooden_bowl: 1 }, heat: 35, pot: true, label: 'Cook Wheat Porridge' });
  R.push({ id: 'cook_fish_stew', st: 'cpot', out: ['fish_stew', 1], cost: { fresh_fish: 2, potato: 1, wooden_bowl: 1 }, heat: 40, pot: true, label: 'Cook Fish Stew' });
  item('fish_stew', '🍲', 'Fish Stew', 'Fish and potato stew, served in a Wooden Bowl.', { type: 'food', eat: { t: 5, h: 42, th: 4, energy: 28, comfort: 25 }, note: 'Restores 42 Hunger, 28 Energy.' });
  /* Cooking Pot dishes: ingredients go in the 6 slots, a Wooden Bowl in the container slot; the meal appears in the ready slot. time = seconds. */
  WZ.POT = R.filter(function (r) { return r.pot; }).map(function (r) { var ing = {}; Object.keys(r.cost).forEach(function (k) { if (k !== 'wooden_bowl') ing[k] = r.cost[k]; }); return { id: r.id, ing: ing, cont: 'wooden_bowl', out: r.out, time: Math.round(r.heat / 2), label: r.label }; });
  (function () { var sp = WZ.spr('s3_16'); if (sp && I.revolver) { I.revolver.emoji = I.revolver.ic; I.revolver.ic = sp; } })();
  I.wood_plank_basket.emoji = I.wood_plank_basket.ic; I.wood_plank_basket.ic = '<svg class="ico" viewBox="0 0 32 32" style="width:1em;height:1em;display:inline-block;vertical-align:-.12em"><path d="M5 13h22l-2.6 14.5a2 2 0 0 1-2 1.6H9.6a2 2 0 0 1-2-1.6z" fill="#b57c3c" stroke="#5a3a1a" stroke-width="1.6"/><path d="M6.2 18.5h19.6M7 23.6h18" stroke="#6e4720" stroke-width="1.4"/><path d="M12 13.5l.8 14.4M20 13.5l-.8 14.4" stroke="#8d5c2b" stroke-width="1.2"/><path d="M9 13c0-6 14-6 14 0" fill="none" stroke="#5a3a1a" stroke-width="2.2" stroke-linecap="round"/></svg>';
  /* [SHAPE TAG] Stairs (3/4 HP), Slabs (1/2 HP) and Layer Slabs (1/4 HP) for every building block: vox 87..125. Materials match the volume. */
  WZ.SHAPES = [['stair', 'Stair', 0.75, 4, 3], ['slab', 'Slab', 0.5, 2, 1], ['layer', 'Layer Slab', 0.25, 4, 1]];
  WZ.VARIANT = {}; WZ.SHAPE_BASES = ['wood_block', 'stone_block', 'wood_plank_block', 'smooth_granite_block', 'smooth_andesite_block', 'smooth_diorite_block', 'smooth_calcite_block', 'stone_bricks_block', 'red_bricks_block', 'granite_bricks_block', 'andesite_bricks_block', 'diorite_bricks_block', 'calcite_bricks_block'];
  WZ.SHAPE_BASES.forEach(function (bid, bi) { var b = WZ.ITEMS[bid]; if (!b) return; var nm = b.name.replace(/ Block$/, ''), wood = /^wood/.test(bid);
    WZ.SHAPES.forEach(function (sh, si) { var vid = 87 + bi * 3 + si, id = bid.replace(/_block$/, '') + '_' + sh[0], hp = Math.max(1, Math.round(b.hp * sh[2]));
      WZ.VARIANT[vid] = [b.vox, si, bid, id];
      item(id, b.ic || '⬜', nm + ' ' + sh[1], nm + ' ' + sh[1] + '. ' + Math.round(sh[2] * 100) + '% of a ' + b.name + ': HP ' + hp + '. ' + (si === 0 ? 'Rises toward the direction you face.' : si === 1 ? 'Half-height block you can step onto.' : 'Quarter-height layer.') + ' Right click to place.', { type: 'block', vox: vid, hp: hp, shape: sh[0], baseItem: bid });
      var c = {}; c[bid] = sh[4]; R.push({ id: id, st: wood ? 'sawmill' : 'mason', out: [id, sh[3]], cost: c, puz: wood ? { k: 'saw', d: 1 } : undefined, label: 'Cut ' + sh[4] + ' ' + b.name + (sh[4] > 1 ? 's' : '') + ' into ' + nm + ' ' + sh[1] + 's' });
    }); });
  WZ.RECIPES = R;
  /* Recipe reveal rule: 'all' = shown only when the player has at least 1 of EVERY ingredient (and is at the station). Set to 'any' to show it when at least one ingredient is owned. */
  WZ.REVEAL = 'all';
  /* Fuel: t = burn seconds per item, p = heat power per item */
  WZ.FUEL = { coal: { t: 15, p: 10 }, wood: { t: 5, p: 4 }, charcoal: { t: 10, p: 10 } };
  /* Bag rules: 24 slots; stacks of 50; tools, armor and accessories do not stack. */
  WZ.BAG_SLOTS = 36;
  WZ.maxStack = function (id) { var it = I[id]; if (!it) return 50; if (id === 'band_aid_box') return 20; if (id.indexOf('ib_') === 0) return 5; if (id === 'life_fruit' || id === 'aegis_fruit' || id === 'magic_purify_water') return 10; if (it.type === 'tool' || it.type === 'armor' || it.type === 'acc' || it.pack || it.type === 'block' && it.turret) return 1; return 50; };
  /* Turret blocks: a destroyed turret (by zombies) drops 20% of its crafting materials */
  WZ.TURRET_VOX = { 13: 'handmade_cannon', 14: 'cannon_turret', 15: 'manual_cannon' };
  WZ.LOOT = LOOT;
  /* [WIKI TAG] Per-mob wiki facts: where it spawns, special skills, rewards. 'No special skills' when none. */

  /* ---------- [VEHICLE TAG 2] benches, fluid tanks, whole vehicles, fuel ---------- */
  item('plastic_plate', '▭', 'Plastic Plate', 'Coming soon.', { soon: true }); item('plastic_bar', '▬', 'Plastic Bar', 'Coming soon.', { soon: true });
  item('iron_piston', '🔩', 'Iron Piston', 'A heavy piston for car engines. Slow to make by hand at a Manual Iron Shaper Table (360 s, -50% if you solve the puzzle).');
  R.push({ id: 'manual_iron_shaper', st: 'sawmill', out: ['manual_iron_shaper', 1], cost: { wood_plank: 24, copper_plate: 6, iron_ingot: 8, iron_stick: 6 }, puz: { k: 'saw', d: 2 } },
    { id: 'tanker_workbench', st: 'sawmill', out: ['tanker_workbench', 1], cost: { wood_plank: 24, plastic_sheet: 12, plastic_plate: 6, plastic_bar: 2, iron_ingot: 4 }, puz: { k: 'saw', d: 2 } },
    { id: 'iron_piston', st: 'shaper', out: ['iron_piston', 1], cost: { iron_ingot: 2, iron_stick: 2 }, dur: 360, puz: { k: 'img', n: 3 }, tier: 1, label: 'Shape an Iron Piston by hand' });
  /* Fluid tanks: [vox id, item id, name, capacity L, allowed liquids, material, size, (cost multiplier)] */
  WZ.TANK = {
    128: { id: 'wood_fluid_tank', name: 'Wood Fluid Tank', cap: 5, allow: ['dirty', 'slightly', 'acceptable'], mat: 'wood', size: [2, 2, 2], hp: 70 },
    129: { id: 'coated_iron_tank', name: 'Coated-Iron Tank', cap: 10, allow: ['dirty', 'slightly', 'acceptable', 'purify', 'honey'], mat: 'iron', size: [2, 2, 2], hp: 120 },
    130: { id: 'wood_fluid_tank_l', name: 'Wood Fluid Tank (Large)', cap: 15, allow: ['dirty', 'slightly', 'acceptable'], mat: 'wood', size: [4, 4, 2], hp: 160 },
    131: { id: 'coated_iron_tank_l', name: 'Coated-Iron Tank (Large)', cap: 30, allow: ['dirty', 'slightly', 'acceptable', 'purify', 'honey'], mat: 'iron', size: [4, 4, 2], hp: 260 }
  };
  Object.keys(WZ.TANK).forEach(function (t) {
    var k = WZ.TANK[t], big = k.size[0] > 2, m = big ? 4 : 1, cost = k.mat === 'wood' ? { wood_plank: 30 * m, wood: 8 * m } : { coated_iron_plate: 30 * m, iron_ingot: 8 * m };
    item(k.id, k.mat === 'wood' ? '🪣' : '🛢️', k.name, 'Stores up to ' + k.cap + ' L of liquid (one kind at a time): ' + k.allow.map(function (a) { return WZ.LIQ[a][0]; }).join(', ') + '. Size ' + k.size.join('x') + '. Pour a filled bucket into it with [E]; use an empty bucket with [E] to take 1 L back out.', { type: 'block', vox: +t, hp: k.hp, size: k.size, note: 'Capacity ' + k.cap + ' L' });
    R.push({ id: k.id, st: 'tanker', out: [k.id, 1], cost: cost, puz: k.mat === 'wood' ? { k: 'saw', d: 1 } : { k: 'crank', n: 8 } });
  });
  /* Whole, drivable vehicle (not an abandoned wreck): place it on flat ground with right click */
  item('scout_ii_suv', '🚙', 'Scout II SUV', 'A complete, drivable Scout II. Place it on flat ground with Right Click. Open the door, sit down, close the door, press [U] and start the engine. Needs Gasoline (15 L tank).', { type: 'vehicle', veh: 'suv', note: 'Vehicle | HP 150, DEF 2 | Gasoline 15 L | AMC i4 Engine | AMC 3-Speed Gearbox (R/N/1/2/3)' });
  R.push({ id: 'scout_ii_suv', st: 'vbench', out: ['scout_ii_suv', 1], cost: { scout_ii_car_casing: 1, amc_i4_engine: 1, amc_3sp_gearbox: 1, amc_i4_gauge: 1, stock_water_coolant: 1, stock_car_battery: 1, leather_seat: 1, rwd_car_drivetrain: 1, stock_car_suspension: 2, drum_brake: 4, stock_wheel: 4, stock_i4_fuel_tank: 1, stock_oil_tank: 1 } });

  /* ---- more whole vehicles ---- */
  [['gmc_brigadier', 'truck', '🚚', 'GMC Brigadier', 'A heavy diesel truck. HP 350, DEF 7.', 'Detroit Diesel V6 Truck Engine', 'Detroit 5-Speed Diesel', 'detroit_v6_truck_engine', 'detroit_5sp_diesel_gearbox', 'Diesel 60 L | 5-speed manual (R/N/1-5)', 0x8a7a4a],
   ['mercedes_230ce', 'sedan', '🚗', 'Mercedes 230CE', 'A comfortable coupe with an automatic gearbox (R / N / D). HP 175, DEF 2.', 'M102 i4 Mercedes Engine', 'Mercedes 4-Speed Matic Gasoline', 'm102_i4_mercedes_engine', 'mercedes_4sp_matic_gearbox', 'Gasoline 20 L | 4-speed automatic (R/N/D)', 0xb9bcc2],
   ['ford_mustang_gt', 'mustang', '🏎️', 'Ford Mustang GT', 'A fast muscle car. HP 225, DEF 3. Careful: the roaring V8 attracts every zombie nearby!', 'Ford FE 428 V8', 'Ford FE 4-Speed Turbo Gas', 'ford_fe_428_v8', 'ford_fe_4sp_turbo_gearbox', 'Gasoline 18 L | 4-speed manual (R/N/1-4)', 0x2f5fa8]].forEach(function (a) {
    var casing = a[0] + '_casing';
    item(casing, a[2], a[3] + ' Car Casing', 'The body shell of the ' + a[3] + '.', { tag: 'vehicle', soon: false });
    item(a[7], '⚙️', a[5], 'The engine of the ' + a[3] + '.', { tag: 'vehicle' }); item(a[8], '⚙️', a[6], 'The gearbox of the ' + a[3] + '.', { tag: 'vehicle' });
    item(a[0], a[2], a[3], a[4] + ' Place it on flat ground with Right Click. Open the door, sit down, close the door, press [U] and start the engine.', { type: 'vehicle', veh: a[1], vcol: a[10], note: 'Vehicle | ' + a[9] + ' | Engine ' + a[5] + ' | Gearbox ' + a[6] });
    R.push({ id: a[0], st: 'vbench', out: [a[0], 1], cost: (function () { var o = {}; o[casing] = 1; o[a[7]] = 1; o[a[8]] = 1; o.amc_i4_gauge = 1; o.stock_water_coolant = 1; o.stock_car_battery = 1; o.leather_seat = 1; o.rwd_car_drivetrain = 1; o.stock_car_suspension = 2; o.drum_brake = 4; o.stock_wheel = 4; o.stock_i4_fuel_tank = 1; o.stock_oil_tank = 1; return o; })() });
  });
  item('fuel_pump_station', '⛽', 'Fuel Pump Station', 'Found at Gas Stations in the city (size 1x1x2). Holds 1-10 L of Gasoline or Diesel. Park next to it with the engine OFF, press [E], choose the litres and press Fill.', { note: 'World structure | Stock 1-10 L | Fill speed 0.5 L/s' });
  item('smasher_machine', '🔨', 'Smasher Machine', 'Coming soon. Drop burnt vehicle wrecks into it to clear them away.', { soon: true });
  WZ.GUIDES = [{ slug: 'scout-ii-assembly', title: 'Assembling the Scout II', md: '1. Place the **Scout II Car Casing** on a large, flat area.\n2. Attach the **gauge** to the dashboard.\n3. Attach the **AMC i4 Car Engine**.\n4. Attach the **gearbox** under the engine.\n5. Install the **coolant**.\n6. Install the **battery**.\n7. Install the **seat** inside the cabin.\n8. Install the **drivetrain** under the vehicle.\n9. Install a **suspension** on each driven wheel.\n10. Install the **brakes** on each wheel.\n11. Install the **wheels and tires**.\n12. Close all doors, the hood and the trunk.\n13. The car is ready to drive!\n\nNote: all cars (Scout II SUV, sedans, trucks) can already be driven: look at one and press [E]. Full part assembly is still coming.' }, { slug: 'liquids-and-water', title: 'Liquids and water quality', md: 'Scoop liquids with an **Iron Bucket** (hold it and press [E] while looking at the liquid).\n\n- **Contaminated Water** (sea): high Water Poison chance.\n- **Dirty Water** (lakes): 50%.\n- **Slightly Dirty Water** (rivers, or filtered): 20%.\n- **Acceptable Water**: almost safe. Made by the Distillation Machine.\n- **Purify Water**: safe and heals.\n- **Lava** (Undershaft): burns badly.\n- **Acid** (Deeper Underground): Corrosive, 1 HP every 0.2 s for 20 s.\n- **Crude Oil** (Deeper Underground and desert), **Honey** (jungle).\n\nThe Water Filtering Machine turns Contaminated into Dirty and Dirty into Slightly Dirty. The Distillation Machine turns Slightly Dirty into Acceptable and Acceptable into Purify.' },
    { slug: 'vehicle-stats', title: 'Vehicle stats & part condition', md: '| Vehicle | HP | DEF | Engine | Gearbox |\n|---|---|---|---|---|\n| Scout II | 150 | 2 | (see Vehicle Parts) | (see Vehicle Parts) |\n| GMC Brigadier | 350 | 7 | Detroit Diesel V6 Truck Engine | Detroit 5-Speed Diesel |\n| Mercedes 230CE | 175 | 2 | M102 i4 Mercedes Engine | Mercedes 4-Speed Matic Gasoline |\n| Ford Mustang GT | 225 | 3 | Ford FE 428 V8 | Ford FE 4-Speed Turbo Gas |\n\n**Universal part-age rule:** parts at 90-100% condition give 100% of their stats. Every further 10% of wear lowers the stats by 10% (80-90% -> 90%, 70-80% -> 80% ...). This applies to every vehicle.\n\n**Gears:** W accelerates, S brakes, Space is a total handbrake. A higher gear ratio means stronger pull but lower speed; ratio 0 (neutral) means no movement. There is no automatic shifting on manual gearboxes: shift with R / F. A wrong shift (for example 3rd to 1st at high speed) destroys the engine. The Ford Mustang GT engine is loud and attracts every zombie nearby.' },
    { slug: 'driving-a-vehicle', title: 'Driving a complete vehicle', md: 'Only **complete vehicles** can be driven (for example the **Scout II SUV**, built at a Vehicle Bench from all its parts). Abandoned cars in the city are wrecks: they cannot be driven.\n\n1. **Place** the vehicle item on flat ground with Right Click.\n2. **Click the door** ([E]) to open it.\n3. **Click the seat** ([E] again) to sit in the driver seat.\n4. **Click the door** ([E]) to close it again.\n5. Open the dashboard with **[U]**. Click the round key slot **once** to insert the key.\n6. **Click and HOLD** the key to crank the starter until the RPM reaches idle (about 850 RPM). The engine starts.\n7. The vehicle is ready: shift with **[R]** (gear up) and **[F]** (gear down) through **R - N - 1 - 2 - 3**, then hold **[W]**. In gear **R**, [W] drives backwards. In **N** the car does not move.\n\nOther keys: [S] brake, [A]/[D] steer, [Space] handbrake, [E] open/close door, [X] leave the seat (the door must be open).\n\nThe engine never starts by itself. Start in 1st gear: starting off in 2nd or 3rd stalls the engine. Over 4750 RPM the engine heats up and eventually shuts down. When Break Points reach 0 the vehicle becomes a rusty, smoking burnt wreck (a future Smasher Machine will clear wrecks away).' },
    { slug: 'refuelling', title: 'Gas Stations and refuelling', md: 'Gas Stations appear in the city. Each has four **Fuel Pump Stations** (1x1x2) holding **1-10 L** of **Gasoline** or **Diesel**.\n\n1. Park your vehicle next to the pump and switch the **engine off**.\n2. Press **[E]** on the pump.\n3. Choose the amount of litres with the +/- buttons.\n4. Press **Fill**. The tank fills automatically (0.5 L/s) and stops when the chosen amount is reached.\n\nThe Scout II uses **Gasoline** (tank 15 L). A pump never gives more than it has left, and a vehicle only accepts its own fuel type.' }];
  WZ.MOBINFO = {
    walker: { spawn: 'Any biome', skills: 'No special skills', reward: '3 kills = 1 coin' },
    runner: { spawn: 'Any biome', skills: 'No special skills', reward: '2 kills = 1 coin' },
    big: { spawn: 'Any biome', skills: 'No special skills', reward: '1 kill = 1 coin' },
    bomber: { spawn: 'Any biome', skills: 'Explodes next to the player (60 damage, area).', reward: '1 kill = 2 coins; 5% Gunpowder' },
    brute: { spawn: 'Any biome', skills: 'No special skills', reward: '1 kill = 2 coins' },
    soldier: { spawn: 'Any biome', skills: 'No special skills', reward: '1 kill = 3 coins' },
    spider: { spawn: 'Any biome', skills: 'No special skills', reward: 'No coins; 33.33% String / 60% Cobweb' },
    jacket: { spawn: 'Mountain', skills: 'No special skills (a Walker with +1 DEF)', reward: 'Coins like a Walker' },
    pfwalker: { spawn: 'Mountain', skills: 'Frost attack: ignores armor DEF.', reward: '1 kill = 5 coins; 10% Permafrost Ore' },
    berserk: { spawn: 'Desert', skills: 'Rush Hour: SPD 3 until its first successful hit, then SPD 1.5. Attack delay 3 s.', reward: '3 coins; 5% Berserker\'s Boots' },
    mutanoider: { spawn: 'Boss: appears once the world reaches Tier 4', skills: 'Guard mode: tentacles and wings give DEF 10 and it cannot attack while guarding (SPD 0.1). Attack delay 0.4 s.', reward: '60 coins' },
    hardzombie: { spawn: 'Summoned at the Statue next to the surface Mineshaft (100 coins, 2 h real-time cooldown)', skills: 'Splash attack (8 diameter), attack delay 4 s.', reward: '120 coins' },
    mutant: { spawn: 'Any biome', skills: 'Tentacle guard: DEF 4 and SPD 0.8 while guarding. Attacks 4 blocks at once (range 2x), attack delay 2x slower.', reward: 'Coins like an uncommon zombie' },
    tough: { spawn: 'Any biome', skills: 'Growl: radius 10, gives zombies +10% damage for 5 s (cooldown 10 s, a new growl replaces the running buff).', reward: 'Coins like an uncommon zombie' },
    antlion: { spawn: 'Desert', skills: 'Moves 2x faster when HP is below 20%.', reward: '1 kill = 4 coins' },
    zcorpion: { spawn: 'Desert', skills: 'Acidic Poison: each hit makes the poison 3x deadlier (stacks up to 3). Reach x1.2.', reward: '1 kill = 6 coins' },
    programmer: { spawn: 'Any biome', skills: 'Shoots the Keybind Error Virus.', reward: '1 kill = 7 coins; 10% Signal Finder Chip' },
    miner: { spawn: 'Only inside the Mineshaft / Underground', skills: 'No special skills', reward: 'No coins' },
    drowned: { spawn: 'Sea (underwater)', skills: 'No special skills', reward: 'No drops' },
    zfish: { spawn: 'Fishing only (pulled out of the water)', skills: 'Its attack gives Water Poison.', reward: '1 kill = 1 coin' },
    gigantus: { spawn: 'Boss: spawns once at day 10 (Tier 2 boss)', skills: 'Splash attack. Weakness: attacks 3x slower than normal zombies.', reward: '25 coins' },
    armored: { spawn: 'Boss: spawns once at day 30 (Tier 3 boss)', skills: 'Heavy armor (DEF 7). Weakness: attacks 4x slower than normal zombies.', reward: '100 coins' },
    floater: { spawn: 'Sea (surface only)', skills: 'Attacks only on the sea surface (swims with a ring float). Counts as a Walker kill.', reward: 'Counts as Walker kills' }
  };
  WZ.ZOMBIES = Z;
  WZ.ZTYPE_LIST = ['walker', 'runner', 'big', 'bomber', 'brute', 'soldier', 'spider', 'programmer', 'miner', 'zfish', 'antlion', 'zcorpion', 'gigantus', 'armored', 'mutant', 'tough', 'jacket', 'pfwalker', 'berserk', 'mutanoider', 'hardzombie', 'drowned', 'floater'];
  /* Loot entries may carry a minimum world tier as the 3rd value. Group tokens ('@dirty_fruit', ...) pick a random member; ctx.village=false hides watermelon/pumpkin. Luck (0..1) rerolls toward rarer items. */
  WZ.getTier = function () { return 5; };
  WZ.luck = function () { return 0; };
  function pickGroup(tok, rnd, ctx) {
    var g = WZ.GROUPS[tok.slice(1)] || [], ok = g.filter(function (id) { return !(WZ.VILLAGE_ONLY[id] && ctx && ctx.village === false); });
    return ok[Math.floor(rnd() * ok.length)] || g[0];
  }
  WZ.rollLoot = function (key, rnd, ctx) {
    var wt = WZ.getTier(), t = LOOT[key].t.filter(function (e) { return e[1] != null && (!e[2] || e[2] <= wt); }), tot = 0, i, pickEntry;
    t.forEach(function (e) { tot += e[1]; });
    function once() { var r = rnd() * tot, acc = 0; for (var k = 0; k < t.length; k++) { acc += t[k][1]; if (r < acc) return t[k]; } return t[t.length - 1]; }
    pickEntry = once();
    if (WZ.luck() > 0 && rnd() < WZ.luck()) { var e2 = once(); if (e2[1] < pickEntry[1]) pickEntry = e2; }
    var id = pickEntry[0]; return id.charAt(0) === '@' ? pickGroup(id, rnd, ctx) : id;
  };
  /* Bush loot (percent). plain: luck-free defaults. */
  LOOT.bush_plain = { name: 'Bush', rolls: 1, enabled: true, t: [['cotton', 8], ['wood_sticks', 38], ['leaf', 10], ['#contaminated_berry', 21], ['#clean_berry', 17], ['mysterious_box', 3], ['golden_berry', 1], ['clover_leaf', 1], ['wheat_seeds', 3], ['pumpkin_seeds', 2], ['watermelon_seeds', 2], ['rice_seeds', 2]] };
  LOOT.bush_jungle = { name: 'Jungle Bush', rolls: 1, enabled: true, t: [['cotton', 12], ['wood_sticks', 28], ['leaf', 15], ['#contaminated_berry', 21], ['#clean_berry', 17], ['mysterious_box', 3], ['golden_berry', 2], ['clover_leaf', 1], ['wheat_seeds', 3], ['pumpkin_seeds', 2], ['watermelon_seeds', 2], ['rice_seeds', 3]] };
  WZ.rollBush = function (key, rnd) {
    var r = WZ.rollLoot(key, rnd); if (r === '#contaminated_berry') return ['contaminated_blueberry', 'contaminated_redberry', 'contaminated_sweetberry'][Math.floor(rnd() * 3)];
    if (r === '#clean_berry') return ['blueberry', 'redberry', 'sweetberry'][Math.floor(rnd() * 3)]; return r;
  };
})(window.WZ);
/* ---------- VEHICLE SCHEMAS (specs & recipes only: driving system + benches are NOT built yet, items are not craftable) ---------- */
WZ.VEHICLE = {
  note: 'Schemas for the future vehicle update. Recipes live here (not in WZ.RECIPES) until the benches exist.',
  engineAge: function (hours) { return hours < 500 ? { start: 'safe', power: 1, speed: 1, fail: 0 } : hours < 1250 ? { start: 'slow', power: 1, speed: 1, fail: 0 } : hours < 3000 ? { start: 'slow', power: 0.85, speed: 1, fail: 0 } : hours < 5000 ? { start: 'sometimes_fails', power: 0.7, speed: 0.625, fail: 0.25 } : { start: 'almost_never', power: 0.5, speed: 0.2, fail: 0.8 }; },
  ageRate: function (o) { return 1 + (o.overheat ? 1.5 : 0) + (o.overRpm ? 1 : 0) + (o.lowOil ? 2 : 0); },
  hourPerRealMinute: 1,
  parts: {
    amc_i4_engine: { name: 'AMC i4 Car Engine', bench: 'Engine Bench', pistons: 4, maxRpm: 7100, safeRpm: 3800, overheat: 4750, topSpeed: 25, wheel: 1, fuelPer02s: [0.1, 0.25, 0.5], cost: { iron_piston: 4, iron_casing: 40, red_dye: 8, iron_chain: 8, small_iron_cogwheel: 1, large_iron_cogwheel: 1, copper_wire: 20, amc_spark_plug: 4, iron_metal_piston_tube: 4, iron_plate: 18 } },
    amc_3sp_gearbox: { name: 'AMC 3-Speed Manual Gearbox', bench: 'Gearbox Bench', ratios: { R: -2.2, N: 0, 1: 2.5, 2: 1.3, 3: 0.7 }, cost: { iron_chain: 18, small_iron_cogwheel: 4, large_iron_cogwheel: 5, iron_metal_tube: 16, iron_bar: 8, screws: 12 } },
    stock_oil_tank: { name: 'Stock Lubrication-Oil Tank', bench: 'Seat & Cargo Bench', liters: 4, i4Use: '1 L per 5000 game hours', cost: { anti_corrosive_plastic_sheet: 12, cap: 1, rope: 4 } },
    stock_i4_fuel_tank: { name: 'Stock i4 Fuel Tank', bench: 'Seat & Cargo Bench', liters: 15, cost: { plastic_sheet: 30, rope: 12, iron_plate: 6 } },
    leather_seat: { name: 'Leather Seat', bench: 'Seat & Cargo Bench', note: 'keeps comfort stable', cost: { leather: 8, string: 12, cotton_sponge: 20, iron_plate: 2 } },
    stock_wheel: { name: 'Stock Wheel', bench: 'Wheel Workbench', diameter: 0.9, customRims: 'Custom Bench', cost: { iron_plate: 2, iron_stick: 8, iron_tube: 1, rubber: 18 } },
    stock_water_coolant: { name: 'Stock Water Coolant', bench: 'Engine Bench', cost: { iron_tube: 24, pump_machine: 1, fan_motor: 1, fan_blade: 4, screws: 8 } },
    amc_i4_gauge: { name: 'AMC i4-Car Gauge', gauges: ['Tachometer', 'Speedometer (KM/H <-> MPH in Settings)', 'ODO', 'Fuel gauge', 'Heat gauge', 'Analog clock (Gold Watch)'] }
  },
  vehicles: { scout_ii: { name: 'Scout II', type: 'SUV' } },
  keybinds: 'A/D gradual steering | S foot brake only | W accelerator only | U dashboard panel (Starter Engine: press = insert key, hold = crank, release when running, click = off; Car Lights: 2x flashlight brightness, zombies +5% faster while on)'
};

/* ---------- VEHICLE PARTS wiki completion: every part gets a Vehicle tag, bench, specs and material list; missing materials become real items ---------- */
(function (WZ) {
  var I = WZ.ITEMS, V = WZ.VEHICLE; if (!I || !V) return;
  function nice(k) { return k.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function mk(id, ic, name, desc, extra) { if (!I[id]) { I[id] = { id: id, ic: ic, name: name, desc: desc, type: 'material' }; } for (var k in (extra || {})) I[id][k] = extra[k]; }
  mk('stock_oil_tank', '🛢️', 'Stock Lubrication-Oil Tank', 'Holds the oil that keeps the engine from wearing out.');
  mk('stock_i4_fuel_tank', '⛽', 'Stock i4 Fuel Tank', 'Holds fuel for the AMC i4 engine.');
  mk('car_battery', '🔋', 'Car Battery', 'Starts the engine and powers the lights.');
  V.parts.stock_oil_tank = V.parts.stock_oil_tank || {}; V.parts.car_battery = { name: 'Car Battery', bench: 'Engine Bench', note: 'Powers the starter and the car lights.', cost: { iron_plate: 6, copper_wire: 12, acid_cell: 4 } };
  [['pump_machine', '⛲', 'Pump Machine'], ['fan_motor', '🌀', 'Fan Motor'], ['fan_blade', '🪭', 'Fan Blade'], ['iron_tube', '🧪', 'Iron Tube'], ['iron_metal_tube', '🧪', 'Iron Metal Tube'], ['iron_metal_piston_tube', '🧪', 'Iron Metal Piston Tube'], ['iron_piston', '🔩', 'Iron Piston'], ['amc_spark_plug', '⚡', 'AMC Spark Plug'], ['screws', '🔩', 'Screws'], ['rubber', '⚫', 'Rubber'], ['red_dye', '🟥', 'Red Dye'], ['copper_wire', '➰', 'Copper Wire'], ['iron_chain', '⛓️', 'Iron Chain'], ['iron_stick', '📏', 'Iron Stick'], ['leather', '🟫', 'Leather'], ['string', '🧵', 'String'], ['cotton_sponge', '🧽', 'Cotton Sponge'], ['plastic_sheet', '▭', 'Plastic Sheet'], ['anti_corrosive_plastic_sheet', '▭', 'Anti-Corrosive Plastic Sheet'], ['cap', '🧢', 'Cap'], ['rope', '🪢', 'Rope'], ['acid_cell', '🧫', 'Acid Cell']].forEach(function (a) { mk(a[0], a[1], a[2], 'A crafting component used for vehicle parts.'); });
  var STATS = { amc_i4_engine: 'Pistons 4 | Max RPM 7100 | Safe RPM 3800 | Overheat at 4750 RPM | Top speed 25 | Fuel use per 0.2 s: 0.1 / 0.25 / 0.5 (by gear range)', amc_3sp_gearbox: 'Ratios: R -2.2, N 0, 1st 2.5, 2nd 1.3, 3rd 0.7', stock_oil_tank: 'Capacity 4 L (the i4 uses 1 L per 5000 game hours)', stock_i4_fuel_tank: 'Capacity 15 L', leather_seat: 'Keeps the driver comfort stable', stock_wheel: 'Diameter 0.9 (custom rims: Custom Bench)', stock_water_coolant: 'Cools the engine so it does not overheat', amc_i4_gauge: 'Gauges: Tachometer, Speedometer (KM/H <-> MPH in Settings), ODO, Fuel gauge, Heat gauge, Analog clock (Gold Watch)', car_battery: 'Powers the starter and the lights' };
  Object.keys(V.parts).forEach(function (id) {
    var p = V.parts[id]; if (!I[id]) mk(id, '🔧', p.name, p.note || 'A vehicle part.');
    var it = I[id], cost = p.cost ? Object.keys(p.cost).map(function (k) { if (!I[k]) mk(k, '🔩', nice(k), 'A crafting component used for vehicle parts.'); return p.cost[k] + ' x ' + I[k].name; }).join(', ') : '';
    it.tag = 'vehicle'; it.note = 'Vehicle part. ' + (p.bench ? 'Built at: ' + p.bench + '. ' : '') + (STATS[id] ? STATS[id] + '. ' : '') + (cost ? 'Materials: ' + cost + '.' : '');
  });
  ['stock_car_suspension', 'rwd_car_drivetrain', 'drum_brake', 'drum_brake_casing', 'scout_ii_car_casing'].forEach(function (id) {
    var it = I[id]; if (!it) return; it.tag = 'vehicle'; var r = (WZ.RECIPES || []).filter(function (x) { return x.out && x.out[0] === id; })[0];
    it.note = (it.note || 'Vehicle part.').replace(/\s*\(cannot be installed yet\)/, '') + (r ? ' Built at: ' + (WZ.STN_NAMES && WZ.STN_NAMES[r.st] || (r.st === 'drive' ? 'Drivetrain Workbench' : r.st === 'vbench' ? 'Vehicle Workbench' : r.st)) + '.' : '');
  });
  I.scout_ii_car_casing.desc = 'The body of the Scout II SUV. A right-trapezoid cabin: the rear is vertical and the windshield slopes down to the hood. Cars like this are found parked around the cities.';
})(window.WZ);

/* ---------- where each material comes from (wiki "Obtain through" + creative list), derived from the game rules above ---------- */
(function (WZ) {
  var I = WZ.ITEMS, L = WZ.LOOT || {}, G = WZ.GROUPS || {}, Z = WZ.ZOMBIES || {};
  var MOB = { spider: [['string', '33%'], ['cobweb', '60%']], programmer: [['signal_chip', '10%']], pfwalker: [['permafrost_ore', '10%']], berserk: [['berserkers_boots', '5%']], bomber: [['gunpowder', '5%']], miner: [['dynamite', '15%']] };
  var MINE = { granite_ore: 'Granite', andesite_ore: 'Andesite', diorite_ore: 'Diorite', calcite_ore: 'Calcite', clay_ore: 'Clay', zinc_ore: 'Zinc Ore', titanium_ore: 'Titanium Ore', permafrost_ore: 'Permafrost Ore', diamond: 'Diamond ore', ruby: 'Ruby ore', emerald: 'Emerald ore', amethyst: 'Amethyst ore', sapphire: 'Sapphire ore', stone: 'Rocks / stone', copper_ore: 'Copper ore', coal: 'Coal ore', iron_ore: 'Iron ore', sand: 'Sand' };
  var TXT = { wood: 'Chopping any tree with an axe.', pine_log: 'Chopping Pine trees.', palm_log: 'Chopping Palm trees.', cactus: 'Cutting a Cactus in the desert.', cotton: 'Picking Cotton from bushes.', rice_raw: 'Peeling Rice Panicle on a Furniture Table.', soil: 'Digging dirt with a shovel.' };
  WZ.sourcesOf = function (id) {
    var o = [], k, t = I[id]; if (!t) return o;
    for (k in L) { var has = (L[k].t || []).some(function (e) { var x = e[0]; if (x === id) return true; if (x === '#contaminated_berry') return /^contaminated_(blue|red|sweet)berry$/.test(id); if (x === '#clean_berry') return /^(blue|red|sweet)berry$/.test(id); return x.charAt(0) === '@' && (G[x.slice(1)] || []).indexOf(id) >= 0; }); if (has && L[k].name) o.push('Looting: ' + L[k].name); }
    var F = WZ.FISH || {}; for (k in F) F[k].forEach(function (f) { if (f.id === id) o.push('Fishing in a ' + k + ' (' + f.pct + '% per catch)'); });
    for (k in MOB) MOB[k].forEach(function (d) { if (d[0] === id && Z[k]) o.push('Dropped by ' + Z[k].name + ' (' + d[1] + ')'); });
    if (MINE[id]) o.push('Mining ' + MINE[id] + ' in the world / underground.'); if (TXT[id]) o.push(TXT[id]);
    var C = WZ.CROPS || {}; for (k in C) if (C[k].crop === id) o.push('Harvesting ' + (I[k] ? I[k].name : k) + ' grown on tilled farmland.');
    if (/^ib_/.test(id) || /^wb_/.test(id)) o.push('Filling a bucket from water / a liquid pool, or from a fluid tank.');
    return o.filter(function (v, i, a) { return a.indexOf(v) === i; });
  };
})(window.WZ);
/* end data.js */
