import type { ArmyEntry } from './battlefield';
import { FACTIONS } from './factions';
import type { Culture } from './formations';
import { PLACES } from './world';

export interface Scenario {
  id: string;
  name: string;
  desc: string;
  /** 用得嘅陣法文化 */
  cultures: Culture[];
  /** 十二組：勢力名、主城名，次序對應 FACTIONS */
  realms?: [string, string][];
  /** 守軍款式，循環派畀各國 */
  camps?: ArmyEntry[][];
  /** 村莊新兵 */
  levy: string;
  /** 酒館傭兵 */
  mercs: string[];
  /** 龍巢嘅 Boss 同地名 */
  boss?: { unit: string; lair: string; desc: string };
}

const army = (...list: [string, number][]): ArmyEntry[] => list.map(([unit, count]) => ({ unit, count }));

const EAST_MERCS = ['dao_guard', 'pikeman', 'archer', 'crossbowman', 'horseman', 'lancer', 'axeman'];
const WEST_MERCS = ['sergeant', 'pikeman', 'archer', 'crossbowman', 'horseman', 'lancer', 'axeman'];

export const SCENARIOS: Scenario[] = [
  {
    id: 'chaos', name: '大混戰', desc: '裂天大陸：中西魔幻全部同場，咩都有',
    cultures: ['east', 'west', 'magic'], levy: 'footman', mercs: WEST_MERCS,
  },
  {
    id: 'threekingdoms', name: '三國鼎立', desc: '魏蜀吳爭天下，群雄並起', cultures: ['east'], levy: 'dao_guard', mercs: EAST_MERCS,
    realms: [
      ['魏', '許都'], ['袁紹', '鄴城'], ['呂布', '下邳'], ['蜀', '成都'], ['吳', '建業'], ['孫策舊部', '吳郡'],
      ['劉表', '襄陽'], ['劉璋', '綿竹'], ['馬騰', '西涼'], ['公孫瓚', '易京'], ['張魯', '漢中'], ['董卓餘部', '長安'],
    ],
    camps: [army(['dao_guard', 14], ['pikeman', 8], ['crossbowman', 6], ['lancer', 3]), army(['dao_guard', 12], ['archer', 8], ['horseman', 5])],
    boss: { unit: 'boss_chimera', lair: '赤壁妖穴', desc: '傳說中嘅上古凶獸棲息之地。' },
  },
  {
    id: 'fivedynasties', name: '五代十國', desc: '藩鎮割據，牙兵篡位，朝為將相暮為囚', cultures: ['east'], levy: 'dao_guard', mercs: EAST_MERCS,
    realms: [
      ['後梁', '汴州'], ['後唐', '洛陽'], ['契丹', '幽州'], ['前蜀', '成都'], ['吳越', '杭州'], ['楚', '潭州'],
      ['閩', '福州'], ['南漢', '廣州'], ['荊南', '江陵'], ['南唐', '金陵'], ['北漢', '太原'], ['岐', '鳳翔'],
    ],
    camps: [army(['ya_guard', 6], ['dao_guard', 12], ['archer', 8]), army(['dao_guard', 14], ['horseman', 6], ['crossbowman', 5])],
  },
  {
    id: 'rome', name: '羅馬爭霸', desc: '軍團征服地中海，蠻族虎視眈眈', cultures: ['west'], levy: 'legionary', mercs: ['legionary', 'auxilia', 'barbarian', 'horseman'],
    realms: [
      ['羅馬', '羅馬城'], ['迦太基', '迦太基城'], ['高盧', '阿萊西亞'], ['帕提亞', '泰西封'], ['埃及', '亞歷山大港'], ['希臘', '雅典'],
      ['不列顛', '倫蒂尼姆'], ['日耳曼', '條頓堡'], ['努米底亞', '錫爾塔'], ['西班牙', '努曼提亞'], ['色雷斯', '拜占庭'], ['達契亞', '薩爾米澤圖薩'],
    ],
    camps: [army(['legionary', 14], ['auxilia', 8], ['horseman', 4]), army(['barbarian', 18], ['archer', 6], ['horseman', 4])],
  },
  {
    id: 'crusade', name: '十字軍東征', desc: '聖地之爭，騎士對決馬穆魯克', cultures: ['west'], levy: 'sergeant', mercs: ['sergeant', 'crossbowman', 'crusader', 'mamluk', 'archer'],
    realms: [
      ['耶路撒冷王國', '耶路撒冷'], ['安條克公國', '安條克'], ['的黎波里伯國', '的黎波里'], ['埃德薩伯國', '埃德薩'], ['阿尤布王朝', '開羅'], ['大馬士革', '大馬士革'],
      ['阿勒坡', '阿勒坡'], ['摩蘇爾', '摩蘇爾'], ['拜占庭', '君士坦丁堡'], ['威尼斯', '威尼斯'], ['羅姆蘇丹國', '科尼亞'], ['醫院騎士團', '騎士堡'],
    ],
    camps: [army(['sergeant', 12], ['crossbowman', 6], ['crusader', 5]), army(['footman', 12], ['archer', 8], ['mamluk', 6])],
  },
  {
    id: 'greek', name: '希臘神話', desc: '城邦重裝步兵對抗獨眼巨人同怪物', cultures: ['west', 'magic'], levy: 'hoplite', mercs: ['hoplite', 'archer', 'horseman', 'minotaur_guard'],
    realms: [
      ['雅典', '雅典'], ['斯巴達', '斯巴達'], ['底比斯', '底比斯'], ['科林斯', '科林斯'], ['克里特', '克諾索斯'], ['特洛伊', '特洛伊'],
      ['馬其頓', '佩拉'], ['色薩利', '拉里薩'], ['亞馬遜', '忒彌斯庫拉'], ['波斯', '波斯波利斯'], ['冥府信眾', '冥河渡口'], ['巨人族', '獨眼島'],
    ],
    camps: [army(['hoplite', 16], ['archer', 8], ['horseman', 3]), army(['hoplite', 12], ['minotaur_guard', 2], ['skeleton', 8])],
    boss: { unit: 'boss_cyclops', lair: '獨眼巨人洞', desc: '洞口滿地白骨，巨人鼻鼾如雷。' },
  },
  {
    id: 'hellgate', name: '地獄深淵', desc: '黑暗哥德風：魔物湧出，人類退守孤城', cultures: ['magic', 'west'], levy: 'footman', mercs: WEST_MERCS,
    realms: [
      ['聖光教團', '聖光城'], ['流浪者營地', '荒原營'], ['血月修會', '血月修院'], ['灰燼王庭', '灰燼城'], ['獵魔人公會', '獵魔堡'], ['沙漠商盟', '黃沙城'],
      ['叢林部族', '瘴林寨'], ['寒山蠻族', '霜牙嶺'], ['墮落教團', '墮落聖所'], ['骸骨軍團', '萬骨塚'], ['血肉軍團', '血肉巢'], ['深淵大軍', '深淵之門'],
    ],
    camps: [army(['footman', 12], ['archer', 8], ['elf_mage', 3]), army(['demon_grunt', 10], ['skeleton', 12], ['necromancer', 3])],
    boss: { unit: 'boss_hellking', lair: '深淵王座', desc: '整個世界嘅惡意都由呢度湧出。' },
  },
  {
    id: 'dungeoncrawl', name: '地下城屠龍', desc: '冒險者公會、地下城同巨龍，刀劍魔法正統奇幻', cultures: ['west', 'magic'], levy: 'footman', mercs: WEST_MERCS,
    realms: [
      ['銀盾王國', '銀盾城'], ['冒險者公會', '公會都市'], ['矮人王國', '鐵爐堡壘'], ['精靈王國', '星歌林'], ['半身人鄉', '綠丘鎮'], ['法師議會', '奧術塔'],
      ['自由港', '黑帆港'], ['聖騎士團', '光輝要塞'], ['獸人大軍', '碎顱寨'], ['狗頭人礦坑', '黑礦坑'], ['蜥蜴沼澤', '毒沼'], ['巫妖領', '永夜塔'],
    ],
    camps: [army(['footman', 10], ['archer', 6], ['elf_mage', 3], ['griffin_guard', 3]), army(['kobold', 14], ['orc_warrior', 8], ['lizard_warrior', 6])],
  },
  {
    id: 'awakened', name: '覺醒者與巨龍', desc: '巨龍奪走你嘅心，覺醒者帶住隨從踏上討龍之旅', cultures: ['west', 'magic'], levy: 'awakened', mercs: ['awakened', 'archer', 'elf_mage', 'griffin_guard'],
    realms: [
      ['王都', '葛蘭城'], ['邊境村落', '黎明村'], ['山賊同盟', '斷崖寨'], ['古代遺民', '遺跡都'], ['騎士團', '白騎堡'], ['巫女殿', '神木殿'],
      ['妖魔群', '獸人谷'], ['獅鷲巢', '風鳴岩'], ['不死者', '亡者礦坑'], ['魔像遺跡', '石巨人原'], ['邪教', '救贖教堂'], ['龍之僕從', '焦土之地'],
    ],
    camps: [army(['awakened', 5], ['footman', 12], ['archer', 6]), army(['orc_warrior', 10], ['goblin_spear', 10], ['skeleton', 6])],
  },
  {
    id: 'sorcery', name: '魔法世界', desc: '法師學院統治大陸，魔法決定一切', cultures: ['magic'], levy: 'elf_mage', mercs: ['elf_mage', 'necromancer', 'footman', 'griffin_guard'],
    realms: [
      ['星辰學院', '星辰塔'], ['烈焰學院', '熔爐城'], ['寒霜學院', '冰晶宮'], ['雷霆學院', '雷鳴峰'], ['大地學院', '石心城'], ['幻影學院', '鏡之都'],
      ['死靈學院', '蒼白塔'], ['自然學院', '綠環'], ['煉金公會', '水銀城'], ['符文公會', '刻石鎮'], ['魔獸聯盟', '獸王谷'], ['禁咒教團', '禁忌島'],
    ],
    camps: [army(['elf_mage', 8], ['footman', 12], ['griffin_guard', 3]), army(['necromancer', 4], ['skeleton', 14], ['elf_mage', 4])],
  },
  {
    id: 'xianxia', name: '修仙問道', desc: '宗門爭霸，飛劍斬魔，渡劫飛昇', cultures: ['east', 'magic'], levy: 'dao_guard', mercs: ['sword_cultivator', 'dao_guard', 'archer', 'elf_mage'],
    realms: [
      ['青雲門', '青雲山'], ['天劍宗', '萬劍峰'], ['玄天觀', '玄天觀'], ['丹鼎派', '丹霞山'], ['百花谷', '百花谷'], ['金剛寺', '須彌寺'],
      ['妖族', '萬妖窟'], ['魔門', '血煞宗'], ['散修聯盟', '坊市'], ['海外仙島', '蓬萊'], ['鬼修', '幽冥谷'], ['龍宮', '東海龍宮'],
    ],
    camps: [army(['sword_cultivator', 6], ['dao_guard', 14], ['archer', 6]), army(['demon_grunt', 8], ['goblin_spear', 12], ['necromancer', 3])],
    boss: { unit: 'boss_heavenly', lair: '渡劫崖', desc: '九天雷劫之下，老魔等待飛昇。' },
  },
];

