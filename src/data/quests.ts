export type QuestKind = 'bandits' | 'grain' | 'letter';

export const QUESTS = {
  kinds: ['bandits', 'grain', 'letter'] as QuestKind[],
  refreshDays: 5,
  deadlineDays: 14,
  maxActive: 3,
  failRelation: 5,
};

export const EVENT_RULES = {
  /** 每日觸發突發事件嘅機率 */
  chance: 0.12,
  /** 開局幾日內唔會有 */
  firstDay: 3,
};

export interface EventChoice {
  label: string;
  /** 效果 id，見 quests/events.ts */
  effect: string;
}

export interface StoryEvent {
  id: string;
  title: string;
  text: string;
  choices: EventChoice[];
  /** 要有同伴先會出現 */
  needMen?: number;
  /** 只喺魔法劇本出現 */
  magic?: boolean;
  /** 只喺呢個劇本出現 */
  scenario?: string;
  /** 只有呢個職業先遇到 */
  job?: string;
}

export const EVENTS: StoryEvent[] = [
  {
    id: 'plague', title: '瘟疫', text: '營中有人發燒咳血，疫症開始蔓延。', needMen: 6,
    choices: [{ label: '花 200 金買藥', effect: 'cure' }, { label: '隔離病人，繼續行軍', effect: 'plague' }],
  },
  {
    id: 'harvest', title: '豐收', text: '路過嘅村民今年豐收，執意要送糧畀你。',
    choices: [{ label: '收下', effect: 'food' }, { label: '留畀佢哋，換聲望', effect: 'renown' }],
  },
  {
    id: 'deserters', title: '逃兵叛變', text: '幾個士兵半夜想偷馬走佬，被哨兵捉住。', needMen: 6,
    choices: [{ label: '軍法處置', effect: 'punish' }, { label: '放佢哋走，安撫軍心', effect: 'mercy' }],
  },
  {
    id: 'quarrel', title: '營中爭執', text: '兩個部下因為分戰利品打起上嚟，等你調停。', needMen: 4,
    choices: [{ label: '自己出錢擺平（100 金）', effect: 'settle' }, { label: '各打五十大板', effect: 'scold' }],
  },
  {
    id: 'peddler', title: '神秘行商', text: '有個披斗篷嘅行商話有好貨，收你 800 金換一張招募令。',
    choices: [{ label: '買', effect: 'ticket' }, { label: '唔信佢', effect: 'none' }],
  },
  {
    id: 'job_farmer', job: 'farmer', title: '大旱之年', text: '今年天旱，鄰村求你分啲種子。',
    choices: [{ label: '分畀佢哋', effect: 'renown' }, { label: '高價賣畀佢哋', effect: 'gold' }],
  },
  {
    id: 'job_hunter', job: 'hunter', title: '白鹿', text: '林中出現一隻通體雪白嘅鹿，老人話射唔得。',
    choices: [{ label: '放佢走', effect: 'renown' }, { label: '一箭射落', effect: 'food' }],
  },
  {
    id: 'job_fisher', job: 'fisher', title: '會講嘢嘅魚', text: '條魚開口話：放我走，我話你知河底金幣喺邊。',
    choices: [{ label: '放佢走', effect: 'gold' }, { label: '今晚加餸', effect: 'food' }],
  },
  {
    id: 'job_miner', job: 'miner', title: '礦脈異光', text: '礦道深處有奇異光芒，工友叫你唔好過去。',
    choices: [{ label: '掘落去', effect: 'gold' }, { label: '封咗條礦道', effect: 'renown' }],
  },
  {
    id: 'job_smith', job: 'smith', title: '名匠挑戰', text: '外地名匠上門，話你打嘅刀唔夠硬。',
    choices: [{ label: '鬥一場', effect: 'prophecy' }, { label: '虛心請教', effect: 'renown' }],
  },
  {
    id: 'job_merchant', job: 'merchant', title: '囤貨良機', text: '有消息話鐵價就快暴升，要唔要全倉買入？',
    choices: [{ label: '賭一鋪', effect: 'gold' }, { label: '穩陣啲', effect: 'none' }],
  },
  {
    id: 'job_cook', job: 'cook', title: '貴客臨門', text: '微服大官試你手勢，食得開心就幫你揚名。',
    choices: [{ label: '煮招牌菜', effect: 'renown' }, { label: '加價宰佢', effect: 'gold' }],
  },
  {
    id: 'job_doctor', job: 'doctor', title: '夜半求醫', text: '半夜有人拍門，話老母病重，但佢冇錢。',
    choices: [{ label: '即刻去', effect: 'renown' }, { label: '收定訂金先', effect: 'gold' }],
  },
  {
    id: 'job_bard', job: 'bard', title: '御前獻唱', text: '貴族宴會請你唱一曲，但要你讚佢打勝仗，雖然佢輸咗。',
    choices: [{ label: '照唱，收錢', effect: 'gold' }, { label: '唱真相', effect: 'renown' }],
  },
  {
    id: 'job_thief', job: 'thief', title: '同行請帖', text: '盜賊公會塞張紙條：今晚一齊做單大嘅？',
    choices: [{ label: '入夥', effect: 'gold' }, { label: '獨行', effect: 'prophecy' }],
  },
  {
    id: 'job_hermit', job: 'hermit', title: '頓悟', text: '打坐到深處，你好似見到自己嘅前世。',
    choices: [{ label: '繼續入定', effect: 'prophecy' }, { label: '抽身返嚟', effect: 'none' }],
  },
  {
    id: 'job_warrior', job: 'warrior', title: '比武下戰書', text: '老對手派人送嚟戰書，約你單打獨鬥。',
    choices: [{ label: '應戰', effect: 'prophecy' }, { label: '一笑置之', effect: 'renown' }],
  },
  {
    id: 'plaguegrain', scenario: 'frostwar', title: '染疫糧車', text: '一架糧車入面嘅麥發黑。王子話要燒村，村民喊住求你。',
    choices: [{ label: '燒咗糧，救得幾多得幾多', effect: 'renown' }, { label: '放過村民，自己收低部分糧', effect: 'food' }],
  },
  {
    id: 'hordeoath', scenario: 'frostwar', title: '戰歌之盟', text: '獸人斥候放低斧頭：「屍潮面前，冇人類同獸人之分。」',
    choices: [{ label: '握手結盟', effect: 'prophecy' }, { label: '唔信佢', effect: 'none' }],
  },
  {
    id: 'distress', scenario: 'starwar', title: '求救訊號', text: '殖民站傳嚟斷續訊號，背景有好多爪刮金屬嘅聲。',
    choices: [{ label: '派隊支援', effect: 'renown' }, { label: '搜刮物資', effect: 'gold' }],
  },
  {
    id: 'psivision', scenario: 'starwar', title: '靈能幻象', text: '一個金色身影喺你腦入面講：「星區將燃，選擇你嘅陣營。」',
    choices: [{ label: '接受試煉', effect: 'prophecy' }, { label: '當係幻覺', effect: 'none' }],
  },
  {
    id: 'firstblood', scenario: 'ancients', title: '第一滴血', text: '河道傳嚟宣告：有人拎咗第一滴血，全軍士氣大振。',
    choices: [{ label: '乘勝追擊', effect: 'renown' }, { label: '回泉水補給', effect: 'food' }],
  },
  {
    id: 'deepbeast', scenario: 'ancients', title: '遠古巨獸甦醒', text: '河邊洞穴傳出震動，打低佢可以攞到復活神物。',
    choices: [{ label: '帶隊去打', effect: 'prophecy' }, { label: '讓畀對面', effect: 'none' }],
  },
  {
    id: 'minecollapse', scenario: 'emberdeep', title: '礦坑塌陷', text: '礦工話第三層塌咗，下面傳嚟紅光同低語。',
    choices: [{ label: '救人', effect: 'renown' }, { label: '撿走散落嘅熾礦', effect: 'gold' }],
  },
  {
    id: 'petfood', scenario: 'emberdeep', title: '餵魚變身', text: '行商話餵隻狗食條怪魚，佢會變成魔狼三十秒。',
    choices: [{ label: '買條試下', effect: 'gold' }, { label: '唔好玩', effect: 'none' }],
  },
  {
    id: 'wyrmshadow', magic: true, title: '龍影掠空', text: '巨大黑影掠過頭頂，村民話預言中吞食龍魂嘅人就快出現，全部人望住你。',
    choices: [{ label: '接受呢個身份', effect: 'prophecy' }, { label: '我只係過路', effect: 'none' }],
  },
  {
    id: 'hollowdream', magic: true, title: '被奪走嘅心', text: '你夢見一條赤龍將爪插入你胸口，醒來胸前真係有條舊疤，隨從話見過你夢入面嗰座山。',
    choices: [{ label: '跟隨從搵線索', effect: 'prophecy' }, { label: '當係惡夢', effect: 'food' }],
  },
  {
    id: 'cattrader', magic: true, title: '貓人行商', text: '貓耳商隊喺火堆邊招手，話肯用南方香料換你一段路程。',
    choices: [{ label: '護送佢哋', effect: 'gold' }, { label: '收佢哋過路費', effect: 'renown' }],
  },
  {
    id: 'tombwhisper', magic: true, title: '墳墓低語', text: '北方焦土傳嚟低語：第十層嘅王歡迎任何夠膽落去嘅人。一個蒼白信使留低一袋金幣。',
    choices: [{ label: '收低', effect: 'gold' }, { label: '掟返畀佢', effect: 'renown' }],
  },
  {
    id: 'slimeenvoy', magic: true, title: '魔物使者', text: '一隻史萊姆頂住信件彈到你面前：萬魔城想同你做朋友。',
    choices: [{ label: '回信示好', effect: 'monsterfriend' }, { label: '斬咗佢', effect: 'none' }],
  },
  {
    id: 'orphan', title: '流浪少年', text: '一個少年跪喺路邊，求你帶佢入伍。',
    choices: [{ label: '收留', effect: 'recruit' }, { label: '畀啲乾糧佢走', effect: 'renown' }],
  },
];

export const ENDINGS = {
  /** 統一大陸結局文字 */
  title: '天下一統',
  text: '烽煙散盡，諸國稱臣。由無名傭兵到一國之君，你嘅名字會刻喺裂天大陸嘅史書上。',
};
