import type { PlayableRace } from './factions';
import type { SkillId } from './economy';

export type CrownClass = '武力' | '智略' | '統率' | '弓術' | '騎術' | '魔導' | '暗影';

/** 冠位角色：可以直接扮佢開局，唔扮就係大地圖上嘅人物 */
export interface CrownDef {
  id: string;
  cls: CrownClass;
  name: string;
  scenario: string;
  desc: string;
  race: PlayableRace;
  /** 力量、敏捷、智力、魅力 */
  attrs: [number, number, number, number];
  skills: Partial<Record<SkillId, number>>;
  /** 專屬兵器：名、底本武器、加幾多傷害 */
  sig: [string, string, number];
  /** 其餘武器 */
  extra: string[];
  horse: string;
  armor: string[];
  army: [string, number][];
  gold: number;
  food: number;
  home: string;
  color: number;
  /** 大混戰領一軍 */
  grand?: boolean;
}

const HEAVY = ['plate', 'greathelm', 'gauntlets', 'greaves'];
const MEDIUM = ['mail', 'helm', 'gloves', 'boots'];
const LIGHT = ['gambeson', 'hood', 'gloves', 'boots'];

export const CROWNS: CrownDef[] = [
  {
    id: 'crown_lubu', cls: '武力', name: '呂布', scenario: 'threekingdoms', desc: '人中呂布，天下無雙；智謀同信義就係另一回事', race: 'human', grand: true,
    attrs: [17, 12, 4, 6], skills: { riding: 6, ironskin: 4, tactics: 2 }, sig: ['方天畫戟', 'hero_lance', 16], extra: ['axe', 'horsebow'], horse: 'steppe', armor: HEAVY,
    army: [['lancer', 8], ['horseman', 8], ['dao_guard', 6]], gold: 2500, food: 90, home: 'xuan_city', color: 0xc8342c,
  },
  {
    id: 'crown_kongming', cls: '智略', name: '諸葛亮', scenario: 'threekingdoms', desc: '羽扇綸巾，算無遺策，手無縛雞之力', race: 'human',
    attrs: [4, 7, 18, 14], skills: { tactics: 7, leadership: 5, medicine: 3, trade: 3 }, sig: ['諸葛連弩', 'elite_crossbow', 10], extra: ['sword'], horse: 'pack', armor: LIGHT,
    army: [['crossbowman', 12], ['pikeman', 8], ['dao_guard', 8]], gold: 4000, food: 140, home: 'bashu_pass', color: 0xe8e8d8,
  },
  {
    id: 'crown_caocao', cls: '統率', name: '曹操', scenario: 'threekingdoms', desc: '治世能臣，亂世奸雄；帶兵嘅天花板', race: 'human',
    attrs: [9, 9, 13, 16], skills: { leadership: 8, tactics: 5, trade: 2 }, sig: ['倚天劍', 'hero_blade', 8], extra: ['horsebow'], horse: 'warhorse', armor: MEDIUM,
    army: [['dao_guard', 14], ['crossbowman', 8], ['lancer', 6]], gold: 5000, food: 160, home: 'griffon', color: 0x3a4a7a,
  },
  {
    id: 'crown_zhaoyun', cls: '騎術', name: '趙雲', scenario: 'threekingdoms', desc: '長坂七進七出，一身是膽', race: 'human',
    attrs: [14, 15, 9, 11], skills: { riding: 8, ironskin: 2 }, sig: ['龍膽亮銀槍', 'hero_lance', 12], extra: ['sword', 'horsebow'], horse: 'steppe', armor: MEDIUM,
    army: [['horseman', 12], ['lancer', 4]], gold: 1800, food: 80, home: 'bashu_pass', color: 0xd8dce8,
  },
  {
    id: 'crown_taishici', cls: '弓術', name: '太史慈', scenario: 'threekingdoms', desc: '猿臂善射，弦不虛發', race: 'human',
    attrs: [12, 15, 8, 9], skills: { archery: 8, riding: 3 }, sig: ['虎筋弓', 'hero_bow', 12], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['archer', 14], ['dao_guard', 6]], gold: 1600, food: 80, home: 'linjiang', color: 0x4a7a5a,
  },
  {
    id: 'crown_cunxiao', cls: '武力', name: '李存孝', scenario: 'fivedynasties', desc: '王不過霸，將不過李；十八騎破長安', race: 'human', grand: true,
    attrs: [16, 13, 5, 7], skills: { riding: 6, ironskin: 3, tactics: 2 }, sig: ['禹王槊', 'hero_lance', 14], extra: ['axe'], horse: 'warhorse', armor: HEAVY,
    army: [['ya_guard', 6], ['lancer', 8], ['dao_guard', 6]], gold: 2200, food: 90, home: 'ironhelm_keep', color: 0x8a2c3a,
  },
  {
    id: 'crown_abaoji', cls: '騎術', name: '耶律阿保機', scenario: 'fivedynasties', desc: '統一諸部，鐵騎南望', race: 'human',
    attrs: [12, 13, 11, 13], skills: { riding: 7, leadership: 4, archery: 3 }, sig: ['鳴鏑強弓', 'hero_bow', 8], extra: ['sword', 'lance'], horse: 'steppe', armor: MEDIUM,
    army: [['horseman', 16], ['archer', 6]], gold: 3000, food: 110, home: 'xuan_city', color: 0x9a7a4a,
  },
  {
    id: 'crown_qianliu', cls: '弓術', name: '錢鏐', scenario: 'fivedynasties', desc: '強弩射潮，保境安民', race: 'human',
    attrs: [10, 12, 12, 13], skills: { archery: 7, trade: 5, leadership: 3 }, sig: ['射潮強弩', 'elite_crossbow', 14], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['crossbowman', 14], ['dao_guard', 8]], gold: 5000, food: 150, home: 'linjiang', color: 0x4a8a9a,
  },
  {
    id: 'crown_caesar', cls: '統率', name: '凱撒', scenario: 'rome', desc: '我來，我見，我征服', race: 'human', grand: true,
    attrs: [10, 10, 14, 17], skills: { leadership: 8, tactics: 6 }, sig: ['第十軍團之劍', 'hero_blade', 8], extra: ['javelin'], horse: 'hunter', armor: MEDIUM,
    army: [['legionary', 20], ['auxilia', 8], ['horseman', 4]], gold: 4500, food: 160, home: 'griffon', color: 0xa02a3a,
  },
  {
    id: 'crown_hannibal', cls: '智略', name: '漢尼拔', scenario: 'rome', desc: '翻越阿爾卑斯，坎尼一戰成千古兵法', race: 'human',
    attrs: [9, 11, 17, 13], skills: { tactics: 8, leadership: 5 }, sig: ['巴卡戰刃', 'hero_blade', 9], extra: ['javelin'], horse: 'steppe', armor: MEDIUM,
    army: [['barbarian', 14], ['horseman', 8], ['archer', 6]], gold: 3200, food: 130, home: 'ironhelm_keep', color: 0x7a4a9a,
  },
  {
    id: 'crown_spartacus', cls: '武力', name: '斯巴達克斯', scenario: 'rome', desc: '奴隸起義嘅領袖，鬥場入面冇對手', race: 'human',
    attrs: [16, 14, 7, 12], skills: { ironskin: 7, tactics: 2 }, sig: ['色雷斯彎刀', 'hero_blade', 14], extra: ['axe'], horse: 'hunter', armor: LIGHT,
    army: [['barbarian', 18], ['auxilia', 4]], gold: 500, food: 70, home: 'blackfang', color: 0xb08a4a,
  },
  {
    id: 'crown_richard', cls: '武力', name: '獅心王理查', scenario: 'crusade', desc: '永遠衝喺最前，國庫永遠係空', race: 'human', grand: true,
    attrs: [16, 11, 8, 13], skills: { riding: 5, ironskin: 5, leadership: 3 }, sig: ['獅心大斧', 'hero_axe', 10], extra: ['sword', 'lance'], horse: 'warhorse', armor: HEAVY,
    army: [['crusader', 8], ['sergeant', 10], ['crossbowman', 6]], gold: 1500, food: 100, home: 'griffon', color: 0xc84a2c,
  },
  {
    id: 'crown_saladin', cls: '統率', name: '薩拉丁', scenario: 'crusade', desc: '仁慈同用兵一樣令敵人佩服', race: 'human',
    attrs: [11, 12, 14, 16], skills: { leadership: 7, riding: 4, medicine: 3 }, sig: ['大馬士革彎刀', 'hero_blade', 10], extra: ['horsebow'], horse: 'steppe', armor: MEDIUM,
    army: [['mamluk', 10], ['archer', 8], ['footman', 8]], gold: 3500, food: 140, home: 'linjiang', color: 0xd8c86a,
  },
  {
    id: 'crown_achilles', cls: '武力', name: '阿基里斯', scenario: 'greek', desc: '除咗腳踭，刀槍不入', race: 'human', grand: true,
    attrs: [18, 16, 6, 8], skills: { ironskin: 8, tactics: 1 }, sig: ['佩利翁長矛', 'hero_lance', 15], extra: ['sword'], horse: 'hunter', armor: HEAVY,
    army: [['hoplite', 14], ['archer', 4]], gold: 1500, food: 80, home: 'qingcheng_pass', color: 0xd8b04a,
  },
  {
    id: 'crown_odysseus', cls: '智略', name: '奧德修斯', scenario: 'greek', desc: '木馬嘅主意就係佢出', race: 'human',
    attrs: [10, 12, 17, 13], skills: { tactics: 7, trade: 4, archery: 4 }, sig: ['伊薩卡硬弓', 'hero_bow', 10], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['hoplite', 12], ['archer', 8]], gold: 2500, food: 120, home: 'griffon', color: 0x4a6a9a,
  },
  {
    id: 'crown_atalanta', cls: '弓術', name: '阿塔蘭忒', scenario: 'greek', desc: '林中長大，跑得過任何人', race: 'human',
    attrs: [9, 18, 8, 9], skills: { archery: 8 }, sig: ['卡呂冬獵弓', 'hero_bow', 12], extra: ['sword'], horse: 'hunter', armor: LIGHT,
    army: [['archer', 12], ['horseman', 3]], gold: 1000, food: 70, home: 'shadowspire', color: 0x7aa84a,
  },
  {
    id: 'crown_lumen', cls: '魔導', name: '聖光大祭司 蘭絲', scenario: 'hellgate', desc: '孤城最後一盞燈', race: 'human', grand: true,
    attrs: [6, 9, 17, 15], skills: { magic: 8, medicine: 5, leadership: 3 }, sig: ['聖裁之光', 'lich_bolt', 14], extra: ['heal', 'ward', 'sword'], horse: 'hunter', armor: MEDIUM,
    army: [['footman', 14], ['elf_mage', 4], ['archer', 6]], gold: 3000, food: 120, home: 'griffon', color: 0xf0e8b0,
  },
  {
    id: 'crown_owl', cls: '暗影', name: '獵魔宗師 夜梟', scenario: 'hellgate', desc: '獵過嘅魔多過佢見過嘅人', race: 'human',
    attrs: [11, 17, 11, 6], skills: { archery: 6, ironskin: 3 }, sig: ['銀刃連弩', 'elite_crossbow', 13], extra: ['sword'], horse: 'hunter', armor: LIGHT,
    army: [['archer', 8], ['crossbowman', 6]], gold: 1400, food: 70, home: 'linjiang', color: 0x4a4a5a,
  },
  {
    id: 'crown_gareth', cls: '武力', name: '屠龍勇者 蓋雷斯', scenario: 'dungeoncrawl', desc: '公會排名第一，身上傷疤全部係龍爪', race: 'human', grand: true,
    attrs: [15, 12, 9, 12], skills: { ironskin: 5, riding: 3, leadership: 3 }, sig: ['屠龍大劍', 'hero_axe', 12], extra: ['sword'], horse: 'warhorse', armor: HEAVY,
    army: [['footman', 10], ['griffin_guard', 3], ['elf_mage', 3]], gold: 2800, food: 100, home: 'griffon', color: 0xb8c0d0,
  },
  {
    id: 'crown_meruna', cls: '魔導', name: '大賢者 梅露娜', scenario: 'dungeoncrawl', desc: '法師議會活咗三百年嘅議長', race: 'elf',
    attrs: [4, 10, 19, 11], skills: { magic: 8, trade: 2 }, sig: ['賢者星爆', 'lich_fire', 16], extra: ['heal', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['elf_mage', 8], ['footman', 8]], gold: 3500, food: 90, home: 'wuyi', color: 0x8a6ad8,
  },
  {
    id: 'crown_lane', cls: '武力', name: '覺醒者 烈恩', scenario: 'awakened', desc: '心被巨龍奪走，反而再冇嘢驚', race: 'human', grand: true,
    attrs: [14, 14, 10, 10], skills: { ironskin: 4, magic: 3, riding: 2 }, sig: ['斬龍之刃', 'hero_blade', 14], extra: ['longbow', 'fireball'], horse: 'hunter', armor: MEDIUM,
    army: [['awakened', 5], ['archer', 6]], gold: 1600, food: 90, home: 'griffon', color: 0x8a5a3a,
  },
  {
    id: 'crown_ira', cls: '魔導', name: '神木巫女 伊拉', scenario: 'awakened', desc: '聽得到神木講嘢', race: 'human',
    attrs: [5, 11, 17, 14], skills: { magic: 7, medicine: 6 }, sig: ['神木之怒', 'lich_bolt', 12], extra: ['heal', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['elf_mage', 5], ['griffin_guard', 3], ['footman', 6]], gold: 2200, food: 100, home: 'wuyi', color: 0x6ab86a,
  },
  {
    id: 'crown_hald', cls: '武力', name: '吞龍者 哈爾德', scenario: 'northland', desc: '佢吼一聲，山頂嘅雪都會落', race: 'nord', grand: true,
    attrs: [16, 11, 10, 11], skills: { ironskin: 5, leadership: 3 }, sig: ['龍骨戰斧', 'hero_axe', 11], extra: ['sword', 'longbow'], horse: 'hunter', armor: HEAVY,
    army: [['huscarl', 14], ['archer', 6]], gold: 2000, food: 110, home: 'griffon', color: 0x9ab8d0,
  },
  {
    id: 'crown_ulf', cls: '魔導', name: '高崖大師 烏爾夫', scenario: 'northland', desc: '七千級石階頂修行咗半世紀', race: 'nord',
    attrs: [9, 8, 17, 12], skills: { magic: 8, medicine: 2 }, sig: ['龍語風暴', 'frost_nova', 8], extra: ['ward', 'axe'], horse: 'hunter', armor: LIGHT,
    army: [['huscarl', 8], ['elf_mage', 4]], gold: 1500, food: 90, home: 'qingcheng_pass', color: 0xc8d8e8,
  },
  {
    id: 'crown_oserin', cls: '魔導', name: '星辰院長 奧瑟琳', scenario: 'sorcery', desc: '大陸上最接近星辰嘅人', race: 'elf', grand: true,
    attrs: [4, 11, 20, 13], skills: { magic: 8, leadership: 3 }, sig: ['星隕', 'lich_fire', 18], extra: ['lightning', 'ward', 'heal'], horse: 'pegasus', armor: LIGHT,
    army: [['elf_mage', 12], ['griffin_guard', 4]], gold: 4000, food: 100, home: 'griffon', color: 0x6a8ae8,
  },
  {
    id: 'crown_karon', cls: '魔導', name: '烈焰院長 卡隆', scenario: 'sorcery', desc: '燒過三間學院嘅藏書樓', race: 'demon',
    attrs: [9, 9, 18, 8], skills: { magic: 8 }, sig: ['煉獄火', 'lich_fire', 14], extra: ['fireball', 'ward'], horse: 'nightmare', armor: LIGHT,
    army: [['elf_mage', 6], ['necromancer', 3], ['footman', 8]], gold: 2500, food: 90, home: 'ironhelm_keep', color: 0xe05a2a,
  },
  {
    id: 'crown_wuchen', cls: '武力', name: '劍尊 蕭無塵', scenario: 'xianxia', desc: '一劍光寒十九洲', race: 'human', grand: true,
    attrs: [15, 16, 13, 9], skills: { magic: 5, ironskin: 3 }, sig: ['無塵飛劍', 'flying_sword', 14], extra: ['sword', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['sword_cultivator', 8], ['dao_guard', 8]], gold: 2500, food: 90, home: 'ironhelm_keep', color: 0xa8e0e8,
  },
  {
    id: 'crown_xuehe', cls: '暗影', name: '魔尊 血河', scenario: 'xianxia', desc: '魔門千年一出嘅奇才', race: 'demon',
    attrs: [13, 13, 17, 7], skills: { magic: 7 }, sig: ['血河魔焰', 'lich_fire', 12], extra: ['heal', 'sword'], horse: 'nightmare', armor: MEDIUM,
    army: [['demon_grunt', 10], ['necromancer', 3]], gold: 2000, food: 70, home: 'qingcheng_pass', color: 0x9a1a2a,
  },
  {
    id: 'fig_fallen', cls: '武力', name: '霜魂王子 亞瑟倫', scenario: 'frostwar', desc: '為救子民而墮落嘅王儲', race: 'undead', grand: true,
    attrs: [16, 10, 13, 10], skills: { ironskin: 5, magic: 4, riding: 2 }, sig: ['霜魂劍', 'hero_blade', 16], extra: ['lightning'], horse: 'nightmare', armor: HEAVY,
    army: [['ghoul', 16], ['skeleton_archer', 6], ['stitched', 2]], gold: 2500, food: 40, home: 'griffon', color: 0x6ab8e8,
  },
  {
    id: 'fig_warchief', cls: '統率', name: '戰歌酋長 薩爾加', scenario: 'frostwar', desc: '帶族人走出奴役', race: 'orc',
    attrs: [15, 10, 11, 15], skills: { leadership: 7, ironskin: 3 }, sig: ['毀滅戰錘', 'hero_axe', 8], extra: ['lightning'], horse: 'hunter', armor: HEAVY,
    army: [['orc_warrior', 16], ['archer', 4]], gold: 1800, food: 110, home: 'linjiang', color: 0x5f8a45,
  },
  {
    id: 'fig_marshal', cls: '統率', name: '鋼鐵元帥 雷諾斯', scenario: 'starwar', desc: '老兵不死，只係再上一次戰場', race: 'human', grand: true,
    attrs: [12, 10, 12, 15], skills: { leadership: 7, tactics: 4, archery: 3 }, sig: ['元帥磁軌炮', 'gauss_rifle', 12], extra: ['sword'], horse: 'hoverbike', armor: HEAVY,
    army: [['marine_trooper', 16], ['flame_trooper', 6], ['walker_mech', 2]], gold: 3000, food: 120, home: 'griffon', color: 0x4a6a9a,
  },
  {
    id: 'fig_prelate', cls: '魔導', name: '靈能大主教 塞琳娜', scenario: 'starwar', desc: '聽得到全族嘅聲音', race: 'psionic',
    attrs: [8, 11, 18, 14], skills: { magic: 8, leadership: 3 }, sig: ['靈能風暴', 'psi_bolt', 16], extra: ['ward', 'sword'], horse: 'hunter', armor: MEDIUM,
    army: [['psi_zealot', 12], ['psi_stalker', 6]], gold: 2500, food: 100, home: 'wuyi', color: 0xd9b24a,
  },
  {
    id: 'fig_treelord', cls: '統率', name: '古樹之王', scenario: 'ancients', desc: '守住水晶一千年', race: 'treant', grand: true,
    attrs: [18, 5, 12, 14], skills: { ironskin: 8, leadership: 4 }, sig: ['千年古木槌', 'hero_axe', 12], extra: ['heal'], horse: 'hunter', armor: LIGHT,
    army: [['ancient_guard', 4], ['lane_creep', 14], ['lane_caster', 6]], gold: 1500, food: 100, home: 'griffon', color: 0x4f7a3a,
  },
  {
    id: 'fig_windranger', cls: '弓術', name: '疾風射手 蘿娜', scenario: 'ancients', desc: '箭比風快', race: 'elf',
    attrs: [8, 19, 9, 10], skills: { archery: 8 }, sig: ['疾風長弓', 'hero_bow', 12], extra: ['sword'], horse: 'hunter', armor: LIGHT,
    army: [['lane_creep', 10], ['elf_mage', 3]], gold: 1400, food: 70, home: 'songglade', color: 0x7fd06a,
  },
  {
    id: 'fig_alchemist', cls: '魔導', name: '煉金師 維拉', scenario: 'emberdeep', desc: '被熾礦改造過嘅身體，隨時會爆', race: 'human', grand: true,
    attrs: [7, 11, 17, 8], skills: { magic: 7, trade: 4, medicine: 3 }, sig: ['熾礦連爆', 'ember_blast', 12], extra: ['heal', 'sword'], horse: 'hunter', armor: LIGHT,
    army: [['footman', 10], ['elf_mage', 3], ['archer', 4]], gold: 2800, food: 80, home: 'griffon', color: 0xe07a2a,
  },
  {
    id: 'fig_pethunter', cls: '弓術', name: '獵寶人 阿卡', scenario: 'emberdeep', desc: '佢隻狗比佢更識搵寶', race: 'human',
    attrs: [10, 15, 9, 11], skills: { archery: 6, trade: 5 }, sig: ['獵寶長弓', 'hero_bow', 8], extra: ['sword'], horse: 'elk', armor: LIGHT,
    army: [['archer', 8], ['footman', 6]], gold: 3000, food: 80, home: 'linjiang', color: 0x8a6a3a,
  },
];

