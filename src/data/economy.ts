import type { ArmyEntry } from './battlefield';

// ── 貨物 ──
export type GoodId = 'salt' | 'iron' | 'cloth' | 'wine' | 'crystal' | 'fur' | 'spice';

/** weight 係每件重量 */
export const GOODS: Record<GoodId, { name: string; base: number; weight: number }> = {
  salt: { name: '鹽', base: 18, weight: 2 },
  iron: { name: '鐵', base: 34, weight: 5 },
  cloth: { name: '布', base: 26, weight: 2 },
  wine: { name: '酒', base: 22, weight: 3 },
  crystal: { name: '魔晶', base: 70, weight: 1 },
  fur: { name: '皮毛', base: 30, weight: 2 },
  spice: { name: '香料', base: 55, weight: 1 },
};
export const GOOD_ORDER: GoodId[] = ['salt', 'iron', 'cloth', 'wine', 'crystal', 'fur', 'spice'];

/** 各地特產（目標存貨高）同短缺（目標存貨低） */
export const TOWN_TRADE: Record<string, { makes: GoodId[]; needs: GoodId[] }> = {
  griffon: { makes: ['iron', 'wine'], needs: ['salt', 'crystal', 'spice'] },
  linjiang: { makes: ['salt', 'cloth'], needs: ['iron', 'fur'] },
  wuyi: { makes: ['crystal', 'spice'], needs: ['cloth', 'wine'] },
  wheat: { makes: ['wine'], needs: ['salt', 'iron'] },
  stonebridge: { makes: ['iron', 'fur'], needs: ['cloth'] },
  bamboo: { makes: ['cloth'], needs: ['wine', 'crystal'] },
  southpond: { makes: ['salt', 'spice'], needs: ['iron', 'fur'] },
  frostfang: { makes: ['fur', 'iron'], needs: ['wine', 'spice'] },
  iceharbor: { makes: ['fur', 'salt'], needs: ['cloth'] },
  shadowspire: { makes: ['crystal', 'cloth'], needs: ['iron', 'salt'] },
  moonleaf: { makes: ['wine', 'spice'], needs: ['iron'] },
  monsterhold: { makes: ['crystal', 'fur'], needs: ['wine', 'cloth', 'iron'] },
  goblinfen: { makes: ['iron'], needs: ['wine', 'salt'] },
};

/** 各地金庫同糧市 */
export const LOCAL = {
  /** 金庫基準 */
  townGold: 3000,
  villageGold: 700,
  /** 每日回復到基準嘅比例 */
  goldDrift: 0.06,
  /** 村莊存貨比例 */
  villageStock: 0.5,
  /** 村莊糧價倍率 */
  villageFood: 0.7,
  /** 糧市：存糧每差 1 單位價格變幾多 */
  foodSwing: 0.012,
  foodPriceMin: 0.5,
  foodPriceMax: 2.5,
  /** 糧每單位重量 */
  foodWeight: 0.2,
};

/** 俘虜 */
export const CAPTIVE = {
  /** 賣價 = 兵階 × 呢個數 */
  pricePerTier: 45,
  /** 每個俘虜每日逃走機率 */
  escapeChance: 0.08,
  /** 招降費 = 兵階 × 呢個數 */
  recruitPerTier: 25,
  /** 招降後士氣 */
  recruitMorale: -2,
  /** 自動結算打贏捉到幾多 */
  autoResolveMax: 2,
};

export const MARKET = {
  /** 普通存貨目標 */
  stockNormal: 50,
  stockMakes: 90,
  stockNeeds: 20,
  /** 價格 = 基價 × (1 + (目標 − 存貨) ÷ 目標 × 呢個數) */
  priceSwing: 0.9,
  priceMin: 0.45,
  priceMax: 2,
  /** 賣出折讓 */
  sellRatio: 0.9,
  /** 每日回復到目標嘅比例 */
  dailyDrift: 0.08,
  /** 每次買賣數量 */
  lot: 5,
  /** 貨倉載重：基本同每人額外 */
  cargoBase: 120,
  cargoPerSoldier: 4,
  /** 商隊到達時帶嚟嘅貨量 */
  caravanLoad: 5,
};

export interface WorkshopDef {
  id: string;
  name: string;
  good: GoodId;
  cost: number;
  /** 每週基本收入 */
  income: number;
}

export const WORKSHOPS: WorkshopDef[] = [
  { id: 'brewery', name: '釀酒坊', good: 'wine', cost: 1500, income: 150 },
  { id: 'weaver', name: '織布坊', good: 'cloth', cost: 1800, income: 180 },
  { id: 'forge', name: '鍛造坊', good: 'iron', cost: 2400, income: 240 },
];