export const scenarioOf = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

const HOME_PLACE = [
  'griffon', 'ironhelm_keep', 'xuan_city', 'bashu_pass', 'linjiang', 'wuyi', 'chishui_fort', 'qingcheng_pass',
  'songglade', 'anvilhold', 'blackfang', 'spire',
];

// 記低原本資料，切換劇本時可以還原
const baseFactions = FACTIONS.map((f) => ({ name: f.name, garrison: f.garrison }));
const basePlaces = PLACES.map((p) => ({ name: p.name, desc: p.desc, garrison: p.garrison }));

let current: Scenario = SCENARIOS[0];
export const currentScenario = () => current;

/** 將劇本套用落勢力同地點 */
export function applyScenario(id: string) {
  current = scenarioOf(id);
  FACTIONS.forEach((f, i) => Object.assign(f, baseFactions[i]));
  PLACES.forEach((p, i) => Object.assign(p, basePlaces[i]));
  const { realms, camps, boss } = current;
  if (realms) {
    realms.forEach(([faction, place], i) => {
      FACTIONS[i].name = faction;
      const p = PLACES.find((x) => x.id === HOME_PLACE[i]);
      if (p) p.name = place;
    });
  }
  if (camps) FACTIONS.forEach((f, i) => { f.garrison = camps[i % camps.length]; });
  if (boss) {
    const lair = PLACES.find((p) => p.id === 'dragonlair')!;
    lair.name = boss.lair;
    lair.desc = boss.desc;
    lair.garrison = [{ unit: boss.unit, count: 1 }];
  }
}