/** 專屬法術耗法力：範圍術貴啲，點殺平啲 */
export const SIG_MP = { aoe: 18, bolt: 12 };

export type MusouStyle = 'whirl' | 'charge' | 'rain' | 'nova' | 'thunder' | 'shadow' | 'rally';

export interface MusouDef {
  name: string;
  style: MusouStyle;
  color: number;
}

/** 招式手感：幾多步、每步隔幾耐、傷害倍率（底數係專屬兵器）、範圍 */
export const MUSOU_STYLES: Record<MusouStyle, { label: string; desc: string; steps: number; every: number; mult: number; radius: number; reach: number; spread: number }> = {
  whirl: { label: '亂舞', desc: '原地掃蕩四周', steps: 6, every: 0.2, mult: 0.5, radius: 7, reach: 0, spread: 0 },
  charge: { label: '突進', desc: '向前直衝，撞飛沿途敵人', steps: 7, every: 0.09, mult: 0.7, radius: 4.5, reach: 3, spread: 0 },
  rain: { label: '天降', desc: '前方一片連環轟落', steps: 14, every: 0.09, mult: 1.3, radius: 4.5, reach: 10, spread: 7 },
  nova: { label: '爆發', desc: '三重衝擊波向外擴散', steps: 3, every: 0.35, mult: 0.6, radius: 4, reach: 0, spread: 0 },
  thunder: { label: '落雷', desc: '連環雷劈附近敵人', steps: 8, every: 0.14, mult: 0.7, radius: 2.5, reach: 24, spread: 8 },
  shadow: { label: '瞬斬', desc: '瞬移連斬，一刀一個', steps: 6, every: 0.16, mult: 1, radius: 2.5, reach: 18, spread: 0 },
  rally: { label: '號令', desc: '全軍回血回士氣，同時震開身邊敵人', steps: 3, every: 0.4, mult: 0.9, radius: 7, reach: 22, spread: 0 },
};