// ── 護甲 ──
export type ArmorSlot = 'head' | 'body' | 'hands' | 'feet';
export const SLOT_NAME: Record<ArmorSlot, string> = { head: '頭', body: '身', hands: '手', feet: '腳' };

export interface ArmorDef {
  id: string;
  name: string;
  slot: ArmorSlot;
  armor: number;
  /** 速度懲罰比例 */
  weight: number;
  price: number;
  /** 品質；冇就係普通貨，鐵匠有得賣 */
  quality?: 'worn' | 'fine' | 'legend';
}

export const ARMORS: ArmorDef[] = [
  { id: 'hood', name: '皮帽', slot: 'head', armor: 1, weight: 0, price: 60 },
  { id: 'helm', name: '鐵盔', slot: 'head', armor: 3, weight: 0.01, price: 260 },
  { id: 'greathelm', name: '重型大盔', slot: 'head', armor: 5, weight: 0.02, price: 700 },
  { id: 'gambeson', name: '棉甲', slot: 'body', armor: 3, weight: 0.01, price: 180 },
  { id: 'mail', name: '鎖子甲', slot: 'body', armor: 7, weight: 0.04, price: 750 },
  { id: 'plate', name: '板甲', slot: 'body', armor: 12, weight: 0.08, price: 2200 },
  { id: 'gloves', name: '皮手套', slot: 'hands', armor: 1, weight: 0, price: 50 },
  { id: 'gauntlets', name: '鐵手套', slot: 'hands', armor: 2, weight: 0.01, price: 320 },
  { id: 'boots', name: '皮靴', slot: 'feet', armor: 1, weight: 0, price: 60 },
  { id: 'greaves', name: '鐵脛甲', slot: 'feet', armor: 3, weight: 0.02, price: 420 },
  // 只會由戰利品掉落
  { id: 'rusty_mail', name: '殘破鎖甲', slot: 'body', armor: 4, weight: 0.04, price: 0, quality: 'worn' },
  { id: 'rusty_helm', name: '殘破鐵盔', slot: 'head', armor: 2, weight: 0.01, price: 0, quality: 'worn' },
  { id: 'fine_plate', name: '精良板甲', slot: 'body', armor: 15, weight: 0.07, price: 0, quality: 'fine' },
  { id: 'fine_gauntlets', name: '精良鐵手套', slot: 'hands', armor: 4, weight: 0.01, price: 0, quality: 'fine' },
  { id: 'legend_helm', name: '傳說戰盔', slot: 'head', armor: 9, weight: 0.01, price: 0, quality: 'legend' },
  { id: 'legend_boots', name: '傳說戰靴', slot: 'feet', armor: 7, weight: 0, price: 0, quality: 'legend' },
];

/** 戰利品：每場打贏掉落機率 */
export const LOOT = {
  /** 貨物數量 */
  goodsMin: 1,
  goodsMax: 3,
  worn: 0.3,
  fine: 0.1,
  legend: 0.02,
  /** 鐵匠收購價 */
  sell: { worn: 60, fine: 700, legend: 3000 },
};

export const WEAPON_PRICE: Record<string, number> = {
  sword: 0, lance: 0, horsebow: 0, hand_axe: 350, mace: 380, axe: 520, greatsword: 800,
  pike: 300, longbow: 650, crossbow: 900, javelin: 280,
  fireball: 1800, lightning: 2200, ward: 1400, heal: 1600,
};

export const HORSE_PRICE: Record<string, number> = {
  hunter: 0, pack: 300, steppe: 900, warhorse: 2400, camel: 700, elk: 1100,
  dire_wolf: 1600, tiger: 2600, drake: 3200, rhino: 3600, unicorn: 4200, nightmare: 4500, pegasus: 5000, griffin_mount: 6000,
};

// ── 主角 ──
export type AttrId = 'str' | 'agi' | 'int' | 'cha';
export const ATTR_NAME: Record<AttrId, string> = { str: '力量', agi: '敏捷', int: '智力', cha: '魅力' };
export const ATTR_DESC: Record<AttrId, string> = {
  str: '生命、近戰傷害', agi: '出招速度、走路', int: '技能點', cha: '帶兵上限',
};

