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
    id: 'orphan', title: '流浪少年', text: '一個少年跪喺路邊，求你帶佢入伍。',
    choices: [{ label: '收留', effect: 'recruit' }, { label: '畀啲乾糧佢走', effect: 'renown' }],
  },
];

export const ENDINGS = {
  /** 統一大陸結局文字 */
  title: '天下一統',
  text: '烽煙散盡，諸國稱臣。由無名傭兵到一國之君，你嘅名字會刻喺裂天大陸嘅史書上。',
};