export const MUSOU_RULES = {
  max: 100,
  /** 打人、被打、時間都會儲氣 */
  perDamageDealt: 0.22,
  perDamageTaken: 0.4,
  perSecond: 1,
  /** 絕招底數範圍：騎槍底數低、巨斧底數高，唔限就差幾倍 */
  baseMin: 48,
  baseMax: 58,
  /** 法系加成只計一半，否則法師絕招係武將兩倍 */
  spellScale: 0.5,
  /** 招式前搖 */
  windup: 0.22,
  /** 開招慢鏡（真實秒） */
  startSlow: 0.3,
  /** 收招：最後一下嘅慢鏡、震動 */
  finishSlow: 0.16,
  finishShake: 0.6,
  /** 每步嘅震動 */
  stepShake: 0.2,
  /** 亂舞自轉（弧度／秒） */
  spin: 15,
  rallyHeal: 0.12,
  rallyMorale: 25,
  /** 部隊裏嘅冠位，敵人近過呢個先放 */
  aiRange: 9,
};

/** 每位冠位嘅專屬戰技 */
export const MUSOU: Record<string, MusouDef> = {
  crown_lubu: { name: '天下無雙', style: 'whirl', color: 0xff3a2a },
  crown_kongming: { name: '火計連環', style: 'rain', color: 0xff7a1a },
  crown_caocao: { name: '魏武揮鞭', style: 'rally', color: 0x7a9aff },
  crown_zhaoyun: { name: '七進七出', style: 'charge', color: 0xe8f0ff },
  crown_taishici: { name: '百步連珠', style: 'rain', color: 0x9ae08a },
  crown_cunxiao: { name: '十八騎破城', style: 'charge', color: 0xff5a4a },
  crown_abaoji: { name: '鐵騎南下', style: 'charge', color: 0xe0c08a },
  crown_qianliu: { name: '強弩射潮', style: 'rain', color: 0x4ac0e0 },
  crown_caesar: { name: '我來我見我征服', style: 'rally', color: 0xffd24a },
  crown_hannibal: { name: '坎尼之圍', style: 'nova', color: 0xc08aff },
  crown_spartacus: { name: '破鎖狂舞', style: 'whirl', color: 0xffb84a },
  crown_richard: { name: '獅心一擊', style: 'nova', color: 0xff8a3a },
  crown_saladin: { name: '聖城之仁', style: 'rally', color: 0xf0e08a },
  crown_achilles: { name: '特洛伊之怒', style: 'shadow', color: 0xffd24a },
  crown_odysseus: { name: '十二斧穿弓', style: 'rain', color: 0x9ac0ff },
  crown_atalanta: { name: '卡呂冬箭雨', style: 'rain', color: 0xa8e06a },
  crown_lumen: { name: '聖光裁決', style: 'thunder', color: 0xfff0a0 },
  crown_owl: { name: '獵魔瞬斬', style: 'shadow', color: 0xb0b0d0 },
  crown_gareth: { name: '屠龍一閃', style: 'charge', color: 0xd0e0ff },
  crown_meruna: { name: '星界崩壞', style: 'nova', color: 0xb08aff },
  crown_lane: { name: '覺醒斬龍', style: 'whirl', color: 0xff9a5a },
  crown_ira: { name: '神木庇佑', style: 'rally', color: 0x7ae08a },
  crown_hald: { name: '龍吼崩山', style: 'nova', color: 0xbfe0ff },
  crown_ulf: { name: '風暴龍語', style: 'thunder', color: 0xc8e0ff },
  crown_oserin: { name: '星隕天降', style: 'rain', color: 0x8ab0ff },
  crown_karon: { name: '煉獄焚天', style: 'nova', color: 0xff5a1a },
  crown_wuchen: { name: '萬劍歸宗', style: 'rain', color: 0xa8f0f8 },
  crown_xuehe: { name: '血河倒流', style: 'shadow', color: 0xe02a3a },
  fig_fallen: { name: '霜魂寒獄', style: 'nova', color: 0x9ad8ff },
  fig_warchief: { name: '雷霆戰歌', style: 'thunder', color: 0xa0e0ff },
  fig_marshal: { name: '軌道炮擊', style: 'rain', color: 0xffd080 },
  fig_prelate: { name: '靈能風暴', style: 'thunder', color: 0x6ae0f0 },
  fig_treelord: { name: '萬木復甦', style: 'rally', color: 0x7ad06a },
  fig_windranger: { name: '疾風連射', style: 'rain', color: 0x9af08a },
  fig_alchemist: { name: '熾礦核爆', style: 'nova', color: 0xff9a3a },
  fig_pethunter: { name: '靈犬突襲', style: 'shadow', color: 0xe0b06a },
};
export const musouOf = (id: string) => MUSOU[id];

export const crownOf = (id?: string) => CROWNS.find((c) => c.id === id);
export const GRAND_CROWNS = CROWNS.filter((c) => c.grand);
/** 大混戰揀到領軍嗰十五位，其他劇本揀自己嗰幾位 */
export const crownsIn = (scenario: string) => (scenario === 'chaos' ? GRAND_CROWNS : CROWNS.filter((c) => c.scenario === scenario));
/** 專屬兵器 id */
export const sigId = (c: { id: string }) => `sig_${c.id}`;
/** 去咗名銜嘅短名，大混戰軍號用 */
export const shortName = (c: CrownDef) => c.name.split(' ').pop()!;
