import type { ArmyEntry } from './battlefield';
import { FACTIONS } from './factions';
import type { Culture } from './formations';
import { NPC } from './economy';
import { CALAMITY } from './tomb';
import type { TicketPool } from './gacha';
import type { PlayableRace } from './factions';
import { GRAND_CROWNS, crownOf, shortName, type CrownDef } from './crowns';
import { FIEF_OWNERS } from './factions';
import { figuresFor } from './figures';
import { BIOMES, MAP, PLACES } from './world';

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
  /** 喺大地圖行走嘅巨神 */
  titan?: { unit: string; name: string };
  /** 天上飛過嘅生物 */
  sky?: string[];
  /** 只出現呢個劇本專屬人物 */
  ownFigures?: boolean;
  /** 主角可揀種族，冇就全部 */
  races?: PlayableRace[];
  /** 可用卡池，冇就全部 */
  pools?: TicketPool[];
  /** 科幻：有槍械同懸浮載具，通用卡池只抽劇本兵種 */
  scifi?: boolean;
}

const army = (...list: [string, number][]): ArmyEntry[] => list.map(([unit, count]) => ({ unit, count }));

const EAST_MERCS = ['dao_guard', 'pikeman', 'archer', 'crossbowman', 'horseman', 'lancer', 'axeman'];
const WEST_MERCS = ['sergeant', 'pikeman', 'archer', 'crossbowman', 'horseman', 'lancer', 'axeman'];

