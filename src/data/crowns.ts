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
  /** 魔王陣營：大地圖撳 X 放滅世魔法 */
  doom?: boolean;
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
    army: [['lancer', 8], ['horseman', 8], ['dao_guard', 6]], gold: 2500, food: 150, home: 'xuan_city', color: 0xc8342c,
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
    army: [['horseman', 12], ['lancer', 4]], gold: 1800, food: 125, home: 'bashu_pass', color: 0xd8dce8,
  },
  {
    id: 'crown_taishici', cls: '弓術', name: '太史慈', scenario: 'threekingdoms', desc: '猿臂善射，弦不虛發', race: 'human',
    attrs: [12, 15, 8, 9], skills: { archery: 8, riding: 3 }, sig: ['虎筋弓', 'hero_bow', 12], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['archer', 14], ['dao_guard', 6]], gold: 1600, food: 80, home: 'linjiang', color: 0x4a7a5a,
  },
  {
    id: 'crown_cunxiao', cls: '武力', name: '李存孝', scenario: 'fivedynasties', desc: '王不過霸，將不過李；十八騎破長安', race: 'human', grand: true,
    attrs: [16, 13, 5, 7], skills: { riding: 6, ironskin: 3, tactics: 2 }, sig: ['禹王槊', 'hero_lance', 14], extra: ['axe'], horse: 'warhorse', armor: HEAVY,
    army: [['ya_guard', 6], ['lancer', 8], ['dao_guard', 6]], gold: 2200, food: 110, home: 'ironhelm_keep', color: 0x8a2c3a,
  },
  {
    id: 'crown_abaoji', cls: '騎術', name: '耶律阿保機', scenario: 'fivedynasties', desc: '統一諸部，鐵騎南望', race: 'human',
    attrs: [12, 13, 11, 13], skills: { riding: 7, leadership: 4, archery: 3 }, sig: ['鳴鏑強弓', 'hero_bow', 8], extra: ['sword', 'lance'], horse: 'steppe', armor: MEDIUM,
    army: [['horseman', 16], ['archer', 6]], gold: 3000, food: 150, home: 'xuan_city', color: 0x9a7a4a,
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
    army: [['barbarian', 18], ['auxilia', 4]], gold: 800, food: 80, home: 'blackfang', color: 0xb08a4a,
  },
  {
    id: 'crown_richard', cls: '武力', name: '獅心王理查', scenario: 'crusade', desc: '永遠衝喺最前，國庫永遠係空', race: 'human', grand: true,
    attrs: [16, 11, 8, 13], skills: { riding: 5, ironskin: 5, leadership: 3 }, sig: ['獅心大斧', 'hero_axe', 10], extra: ['sword', 'lance'], horse: 'warhorse', armor: HEAVY,
    army: [['crusader', 8], ['sergeant', 10], ['crossbowman', 6]], gold: 1500, food: 125, home: 'griffon', color: 0xc84a2c,
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
    army: [['lane_creep', 14], ['elf_mage', 4]], gold: 1400, food: 70, home: 'songglade', color: 0x7fd06a,
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
  {
    id: 'crown_lijing', cls: '統率', name: '托塔天王 李靖', scenario: 'tianjie', desc: '掌天兵十萬，手上寶塔鎮得住魔', race: 'human',
    attrs: [11, 9, 12, 16], skills: { leadership: 8, tactics: 5 }, sig: ['玲瓏寶塔', 'lich_bolt', 12], extra: ['sword', 'ward'], horse: 'pegasus', armor: HEAVY,
    army: [['tian_bing', 14], ['tian_jiang', 5], ['tian_archer', 6]], gold: 4000, food: 150, home: 'ironhelm_keep', color: 0xe8c860,
  },
  {
    id: 'crown_juling', cls: '武力', name: '巨靈神', scenario: 'tianjie', desc: '一斧開山，天庭第一力士', race: 'human',
    attrs: [19, 7, 4, 7], skills: { ironskin: 8, tactics: 1 }, sig: ['宣花板斧', 'hero_axe', 12], extra: ['sword'], horse: 'hunter', armor: HEAVY,
    army: [['jin_jia', 3], ['tian_bing', 12]], gold: 1800, food: 110, home: 'griffon', color: 0xd8a83a,
  },
  {
    id: 'crown_leigong', cls: '魔導', name: '雷部天尊', scenario: 'tianjie', desc: '一聲令下，九天雷動', race: 'human',
    attrs: [8, 12, 18, 12], skills: { magic: 8, leadership: 3 }, sig: ['九霄神雷', 'lich_bolt', 14], extra: ['lightning', 'ward'], horse: 'griffin_mount', armor: MEDIUM,
    army: [['lei_bu', 6], ['tian_bing', 10]], gold: 3000, food: 100, home: 'xuan_city', color: 0x8ab0ff,
  },
  {
    id: 'crown_change', cls: '弓術', name: '嫦娥', scenario: 'tianjie', desc: '廣寒宮主，月華為箭', race: 'human',
    attrs: [6, 17, 14, 13], skills: { archery: 7, magic: 3 }, sig: ['太陰弓', 'hero_bow', 12], extra: ['heal', 'sword'], horse: 'unicorn', armor: LIGHT,
    army: [['tian_archer', 10], ['tian_bing', 6]], gold: 2500, food: 100, home: 'chishui_fort', color: 0xd8e4ff,
  },
  {
    id: 'crown_xuehai', cls: '武力', name: '血海魔君', scenario: 'tianjie', desc: '率魔界先鋒殺上南天門', race: 'demon',
    attrs: [17, 13, 10, 8], skills: { ironskin: 5, magic: 3 }, sig: ['血海魔刀', 'hero_blade', 16], extra: ['fireball'], horse: 'nightmare', armor: HEAVY,
    army: [['demon_grunt', 12], ['ye_cha', 5]], gold: 2000, food: 80, home: 'blackfang', color: 0xc8342c,
  },
  {
    id: 'crown_wukong', cls: '武力', name: '孫悟空', scenario: 'xiyou', desc: '齊天大聖，一個筋斗十萬八千里', race: 'human',
    attrs: [18, 19, 12, 9], skills: { ironskin: 6, tactics: 2 }, sig: ['如意金箍棒', 'hero_lance', 22], extra: ['heal'], horse: 'griffin_mount', armor: MEDIUM,
    army: [['yao_bing', 14], ['yao_jiang', 3]], gold: 1500, food: 100, home: 'ironhelm_keep', color: 0xf2c14e,
  },
  {
    id: 'crown_tangseng', cls: '統率', name: '唐三藏', scenario: 'xiyou', desc: '手無寸鐵，一心向西', race: 'human',
    attrs: [4, 6, 16, 19], skills: { leadership: 8, medicine: 6 }, sig: ['九環錫杖', 'lich_bolt', 8], extra: ['heal', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['dao_guard', 14], ['archer', 8]], gold: 5000, food: 160, home: 'griffon', color: 0xe8d8a8,
  },
  {
    id: 'crown_bajie', cls: '武力', name: '豬八戒', scenario: 'xiyou', desc: '食得打得，三十六變', race: 'human',
    attrs: [16, 8, 8, 13], skills: { ironskin: 6, trade: 3 }, sig: ['九齒釘鈀', 'hero_axe', 10], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['yao_bing', 12], ['shui_zu', 4]], gold: 1800, food: 140, home: 'xuan_city', color: 0xe8a8b8,
  },
  {
    id: 'crown_wujing', cls: '統率', name: '沙悟淨', scenario: 'xiyou', desc: '流沙河出身，挑擔行天下', race: 'human',
    attrs: [14, 9, 10, 12], skills: { ironskin: 5, leadership: 4 }, sig: ['降妖寶杖', 'hero_lance', 12], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['shui_zu', 12], ['dao_guard', 6]], gold: 2000, food: 110, home: 'bashu_pass', color: 0x4a8a9a,
  },
  {
    id: 'crown_niumo', cls: '武力', name: '牛魔王', scenario: 'xiyou', desc: '七十二洞妖王之首', race: 'minotaur',
    attrs: [19, 10, 9, 11], skills: { ironskin: 7, leadership: 3 }, sig: ['混鐵棍', 'hero_axe', 12], extra: ['fireball'], horse: 'hunter', armor: HEAVY,
    army: [['yao_jiang', 8], ['yao_bing', 12]], gold: 3000, food: 110, home: 'chishui_fort', color: 0x4a3020,
  },
  {
    id: 'crown_tieshan', cls: '魔導', name: '鐵扇公主', scenario: 'xiyou', desc: '一扇熄火，二扇生風，三扇落雨', race: 'human',
    attrs: [8, 14, 17, 12], skills: { magic: 8, trade: 2 }, sig: ['芭蕉扇', 'frost_nova', 8], extra: ['ward', 'sword'], horse: 'tiger', armor: LIGHT,
    army: [['yao_jiang', 4], ['yao_bing', 10]], gold: 3500, food: 100, home: 'chishui_fort', color: 0xe87a4a,
  },
  {
    id: 'crown_ziya', cls: '智略', name: '姜子牙', scenario: 'fengshen', desc: '七十二歲下山，手持打神鞭', race: 'human',
    attrs: [6, 8, 19, 15], skills: { tactics: 8, magic: 5, leadership: 4 }, sig: ['打神鞭', 'lich_bolt', 12], extra: ['ward', 'heal'], horse: 'unicorn', armor: LIGHT,
    army: [['dao_guard', 14], ['crossbowman', 8]], gold: 4500, food: 150, home: 'griffon', color: 0xd8c8a0,
  },
  {
    id: 'crown_nezha', cls: '騎術', name: '哪吒', scenario: 'fengshen', desc: '三頭六臂，腳踏風火輪', race: 'human',
    attrs: [15, 19, 9, 8], skills: { riding: 8, ironskin: 3 }, sig: ['火尖槍', 'hero_lance', 16], extra: ['fireball'], horse: 'nightmare', armor: MEDIUM,
    army: [['lancer', 8], ['dao_guard', 8]], gold: 2000, food: 110, home: 'bashu_pass', color: 0xe8542c,
  },
  {
    id: 'crown_yangjian', cls: '武力', name: '楊戩', scenario: 'fengshen', desc: '三隻眼，七十三變，哮天犬隨身', race: 'human',
    attrs: [17, 16, 13, 10], skills: { ironskin: 5, magic: 4, tactics: 3 }, sig: ['三尖兩刃刀', 'hero_lance', 18], extra: ['longbow'], horse: 'tiger', armor: HEAVY,
    army: [['tian_jiang', 5], ['dao_guard', 8]], gold: 2500, food: 110, home: 'songglade', color: 0xe8e8f0,
  },
  {
    id: 'crown_wenzhong', cls: '魔導', name: '太師聞仲', scenario: 'fengshen', desc: '三隻眼洞悉忠奸，雌雄鞭鎮朝歌', race: 'human',
    attrs: [13, 10, 17, 14], skills: { magic: 7, leadership: 5 }, sig: ['雌雄金鞭', 'lich_bolt', 14], extra: ['lightning', 'sword'], horse: 'drake', armor: HEAVY,
    army: [['dao_guard', 12], ['lei_bu', 4], ['crossbowman', 6]], gold: 3500, food: 120, home: 'ironhelm_keep', color: 0x7a4ae0,
  },
  {
    id: 'crown_daji', cls: '暗影', name: '妲己', scenario: 'fengshen', desc: '千年狐精，一笑傾國', race: 'demon',
    attrs: [6, 17, 16, 18], skills: { magic: 6, trade: 4 }, sig: ['九尾魅火', 'lich_fire', 10], extra: ['heal', 'sword'], horse: 'dire_wolf', armor: LIGHT,
    army: [['yao_jiang', 5], ['yao_bing', 12]], gold: 4000, food: 100, home: 'blackfang', color: 0xe84a8a,
  },
  {
    id: 'crown_huangdi', cls: '統率', name: '軒轅黃帝', scenario: 'shenhua', desc: '統御諸部，人文初祖', race: 'human',
    attrs: [13, 11, 15, 18], skills: { leadership: 8, tactics: 6 }, sig: ['軒轅劍', 'hero_blade', 14], extra: ['horsebow'], horse: 'warhorse', armor: HEAVY,
    army: [['pikeman', 14], ['archer', 8], ['axeman', 5]], gold: 4500, food: 160, home: 'griffon', color: 0xf2c14e,
  },
  {
    id: 'crown_chiyou', cls: '武力', name: '蚩尤', scenario: 'shenhua', desc: '銅頭鐵額，八十一兄弟', race: 'minotaur',
    attrs: [20, 11, 10, 11], skills: { ironskin: 8, tactics: 3 }, sig: ['五兵戰斧', 'hero_axe', 12], extra: ['sword'], horse: 'hunter', armor: HEAVY,
    army: [['yao_jiang', 8], ['axeman', 8]], gold: 2500, food: 110, home: 'xuan_city', color: 0x8a2c3a,
  },
  {
    id: 'crown_houyi', cls: '弓術', name: '后羿', scenario: 'shenhua', desc: '十日並出，一箭一個', race: 'human',
    attrs: [14, 16, 9, 11], skills: { archery: 8, ironskin: 2 }, sig: ['射日神弓', 'hero_bow', 18], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['archer', 14], ['pikeman', 6]], gold: 1800, food: 100, home: 'bashu_pass', color: 0xffb84a,
  },
  {
    id: 'crown_nvwa', cls: '魔導', name: '女媧', scenario: 'shenhua', desc: '煉石補天，摶土造人', race: 'human',
    attrs: [8, 11, 20, 17], skills: { magic: 8, medicine: 8 }, sig: ['五色神石', 'lich_fire', 14], extra: ['heal', 'ward'], horse: 'griffin_mount', armor: LIGHT,
    army: [['lei_bu', 4], ['pikeman', 12]], gold: 4000, food: 130, home: 'linjiang', color: 0x8ae0c8,
  },
  {
    id: 'crown_xingtian', cls: '武力', name: '刑天', scenario: 'shenhua', desc: '斷頭猶舞干戚，猛志固常在', race: 'human',
    attrs: [18, 12, 6, 12], skills: { ironskin: 8 }, sig: ['干戚', 'hero_axe', 10], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['axeman', 12], ['pikeman', 6]], gold: 1200, food: 100, home: 'spire', color: 0xa84a3a,
  },
  {
    id: 'crown_zhongkui', cls: '武力', name: '鍾馗', scenario: 'fengdu', desc: '天下第一捉鬼師，鬼見都驚', race: 'human',
    attrs: [16, 11, 13, 10], skills: { ironskin: 5, magic: 4 }, sig: ['斬鬼劍', 'hero_blade', 16], extra: ['fireball'], horse: 'hunter', armor: MEDIUM,
    army: [['yin_cha', 10], ['gui_zu', 8]], gold: 2200, food: 110, home: 'griffon', color: 0x3a4a6a,
  },
  {
    id: 'crown_yanluo', cls: '統率', name: '閻羅王', scenario: 'fengdu', desc: '生死簿在手，判官隨侍', race: 'human',
    attrs: [13, 9, 16, 16], skills: { leadership: 8, tactics: 4, magic: 3 }, sig: ['判官筆', 'lich_bolt', 14], extra: ['ward', 'sword'], horse: 'nightmare', armor: HEAVY,
    army: [['niu_tou', 3], ['ma_mian', 5], ['gui_zu', 12]], gold: 4000, food: 120, home: 'wuyi', color: 0x2a2a3a,
  },
  {
    id: 'crown_wuchang', cls: '暗影', name: '黑白無常', scenario: 'fengdu', desc: '一見生財，天下太平', race: 'undead',
    attrs: [12, 18, 12, 9], skills: { ironskin: 3, magic: 4 }, sig: ['勾魂索', 'hero_blade', 12], extra: ['lightning'], horse: 'hunter', armor: LIGHT,
    army: [['yin_cha', 12], ['wang_hun', 4]], gold: 2000, food: 60, home: 'ironhelm_keep', color: 0xd8d8e0,
  },
  {
    id: 'crown_mengpo', cls: '魔導', name: '孟婆', scenario: 'fengdu', desc: '一碗湯，前塵盡忘', race: 'undead',
    attrs: [5, 9, 19, 14], skills: { magic: 8, medicine: 6 }, sig: ['忘川湯', 'frost_nova', 8], extra: ['heal', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['wang_hun', 8], ['gui_zu', 8]], gold: 2500, food: 60, home: 'shadowspire', color: 0x8ac8d8,
  },
  {
    id: 'crown_hades', cls: '統率', name: '哈迪斯', scenario: 'mingfu', desc: '冥界之王，雙叉戟定生死', race: 'undead',
    attrs: [15, 10, 16, 15], skills: { leadership: 7, magic: 5 }, sig: ['冥王雙叉戟', 'hero_lance', 16], extra: ['lightning', 'ward'], horse: 'nightmare', armor: HEAVY,
    army: [['styx_guard', 12], ['grave_knight', 5], ['wang_hun', 4]], gold: 4500, food: 60, home: 'griffon', color: 0x3a2a5a,
  },
  {
    id: 'crown_persephone', cls: '魔導', name: '波瑟芬妮', scenario: 'mingfu', desc: '半年春神，半年冥后', race: 'human',
    attrs: [6, 13, 18, 16], skills: { magic: 8, medicine: 5 }, sig: ['冥石榴', 'lich_fire', 12], extra: ['heal', 'ward'], horse: 'unicorn', armor: LIGHT,
    army: [['wang_hun', 6], ['styx_guard', 8]], gold: 3500, food: 90, home: 'ironhelm_keep', color: 0xc84a8a,
  },
  {
    id: 'crown_anubis', cls: '暗影', name: '阿努比斯', scenario: 'mingfu', desc: '秤心之神，胡狼首引魂', race: 'beastkin',
    attrs: [14, 17, 15, 9], skills: { ironskin: 4, magic: 5 }, sig: ['秤心權杖', 'hero_blade', 14], extra: ['lightning'], horse: 'hunter', armor: MEDIUM,
    army: [['jackal_guard', 8], ['skeleton', 8]], gold: 2500, food: 80, home: 'chishui_fort', color: 0xc8a040,
  },
  {
    id: 'crown_orpheus', cls: '智略', name: '奧爾弗斯', scenario: 'mingfu', desc: '琴聲可以令冥王落淚', race: 'human',
    attrs: [6, 12, 17, 18], skills: { tactics: 6, leadership: 5, medicine: 3 }, sig: ['金豎琴', 'psi_bolt', 14], extra: ['heal', 'sword'], horse: 'hunter', armor: LIGHT,
    army: [['wang_hun', 5], ['styx_guard', 8]], gold: 3000, food: 120, home: 'anvilhold', color: 0xf2e08a,
  },
  {
    id: 'crown_helion', cls: '統率', name: '光耀神王 赫利昂', scenario: 'shenmo', desc: '諸神之首，一手托住晨光', race: 'human',
    attrs: [14, 11, 16, 17], skills: { leadership: 8, magic: 5 }, sig: ['晨曦神槍', 'hero_lance', 16], extra: ['lightning', 'ward'], horse: 'griffin_mount', armor: HEAVY,
    army: [['tian_jiang', 6], ['tian_bing', 14]], gold: 4500, food: 150, home: 'griffon', color: 0xffe8a0,
  },
  {
    id: 'crown_ares', cls: '武力', name: '戰神 雷戈斯', scenario: 'shenmo', desc: '未敗過一場，亦未停過一場', race: 'human',
    attrs: [19, 14, 8, 11], skills: { ironskin: 7, tactics: 3 }, sig: ['裂天戰斧', 'hero_axe', 14], extra: ['sword'], horse: 'warhorse', armor: HEAVY,
    army: [['jin_jia', 3], ['tian_bing', 12]], gold: 2500, food: 120, home: 'ironhelm_keep', color: 0xe0542c,
  },
  {
    id: 'crown_modis', cls: '暗影', name: '暗皇 莫迪斯', scenario: 'shenmo', desc: '魔王軍之主，連影都怕佢', race: 'demon',
    attrs: [16, 15, 16, 12], skills: { magic: 6, ironskin: 3 }, sig: ['噬光魔劍', 'hero_blade', 16], extra: ['fireball', 'ward'], horse: 'nightmare', armor: HEAVY,
    army: [['demon_grunt', 12], ['ye_cha', 6]], gold: 3000, food: 80, home: 'songglade', color: 0x7a2ae0,
  },
  {
    id: 'crown_lilis', cls: '魔導', name: '魔后 莉絲', scenario: 'shenmo', desc: '一曲可以令神族叛變', race: 'demon',
    attrs: [7, 15, 19, 16], skills: { magic: 8, trade: 3 }, sig: ['深淵魔焰', 'lich_fire', 14], extra: ['heal', 'ward'], horse: 'dire_wolf', armor: LIGHT,
    army: [['demon_cultist', 5], ['demon_grunt', 8]], gold: 3500, food: 80, home: 'anvilhold', color: 0xe84a8a,
  },
  {
    id: 'crown_daoling', cls: '魔導', name: '張天師', scenario: 'maoshan', desc: '龍虎山祖師，五雷正法鎮百鬼', race: 'human',
    attrs: [8, 10, 19, 16], skills: { magic: 8, leadership: 4, medicine: 3 }, sig: ['五雷法印', 'lich_bolt', 14], extra: ['heal', 'ward'], horse: 'hunter', armor: LIGHT,
    army: [['dao_zhang', 6], ['dao_tong', 10]], gold: 3500, food: 130, home: 'ironhelm_keep', color: 0xf2d870,
  },
  {
    id: 'crown_shouyi', cls: '智略', name: '茅山掌教 守一子', scenario: 'maoshan', desc: '一字眉一身正氣，黃符糯米樣樣齊', race: 'human',
    attrs: [12, 13, 16, 13], skills: { magic: 6, tactics: 5, medicine: 4 }, sig: ['桃木法劍', 'flying_sword', 12], extra: ['heal', 'sword'], horse: 'hunter', armor: LIGHT,
    army: [['dao_tong', 12], ['dao_zhang', 4]], gold: 2500, food: 120, home: 'griffon', color: 0xe8d048,
  },
  {
    id: 'crown_yanchixia', cls: '武力', name: '燕赤霞', scenario: 'maoshan', desc: '蘭若寺斬妖嘅劍客', race: 'human',
    attrs: [15, 15, 13, 9], skills: { ironskin: 4, magic: 4 }, sig: ['斬妖神劍', 'flying_sword', 16], extra: ['sword', 'ward'], horse: 'hunter', armor: MEDIUM,
    army: [['dao_guard', 10], ['dao_tong', 6]], gold: 1800, food: 100, home: 'linjiang', color: 0x8ad0e0,
  },
  {
    id: 'crown_xiaoqian', cls: '暗影', name: '聶小倩', scenario: 'maoshan', desc: '蘭若寺女鬼，心地比人仲好', race: 'undead',
    attrs: [5, 18, 16, 15], skills: { magic: 6, trade: 2 }, sig: ['幽魂魅影', 'lich_bolt', 10], extra: ['heal'], horse: 'hunter', armor: LIGHT,
    army: [['nv_gui', 6], ['gui_zu', 8]], gold: 2000, food: 60, home: 'linjiang', color: 0xe8e8ff,
  },
  {
    id: 'crown_leijie', cls: '武力', name: '特勤探員 雷傑', scenario: 'biocity', desc: '第一日返工就撞正全城喪屍', race: 'human',
    attrs: [13, 15, 11, 12], skills: { archery: 7, riding: 3, ironskin: 3 }, sig: ['專用手槍', 'gauss_rifle', 14], extra: ['sword'], horse: 'hoverbike', armor: MEDIUM,
    army: [['marine_trooper', 12], ['flame_trooper', 4]], gold: 3000, food: 120, home: 'griffon', color: 0x3a4a5a,
  },
  {
    id: 'crown_tiege', cls: '統率', name: '傭兵隊長 鐵鷹', scenario: 'biocity', desc: '收錢辦事，但唔會丟低隊友', race: 'human',
    attrs: [14, 12, 12, 15], skills: { leadership: 7, tactics: 5, archery: 3 }, sig: ['重型機槍', 'gauss_rifle', 18], extra: ['sword'], horse: 'hoverbike', armor: HEAVY,
    army: [['marine_trooper', 14], ['walker_mech', 2]], gold: 3500, food: 130, home: 'xuan_city', color: 0x6a6a4a,
  },
  {
    id: 'crown_wendy', cls: '智略', name: '生化學家 溫蒂', scenario: 'biocity', desc: '份解藥只有佢識調', race: 'human',
    attrs: [6, 14, 19, 13], skills: { medicine: 8, tactics: 4, trade: 3 }, sig: ['麻醉狙擊槍', 'gauss_rifle', 12], extra: ['heal', 'sword'], horse: 'hoverbike', armor: LIGHT,
    army: [['marine_trooper', 10], ['flame_trooper', 3]], gold: 4000, food: 120, home: 'linjiang', color: 0xe8e8e0,
  },
  {
    id: 'crown_qinguang', cls: '統率', name: '一殿秦廣王', scenario: 'fengdu', desc: '孽鏡台前照見一生善惡', race: 'human',
    attrs: [11, 9, 15, 16], skills: { leadership: 7, tactics: 4 }, sig: ['孽鏡天光', 'lich_bolt', 12], extra: ['ward','sword'], horse: 'nightmare', armor: HEAVY,
    army: [['yin_cha', 10], ['gui_zu', 10]], gold: 3500, food: 110, home: 'ironhelm_keep', color: 0x4a4a7a,
  },
  {
    id: 'crown_chujiang', cls: '魔導', name: '二殿楚江王', scenario: 'fengdu', desc: '掌活大地獄，寒冰加身', race: 'human',
    attrs: [9, 9, 18, 12], skills: { magic: 8 }, sig: ['寒冰獄印', 'frost_nova', 8], extra: ['ward','sword'], horse: 'hunter', armor: MEDIUM,
    army: [['wang_hun', 6], ['gui_zu', 10]], gold: 3000, food: 100, home: 'xuan_city', color: 0x6ab8d8,
  },
  {
    id: 'crown_songdi', cls: '武力', name: '三殿宋帝王', scenario: 'fengdu', desc: '黑繩大地獄主，索到就走唔甩', race: 'human',
    attrs: [16, 13, 9, 10], skills: { ironskin: 6, tactics: 2 }, sig: ['黑繩鎖魂槍', 'hero_lance', 14], extra: ['sword'], horse: 'hunter', armor: HEAVY,
    army: [['yin_cha', 8], ['ma_mian', 4]], gold: 2500, food: 100, home: 'bashu_pass', color: 0x3a3a4a,
  },
  {
    id: 'crown_wuguan', cls: '智略', name: '四殿五官王', scenario: 'fengdu', desc: '合大地獄，專審騙人嘅奸商', race: 'human',
    attrs: [8, 10, 18, 14], skills: { tactics: 7, trade: 5 }, sig: ['五官判筆', 'lich_bolt', 11], extra: ['heal','sword'], horse: 'hunter', armor: MEDIUM,
    army: [['wang_hun', 5], ['yin_cha', 8]], gold: 4000, food: 110, home: 'linjiang', color: 0x8a7a4a,
  },
  {
    id: 'crown_biancheng', cls: '暗影', name: '六殿卞城王', scenario: 'fengdu', desc: '叫喚大地獄，枉死城都歸佢管', race: 'undead',
    attrs: [13, 16, 13, 9], skills: { ironskin: 3, magic: 4 }, sig: ['枉死刀', 'hero_blade', 14], extra: ['lightning'], horse: 'hunter', armor: MEDIUM,
    army: [['gui_zu', 12], ['ye_cha', 3]], gold: 2200, food: 60, home: 'chishui_fort', color: 0x5a2a3a,
  },
  {
    id: 'crown_taishan', cls: '武力', name: '七殿泰山王', scenario: 'fengdu', desc: '熱惱地獄主，一錘碓碎山石', race: 'human',
    attrs: [18, 8, 9, 11], skills: { ironskin: 7 }, sig: ['碓磨巨錘', 'hero_axe', 11], extra: ['sword'], horse: 'hunter', armor: HEAVY,
    army: [['niu_tou', 3], ['gui_zu', 10]], gold: 2500, food: 100, home: 'qingcheng_pass', color: 0x6a4a2a,
  },
  {
    id: 'crown_dushi', cls: '魔導', name: '八殿都市王', scenario: 'fengdu', desc: '大熱惱地獄，火海無邊', race: 'human',
    attrs: [9, 11, 18, 10], skills: { magic: 8 }, sig: ['熱惱獄火', 'ember_blast', 10], extra: ['ward','heal'], horse: 'hunter', armor: MEDIUM,
    army: [['wang_hun', 5], ['ye_cha', 4]], gold: 2800, food: 100, home: 'songglade', color: 0xe0542a,
  },
  {
    id: 'crown_pingdeng', cls: '智略', name: '九殿平等王', scenario: 'fengdu', desc: '阿鼻地獄前，人人平等', race: 'human',
    attrs: [10, 10, 17, 15], skills: { tactics: 6, leadership: 5 }, sig: ['平等天秤', 'psi_bolt', 12], extra: ['ward','sword'], horse: 'hunter', armor: MEDIUM,
    army: [['yin_cha', 10], ['wang_hun', 4]], gold: 3200, food: 110, home: 'anvilhold', color: 0xc8c8d0,
  },
  {
    id: 'crown_zhuanlun', cls: '統率', name: '十殿轉輪王', scenario: 'fengdu', desc: '六道輪迴由佢撥動', race: 'human',
    attrs: [10, 11, 16, 17], skills: { leadership: 8, magic: 4 }, sig: ['六道法輪', 'psi_bolt', 14], extra: ['heal','ward'], horse: 'unicorn', armor: MEDIUM,
    army: [['yin_cha', 10], ['ma_mian', 4], ['gui_zu', 6]], gold: 4000, food: 120, home: 'blackfang', color: 0xd8b84a,
  },
  {
    id: 'crown_cuijue', cls: '智略', name: '判官 崔玨', scenario: 'fengdu', desc: '生死簿改一筆，陽壽加一紀', race: 'human',
    attrs: [7, 11, 18, 14], skills: { tactics: 6, medicine: 5 }, sig: ['勾魂朱筆', 'lich_bolt', 12], extra: ['heal','sword'], horse: 'hunter', armor: LIGHT,
    army: [['yin_cha', 8], ['wang_hun', 4]], gold: 3000, food: 100, home: 'wuyi', color: 0xa82a2a,
  },
  {
    id: 'crown_niutou', cls: '武力', name: '牛頭', scenario: 'fengdu', desc: '奈何橋頭守門，鋼叉一舉鬼都驚', race: 'minotaur',
    attrs: [19, 10, 6, 8], skills: { ironskin: 6 }, sig: ['鋼叉', 'hero_lance', 14], extra: ['axe'], horse: 'hunter', armor: HEAVY,
    army: [['gui_zu', 10], ['yin_cha', 4]], gold: 1800, food: 110, home: 'wuyi', color: 0x4a3020,
  },
  {
    id: 'crown_mamian', cls: '騎術', name: '馬面', scenario: 'fengdu', desc: '日行千里拘魂，快過生死簿', race: 'beastkin',
    attrs: [14, 18, 8, 9], skills: { riding: 7, tactics: 2 }, sig: ['拘魂槍', 'hero_lance', 12], extra: ['sword'], horse: 'nightmare', armor: MEDIUM,
    army: [['ma_mian', 4], ['gui_zu', 8]], gold: 1800, food: 90, home: 'wuyi', color: 0x5a4030,
  },
  {
    id: 'crown_honghai', cls: '魔導', name: '紅孩兒', scenario: 'xiyou', desc: '三昧真火連行者都怕', race: 'demon',
    attrs: [11, 16, 15, 8], skills: { magic: 7 }, sig: ['三昧真火', 'ember_blast', 12], extra: ['fireball'], horse: 'tiger', armor: LIGHT,
    army: [['yao_jiang', 4], ['yao_bing', 10]], gold: 2200, food: 90, home: 'chishui_fort', color: 0xe03a2a,
  },
  {
    id: 'crown_baigu', cls: '暗影', name: '白骨夫人', scenario: 'xiyou', desc: '三變三騙，一堆白骨', race: 'undead',
    attrs: [8, 17, 17, 14], skills: { magic: 6 }, sig: ['白骨魅影', 'lich_bolt', 10], extra: ['heal'], horse: 'hunter', armor: LIGHT,
    army: [['skeleton', 12], ['yao_bing', 6]], gold: 2200, food: 60, home: 'blackfang', color: 0xe8e0d0,
  },
  {
    id: 'crown_taibai', cls: '智略', name: '太白金星', scenario: 'tianjie', desc: '天庭第一和事老', race: 'human',
    attrs: [6, 10, 18, 17], skills: { tactics: 6, trade: 5, leadership: 4 }, sig: ['拂塵金光', 'lich_bolt', 10], extra: ['heal','ward'], horse: 'pegasus', armor: LIGHT,
    army: [['tian_bing', 12], ['tian_archer', 5]], gold: 4500, food: 130, home: 'griffon', color: 0xf0f0e0,
  },
  {
    id: 'crown_leizhen', cls: '魔導', name: '雷震子', scenario: 'fengshen', desc: '脅生雙翼，黃金棍帶雷', race: 'human',
    attrs: [14, 17, 14, 8], skills: { magic: 5, riding: 3 }, sig: ['風雷棍', 'hero_lance', 12], extra: ['lightning'], horse: 'griffin_mount', armor: MEDIUM,
    army: [['lei_bu', 4], ['dao_guard', 8]], gold: 2200, food: 100, home: 'griffon', color: 0x6a8ae8,
  },
  {
    id: 'crown_feihu', cls: '統率', name: '黃飛虎', scenario: 'fengshen', desc: '反出五關嘅武成王', race: 'human',
    attrs: [15, 12, 11, 15], skills: { leadership: 7, riding: 4 }, sig: ['虎頭槍', 'hero_lance', 13], extra: ['sword'], horse: 'warhorse', armor: HEAVY,
    army: [['lancer', 6], ['dao_guard', 12]], gold: 3000, food: 130, home: 'ironhelm_keep', color: 0xd8a83a,
  },
  {
    id: 'crown_tuxing', cls: '暗影', name: '土行孫', scenario: 'fengshen', desc: '身矮本事大，一遁千里', race: 'human',
    attrs: [9, 19, 12, 9], skills: { tactics: 3 }, sig: ['捆仙繩', 'hero_blade', 12], extra: ['sword'], horse: 'hunter', armor: LIGHT,
    army: [['dao_guard', 10], ['archer', 4]], gold: 1800, food: 100, home: 'linjiang', color: 0x8a6a3a,
  },
  {
    id: 'crown_kuafu', cls: '武力', name: '夸父', scenario: 'shenhua', desc: '追日而亡，手杖化鄧林', race: 'human',
    attrs: [17, 16, 6, 9], skills: { ironskin: 5 }, sig: ['鄧林手杖', 'hero_axe', 10], extra: ['sword'], horse: 'hunter', armor: LIGHT,
    army: [['axeman', 10], ['pikeman', 6]], gold: 1500, food: 130, home: 'songglade', color: 0xe8a84a,
  },
  {
    id: 'crown_dayu', cls: '統率', name: '大禹', scenario: 'shenhua', desc: '三過家門不入，定九州', race: 'human',
    attrs: [13, 12, 14, 17], skills: { leadership: 8, tactics: 4 }, sig: ['開山神斧', 'hero_axe', 8], extra: ['heal'], horse: 'hunter', armor: MEDIUM,
    army: [['pikeman', 14], ['archer', 6]], gold: 4000, food: 150, home: 'griffon', color: 0x5a8ab0,
  },
  {
    id: 'crown_jingwei', cls: '魔導', name: '精衛', scenario: 'shenhua', desc: '銜石填海，至死不休', race: 'human',
    attrs: [5, 18, 16, 12], skills: { magic: 7 }, sig: ['銜石烈焰', 'lich_fire', 10], extra: ['heal'], horse: 'pegasus', armor: LIGHT,
    army: [['archer', 8], ['pikeman', 6]], gold: 2000, food: 100, home: 'linjiang', color: 0xf05a4a,
  },
  {
    id: 'crown_guanyu', cls: '武力', name: '關羽', scenario: 'threekingdoms', desc: '溫酒斬華雄，一把青龍偃月刀', race: 'human',
    attrs: [17, 12, 12, 14], skills: { riding: 6, ironskin: 3, leadership: 3 }, sig: ['青龍偃月刀', 'hero_lance', 17], extra: ['sword'], horse: 'warhorse', armor: HEAVY,
    army: [['dao_guard', 10], ['lancer', 6]], gold: 2500, food: 130, home: 'bashu_pass', color: 0x2a7a4a,
  },
  {
    id: 'crown_zhangfei', cls: '武力', name: '張飛', scenario: 'threekingdoms', desc: '長坂橋頭一吼退曹軍', race: 'human',
    attrs: [18, 11, 7, 10], skills: { ironskin: 5, riding: 3 }, sig: ['丈八蛇矛', 'hero_lance', 16], extra: ['axe'], horse: 'warhorse', armor: HEAVY,
    army: [['dao_guard', 10], ['horseman', 4]], gold: 2000, food: 120, home: 'bashu_pass', color: 0x2a2a30,
  },
  {
    id: 'crown_zhouyu', cls: '智略', name: '周瑜', scenario: 'threekingdoms', desc: '羽扇綸巾，談笑間檣櫓灰飛煙滅', race: 'human',
    attrs: [9, 12, 17, 15], skills: { tactics: 7, leadership: 4 }, sig: ['赤壁火令', 'lich_fire', 8], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['crossbowman', 10], ['dao_guard', 8]], gold: 3500, food: 130, home: 'linjiang', color: 0xc8342c,
  },
  {
    id: 'crown_simayi', cls: '智略', name: '司馬懿', scenario: 'threekingdoms', desc: '鷹視狼顧，忍到最後', race: 'human',
    attrs: [8, 9, 18, 13], skills: { tactics: 8, leadership: 3 }, sig: ['鷹視軍令', 'elite_crossbow', 10], extra: ['sword'], horse: 'hunter', armor: MEDIUM,
    army: [['crossbowman', 12], ['dao_guard', 10]], gold: 4000, food: 140, home: 'griffon', color: 0x3a3a5a,
  },
  {
    id: 'crown_hecate', cls: '魔導', name: '赫卡忒', scenario: 'mingfu', desc: '三岔路口嘅巫術女神', race: 'human',
    attrs: [6, 12, 19, 14], skills: { magic: 8 }, sig: ['三相火炬', 'lich_fire', 13], extra: ['ward','heal'], horse: 'hunter', armor: LIGHT,
    army: [['necromancer', 3], ['skeleton', 12]], gold: 3000, food: 80, home: 'qingcheng_pass', color: 0x8a4ae0,
  },
  {
    id: 'crown_osiris', cls: '統率', name: '奧西里斯', scenario: 'mingfu', desc: '死而復生嘅冥界之王', race: 'undead',
    attrs: [13, 9, 16, 16], skills: { leadership: 7, medicine: 4 }, sig: ['冥王權杖', 'lich_bolt', 13], extra: ['heal','sword'], horse: 'hunter', armor: MEDIUM,
    army: [['jackal_guard', 6], ['skeleton', 12]], gold: 3500, food: 60, home: 'wuyi', color: 0x4a9a6a,
  },
  {
    id: 'crown_hela', cls: '暗影', name: '海拉', scenario: 'mingfu', desc: '半身生半身死，赫爾海姆之主', race: 'undead',
    attrs: [14, 14, 16, 10], skills: { magic: 5, ironskin: 4 }, sig: ['死霧之刃', 'hero_blade', 15], extra: ['frost_nova'], horse: 'nightmare', armor: MEDIUM,
    army: [['grave_knight', 5], ['skeleton', 10]], gold: 2500, food: 60, home: 'chishui_fort', color: 0x5a6a8a,
  },
  {
    id: 'crown_zanghun', cls: '魔導', name: '葬魂王', scenario: 'doomlord', desc: '枯骨冠冕下嘅不死帝王，要將世界帶入永眠', race: 'undead', doom: true,
    attrs: [10, 9, 20, 16], skills: { magic: 8, leadership: 5 }, sig: ['歸寂魔杖', 'lich_fire', 18], extra: ['lightning', 'ward', 'heal'], horse: 'nightmare', armor: MEDIUM,
    army: [['death_rider', 4], ['grave_knight', 6], ['skeleton', 14]], gold: 5000, food: 40, home: 'griffon', color: 0x4a2a7a,
  },
  {
    id: 'crown_feiye', cls: '武力', name: '血姬 緋夜', scenario: 'doomlord', desc: '活咗千年嘅吸血貴族，戰場就係佢嘅舞會', race: 'vampire', doom: true,
    attrs: [15, 18, 12, 13], skills: { ironskin: 4, riding: 3 }, sig: ['絳血長槍', 'hero_lance', 17], extra: ['heal'], horse: 'nightmare', armor: MEDIUM,
    army: [['vampire', 4], ['skeleton', 12]], gold: 3000, food: 40, home: 'ironhelm_keep', color: 0x8a1a2c,
  },
  {
    id: 'crown_xuance', cls: '智略', name: '魔相 玄策', scenario: 'doomlord', desc: '一紙毒計勝過十萬魔軍', race: 'demon', doom: true,
    attrs: [10, 12, 19, 15], skills: { tactics: 8, trade: 4, magic: 3 }, sig: ['業火契約', 'lich_fire', 12], extra: ['ward', 'sword'], horse: 'drake', armor: LIGHT,
    army: [['demon_grunt', 10], ['demon_cultist', 5]], gold: 4500, food: 80, home: 'xuan_city', color: 0x7a1a24,
  },
  {
    id: 'crown_heiyao', cls: '統率', name: '黑曜騎士 墨淵', scenario: 'doomlord', desc: '黑甲之下冇血肉，只有誓言', race: 'undead', doom: true,
    attrs: [17, 11, 9, 14], skills: { leadership: 6, ironskin: 7, riding: 4 }, sig: ['黑曜巨刃', 'hero_axe', 12], extra: ['sword'], horse: 'nightmare', armor: HEAVY,
    army: [['death_rider', 5], ['grave_knight', 8]], gold: 3000, food: 40, home: 'bashu_pass', color: 0x1c1a24,
  },
  {
    id: 'crown_sheji', cls: '暗影', name: '蛇姬 鱗舞', scenario: 'doomlord', desc: '一眼望落去，石像又多一座', race: 'lizard', doom: true,
    attrs: [10, 17, 16, 14], skills: { magic: 6 }, sig: ['石化魔瞳', 'lich_bolt', 12], extra: ['heal', 'sword'], horse: 'dire_wolf', armor: LIGHT,
    army: [['lizard_warrior', 10], ['demon_cultist', 3]], gold: 2800, food: 90, home: 'linjiang', color: 0x3f8f70,
  },
  {
    id: 'crown_wuyin', cls: '弓術', name: '影弓 無音', scenario: 'doomlord', desc: '箭到咗，先聽到弦聲', race: 'darkelf', doom: true,
    attrs: [9, 19, 11, 9], skills: { archery: 8 }, sig: ['無音長弓', 'hero_bow', 13], extra: ['sword', 'lightning'], horse: 'dire_wolf', armor: LIGHT,
    army: [['darkelf_blade', 8], ['skeleton_archer', 8]], gold: 2500, food: 90, home: 'wuyi', color: 0x3a2a5a,
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
  crown_lijing: { name: '寶塔鎮魔', style: 'rally', color: 0xffe08a },
  crown_juling: { name: '開山一擊', style: 'nova', color: 0xffb84a },
  crown_leigong: { name: '九天應元', style: 'thunder', color: 0xa8c8ff },
  crown_change: { name: '月華萬箭', style: 'rain', color: 0xd8e8ff },
  crown_xuehai: { name: '血海滔天', style: 'whirl', color: 0xe0322a },
  crown_wukong: { name: '齊天大聖', style: 'whirl', color: 0xffd24a },
  crown_tangseng: { name: '緊箍真言', style: 'rally', color: 0xfff0c0 },
  crown_bajie: { name: '九齒連耙', style: 'charge', color: 0xf0a8b8 },
  crown_wujing: { name: '流沙捲地', style: 'nova', color: 0xc8b078 },
  crown_niumo: { name: '牛魔衝撞', style: 'charge', color: 0xe0602a },
  crown_tieshan: { name: '三扇狂風', style: 'rain', color: 0xff9a4a },
  crown_ziya: { name: '封神榜', style: 'thunder', color: 0xffe8a0 },
  crown_nezha: { name: '風火輪', style: 'charge', color: 0xff5a2a },
  crown_yangjian: { name: '天眼神光', style: 'shadow', color: 0xe8f0ff },
  crown_wenzhong: { name: '雌雄雙鞭', style: 'thunder', color: 0xb08aff },
  crown_daji: { name: '九尾魅惑', style: 'shadow', color: 0xff6aa8 },
  crown_huangdi: { name: '指南破霧', style: 'rally', color: 0xffd24a },
  crown_chiyou: { name: '五兵齊出', style: 'whirl', color: 0xc8342c },
  crown_houyi: { name: '射日九箭', style: 'rain', color: 0xffc84a },
  crown_nvwa: { name: '煉石補天', style: 'nova', color: 0x8af0d0 },
  crown_xingtian: { name: '干戚狂舞', style: 'whirl', color: 0xe0602a },
  crown_zhongkui: { name: '斬鬼一劍', style: 'shadow', color: 0x8ab0e0 },
  crown_yanluo: { name: '生死簿', style: 'thunder', color: 0x6a4ae0 },
  crown_wuchang: { name: '勾魂奪魄', style: 'shadow', color: 0xe8e8f0 },
  crown_mengpo: { name: '忘川寒流', style: 'nova', color: 0x9ad8e8 },
  crown_hades: { name: '冥王降臨', style: 'nova', color: 0x7a4ae0 },
  crown_persephone: { name: '四季輪迴', style: 'rally', color: 0xe87ab0 },
  crown_anubis: { name: '秤心審判', style: 'shadow', color: 0xe8c84a },
  crown_orpheus: { name: '冥府之歌', style: 'rally', color: 0xf8e8a0 },
  crown_helion: { name: '晨曦審判', style: 'thunder', color: 0xfff0a0 },
  crown_ares: { name: '裂天一斧', style: 'nova', color: 0xff6a2a },
  crown_modis: { name: '噬光瞬殺', style: 'shadow', color: 0x9a4af0 },
  crown_lilis: { name: '深淵魅歌', style: 'rain', color: 0xf05aa0 },
  crown_daoling: { name: '五雷正法', style: 'thunder', color: 0xffe88a },
  crown_shouyi: { name: '八卦鎮屍', style: 'rally', color: 0xf8e080 },
  crown_yanchixia: { name: '劍氣縱橫', style: 'whirl', color: 0xa8e8f8 },
  crown_xiaoqian: { name: '幽魂纏身', style: 'shadow', color: 0xd8e0ff },
  crown_leijie: { name: '連環速射', style: 'rain', color: 0xffd080 },
  crown_tiege: { name: '火力全開', style: 'whirl', color: 0xff9a3a },
  crown_wendy: { name: '血清爆發', style: 'rally', color: 0x8af0a0 },
  crown_qinguang: { name: '孽鏡照魂', style: 'thunder', color: 0xc8d8ff },
  crown_chujiang: { name: '寒冰地獄', style: 'nova', color: 0x9ad8ff },
  crown_songdi: { name: '黑繩縛魂', style: 'charge', color: 0x8a8ab0 },
  crown_wuguan: { name: '五刑齊下', style: 'rain', color: 0xe8c86a },
  crown_biancheng: { name: '枉死索命', style: 'shadow', color: 0xd04a5a },
  crown_taishan: { name: '泰山壓頂', style: 'nova', color: 0xe8a040 },
  crown_dushi: { name: '八熱焚魂', style: 'rain', color: 0xff7a2a },
  crown_pingdeng: { name: '阿鼻無間', style: 'thunder', color: 0xe0e0ff },
  crown_zhuanlun: { name: '六道輪迴', style: 'rally', color: 0xffe08a },
  crown_cuijue: { name: '朱筆勾魂', style: 'shadow', color: 0xe04a3a },
  crown_niutou: { name: '鋼叉破陣', style: 'charge', color: 0xc88a3a },
  crown_mamian: { name: '追魂千里', style: 'charge', color: 0xe0d0b0 },
  crown_honghai: { name: '三昧真火', style: 'nova', color: 0xff5a1a },
  crown_baigu: { name: '三變白骨', style: 'shadow', color: 0xf0e8d8 },
  crown_taibai: { name: '金星墜天', style: 'rain', color: 0xfff0b0 },
  crown_leizhen: { name: '風雷雙翼', style: 'thunder', color: 0xa8d0ff },
  crown_feihu: { name: '反五關', style: 'charge', color: 0xffc84a },
  crown_tuxing: { name: '遁地奇襲', style: 'shadow', color: 0xc8a060 },
  crown_kuafu: { name: '逐日狂奔', style: 'charge', color: 0xffb84a },
  crown_dayu: { name: '定海治水', style: 'rally', color: 0x7ac8e8 },
  crown_jingwei: { name: '填海千石', style: 'rain', color: 0xff8a5a },
  crown_guanyu: { name: '青龍破陣', style: 'charge', color: 0x5ae08a },
  crown_zhangfei: { name: '長坂一吼', style: 'nova', color: 0xe8d86a },
  crown_zhouyu: { name: '火燒赤壁', style: 'rain', color: 0xff6a2a },
  crown_simayi: { name: '深謀遠慮', style: 'rally', color: 0x8a8ac8 },
  crown_hecate: { name: '三相月火', style: 'rain', color: 0xc07aff },
  crown_osiris: { name: '死者復甦', style: 'rally', color: 0x7ae0a0 },
  crown_hela: { name: '死霧籠罩', style: 'nova', color: 0x8aa8c8 },
  crown_zanghun: { name: '萬物歸寂', style: 'nova', color: 0x9a4af0 },
  crown_feiye: { name: '血月狂宴', style: 'whirl', color: 0xe02a4a },
  crown_xuance: { name: '業火審判', style: 'rain', color: 0xff5a2a },
  crown_heiyao: { name: '黑潮衝鋒', style: 'charge', color: 0x7a6aa8 },
  crown_sheji: { name: '萬蛇石化', style: 'shadow', color: 0x7ae0a0 },
  crown_wuyin: { name: '無聲箭雨', style: 'rain', color: 0xb0a0e0 },
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
