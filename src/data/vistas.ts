/** 秘景：行到附近就收集到一張秘景圖，tile 決定佢會喺邊種地形出現 */
export type VistaArt = 'peak' | 'falls' | 'lake' | 'sea' | 'blossom' | 'dune' | 'snow' | 'farm' | 'volcano' | 'forest' | 'marsh' | 'gorge';

export interface VistaDef {
  id: string;
  name: string;
  desc: string;
  tile: 'mountain' | 'water' | 'lake' | 'sea' | 'forest' | 'farm' | 'sand' | 'swamp' | 'ash' | 'snow' | 'hill';
  art: VistaArt;
  /** 上下天色同主色 */
  sky: [string, string];
  main: string;
}

export const VISTAS: VistaDef[] = [
  { id: 'cloudsea', name: '雲海峰', desc: '日出時雲海湧過山脊，好似站喺世界之上。', tile: 'mountain', art: 'peak', sky: ['#4a6ab8', '#ffc88a'], main: '#5a5668' },
  { id: 'skyfall', name: '飛瀑崖', desc: '飛流直下三千尺，隔十里都聽到水聲。', tile: 'mountain', art: 'falls', sky: ['#7ab8e0', '#e0f0f4'], main: '#6a6258' },
  { id: 'threegorge', name: '千里江峽', desc: '兩岸猿聲啼不住，輕舟已過萬重山。', tile: 'water', art: 'gorge', sky: ['#8ab0c0', '#d8e8e0'], main: '#4a5a50' },
  { id: 'lonesail', name: '孤帆遠影', desc: '孤帆遠影碧空盡，唯見長江天際流。', tile: 'water', art: 'lake', sky: ['#f0a878', '#ffe0b0'], main: '#3f7aa0' },
  { id: 'mirror', name: '鏡湖', desc: '無風嘅時候，天同水分唔開。', tile: 'lake', art: 'lake', sky: ['#6ab0e8', '#d8f0f8'], main: '#5aa0d0' },
  { id: 'egret', name: '白鷺洲', desc: '一行白鷺上青天。', tile: 'lake', art: 'marsh', sky: ['#88c8e8', '#f0f8e8'], main: '#6aa858' },
  { id: 'cliffsea', name: '望海崖', desc: '崖邊只剩風聲同浪聲。', tile: 'sea', art: 'sea', sky: ['#5a90d8', '#c8e8f0'], main: '#2a6a9a' },
  { id: 'coral', name: '珊瑚灣', desc: '退潮時，海水透明到見到底。', tile: 'sea', art: 'sea', sky: ['#70c8e0', '#ffe8c0'], main: '#30b0a8' },
  { id: 'oldtree', name: '千年神木', desc: '十個人手牽手都圍唔晒。', tile: 'forest', art: 'forest', sky: ['#5a9a7a', '#c8e8a8'], main: '#2f6a3a' },
  { id: 'firefly', name: '螢火森林', desc: '入夜之後，成片森林好似銀河落地。', tile: 'forest', art: 'forest', sky: ['#101c38', '#2a4a58'], main: '#1a3a30' },
  { id: 'goldsea', name: '金穗平原', desc: '風吹過，千里麥浪一片金色。', tile: 'farm', art: 'farm', sky: ['#70a8e0', '#ffe8b0'], main: '#d8b040' },
  { id: 'greensea', name: '綠浪稻海', desc: '水田映住天，農夫好似行喺雲上。', tile: 'farm', art: 'farm', sky: ['#88c0e8', '#e8f4d8'], main: '#6ab04a' },
  { id: 'crescent', name: '月牙泉', desc: '沙漠中間一彎清泉，千年未乾。', tile: 'sand', art: 'dune', sky: ['#4a70c0', '#ffd8a0'], main: '#d8b070' },
  { id: 'singsand', name: '鳴沙山', desc: '風過沙丘，會發出低沉嘅鳴響。', tile: 'sand', art: 'dune', sky: ['#c86a4a', '#ffc070'], main: '#c88a50' },
  { id: 'reedmist', name: '蘆花沼', desc: '白茫茫一片蘆花，霧入面有嘢郁。', tile: 'swamp', art: 'marsh', sky: ['#8a9a8a', '#d0d8c0'], main: '#5a6a48' },
  { id: 'lavavale', name: '熔岩谷', desc: '大地裂開，火光照紅成個夜空。', tile: 'ash', art: 'volcano', sky: ['#2a1420', '#c83a1a'], main: '#2a2024' },
  { id: 'holypeak', name: '雪嶺聖峰', desc: '傳說爬到山頂嘅人，可以同神講嘢。', tile: 'snow', art: 'snow', sky: ['#6a90d8', '#e8f0f8'], main: '#e8eef4' },
  { id: 'aurora', name: '極光雪原', desc: '綠色光帶喺夜空入面慢慢飄。', tile: 'snow', art: 'snow', sky: ['#0a1a38', '#1a5a58'], main: '#c8d8e8' },
  { id: 'blossom', name: '櫻花丘', desc: '花瓣落喺舊戰場上，乜嘢都蓋住晒。', tile: 'hill', art: 'blossom', sky: ['#90c8f0', '#ffe8f0'], main: '#7a9a58' },
  { id: 'sunsetridge', name: '落霞嶺', desc: '落霞與孤鶩齊飛。', tile: 'hill', art: 'peak', sky: ['#7a4a88', '#ff9a5a'], main: '#6a4a58' },
];

/** 每收集一張嘅獎勵，集齊再加 */
export const VISTA_REWARD = { gold: 120, renown: 2, allGold: 8000, allRenown: 40 };
/** 行到幾多格內算見到 */
export const VISTA_RANGE = 3;