export const SCENARIOS: Scenario[] = [
  {
    id: 'chaos', sky: ['bird', 'griffin', 'wyvern', 'pegasus', 'dragon'], name: '大混戰', desc: '裂天大陸應世界之惡而召喚歷代冠位：十五軍混戰，勝者要合力面對終焉',
    cultures: ['east', 'west', 'magic'], levy: 'footman', mercs: WEST_MERCS,
    boss: { unit: 'boss_hellking', lair: '終焉王座', desc: '世界之惡盤踞嘅地方。冠位被召喚，全因為佢。' },
  },
  {
    id: 'threekingdoms', name: '三國鼎立', desc: '魏蜀吳爭天下，群雄並起', cultures: ['east'], levy: 'dao_guard', mercs: EAST_MERCS,
    realms: [
      ['魏', '許都'], ['袁紹', '鄴城'], ['呂布', '下邳'], ['蜀', '成都'], ['吳', '建業'], ['孫策舊部', '吳郡'],
      ['劉表', '襄陽'], ['劉璋', '綿竹'], ['馬騰', '西涼'], ['公孫瓚', '易京'], ['張魯', '漢中'], ['董卓餘部', '長安'], ['鮮卑', '彈汗山'], ['南蠻', '銀坑洞'], ['山越', '丹陽'],
    ],
    camps: [army(['dao_guard', 14], ['pikeman', 8], ['crossbowman', 6], ['lancer', 3]), army(['dao_guard', 12], ['archer', 8], ['horseman', 5])],
    boss: { unit: 'boss_warlord', lair: '黑山賊寨', desc: '黑山軍頭領擁兵自重，朝廷都奈佢唔何。' },
  },
  {
    id: 'fivedynasties', name: '五代十國', desc: '藩鎮割據，牙兵篡位，朝為將相暮為囚', cultures: ['east'], levy: 'dao_guard', mercs: EAST_MERCS,
    realms: [
      ['後梁', '汴州'], ['後唐', '洛陽'], ['契丹', '幽州'], ['前蜀', '成都'], ['吳越', '杭州'], ['楚', '潭州'],
      ['閩', '福州'], ['南漢', '廣州'], ['荊南', '江陵'], ['南唐', '金陵'], ['北漢', '太原'], ['岐', '鳳翔'], ['党項', '夏州'], ['大理', '羊苴咩城'], ['武平軍', '朗州'],
    ],
    camps: [army(['ya_guard', 6], ['dao_guard', 12], ['archer', 8]), army(['dao_guard', 14], ['horseman', 6], ['crossbowman', 5])],
    boss: { unit: 'boss_warlord', lair: '亂軍大營', desc: '節度使叛將據此自立。' },
  },
  {
    id: 'rome', name: '羅馬爭霸', desc: '軍團征服地中海，蠻族虎視眈眈', cultures: ['west'], levy: 'legionary', mercs: ['legionary', 'auxilia', 'barbarian', 'horseman'],
    realms: [
      ['羅馬', '羅馬城'], ['迦太基', '迦太基城'], ['高盧', '阿萊西亞'], ['帕提亞', '泰西封'], ['埃及', '亞歷山大港'], ['希臘', '雅典'],
      ['不列顛', '倫蒂尼姆'], ['日耳曼', '條頓堡'], ['努米底亞', '錫爾塔'], ['西班牙', '努曼提亞'], ['色雷斯', '拜占庭'], ['達契亞', '薩爾米澤圖薩'], ['斯基泰', '黑海營地'], ['努比亞', '麥羅埃'], ['本都', '西諾普'],
    ],
    camps: [army(['legionary', 14], ['auxilia', 8], ['horseman', 4]), army(['barbarian', 18], ['archer', 6], ['horseman', 4])],
    boss: { unit: 'boss_warlord', lair: '叛軍要塞', desc: '叛將同角鬥士佔據山頭。' },
  },
  {
    id: 'crusade', name: '十字軍東征', desc: '聖地之爭，騎士對決馬穆魯克', cultures: ['west'], levy: 'sergeant', mercs: ['sergeant', 'crossbowman', 'crusader', 'mamluk', 'archer'],
    realms: [
      ['耶路撒冷王國', '耶路撒冷'], ['安條克公國', '安條克'], ['的黎波里伯國', '的黎波里'], ['埃德薩伯國', '埃德薩'], ['阿尤布王朝', '開羅'], ['大馬士革', '大馬士革'],
      ['阿勒坡', '阿勒坡'], ['摩蘇爾', '摩蘇爾'], ['拜占庭', '君士坦丁堡'], ['威尼斯', '威尼斯'], ['羅姆蘇丹國', '科尼亞'], ['醫院騎士團', '騎士堡'], ['條頓騎士團', '阿卡'], ['法蒂瑪', '亞歷山大'], ['亞美尼亞', '西斯'],
    ],
    camps: [army(['sergeant', 12], ['crossbowman', 6], ['crusader', 5]), army(['footman', 12], ['archer', 8], ['mamluk', 6])],
    boss: { unit: 'boss_warlord', lair: '山中老人堡', desc: '刺客教團嘅鷹巢。' },
  },
  {
    id: 'greek', sky: ['bird', 'pegasus', 'harpy'], name: '希臘神話', desc: '城邦重裝步兵對抗獨眼巨人同怪物', cultures: ['west', 'magic'], levy: 'hoplite', mercs: ['hoplite', 'archer', 'horseman', 'minotaur_guard'],
    realms: [
      ['雅典', '雅典'], ['斯巴達', '斯巴達'], ['底比斯', '底比斯'], ['科林斯', '科林斯'], ['克里特', '克諾索斯'], ['特洛伊', '特洛伊'],
      ['馬其頓', '佩拉'], ['色薩利', '拉里薩'], ['亞馬遜', '忒彌斯庫拉'], ['波斯', '波斯波利斯'], ['冥府信眾', '冥河渡口'], ['巨人族', '獨眼島'], ['色雷斯', '色雷斯城'], ['仙女林', '阿卡迪亞'], ['海怪信徒', '塞壬島'],
    ],
    camps: [army(['hoplite', 16], ['archer', 8], ['horseman', 3]), army(['hoplite', 12], ['minotaur_guard', 2], ['skeleton', 8])],
    boss: { unit: 'boss_cyclops', lair: '獨眼巨人洞', desc: '洞口滿地白骨，巨人鼻鼾如雷。' },
  },
  {
    id: 'hellgate', sky: ['demonbat', 'wyvern', 'dragon'], name: '地獄深淵', desc: '黑暗哥德風：魔物湧出，人類退守孤城', cultures: ['magic', 'west'], levy: 'footman', mercs: WEST_MERCS,
    realms: [
      ['聖光教團', '聖光城'], ['流浪者營地', '荒原營'], ['血月修會', '血月修院'], ['灰燼王庭', '灰燼城'], ['獵魔人公會', '獵魔堡'], ['沙漠商盟', '黃沙城'],
      ['叢林部族', '瘴林寨'], ['寒山蠻族', '霜牙嶺'], ['墮落教團', '墮落聖所'], ['骸骨軍團', '萬骨塚'], ['血肉軍團', '血肉巢'], ['深淵大軍', '深淵之門'], ['雪原遺民', '白骨雪城'], ['暗影教團', '黑森林堡'], ['魔巢', '萬魔窟'],
    ],
    camps: [army(['footman', 12], ['archer', 8], ['elf_mage', 3]), army(['demon_grunt', 10], ['skeleton', 12], ['necromancer', 3])],
    boss: { unit: 'boss_hellking', lair: '深淵王座', desc: '整個世界嘅惡意都由呢度湧出。' },
  },
  {
    id: 'dungeoncrawl', sky: ['bird', 'griffin', 'wyvern', 'dragon'], name: '地下城屠龍', desc: '冒險者公會、地下城同巨龍，刀劍魔法正統奇幻', cultures: ['west', 'magic'], levy: 'footman', mercs: WEST_MERCS,
    realms: [
      ['銀盾王國', '銀盾城'], ['冒險者公會', '公會都市'], ['矮人王國', '鐵爐堡壘'], ['精靈王國', '星歌林'], ['半身人鄉', '綠丘鎮'], ['法師議會', '奧術塔'],
      ['自由港', '黑帆港'], ['聖騎士團', '光輝要塞'], ['獸人大軍', '碎顱寨'], ['狗頭人礦坑', '黑礦坑'], ['蜥蜴沼澤', '毒沼'], ['巫妖領', '永夜塔'], ['蠻族諸部', '霜嶺'], ['幽暗城邦', '蛛網都'], ['魔物之巢', '萬魔城'],
    ],
    camps: [army(['footman', 10], ['archer', 6], ['elf_mage', 3], ['griffin_guard', 3]), army(['kobold', 14], ['orc_warrior', 8], ['lizard_warrior', 6])],
  },
  {
    id: 'awakened', sky: ['bird', 'griffin', 'harpy', 'dragon'], name: '覺醒者與巨龍', desc: '巨龍奪走你嘅心，覺醒者帶住隨從踏上討龍之旅', cultures: ['west', 'magic'], levy: 'awakened', mercs: ['awakened', 'archer', 'elf_mage', 'griffin_guard', 'griffin_rider'],
    realms: [
      ['王都', '葛蘭城'], ['邊境村落', '黎明村'], ['山賊同盟', '斷崖寨'], ['古代遺民', '遺跡都'], ['騎士團', '白騎堡'], ['巫女殿', '神木殿'],
      ['妖魔群', '獸人谷'], ['獅鷲巢', '風鳴岩'], ['不死者', '亡者礦坑'], ['魔像遺跡', '石巨人原'], ['邪教', '救贖教堂'], ['龍之僕從', '焦土之地'], ['雪嶺部族', '白狼寨'], ['深林隱者', '幽林都'], ['魔物群落', '魔物巢都'],
    ],
    camps: [army(['awakened', 5], ['footman', 12], ['archer', 6]), army(['orc_warrior', 10], ['goblin_spear', 10], ['skeleton', 6])],
  },
  {
    id: 'northland', sky: ['bird', 'dragon', 'wyvern'], name: '北境龍吼', desc: '諸侯內戰之際巨龍歸來，傳說有人可以吞食龍魂', cultures: ['west', 'magic'], levy: 'huscarl',
    mercs: ['huscarl', 'archer', 'axeman', 'darkelf_blade', 'elf_mage'],
    realms: [
      ['銀鬃領', '銀鬃堡'], ['風暴兄弟會', '白風城'], ['河谷諸侯', '河谷鎮'], ['裂谷領', '裂谷城'], ['灰石氏族', '灰石寨'], ['沼澤盟', '黑水港'],
      ['遠征軍團', '帝國前哨'], ['高崖修士', '七千階'], ['林地守衛', '翠谷'], ['石匠行會', '深岩堡'], ['獸牙氏族', '獠牙寨'], ['古墓教派', '永夜墓'], ['北境聯盟', '霜牙城'], ['灰影精靈', '灰影都'], ['魔獸群', '萬魔城'],
    ],
    camps: [army(['huscarl', 14], ['archer', 8], ['axeman', 5]), army(['skeleton', 12], ['grave_knight', 4], ['necromancer', 3])],
  },
  {
    id: 'sorcery', sky: ['griffin', 'phoenix', 'pegasus', 'dragon'], name: '魔法世界', desc: '法師學院統治大陸，魔法決定一切', cultures: ['magic'], levy: 'elf_mage', mercs: ['elf_mage', 'necromancer', 'footman', 'griffin_guard', 'pegasus_knight', 'griffin_rider'],
    realms: [
      ['星辰學院', '星辰塔'], ['烈焰學院', '熔爐城'], ['寒霜學院', '冰晶宮'], ['雷霆學院', '雷鳴峰'], ['大地學院', '石心城'], ['幻影學院', '鏡之都'],
      ['死靈學院', '蒼白塔'], ['自然學院', '綠環'], ['煉金公會', '水銀城'], ['符文公會', '刻石鎮'], ['魔獸聯盟', '獸王谷'], ['禁咒教團', '禁忌島'], ['冰封塔', '永冬塔'], ['暗夜學院', '影塔'], ['魔物學派', '萬魔城'],
    ],
    camps: [army(['elf_mage', 8], ['footman', 12], ['griffin_guard', 3]), army(['necromancer', 4], ['skeleton', 14], ['elf_mage', 4])],
  },
  {
    id: 'xianxia', sky: ['crane', 'immortal', 'phoenix'], name: '修仙問道', desc: '宗門爭霸，飛劍斬魔，渡劫飛昇', cultures: ['east', 'magic'], levy: 'dao_guard', mercs: ['sword_cultivator', 'dao_guard', 'archer', 'elf_mage'],
    realms: [
      ['青雲門', '青雲山'], ['天劍宗', '萬劍峰'], ['玄天觀', '玄天觀'], ['丹鼎派', '丹霞山'], ['百花谷', '百花谷'], ['金剛寺', '須彌寺'],
      ['妖族', '萬妖窟'], ['魔門', '血煞宗'], ['散修聯盟', '坊市'], ['海外仙島', '蓬萊'], ['鬼修', '幽冥谷'], ['龍宮', '東海龍宮'], ['雪山派', '大雪山'], ['幽影宗', '影月林'], ['萬妖盟', '萬妖城'],
    ],
    camps: [army(['sword_cultivator', 6], ['dao_guard', 14], ['archer', 6]), army(['demon_grunt', 8], ['goblin_spear', 12], ['necromancer', 3])],
    boss: { unit: 'boss_heavenly', lair: '渡劫崖', desc: '九天雷劫之下，老魔等待飛昇。' },
  },
  {
    id: 'frostwar', ownFigures: true, sky: ['griffin', 'wyvern', 'bird'], name: '人魔霜亂', desc: '王子墮入霜魂，屍潮席捲大陸，人類同獸人被迫聯手', cultures: ['west', 'magic'], levy: 'footman',
    mercs: ['footman', 'archer', 'paladin', 'orc_warrior', 'elf_longbow'],
    realms: [
      ['銀翼王國', '銀翼城'], ['鐵爐山國', '深爐堡'], ['高塔法師領', '星穹城'], ['聖光騎士團', '聖光堡'], ['戰歌部族', '碎骨要塞'], ['雷蹄氏族', '雷崖'],
      ['暗矛巨魔', '暗矛寨'], ['金曦王庭', '金曦塔'], ['月影林民', '月井谷'], ['地精商盟', '齒輪港'], ['天罰屍潮', '霜冠堡'], ['亡骸議會', '死靈都'],
      ['冰爪巨人', '冰爪嶺'], ['燃焰軍團', '魔火裂隙'], ['潮汐海妖', '潮汐宮'],
    ],
    camps: [army(['footman', 12], ['archer', 8], ['paladin', 4]), army(['ghoul', 16], ['skeleton_archer', 6], ['stitched', 3])],
    boss: { unit: 'boss_frost', lair: '霜冠王座', desc: '墮落王子坐喺冰封王座上，等緊你。' },
  },
  {
    id: 'starwar', sky: ['dropship', 'swarmflyer'], name: '星海三族', desc: '人類殖民者、噬星蟲群同遠古靈能族爭奪星區', cultures: ['west'], levy: 'marine_trooper', ownFigures: true,
    mercs: ['marine_trooper', 'flame_trooper', 'psi_zealot', 'psi_stalker', 'walker_mech'],
    realms: [
      ['銀河聯邦', '首都星港'], ['礦星殖民地', '煤渣站'], ['叛軍同盟', '自由基地'], ['傭兵公會', '霓虹城'], ['鋼鐵軍團', '鋼壘'], ['靈能聖殿', '金輝聖城'],
      ['流亡遠星者', '暗影方舟'], ['守望議會', '星環殿'], ['原住民', '石碑谷'], ['科研艦隊', '零號實驗室'], ['蟲巢主腦', '母巢'], ['噬星蟲群', '酸液巢'],
      ['掠奪海盜', '黑市站'], ['機械叛軍', '機核'], ['飛蟲群', '孢子塔'],
    ],
    camps: [
      army(['marine_trooper', 16], ['flame_trooper', 6], ['walker_mech', 3]), army(['psi_zealot', 12], ['psi_stalker', 8]),
      army(['swarmling', 22], ['acid_spitter', 8], ['swarm_brute', 3]),
    ],
    boss: { unit: 'boss_hive', lair: '主巢深淵', desc: '蟲群意志嘅中心，整個星球都喺佢嘅脈搏入面。' },
  },
  {
    id: 'ancients', ownFigures: true, sky: ['bird', 'wyvern'], name: '遠古對決', desc: '晨曦聖所同暮影深淵各守一塊水晶，英雄沿三條大路廝殺', cultures: ['west', 'magic'], levy: 'lane_creep',
    mercs: ['lane_creep', 'lane_caster', 'ancient_guard', 'elf_mage', 'minotaur_guard'],
    realms: [
      ['晨曦聖所', '曦光水晶'], ['林間守衛', '古樹壘'], ['河道商會', '河心集'], ['天空聖女', '雲頂台'], ['賞金獵人會', '賞金鎮'], ['風行遊俠', '疾風谷'],
      ['戰鼓巨魔', '戰鼓山'], ['森林先知', '萬木林'], ['暮影深淵', '暮影水晶'], ['瘟疫教團', '腐沼'], ['骷髏王庭', '白骨殿'], ['噬魂影裔', '噬魂崖'],
      ['血魔祭司', '血祭台'], ['寒霜法師', '寒霜塔'], ['中立野怪', '遠古營地'],
    ],
    camps: [army(['lane_creep', 14], ['lane_caster', 8], ['ancient_guard', 3]), army(['lane_creep', 14], ['necromancer', 3], ['demon_grunt', 6])],
    boss: { unit: 'boss_ancient', lair: '暮影水晶深處', desc: '打爆佢，呢場千年對決先有結果。' },
  },
  {
    id: 'emberdeep', ownFigures: true, sky: ['bird', 'demonbat'], name: '礦燈鎮傳說', desc: '小鎮礦坑愈掘愈深，熾礦力量令礦工發狂，冒險者同寵物落坑尋寶', cultures: ['west', 'magic'], levy: 'footman',
    mercs: ['footman', 'archer', 'axeman', 'elf_mage', 'fairy'],
    realms: [
      ['礦燈鎮', '礦燈鎮'], ['鐵匠公會', '錘鎮'], ['冒險者營地', '火把營'], ['煉金師會', '藥瓶巷'], ['獵寶團', '寶匣村'], ['皇城', '皇都'],
      ['沙漠商幫', '黃沙驛'], ['森林巫師', '迷霧林'], ['地精礦幫', '地精坑'], ['矮人遺族', '舊爐堡'], ['骷髏礦魂', '廢礦'], ['蜘蛛巢', '絲網洞'],
      ['熾礦邪教', '熾礦聖堂'], ['石像守衛', '古遺跡'], ['魔化礦工', '深坑'],
    ],
    camps: [army(['footman', 12], ['archer', 8], ['axeman', 4]), army(['ember_miner', 14], ['tomb_spider', 8], ['skeleton', 6])],
    boss: { unit: 'boss_ember', lair: '熾礦之心', desc: '礦坑最深處，一塊會呼吸嘅巨大熾礦。' },
  },
  {
    id: 'tianjie', ownFigures: true, sky: ['crane','immortal','phoenix'], name: '天界大戰', desc: '魔界大軍攻破南天門，諸天神將各據一方，三界存亡一線間', cultures: ['east','magic'], levy: 'tian_bing',
    mercs: ['tian_bing','tian_archer','tian_jiang','lei_bu'],
    realms: [
      ['凌霄天庭', '凌霄殿'],
      ['托塔天王府', '雲樓宮'],
      ['雷部', '神霄府'],
      ['斗部', '斗牛宮'],
      ['四海龍宮', '東海龍宮'],
      ['瑤池', '瑤池仙境'],
      ['月宮', '廣寒宮'],
      ['兜率宮', '兜率天'],
      ['南天門守軍', '南天門'],
      ['九曜星官', '星宿殿'],
      ['魔界先鋒', '血海關'],
      ['魔界大軍', '萬魔殿'],
      ['北俱蘆洲', '寒冰獄'],
      ['幽冥使者', '黃泉關'],
      ['混沌魔裔', '混沌淵'],
    ],
    camps: [army(['tian_bing', 14], ['tian_archer', 6], ['tian_jiang', 3]), army(['demon_grunt', 12], ['ye_cha', 5], ['lei_bu', 2])],
    boss: { unit: 'boss_chaos', lair: '混沌深淵', desc: '三界未開之前就存在嘅魔祖，要將天地打返成一團混沌。' },
    titan: { unit: 'boss_asura', name: '阿修羅王' },
  },
  {
    id: 'xiyou', ownFigures: true, sky: ['crane','immortal','demonbat'], name: '西遊取經', desc: '師徒四人西行，一路妖魔要食唐僧肉，八十一難等緊你', cultures: ['east','magic'], levy: 'dao_guard',
    mercs: ['dao_guard','yao_bing','yao_jiang','shui_zu','sword_cultivator'],
    realms: [
      ['大唐', '長安'],
      ['花果山', '水簾洞'],
      ['高老莊', '高老莊'],
      ['流沙河', '流沙河'],
      ['東海龍宮', '水晶宮'],
      ['靈山', '大雷音寺'],
      ['火焰山', '翠雲山'],
      ['獅駝嶺', '獅駝城'],
      ['女兒國', '西梁女國'],
      ['車遲國', '車遲城'],
      ['白骨嶺', '白虎嶺'],
      ['盤絲洞', '盤絲洞'],
      ['朱紫國', '朱紫城'],
      ['黃風嶺', '黃風洞'],
      ['比丘國', '比丘城'],
    ],
    camps: [army(['dao_guard', 14], ['archer', 8], ['pikeman', 5]), army(['yao_bing', 16], ['yao_jiang', 5], ['shui_zu', 6])],
    boss: { unit: 'boss_jiuling', lair: '九曲盤桓洞', desc: '九頭獅妖坐鎮，連齊天大聖都要打足精神。' },
  },
  {
    id: 'fengshen', ownFigures: true, sky: ['crane','immortal','phoenix'], name: '封神之戰', desc: '商周易代，闡截兩教鬥法，封神榜上人人有份', cultures: ['east','magic'], levy: 'dao_guard',
    mercs: ['dao_guard','crossbowman','sword_cultivator','lei_bu','tian_jiang'],
    realms: [
      ['西岐', '西岐城'],
      ['朝歌', '朝歌'],
      ['冀州', '冀州城'],
      ['陳塘關', '陳塘關'],
      ['東伯侯', '東魯'],
      ['南伯侯', '南都'],
      ['北伯侯', '崇城'],
      ['截教', '碧遊宮'],
      ['闡教', '玉虛宮'],
      ['人教', '八景宮'],
      ['軒轅墳', '軒轅墳'],
      ['十絕陣', '十絕陣'],
      ['梅山七怪', '梅山'],
      ['東夷', '東夷'],
      ['萬仙陣', '萬仙陣'],
    ],
    camps: [army(['dao_guard', 14], ['crossbowman', 8], ['lancer', 4]), army(['sword_cultivator', 6], ['yao_jiang', 5], ['yao_bing', 12])],
    boss: { unit: 'boss_tongtian', lair: '誅仙陣', desc: '四劍懸空，通天教主親自主陣。' },
  },
  {
    id: 'shenhua', ownFigures: true, sky: ['crane','phoenix','dragon'], name: '上古神話', desc: '共工撞倒不周山，天傾地陷；黃帝、蚩尤、后羿各自爭命', cultures: ['east','magic'], levy: 'pikeman',
    mercs: ['pikeman','archer','axeman','yao_jiang','lei_bu'],
    realms: [
      ['軒轅部', '有熊'],
      ['神農部', '姜水'],
      ['九黎部', '涿鹿'],
      ['東夷部', '窮桑'],
      ['昆侖', '昆侖墟'],
      ['蓬萊', '蓬萊島'],
      ['共工氏', '不周山'],
      ['祝融氏', '南嶽'],
      ['夸父族', '成都載天'],
      ['巫咸國', '靈山'],
      ['羲和國', '湯谷'],
      ['刑天舊部', '常羊山'],
      ['北冥', '北海'],
      ['青丘', '青丘'],
      ['歸墟', '歸墟'],
    ],
    camps: [army(['pikeman', 14], ['archer', 8], ['axeman', 5]), army(['yao_jiang', 8], ['yao_bing', 14], ['minotaur_guard', 2])],
    boss: { unit: 'boss_gonggong', lair: '不周山缺口', desc: '水神共工怒觸天柱，洪水由呢度湧出。' },
  },
  {
    id: 'fengdu', ownFigures: true, sky: ['demonbat','crane'], name: '酆都鬼城', desc: '鬼門關失守，十殿閻羅各自為政，陰差同厲鬼爭奪地府', cultures: ['east','magic'], levy: 'gui_zu',
    mercs: ['gui_zu','yin_cha','ma_mian','ye_cha','wang_hun'],
    realms: [
      ['酆都城', '酆都'],
      ['一殿秦廣王', '秦廣殿'],
      ['二殿楚江王', '楚江殿'],
      ['三殿宋帝王', '宋帝殿'],
      ['四殿五官王', '五官殿'],
      ['五殿閻羅王', '森羅殿'],
      ['六殿卞城王', '卞城殿'],
      ['七殿泰山王', '泰山殿'],
      ['八殿都市王', '都市殿'],
      ['九殿平等王', '平等殿'],
      ['十殿轉輪王', '轉輪殿'],
      ['陰司城隍', '城隍廟'],
      ['餓鬼道', '枉死城'],
      ['孟婆莊', '奈何橋'],
      ['血池魔眾', '血池'],
    ],
    camps: [army(['gui_zu', 14], ['yin_cha', 8], ['niu_tou', 2]), army(['ye_cha', 8], ['ma_mian', 6], ['wang_hun', 6])],
    boss: { unit: 'boss_blood', lair: '血池地獄', desc: '血池深處嘅魔君，想由陰間殺返陽世。' },
  },
  {
    id: 'mingfu', ownFigures: true, sky: ['demonbat','harpy'], name: '冥府諸神', desc: '世界各地嘅冥王爭奪亡魂，希臘、埃及、北歐嘅冥土連成一片', cultures: ['west','magic'], levy: 'styx_guard',
    mercs: ['styx_guard','skeleton','grave_knight','jackal_guard','wang_hun','necromancer'],
    realms: [
      ['哈迪斯王庭', '冥王殿'],
      ['極樂園', '厄流西昂'],
      ['塔爾塔羅斯', '深淵牢獄'],
      ['冥河渡口', '斯堤克斯'],
      ['水仙平原', '水仙原'],
      ['埃及冥土', '杜阿特'],
      ['胡狼神殿', '秤心殿'],
      ['北歐冥界', '赫爾海姆'],
      ['巴比倫冥土', '庫爾'],
      ['忘川樂團', '忘川'],
      ['復仇女神', '報應之庭'],
      ['三頭犬牧群', '冥門'],
      ['巨人殘部', '泰坦監牢'],
      ['夜之女神', '夜宮'],
      ['泰坦遺族', '混沌之底'],
    ],
    camps: [army(['styx_guard', 12], ['skeleton', 10], ['wang_hun', 4]), army(['jackal_guard', 8], ['grave_knight', 5], ['necromancer', 3])],
    boss: { unit: 'boss_kronos', lair: '塔爾塔羅斯深淵', desc: '被囚嘅泰坦撼動牢籠，冥府諸神都要停戰。' },
  },
  {
    id: 'shenmo', ownFigures: true, sky: ['phoenix','demonbat','dragon'], name: '神魔大戰', desc: '諸神同萬魔決戰，滅世魔神踏遍大陸，一腳落地就係一座城', cultures: ['west','magic'], levy: 'tian_bing',
    mercs: ['tian_bing','tian_archer','tian_jiang','demon_grunt','ye_cha','lei_bu'],
    realms: [
      ['光輝神國', '神王殿'],
      ['戰神聖殿', '戰神山'],
      ['智慧神殿', '星輝城'],
      ['雷霆神域', '雷霆峰'],
      ['海神王國', '潮汐宮'],
      ['豐饒神域', '金穗城'],
      ['凡人聯盟', '自由城'],
      ['晨星騎士團', '晨星堡'],
      ['魔王軍', '魔王城'],
      ['血魔族', '血月城'],
      ['骸骨魔域', '萬骨城'],
      ['影魔議會', '影之塔'],
      ['炎魔熔爐', '熔岩城'],
      ['寒獄魔域', '冰獄'],
      ['虛空裂隙', '虛空門'],
    ],
    camps: [army(['tian_bing', 12], ['tian_archer', 6], ['tian_jiang', 4]), army(['demon_grunt', 12], ['ye_cha', 6], ['demon_cultist', 3])],
    boss: { unit: 'boss_voidgod', lair: '虛空王座', desc: '諸神同萬魔之上，仲有一位主宰。' },
    titan: { unit: 'boss_demongod', name: '滅世魔神' },
  },
  {
    id: 'maoshan', ownFigures: true, sky: ['demonbat','crane'], name: '茅山驅魔', desc: '月黑風高，殭屍出棺，百鬼夜行，道長帶住徒弟開壇作法', cultures: ['east','magic'], levy: 'dao_tong',
    mercs: ['dao_tong','dao_zhang','dao_guard','archer'],
    realms: [
      ['茅山派', '茅山'],
      ['龍虎山', '天師府'],
      ['任家鎮', '任家鎮'],
      ['甘田鎮', '甘田鎮'],
      ['蘭若寺', '蘭若寺'],
      ['義莊', '義莊'],
      ['鎮江督軍府', '督軍府'],
      ['省城', '省城'],
      ['湘西趕屍人', '辰州'],
      ['苗疆蠱寨', '蠱寨'],
      ['亂葬崗', '亂葬崗'],
      ['古墓僵族', '千年古墓'],
      ['黑山老妖', '黑山'],
      ['百鬼窟', '百鬼窟'],
      ['妖狐洞', '狐仙洞'],
    ],
    camps: [army(['dao_tong', 12], ['dao_zhang', 4], ['dao_guard', 8]), army(['jiangshi', 16], ['nv_gui', 6], ['gui_zu', 6])],
    boss: { unit: 'boss_jiangwang', lair: '千年僵王墓', desc: '封印咗千年嘅殭屍王開棺，月光都照唔入去。' },
  },
  {
    id: 'biocity', ownFigures: true, sky: ['bird'], name: '喪屍危城', desc: '生化公司病毒外洩，全城喪屍化，特勤探員殺出一條血路', cultures: ['west'], levy: 'marine_trooper',
    mercs: ['marine_trooper','flame_trooper','walker_mech'],
    realms: [
      ['特勤總部', '行動基地'],
      ['警察局', '中央警局'],
      ['市政廳', '市政廳'],
      ['大學', '醫學院'],
      ['港口區', '碼頭'],
      ['工業區', '化工廠'],
      ['倖存者營地', '地鐵站'],
      ['軍方封鎖線', '封鎖線'],
      ['醫院區', '總醫院'],
      ['商場區', '購物中心'],
      ['生化公司', '總部大樓'],
      ['地下實驗室', '地下研究所'],
      ['下水道', '下水道'],
      ['污染區', '隔離區'],
      ['爆心地帶', '爆心'],
    ],
    camps: [army(['marine_trooper', 12], ['flame_trooper', 5]), army(['zombie', 18], ['zombie_runner', 8], ['zombie_brute', 2])],
    boss: { unit: 'boss_mutant', lair: '地下研究所', desc: '實驗失控，培養槽入面嘅嘢爬咗出嚟。' },
  },
  {
    id: 'jianghu', ownFigures: true, sky: ['crane', 'bird'], name: '武俠江湖', desc: '武林大會將至，名門正派同魔教爭盟主，快意恩仇全憑手中劍', cultures: ['east'], levy: 'biao_shi',
    mercs: ['biao_shi', 'wu_seng', 'jian_ke', 'yin_wei'],
    realms: [
      ['少林寺', '少室山'], ['武當派', '紫霄宮'], ['峨眉派', '金頂'], ['華山派', '玉女峰'], ['青城派', '青城山'], ['崑崙派', '崑崙山'],
      ['梁山泊', '水泊'], ['丐幫', '洛陽分舵'], ['開封府', '開封'], ['鏢局聯盟', '長風鏢局'], ['唐門', '蜀中唐堡'], ['魔教', '萬魔崖'],
      ['塞外馬幫', '雁門關'], ['東海劍島', '東海島'], ['苗疆五毒', '五毒寨'],
    ],
    camps: [army(['wu_seng', 12], ['jian_ke', 4], ['biao_shi', 8]), army(['mo_zhong', 12], ['yin_wei', 6], ['jian_ke', 3])],
    boss: { unit: 'boss_mojiao', lair: '魔教總壇', desc: '武林公敵閉關三十年，出關就要一統江湖。' },
    races: ['human'], pools: ['human'],
  },
  {
    id: 'doomlord', ownFigures: true, sky: ['demonbat', 'wyvern'], name: '魔王降世', desc: '今次你做魔王：率不死大軍毀滅諸國，勇者同諸神都要來討伐你', cultures: ['west', 'magic'], levy: 'skeleton',
    mercs: ['skeleton', 'skeleton_archer', 'grave_knight', 'necromancer', 'demon_grunt'],
    realms: [
      ['永夜帝國', '葬魂城'], ['血月領', '緋夜堡'], ['業火魔域', '玄策城'], ['黑曜軍團', '墨淵要塞'], ['蛇淵王國', '鱗舞宮'], ['影語林', '無音谷'],
      ['光明王國', '聖都'], ['銀騎士團', '銀冠堡'], ['法師聯邦', '賢者塔'], ['矮人聯邦', '鐵砧城'], ['精靈王庭', '星歌城'], ['教廷', '聖座'], ['北境聯盟', '霜冠城'], ['勇者公會', '勇者城'], ['自由商港', '金港'],
    ],
    camps: [army(['footman', 12], ['archer', 8], ['paladin', 4]), army(['sergeant', 10], ['crossbowman', 8], ['crusader', 3])],
    boss: { unit: 'boss_lightgod', lair: '聖光神殿', desc: '諸神派出最後嘅神祇，要親手將你送返地底。' },
  },
];

