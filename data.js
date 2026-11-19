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
  item('wood', '🪵', 'Wood', 'Raw wood from chopped trees. Used for wood blocks, sticks, furniture and furnaces.');
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
  item('iron_nugget', '🔩', 'Iron Nugget', 'Hmm, maybe it can be smelted to be more useful even though it is tiny?', { note: '8 nuggets smelt into 1 Iron Bar in the Smelting Furnace.' });
  item('broken_copper_wire', '🪢', 'Copper Nugget (Copper Wire)', 'Does this wire still carry current? Oh no, it is broken...', { note: 'Cannot be repaired. 25 pieces smelt into 1 Copper Bar in the Smelting Furnace.' });
  item('broken_cardboards', '📦', 'Broken Cardboards', 'Flat, damp cardboard.');
  item('broken_wood_planks', '🪵', 'Broken Wood Planks', 'A split wooden plank. Still sturdy enough to hit things with.');
  item('iron_ingot', '🧱', 'Iron Bar', 'A bar of pure iron. Used for iron tools, sinks, anvils and iron armor.');
  item('copper_ingot', '🟧', 'Copper Bar', 'A bar of pure copper. No recipe uses it yet.');
  item('feather', '🪶', 'Feather', 'Light and soft. Perfect for the tail of an arrow.');
  item('string', '🧶', 'String', 'A tough thin string. Used for bows and fishing rods.');
  item('iron_chain', '⛓️', 'Iron Chain', 'A short chain of iron links. Made at an Iron Anvil.');
  item('iron_stick', '📏', 'Iron Stick', 'A straight iron rod. Made at an Iron Anvil.');
  item('rope', '🪢', 'Rope', 'A thick rope twisted from strings. Used for the Stone Sword.');
  item('coal', '⚫', 'Coal', 'A black lump of coal. Mined from dark rocks. Used for campfires.');
  item('golden_nugget', '🟡', 'Golden Nugget', 'A shiny golden nugget mined deep in the mineshaft.', { note: '12 nuggets smelt into 1 Golden Bar in the Smelting Furnace.' });
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
  item('iron_bucket', '🪣', 'Iron Bucket', 'ey! super multifunction bucket allow you to carry liquid or if you need more armor just equip it on your head!', { type: 'armor', slot: 'head', tier: 'bucket', def: 3, note: 'Head slot. Halves the chance of getting Water Poison.' });

  /* ---------- Accessories ---------- */
  item('iron_watch', '⌚', 'Iron Watch', 'Watch your time before get back to the home', { type: 'acc', note: 'Accessory. Shows the hour only (minutes are shown as 0).' });
  item('golden_watch', '⌚', 'Golden Watch', 'Show off your time to zombie, and prove they\'re wrong time to come to you!', { type: 'acc', note: 'Accessory. Shows hours and minutes.' });
  item('radar', '📡', 'Radar', 'Detect zombies around you, and if you have GPS It will show they location!!!', { type: 'acc', note: 'Accessory. Shows the zombie count around you. With a GPS, zombies appear on the map.' });
  item('gps', '🗺️', 'GPS', 'I know where I am!', { type: 'acc', note: 'Accessory. Shows the map with your location.' });

  /* ---------- Placeable blocks & furniture ---------- */
  item('wood_block', '🟫', 'Wood Block', '1 m building block. A bit fragile, but cheap. Right click to place.', { type: 'block', vox: 1, hp: 30 });
  item('stone_block', '⬜', 'Stone Block', '1 m building block. Much stronger than a wood block.', { type: 'block', vox: 2, hp: 90 });
  item('furnace', '🔥', 'Smelting Furnace', 'Smelts nuggets and wires into metal bars. Place it, then press E near it.', { type: 'block', vox: 3, hp: 80 });
  item('bed_block', '🛏️', 'Cozy Bed', 'A clean homemade bed. Sleep with [E] and dismantle it again anytime.', { type: 'block', vox: 4, hp: 50 });
  item('couch_block', '🛋️', 'Cozy Couch', 'A clean homemade couch to restore Comfort with [E]. Can be dismantled.', { type: 'block', vox: 5, hp: 45 });
  item('sink_block', '🚰', 'Sink', 'Washes Dirty Vegetables/Fruits into Fresh ones for free! Place it, then press [E].', { type: 'block', vox: 6, hp: 60 });
  item('campfire', '🏕️', 'Campfire', 'Let\'s camping during this apocalypse!', { type: 'block', vox: 7, hp: 40, note: 'Cooks Fresh Fish into Cooked Fish (25 s each). Stay near it while cooking.' });
  item('anvil_block', '⚒️', 'Iron Anvil', 'A heavy iron anvil for forging swords, chains, sticks, buckets and watches.', { type: 'block', vox: 8, hp: 120 });
  item('computer_bench', '🖥️', 'Computer Bench', 'A workbench for assembling electronics: batteries, LEDs, radars and GPS.', { type: 'block', vox: 9, hp: 70 });

  /* ---------- Crafting recipes ---------- */
  var R = [
    { id: 'sticks', out: ['wood_sticks', 2], cost: { wood: 1 } },
    { id: 'gravel', out: ['gravel', 2], cost: { stone: 1 } },
    { id: 'wood_block', out: ['wood_block', 2], cost: { wood: 1 } },
    { id: 'stone_block', out: ['stone_block', 2], cost: { stone: 1 } },
    { id: 'crude_axe', out: ['crude_axe', 1], cost: { wood_sticks: 4, gravel: 2 } },
    { id: 'crude_pickaxe', out: ['crude_pickaxe', 1], cost: { wood_sticks: 4, gravel: 3 } },
    { id: 'wood_club', out: ['wood_club', 1], cost: { broken_wood_planks: 3, broken_cardboards: 2 } },
    { id: 'wood_sword', out: ['wood_sword', 1], cost: { wood_sticks: 2, wood: 6 } },
    { id: 'stone_sword', out: ['stone_sword', 1], cost: { stone: 6, gravel: 2, rope: 1, wood_sticks: 4 } },
    { id: 'iron_sword', out: ['iron_sword', 1], cost: { iron_ingot: 6, broken_copper_wire: 2, iron_nugget: 4, wood_sticks: 8 }, anvil: true },
    { id: 'rope', out: ['rope', 1], cost: { string: 3 } },
    { id: 'wood_bow', out: ['wood_bow', 1], cost: { wood_sticks: 30, string: 6 } },
    { id: 'arrow', out: ['arrow', 20], cost: { wood_sticks: 4, feather: 1 } },
    { id: 'wood_rod', out: ['wood_rod', 1], cost: { wood: 2, wood_sticks: 30, string: 4 } },
    { id: 'furnace', out: ['furnace', 1], cost: { stone: 20, wood: 6 } },
    { id: 'campfire', out: ['campfire', 1], cost: { gravel: 10, wood: 30, coal: 3 } },
    { id: 'bed_block', out: ['bed_block', 1], cost: { wood: 6, broken_fabric_cloth: 2 } },
    { id: 'couch_block', out: ['couch_block', 1], cost: { wood: 5, broken_fabric_cloth: 2, broken_cardboards: 2 } },
    { id: 'sink_block', out: ['sink_block', 1], cost: { iron_ingot: 10, wood: 5 } },
    { id: 'anvil_block', out: ['anvil_block', 1], cost: { iron_ingot: 18 } },
    { id: 'computer_bench', out: ['computer_bench', 1], cost: { iron_ingot: 10, metal_casing: 6, wood: 10, broken_copper_wire: 30 } },
    { id: 'iron_axe', out: ['iron_axe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'iron_pickaxe', out: ['iron_pickaxe', 1], cost: { iron_ingot: 3, wood_sticks: 2 } },
    { id: 'wood_helmet', out: ['wood_helmet', 1], cost: { wood: 4, wood_sticks: 2 } },
    { id: 'wood_chest', out: ['wood_chest', 1], cost: { wood: 7, wood_sticks: 2 } },
    { id: 'wood_legs', out: ['wood_legs', 1], cost: { wood: 5, wood_sticks: 2 } },
    { id: 'wood_boots', out: ['wood_boots', 1], cost: { wood: 4, wood_sticks: 2 } },
    { id: 'iron_helmet', out: ['iron_helmet', 1], cost: { iron_ingot: 4 } },
    { id: 'iron_chest', out: ['iron_chest', 1], cost: { iron_ingot: 7 } },
    { id: 'iron_legs', out: ['iron_legs', 1], cost: { iron_ingot: 5 } },
    { id: 'iron_boots', out: ['iron_boots', 1], cost: { iron_ingot: 4 } },
    { id: 'iron_chain', out: ['iron_chain', 1], cost: { iron_ingot: 2 }, anvil: true },
    { id: 'iron_stick', out: ['iron_stick', 1], cost: { iron_ingot: 1 }, anvil: true },
    { id: 'iron_bucket', out: ['iron_bucket', 1], cost: { iron_ingot: 2, iron_chain: 1 }, anvil: true },
    { id: 'golden_chain', out: ['golden_chain', 1], cost: { golden_ingot: 2 }, anvil: true },
    { id: 'golden_stick', out: ['golden_stick', 1], cost: { golden_ingot: 1 }, anvil: true },
    { id: 'iron_watch', out: ['iron_watch', 1], cost: { iron_ingot: 2, iron_chain: 1, iron_stick: 1 }, anvil: true },
    { id: 'golden_watch', out: ['golden_watch', 1], cost: { golden_ingot: 2, golden_chain: 1, golden_stick: 1 }, anvil: true },
    { id: 'medium_battery', out: ['medium_battery', 1], cost: { iron_nugget: 2, broken_copper_wire: 75, plastic_paper_package: 1 }, computer: true, minigame: true },
    { id: 'ips_led', out: ['ips_led', 1], cost: { mini_led_lamp: 50, broken_copper_wire: 120, rgb_lamp: 3, black_screen_cover: 5 }, computer: true },
    { id: 'radar', out: ['radar', 1], cost: { signal_chip: 1, medium_battery: 1, metal_casing: 10, ips_led: 2 }, computer: true },
    { id: 'gps', out: ['gps', 1], cost: { ips_led: 4, black_screen_cover: 2, metal_casing: 16, medium_battery: 2, signal_chip: 1, gpu_chip: 1 }, computer: true },
    { id: 'melt_iron', out: ['iron_ingot', 1], cost: { iron_nugget: 8 }, furnace: true, label: 'Smelt Iron Bar' },
    { id: 'melt_copper', out: ['copper_ingot', 1], cost: { broken_copper_wire: 25 }, furnace: true, label: 'Smelt Copper Bar' },
    { id: 'melt_gold', out: ['golden_ingot', 1], cost: { golden_nugget: 12 }, furnace: true, label: 'Smelt Golden Bar' },
    { id: 'wash_veg', out: ['fresh_veg', 1], cost: { dirty_veg: 1 }, sink: true, label: 'Wash Dirty Vegetables → Fresh' },
    { id: 'wash_fruits', out: ['fresh_fruits', 1], cost: { dirty_fruits: 1 }, sink: true, label: 'Wash Dirty Fruits → Fresh' },
    { id: 'cook_fish', out: ['cooked_fish', 1], cost: { fresh_fish: 1 }, campfire: true, cook: 25, label: 'Cook Fresh Fish → Cooked Fish' }
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

  /* ---------- Zombies ---------- */
  var Z = {
    walker:  { name: 'Walker',   hp: 80,  spd: 1.1, dmg: 5,  def: 0, tier: 1, scale: 1.0,  color: 0x6d7a5a, cd: 1.0, w: 40 },
    runner:  { name: 'Runner',   hp: 50,  spd: 1.6, dmg: 5,  def: 0, tier: 1, scale: 0.92, color: 0x8a6a52, cd: 0.8, w: 22 },
    big:     { name: 'Big',      hp: 150, spd: 0.8, dmg: 8,  def: 0, tier: 1, scale: 1.3,  color: 0x56654f, cd: 1.1, w: 12 },
    bomber:  { name: 'Bomber',   hp: 60,  spd: 1.2, dmg: 60, def: 0, tier: 1, scale: 1.05, color: 0x9a5a2a, cd: 0,   w: 10, splash: 4 },
    brute:   { name: 'Brute',    hp: 275, spd: 0.5, dmg: 12, def: 0, tier: 2, scale: 1.55, color: 0x4a3f55, cd: 1.3, w: 6 },
    soldier: { name: 'Soldier',  hp: 100, spd: 1.0, dmg: 9,  def: 2, tier: 2, scale: 1.05, color: 0x3d5a3a, cd: 1.0, w: 8 },
    spider:  { name: 'Spider',   hp: 40,  spd: 1.5, dmg: 5,  def: 1, tier: 1, scale: 0.7,  color: 0x3b3340, cd: 0.8, w: 8 },
    programmer: { name: 'Programmer', hp: 70, spd: 0.9, dmg: 10, def: -5, tier: 4, scale: 1.0, color: 0x35506b, cd: 1.0, w: 4, ranged: true },
    miner:   { name: 'Miner Zombie Walker', hp: 90, spd: 0.8, dmg: 12, def: 3, tier: 2, scale: 1.05, color: 0x7a6a3a, cd: 1.0, w: 0, nospawn: true },
    zfish:   { name: 'Zombie Fish', hp: 30, spd: 0.9, dmg: 4, def: -1, tier: 1, scale: 0.55, color: 0x3a8f87, cd: 1.0, w: 0, nospawn: true, wpoison: true }
  };

  WZ.ITEMS = I;
  WZ.RECIPES = R;
  WZ.LOOT = LOOT;
  WZ.ZOMBIES = Z;
  WZ.ZTYPE_LIST = ['walker', 'runner', 'big', 'bomber', 'brute', 'soldier', 'spider', 'programmer', 'miner', 'zfish'];
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