export type SkillId = 'riding' | 'archery' | 'ironskin' | 'leadership' | 'tactics' | 'medicine' | 'trade' | 'magic';
export const SKILL_ORDER: SkillId[] = ['riding', 'archery', 'ironskin', 'leadership', 'tactics', 'medicine', 'trade', 'magic'];
export const SKILLS: Record<SkillId, { name: string; desc: string }> = {
  riding: { name: '騎術', desc: '馬速 +3%／級' },
  archery: { name: '強弓', desc: '散布 −8%／級' },
  ironskin: { name: '鐵骨', desc: '護甲 +1／級' },
  leadership: { name: '領導', desc: '帶兵 +3、工資 −3%／級' },
  tactics: { name: '戰術', desc: '部隊戰鬥士氣 +3%／級' },
  medicine: { name: '醫療', desc: '傷兵休養 −1 日（每 2 級）' },
  trade: { name: '交易', desc: '買賣差價 +2%／級' },
  magic: { name: '魔法', desc: '法力 +10、法術傷害 +8%／級' },
};

export const HERO = {
  startAttr: 5,
  skillMax: 10,
  /** 升級所需經驗 */
  xpBase: 300,
  xpGrowth: 1.35,
  attrPerLevel: 1,
  skillPerLevel: 2,
  /** 每點智力每級額外技能點機率（0.1 = 10 智力多 1 點） */
  intSkillBonus: 0.1,
  hpBase: 90,
  hpPerStr: 8,
  damagePerStr: 0.025,
  /** 敏捷：出招時間縮短比例同走路加速 */
  speedPerAgi: 0.012,
  armorBase: 2,
  /** 帶兵上限 */
  limitBase: 12,
  limitPerCha: 2,
  limitPerLeadership: 3,
  xpPerKill: 60,
  xpBattleWin: 120,
  startWeapons: ['sword', 'lance', 'horsebow'],
  startLoadout: ['sword', 'lance', 'horsebow'],
  startHorse: 'hunter',
  startArmor: ['gambeson'],
};

// ── 士兵升階 ──
export const UPGRADES: Record<string, string[]> = {
  // 步兵：一路升到鐵甲陷陣
  footman: ['pikeman', 'axeman', 'sergeant'],
  dao_guard: ['axeman', 'sergeant'],
  barbarian: ['axeman'],
  sergeant: ['legionary'],
  hoplite: ['griffin_guard'],
  legionary: ['griffin_guard'],
  pikeman: ['griffin_guard', 'shu_mountaineer'],
  axeman: ['ya_guard'],
  griffin_guard: ['vanguard'],
  shu_mountaineer: ['vanguard'],
  ya_guard: ['vanguard'],
  // 弓兵：一路升到神射手
  archer: ['crossbowman'],
  auxilia: ['crossbowman'],
  crossbowman: ['jiangdong_marine', 'elf_longbow'],
  jiangdong_marine: ['sharpshooter'],
  elf_longbow: ['sharpshooter'],
  // 騎兵：一路升到聖殿騎士
  horseman: ['lancer', 'mamluk'],
  lancer: ['blackmail_rider', 'crusader'],
  mamluk: ['blackmail_rider'],
  crusader: ['templar'],
  blackmail_rider: ['templar'],
  // 異族
  goblin_spear: ['orc_warrior'],
  orc_warrior: ['orc_berserker'],
  orc_berserker: ['orc_chief_guard'],
  skeleton: ['grave_knight'],
  grave_knight: ['death_rider'],
  lizard_warrior: ['kobold_miner'],
  kobold_miner: ['minotaur_guard'],
  dwarf_guard: ['dwarf_crossbow'],
  dwarf_crossbow: ['dwarf_breaker'],
  elf_scout: ['elf_longbow'],
};

export const PROMOTION = {
  /** 升階要求等級 */
  needLevel: 3,
  /** 費用 = 新兵階 × 呢個數 */
  costPerTier: 60,
  /** 升階後等級扣減 */
  levelLoss: 2,
};

// ── 同伴 ──
export const COMPANIONS = [
  { unit: 'comp_medic', price: 800, skill: 'medicine' as SkillId, bonus: 4 },
  { unit: 'comp_trader', price: 800, skill: 'trade' as SkillId, bonus: 4 },
  { unit: 'comp_veteran', price: 1100, skill: 'tactics' as SkillId, bonus: 4 },
];

/** 同伴唔夾：同時喺部隊就有機會嗌交，嗌多幾次有人走 */
export const COMPANION_FEUD = {
  pairs: [['comp_trader', 'comp_veteran'], ['comp_medic', 'comp_veteran']] as [string, string][],
  chance: 0.06,
  morale: 6,
  leaveChance: 0.2,
};