// 歷史劇本：只得人類同人類卡池
for (const id of ['threekingdoms', 'fivedynasties', 'rome', 'crusade']) {
  Object.assign(SCENARIOS.find((s) => s.id === id)!, { races: ['human', 'nord'], pools: ['human'] });
}
Object.assign(SCENARIOS.find((s) => s.id === 'starwar')!, { races: ['human', 'psionic'], pools: ['human'], scifi: true });
Object.assign(SCENARIOS.find((s) => s.id === 'biocity')!, { races: ['human'], pools: ['human'], scifi: true });

export const scenarioOf = (id: string): Scenario => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];

const HOME_PLACE = [
  'griffon', 'ironhelm_keep', 'xuan_city', 'bashu_pass', 'linjiang', 'wuyi', 'chishui_fort', 'qingcheng_pass',
  'songglade', 'anvilhold', 'blackfang', 'spire', 'frostfang', 'shadowspire', 'monsterhold',
];

/** 歷史劇本冇呢啲奇幻地點 */
const MAGIC_PLACES = ['tomb', 'witch_tower', 'abyss', 'bonecrypt', 'bullmaze'];

// 記低原本資料，切換劇本時可以還原
const baseFactions = FACTIONS.map((f) => ({ name: f.name, garrison: f.garrison }));
const basePlaces = PLACES.map((p) => ({ name: p.name, desc: p.desc, garrison: p.garrison, x: p.x, monster: p.monster, mercs: p.mercs }));
const baseBiomes = BIOMES.map((b) => b.x);
const baseRiver = MAP.riderX;

