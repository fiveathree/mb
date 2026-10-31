import type { Role } from './units';

export type Culture = 'east' | 'west' | 'magic';
export const CULTURE_NAME: Record<Culture, string> = { east: '東方', west: '西方', magic: '魔法' };

export type FormationShape = 'block' | 'line' | 'wings' | 'wedge' | 'ring' | 'square';

export interface FormationBonus {
  /** 全軍傷害 */
  damage?: number;
  /** 全軍護甲 */
  armor?: number;
  /** 受箭傷害減免 */
  arrow?: number;
  /** 打騎兵額外傷害 */
  antiCavalry?: number;
  /** 法術傷害 */
  spell?: number;
}

export interface FormationDef {
  id: string;
  name: string;
  culture: Culture;
  desc: string;
  shape: FormationShape;
  bonus: FormationBonus;
  /** 智力要求：唔夠效果按比例打折 */
  needInt: number;
  /** 戰術技能要求 */
  needTactics: number;
  /** 兵種要求：唔夠就佈唔到 */
  needRole?: Partial<Record<Role, number>>;
  /** 要呢啲武器類兵種（模型） */
  needSpears?: number;
}

export const FORMATIONS: FormationDef[] = [
  {
    id: 'plain', name: '方陣', culture: 'east', desc: '基本隊形，人人都識', shape: 'block', bonus: {}, needInt: 0, needTactics: 0,
  },
  // 東方
  {
    id: 'snake', name: '一字長蛇陣', culture: 'east', desc: '橫排拉闊，弓箭傷害少', shape: 'line',
    bonus: { arrow: 0.25, damage: 0.05 }, needInt: 6, needTactics: 1, needRole: { infantry: 8 },
  },
  {
    id: 'crane', name: '鶴翼陣', culture: 'east', desc: '兩翼包抄，傷害大增', shape: 'wings',
    bonus: { damage: 0.18 }, needInt: 7, needTactics: 2, needRole: { infantry: 10, archer: 4 },
  },
  {
    id: 'arrow', name: '鋒矢陣', culture: 'east', desc: '集中衝破敵陣', shape: 'wedge',
    bonus: { damage: 0.24, armor: -2 }, needInt: 7, needTactics: 3, needRole: { infantry: 8, cavalry: 3 },
  },
  {
    id: 'bagua', name: '八卦陣', culture: 'east', desc: '環形變化，攻守兼備', shape: 'ring',
    bonus: { damage: 0.1, armor: 3, arrow: 0.15 }, needInt: 10, needTactics: 5, needRole: { infantry: 12 },
  },
  // 西方
  {
    id: 'phalanx', name: '長矛方陣', culture: 'west', desc: '密集長矛，騎兵克星', shape: 'square',
    bonus: { antiCavalry: 0.8, armor: 2 }, needInt: 5, needTactics: 1, needSpears: 6,
  },
  {
    id: 'testudo', name: '龜甲陣', culture: 'west', desc: '舉盾成殼，箭雨無用', shape: 'square',
    bonus: { arrow: 0.6, armor: 3, damage: -0.1 }, needInt: 6, needTactics: 2, needRole: { infantry: 10 },
  },
  {
    id: 'wedge', name: '楔形陣', culture: 'west', desc: '騎士楔入敵陣', shape: 'wedge',
    bonus: { damage: 0.2 }, needInt: 6, needTactics: 2, needRole: { cavalry: 5 },
  },
  {
    id: 'shieldwall', name: '盾牆', culture: 'west', desc: '肩並肩頂住衝擊', shape: 'line',
    bonus: { armor: 5, damage: -0.05 }, needInt: 5, needTactics: 1, needRole: { infantry: 10 },
  },
  // 魔法
  {
    id: 'magiccircle', name: '魔法陣', culture: 'magic', desc: '法師環陣，法術暴增', shape: 'ring',
    bonus: { spell: 0.6, arrow: 0.1 }, needInt: 9, needTactics: 1, needRole: { mage: 3 },
  },
  {
    id: 'wardcircle', name: '護法結界', culture: 'magic', desc: '結界護全軍', shape: 'ring',
    bonus: { armor: 4, arrow: 0.35 }, needInt: 10, needTactics: 2, needRole: { mage: 2 },
  },
];

export const FORMATION_RULES = {
  /** 英雄帶領：有英雄時效果加成 */
  heroBonus: 0.25,
  /** 效果上限 */
  maxEfficiency: 1.5,
  /** 效果低過呢個就佈唔到 */
  minEfficiency: 0.4,
  /** 戰鬥中換陣冷卻（秒） */
  switchCooldown: 8,
  /** 敵軍陣法效果 */
  enemyEfficiency: 0.8,
  /** 離自己位置幾遠算散咗（公尺） */
  cohesionDist: 12,
  /** 全軍散晒時仲有幾多成加成 */
  minCohesion: 0.25,
};