/** 英雄帶隊遠征：離隊幾日，帶金幣同經驗返嚟 */
export const EXPEDITION = {
  size: 8,
  days: 6,
  goldPerMan: 60,
  xpEach: 90,
  hurtChance: 0.25,
  hurtDays: 3,
  /** 普通兵有機會陣亡 */
  loseChance: 0.05,
};

// ── 競技場 ──
export const ARENA = {
  /** 每勝一場升一級難度 */
  rounds: [
    { enemy: [{ unit: 'footman', count: 3 }] as ArmyEntry[], level: 1, reward: 150 },
    { enemy: [{ unit: 'footman', count: 4 }, { unit: 'archer', count: 2 }] as ArmyEntry[], level: 2, reward: 280 },
    { enemy: [{ unit: 'axeman', count: 4 }, { unit: 'lancer', count: 2 }] as ArmyEntry[], level: 3, reward: 480 },
    { enemy: [{ unit: 'griffin_guard', count: 4 }, { unit: 'blackmail_rider', count: 2 }] as ArmyEntry[], level: 4, reward: 900 },
  ],
  bet: 200,
  betMult: 2,
  /** 錦標賽：四輪連戰，輸一場就出局 */
  tournament: { everyDays: 10, prize: 1500, renown: 12 },
  /** 同一城每幾多日可以再比 */
  cooldownDays: 2,
  renownXp: 150,
};

// ── 大地圖 NPC ──
export type NpcKind = 'caravan' | 'farmer' | 'hunter' | 'messenger' | 'patrol' | 'raider' | 'dragon' | 'witch' | 'wyrm' | 'expedition';

export const NPC: Record<NpcKind, { name: string; max: number; size: [number, number]; speed: number; color: string }> = {
  caravan: { name: '商隊', max: 4, size: [5, 9], speed: 3, color: '#e8b84a' },
  farmer: { name: '農民', max: 5, size: [1, 3], speed: 2.6, color: '#c9e08a' },
  hunter: { name: '獵人', max: 3, size: [1, 1], speed: 3.4, color: '#a07a50' },
  messenger: { name: '信使', max: 2, size: [1, 1], speed: 6.5, color: '#f4f0e4' },
  patrol: { name: '巡邏隊', max: 3, size: [10, 16], speed: 4.2, color: '#5aa0ee' },
  raider: { name: '獸人掠奪隊', max: 1, size: [9, 13], speed: 3.8, color: '#e0603a' },
  dragon: { name: '巨龍', max: 1, size: [1, 1], speed: 7, color: '#ff4020' },
  witch: { name: '滅國魔女', max: 1, size: [1, 1], speed: 5, color: '#c040e0' },
  wyrm: { name: '滅世飛龍', max: 1, size: [1, 1], speed: 8, color: '#7a4ae0' },
  expedition: { name: '你嘅遠征隊', max: 1, size: [1, 1], speed: 4.5, color: '#f2c14e' },
};

export const NPC_RULES = {
  /** 幾多日檢查一次補充 */
  refillEvery: 1,
  /** 農民送到城鎮可以加幾多日糧，令糧價跌 */
  farmerFood: 12,
  /** 獵人打獵時間（秒） */
  huntSeconds: 9,
  /** 農民喺城休息（秒） */
  restSeconds: 5,
  /** 巡邏隊發現山賊距離（格） */
  patrolSight: 16,
  /** 山賊發現平民距離（格） */
  banditPreySight: 14,
  /** 接觸距離（格） */
  contactDist: 1.6,
  /** 村莊被燒幾多日唔招到兵 */
  burnedDays: 8,
  /** 掠奪隊幾多日出動一次 */
  raidEveryDays: 9,
  dragonEveryDays: 21,
  /** 第幾日開始有龍出巢 */
  dragonFirstDay: 24,
  /** 截擊掠奪隊獎勵 */
  raiderGold: 350,
  raiderArmy: [{ unit: 'goblin_spear', share: 0.4 }, { unit: 'orc_warrior', share: 0.5 }, { unit: 'wolf_rider', share: 0.1 }],
  raiderLevel: 2,
  /** 向獵人買糧 */
  hunterFood: 8,
  hunterPrice: 12,
  /** 向商隊買糧 */
  caravanFood: 15,
  caravanFoodPrice: 3,
  /** 打聽消息費用 */
  rumorCost: 20,
  /** 護送商隊獎金 */
  labelDist: 16,
};

/** 士兵 post 值：出緊遠征 */
export const EXPEDITION_POST = 'expedition';