let current: Scenario = SCENARIOS[0];
export const currentScenario = () => current;
/** 有魔法嘅劇本先有奇幻內容 */
export const isMagic = () => current.cultures.includes('magic');
/** 呢個劇本有邊啲人物 */
export const currentFigures = () => figuresFor(isMagic(), current.id, !!current.ownFigures);

// 大混戰：十五位冠位各領一軍，主城照舊
SCENARIOS[0].realms = GRAND_CROWNS.map((c) => [`${shortName(c)}軍`, '']);

/** 呢個冠位喺呢個劇本由邊度起家 */
export const crownHome = (c: CrownDef, scenario: string) => (scenario === 'chaos' ? HOME_PLACE[GRAND_CROWNS.findIndex((g) => g.id === c.id)] : c.home);

/** 將劇本套用落勢力同地點；扮冠位時，佢本身個國變舊部 */
export function applyScenario(id: string, crownId?: string) {
  current = scenarioOf(id);
  FACTIONS.forEach((f, i) => Object.assign(f, baseFactions[i]));
  PLACES.forEach((p, i) => Object.assign(p, basePlaces[i]));
  // 單數劇本左右鏡像，城鎮同地域布局唔同
  if (SCENARIOS.indexOf(current) % 2 === 1) {
    for (const p of PLACES) p.x = MAP.width - 1 - p.x;
    BIOMES.forEach((b, i) => { b.x = MAP.width - 1 - baseBiomes[i]; });
    MAP.riderX = MAP.width - 1 - baseRiver;
  } else {
    BIOMES.forEach((b, i) => { b.x = baseBiomes[i]; });
    MAP.riderX = baseRiver;
  }
  const magic = isMagic();
  for (const p of PLACES) {
    p.gone = !magic && MAGIC_PLACES.includes(p.id);
    if (magic || !(p.monster || p.mercs)) continue;
    p.monster = false;
    p.mercs = undefined;
    p.desc = '城中百業興旺，各路人馬往來。';
  }
  if (!magic) {
    const fen = PLACES.find((p) => p.id === 'goblinfen');
    if (fen) fen.name = '蘆葦村';
  }
  NPC.raider.name = magic ? '獸人掠奪隊' : '流寇掠奪隊';
  if (current.titan) {
    NPC.titan.name = current.titan.name;
    CALAMITY.titan.unit = current.titan.unit;
  }
  const { realms, camps, boss } = current;
  if (realms) {
    realms.forEach(([faction, place], i) => {
      FACTIONS[i].name = faction;
      const p = PLACES.find((x) => x.id === HOME_PLACE[i]);
      if (p && place) p.name = place;
    });
  }
  if (camps) FACTIONS.forEach((f, i) => { f.garrison = camps[i % camps.length]; });
  if (boss) {
    const lair = PLACES.find((p) => p.id === 'dragonlair')!;
    lair.name = boss.lair;
    lair.desc = boss.desc;
    lair.garrison = [{ unit: boss.unit, count: 1 }];
  }
  const crown = crownOf(crownId);
  if (crown) {
    const owner = FACTIONS.find((f) => f.id === FIEF_OWNERS[crownHome(crown, current.id)]);
    if (owner) owner.name += '舊部';
  }
}
