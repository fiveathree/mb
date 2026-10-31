/** 善惡行為：正義、忠誠變化同懸賞 */
export type DeedId =
  | 'quest' | 'beatBandit' | 'beatRaider' | 'mercy' | 'charity'
  | 'robVillage' | 'robCaravan' | 'robFarmer' | 'killPatrol' | 'betray' | 'retreat' | 'serve';

export const DEEDS: Record<DeedId, { name: string; justice: number; loyalty: number; bounty: number }> = {
  quest: { name: '完成任務', justice: 3, loyalty: 2, bounty: 0 },
  beatBandit: { name: '剿賊', justice: 2, loyalty: 0, bounty: 0 },
  beatRaider: { name: '保護村莊', justice: 6, loyalty: 1, bounty: 0 },
  mercy: { name: '仁慈', justice: 3, loyalty: -1, bounty: 0 },
  charity: { name: '行善', justice: 4, loyalty: 0, bounty: 0 },
  robVillage: { name: '洗劫村莊', justice: -18, loyalty: -4, bounty: 400 },
  robCaravan: { name: '打劫商隊', justice: -12, loyalty: -3, bounty: 300 },
  robFarmer: { name: '搶農民', justice: -8, loyalty: -1, bounty: 120 },
  killPatrol: { name: '殺官兵', justice: -5, loyalty: -3, bounty: 200 },
  betray: { name: '背叛宗主', justice: -5, loyalty: -40, bounty: 0 },
  retreat: { name: '臨陣退縮', justice: 0, loyalty: -2, bounty: 0 },
  serve: { name: '為宗主出戰', justice: 0, loyalty: 3, bounty: 0 },
};

export const HONOR = {
  min: -100,
  max: 100,
  /** 正義低過呢個就淪為山賊 */
  outlawAt: -40,
  /** 贖罪回到呢個以上先洗底 */
  redeemAt: -20,
  /** 正義低過呢個，村民唔肯當兵 */
  noRecruitAt: -30,
  /** 正義影響買賣價，每點比例 */
  pricePerJustice: 0.001,
  /** 忠誠影響部隊士氣，每點比例 */
  moralePerLoyalty: 0.002,
  /** 忠誠低過呢個，部隊每日多一分機率逃兵 */
  desertLoyalty: -30,
  desertChance: 0.15,
  /** 忠誠高過呢個，契約日薪加成 */
  payLoyalty: 30,
  payBonus: 1.5,
  /** 罰款 = 懸賞 × 倍率，交咗清通緝 */
  fineMult: 1,
  /** 洗劫村莊所得 */
  robVillage: { gold: 300, food: 40 },
  robCaravan: { gold: 450 },
  robFarmer: { gold: 40, food: 10 },
  /** 官兵追捕距離（格） */
  hunterSight: 18,
  /** 贖罪捐款：每次金幣同正義 */
  donate: { gold: 300, justice: 6 },
  /** 山賊身份招賊 */
  banditRecruit: { cost: 30, count: 3 },
};

export const JUSTICE_TIERS: [number, string, string][] = [
  [60, '俠義之士', '物價優惠，村民擁戴'],
  [20, '有口皆碑', '物價略平'],
  [-20, '平民', '冇特別'],
  [-40, '惡名昭彰', '物價貴，村民怕你'],
  [-101, '山賊', '官兵追捕，但賊唔打你，可以佔地為王'],
];

export const LOYALTY_TIERS: [number, string, string][] = [
  [30, '忠心耿耿', '部隊士氣高，契約日薪加成'],
  [0, '守信', '冇特別'],
  [-30, '反覆無常', '部隊士氣跌'],
  [-101, '背信棄義', '士氣大跌，部下會走'],
];

export interface StoryHero {
  id: string;
  unit: string;
  place: string;
  title: string;
  text: string;
  minJustice?: number;
  maxJustice?: number;
  minLoyalty?: number;
  minRenown?: number;
  arenaWins?: number;
  outlaw?: boolean;
  /** 要先清咗呢個地點 */
  cleared?: string;
  cost?: number;
}

/** 劇場角色：唔使抽卡，喺特定地方、符合條件先遇到 */
export const STORY_HEROES: StoryHero[] = [
  {
    id: 'yan', unit: 'hero_yan', place: 'wuyi', title: '酒館快刀', text: '有人喺酒館留下一句：「打贏兩場比武，先值得我出刀。」燕九郎放低酒杯，望住你。', arenaWins: 2,
  },
  {
    id: 'sylvia', unit: 'hero_sylvia', place: 'songglade', title: '林中箭影', text: '一支箭釘喺你腳邊。「你名聲唔差，」希爾薇由樹上跳落嚟，「帶我去見識下外面嘅世界。」', minJustice: 20,
  },
  {
    id: 'gorak', unit: 'hero_gorak', place: 'blackfang', title: '惡人相惜', text: '格拉克大笑：「你手上嘅血同我一樣多！一齊搶！」', maxJustice: -20,
  },
  {
    id: 'crow', unit: 'story_crow', place: 'lair_b', title: '俠盜白鴉', text: '賊窩地牢入面關住個蒙面人。「我只劫貪官，」佢話，「放咗我，我跟你。」', minJustice: 10, cleared: 'lair_b',
  },
  {
    id: 'redbeard', unit: 'story_redbeard', place: 'lair_a', title: '赤鬚寨主', text: '老寨主打量你：「你呢種人先啱行呢條路。入夥啦。」', outlaw: true,
  },
  {
    id: 'ellen', unit: 'story_ellen', place: 'griffon', title: '流亡公主', text: '一個斗篷女子喺王城暗巷攔住你：「我聽講你守信。我需要一支唔會背叛我嘅軍隊。」', minLoyalty: 20, minRenown: 30,
  },
  {
    id: 'monk', unit: 'story_monk', place: 'bamboo', title: '苦行僧', text: '竹林入面嘅老僧合十：「施主積善，老衲願隨行一程，度化世間。」', minJustice: 30,
  },
];
