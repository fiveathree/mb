import { RACES, type Race } from './races';
import type { UnitDef } from './units';
import type { WeaponDef } from './weapons';

/** CC0 模型檔：public/models；extra 係外掛武器檔（public/models/items）同佢掛邊隻手 */
export const SKIN_FILES: Record<string, { extra?: Record<string, string> }> = {
  knight: {}, barbarian: {}, mage: {}, rogue: {}, hooded: {},
  skeleton: { extra: { Skeleton_Blade: 'handslot.r', Skeleton_Axe: 'handslot.r', Skeleton_Shield_Large_A: 'handslot.l' } },
  skel_minion: { extra: { Skeleton_Blade: 'handslot.r' } },
  skel_mage: { extra: { Skeleton_Staff: 'handslot.r' } },
  skel_rogue: { extra: { Skeleton_Crossbow: 'handslot.r' } },
};

export interface SkinLook {
  file: string;
  /** 顯示邊啲件 */
  items: string[];
  /** 種族膚色乘落貼圖，冇就原色 */
  tint?: number;
}

/** 非人形種族繼續用程式畫，保留翼、鰭、樹身等特徵 */
const NO_SKIN = new Set<Race>(['centaur', 'harpy', 'fairy', 'merfolk', 'slime', 'treant', 'swarm', 'golem', 'giant', 'dragon']);
/** 最大體型：再大嘅巨型單位用舊模型 */
const MAX_SCALE = 1.7;
/** 種族膚色乘落貼圖嘅強度 */
const TINT = 0.6;
const BEAST = new Set<Race>(['orc', 'goblin', 'ogre', 'minotaur', 'lizard', 'werewolf', 'beastkin', 'dragonkin', 'demon', 'nord']);

const mix = (color: number, k: number) => {
  const c = [16, 8, 0].map((s) => Math.round(255 + (((color >> s) & 255) - 255) * k));
  return (c[0] << 16) | (c[1] << 8) | c[2];
};

/** 按兵種、武器、種族揀外觀 */
export function skinLook(def: UnitDef, weapons: WeaponDef[]): SkinLook | null {
  const race: Race = def.race ?? 'human';
  if (def.colossal || def.civilian || NO_SKIN.has(race) || (def.scale ?? 1) > MAX_SCALE) return null;
  const w = weapons[0];
  const model = w?.model;
  const shield = weapons.some((x) => x.hasShield);
  if (race === 'undead') {
    if (def.role === 'mage') return { file: 'skel_mage', items: ['Skeleton_Mage_Hat', 'Skeleton_Staff'] };
    if (def.role === 'archer') return { file: 'skel_rogue', items: ['Skeleton_Rogue_Hood', 'Skeleton_Rogue_Cape', 'Skeleton_Crossbow'] };
    if (def.tier <= 2) return { file: 'skel_minion', items: ['Skeleton_Blade'] };
    return { file: 'skeleton', items: ['Skeleton_Warrior_Helmet', model === 'axe' ? 'Skeleton_Axe' : 'Skeleton_Blade', ...(shield ? ['Skeleton_Shield_Large_A'] : [])] };
  }
  const tint = race === 'human' ? undefined : mix(RACES[race].skin, TINT);
  if (def.role === 'mage') return { file: 'mage', items: ['2H_Staff', 'Mage_Hat', 'Mage_Cape'], tint };
  if (def.role === 'archer') return { file: race === 'elf' || race === 'darkelf' || race === 'vampire' ? 'hooded' : 'rogue', items: ['2H_Crossbow', 'Rogue_Cape'], tint };
  if (BEAST.has(race) || model === 'axe') {
    return { file: 'barbarian', items: [model === 'axe' && !shield ? '2H_Axe' : '1H_Axe', 'Barbarian_Hat', 'Barbarian_Cape', ...(shield ? ['Barbarian_Round_Shield'] : [])], tint };
  }
  const long = model === 'lance' || model === 'spear';
  return { file: 'knight', items: [long ? '2H_Sword' : '1H_Sword', 'Knight_Helmet', 'Knight_Cape', ...(shield && !long ? ['Round_Shield'] : [])], tint };
}
