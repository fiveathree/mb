import { RACES, type Race } from './races';
import type { HorseDef } from './horses';
import type { UnitDef } from './units';
import type { WeaponDef } from './weapons';

/** 骨架家族：h 係正常比例人形，全家共用一份動作檔 */
export type SkinFamily = 'h' | 'fly' | 'beast';

interface FamilyClips {
  idle: string; walk: string; run: string; slash: string; shot: string; spell: string; hit: string; die: string; sit?: string; source?: string;
  bones: { hand: string; off: string };
  /** 武器喺手骨入面嘅轉向 */
  grip: [number, number, number];
  /** 盾喺手骨入面嘅轉向 */
  guard: [number, number, number];
}

export const FAMILY_CLIPS: Record<SkinFamily, FamilyClips> = {
  h: {
    idle: 'Idle_Loop', walk: 'Walk_Loop', run: 'Jog_Fwd_Loop', slash: 'Sword_Attack', shot: 'Pistol_Shoot', spell: 'Spell_Simple_Shoot', hit: 'Hit_Chest', die: 'Death01', sit: 'Sitting_Idle_Loop', source: 'h_anim',
    bones: { hand: 'hand_r', off: 'hand_l' }, grip: [Math.PI, 0, 0], guard: [0, 0, 0],
  },
  fly: { idle: 'Flying_Idle', walk: 'Flying_Idle', run: 'Fast_Flying', slash: 'Headbutt', shot: 'Punch', spell: 'Punch', hit: 'HitReact', die: 'Death', bones: { hand: 'FistR', off: 'FistL' }, grip: [0, 0, 0], guard: [0, 0, 0] },
  beast: { idle: 'Idle', walk: 'Walk', run: 'Gallop', slash: 'Attack', shot: 'Attack', spell: 'Attack', hit: 'Idle_HitReact1', die: 'Death', bones: { hand: 'Head', off: 'Head' }, grip: [0, 0, 0], guard: [0, 0, 0] },
};

/** 程式砌嘅裝備件，形狀喺 battle/skins.ts */
export type GearPiece = 'helm' | 'conical' | 'plume' | 'cuirass' | 'pauldrons' | 'skirt' | 'greaves' | 'robe' | 'wizardHat' | 'horns' | 'bigHorns' | 'tusks' | 'ears' | 'antlers' | 'circlet' | 'crown' | 'wings';

export interface SkinLook {
  file: string;
  family: SkinFamily;
  /** 乘落貼圖嘅顏色：種族膚色、服色 */
  tint?: number;
  gear?: GearPiece[];
  /** 裝備主色 */
  metal?: number;
  /** 裝備副色：羽毛、布料 */
  trim?: number;
  hair?: string;
  weapon?: string;
  shield?: boolean;
}

const STEEL = 0xb8c0cc;
const IRON = 0x70747c;
const GOLD = 0xe0b84a;
const BRONZE = 0xb08040;
const LEATHER = 0x6a4a30;
const RED = 0xa82a24;
const BLUE = 0x2a4a90;

const MAN: Pick<SkinLook, 'file' | 'family'> = { file: 'h_MP', family: 'h' };
const WOMAN: Pick<SkinLook, 'file' | 'family'> = { file: 'h_FP', family: 'h' };
const RANGER_M: Pick<SkinLook, 'file' | 'family'> = { file: 'h_MR', family: 'h' };
const RANGER_F: Pick<SkinLook, 'file' | 'family'> = { file: 'h_FR', family: 'h' };

const sets = {
  light: { gear: ['helm', 'skirt'], metal: IRON, trim: LEATHER },
  medium: { gear: ['helm', 'cuirass', 'skirt'], metal: IRON, trim: BLUE },
  heavy: { gear: ['helm', 'plume', 'cuirass', 'pauldrons', 'skirt', 'greaves'], metal: STEEL, trim: RED },
  royal: { gear: ['crown', 'cuirass', 'pauldrons', 'skirt', 'greaves'], metal: GOLD, trim: RED },
  east: { gear: ['conical', 'plume', 'cuirass', 'pauldrons', 'skirt'], metal: BRONZE, trim: RED },
  eastLight: { gear: ['conical', 'skirt'], metal: IRON, trim: 0x304050 },
  robe: { gear: ['robe', 'wizardHat'], metal: 0x34306a, trim: 0xd8c070 },
  monk: { gear: ['robe', 'circlet'], metal: 0xc8a050, trim: GOLD },
} satisfies Record<string, Pick<SkinLook, 'gear' | 'metal' | 'trim'>>;

const crownSet = (gear: Pick<SkinLook, 'gear' | 'metal' | 'trim'>, extra: Partial<SkinLook> = {}): SkinLook => ({ ...MAN, ...gear, ...extra });

/** 有形象嘅冠位：其餘按性別、地區同種族 */
const CROWN_LOOK: Record<string, SkinLook> = {
  crown_wukong: crownSet(sets.east, { gear: ['circlet', 'plume', 'cuirass', 'pauldrons', 'skirt'], metal: GOLD, tint: 0xd8a860 }),
  crown_niumo: crownSet(sets.heavy, { gear: ['bigHorns', 'cuirass', 'pauldrons', 'skirt'], metal: IRON, tint: 0x8a5a3a }),
  crown_bajie: crownSet(sets.medium, { gear: ['ears', 'cuirass', 'skirt'], metal: BRONZE, tint: 0xf0b0b8 }),
  crown_wujing: crownSet(sets.monk, { tint: 0x8aa0c0, metal: 0x304060 }),
  crown_tangseng: crownSet(sets.monk, { gear: ['crown', 'robe'], metal: RED }),
  crown_luzhishen: crownSet(sets.monk, { metal: 0x505a48 }),
  crown_kongming: crownSet(sets.robe, { metal: 0xe8e8e0, trim: 0x303040 }),
  crown_ziya: crownSet(sets.robe, { metal: 0x4a5a80, hair: 'Hair_Beard' }),
  crown_taibai: crownSet(sets.robe, { metal: 0xf0ecd8, hair: 'Hair_Beard' }),
  crown_daoling: crownSet(sets.robe, { metal: 0xd8b840 }),
  crown_shouyi: crownSet(sets.robe, { metal: 0xc8a040 }),
  crown_zhongkui: crownSet(sets.east, { metal: RED, hair: 'Hair_Beard' }),
  crown_guanyu: crownSet(sets.east, { metal: 0x2a7a4a, trim: 0x2a7a4a, hair: 'Hair_Beard' }),
  crown_zhangfei: crownSet(sets.east, { metal: IRON, hair: 'Hair_Beard' }),
  crown_lubu: crownSet(sets.east, { metal: GOLD, trim: RED }),
  crown_yanluo: crownSet(sets.royal, { gear: ['crown', 'robe'], metal: 0x4a2a6a, tint: 0xc0a0d0 }),
  crown_niutou: crownSet(sets.medium, { gear: ['bigHorns', 'cuirass', 'skirt'], tint: 0x9a6a3a }),
  crown_mamian: crownSet(sets.medium, { gear: ['ears', 'cuirass', 'skirt'], tint: 0xc0a080 }),
  crown_chiyou: crownSet(sets.heavy, { gear: ['bigHorns', 'cuirass', 'pauldrons', 'skirt', 'greaves'], metal: IRON, tint: 0xc05a48 }),
  crown_xingtian: crownSet(sets.medium, { gear: ['cuirass', 'skirt'], metal: BRONZE, tint: 0xc08060 }),
  crown_kuafu: crownSet(sets.light, { gear: ['skirt'], tint: 0xc08050 }),
  crown_juling: crownSet(sets.heavy, { metal: GOLD }),
  crown_hades: crownSet(sets.royal, { metal: 0x3a3a50, tint: 0xb0b0c8 }),
  crown_anubis: crownSet(sets.royal, { gear: ['ears', 'cuirass', 'skirt'], metal: GOLD, tint: 0x505060 }),
  crown_osiris: crownSet(sets.royal, { gear: ['crown', 'robe'], metal: 0xe8e0c8, tint: 0x80c080 }),
  crown_modis: crownSet(sets.royal, { gear: ['horns', 'cuirass', 'pauldrons', 'skirt'], metal: 0x302040, tint: 0x8060a0 }),
  crown_hald: crownSet(sets.heavy, { gear: ['horns', 'cuirass', 'pauldrons', 'skirt'], metal: 0xa0c8e8, tint: 0xc0d8f0 }),
};

const FEMALE = new Set(['crown_persephone', 'crown_hecate', 'crown_hela', 'crown_mengpo', 'crown_ira', 'crown_lumen', 'crown_oserin', 'crown_feiye', 'crown_heiyao', 'crown_xuance', 'crown_wuyin', 'crown_nieyinniang', 'crown_hongxian', 'crown_daji', 'crown_baigu', 'crown_nvwa', 'crown_change', 'crown_jingwei', 'crown_tieshan', 'crown_meruna', 'crown_atalanta', 'crown_lilis', 'crown_xiaoqian', 'crown_wendy', 'fig_windranger', 'fig_alchemist']);
const EAST = /crown_(caocao|zhaoyun|taishici|zhouyu|simayi|cunxiao|abaoji|qianliu|lijing|leigong|yangjian|wenzhong|leizhen|feihu|tuxing|huangdi|houyi|dayu|wusong|linchong|qiuran|zhanzhao|yanguichen|wuchen|xuehe|yanchixia|jingke|baiyutang|liuxiang|nezha|honghai)/;

const mix = (color: number, k: number) => {
  const c = [16, 8, 0].map((s) => Math.round(255 + (((color >> s) & 255) - 255) * k));
  return (c[0] << 16) | (c[1] << 8) | c[2];
};

/** 非人類種族：同一副身體，加膚色同特徵件 */
const RACE_GEAR: Partial<Record<Race, { gear: GearPiece[]; k?: number; metal?: number }>> = {
  orc: { gear: ['tusks', 'cuirass', 'skirt'], metal: LEATHER, k: 0.5 },
  ogre: { gear: ['tusks', 'skirt'], metal: LEATHER, k: 0.7 },
  goblin: { gear: ['ears', 'skirt'], metal: LEATHER, k: 0.55 },
  demon: { gear: ['horns', 'cuirass', 'pauldrons', 'skirt'], metal: 0x584050, k: 0.5 },
  minotaur: { gear: ['bigHorns', 'skirt'], metal: LEATHER, k: 0.8 },
  lizard: { gear: ['horns', 'skirt'], metal: LEATHER, k: 0.75 },
  dragonkin: { gear: ['horns', 'cuirass', 'skirt'], metal: BRONZE, k: 0.7 },
  werewolf: { gear: ['ears', 'skirt'], metal: LEATHER, k: 0.85 },
  beastkin: { gear: ['ears', 'cuirass', 'skirt'], metal: LEATHER, k: 0.5 },
  treant: { gear: ['antlers', 'skirt'], metal: 0x4a6a30, k: 0.85 },
  golem: { gear: ['cuirass', 'pauldrons', 'greaves'], metal: 0x6a6e78, k: 0.85 },
  giant: { gear: ['tusks', 'skirt'], metal: LEATHER, k: 0.6 },
  swarm: { gear: ['antlers', 'cuirass'], metal: 0x4a2a5a, k: 0.8 },
  slime: { gear: [], k: 0.9 },
  harpy: { gear: ['wings', 'skirt'], metal: 0xa08060, k: 0.4 },
  fairy: { gear: ['wings', 'circlet'], metal: 0xf0e0a0, k: 0.3 },
  merfolk: { gear: ['ears', 'cuirass'], metal: 0x4a90a0, k: 0.6 },
  vampire: { gear: ['cuirass', 'skirt'], metal: 0x301820, k: 0.3 },
  darkelf: { gear: ['ears', 'cuirass', 'skirt'], metal: 0x4a4858, k: 0.55 },
  elf: { gear: ['ears', 'cuirass', 'skirt'], metal: 0x6a8a5a, k: 0.15 },
  dwarf: { gear: ['helm', 'cuirass', 'skirt'], metal: IRON, k: 0.2 },
  undead: { gear: ['helm', 'cuirass', 'skirt'], metal: 0x7a7468, k: 0.45 },
  psionic: { gear: ['circlet', 'robe'], metal: 0x706040, k: 0.5 },
};

function humanSet(def: UnitDef) {
  if (def.hero || def.tier >= 6) return sets.royal;
  if (def.tier >= 4) return sets.heavy;
  return def.tier >= 3 ? sets.medium : sets.light;
}

const HEAD_COVER = new Set<GearPiece>(['helm', 'conical', 'wizardHat']);
const BOSS_TINT: Record<string, number> = { boss_lightgod: 0xfff0c0, boss_jiangwang: 0x90a090, boss_mutant: 0xc08080, boss_ancient: 0x9a8a6a };

/** 按兵種、武器、種族揀外觀：所有單位都有 */
export function skinLook(def: UnitDef, weapons: WeaponDef[]): SkinLook {
  if (def.animal) return { file: def.animal.file, family: 'beast' };
  const race: Race = def.race ?? 'human';
  const model = weapons[0]?.model;
  const shield = weapons.some((w) => w.hasShield) && def.role !== 'mage';
  if (race === 'dragon') return { file: def.id === 'boss_wyrm' ? 'f_Dragon_Evolved' : 'f_Dragon', family: 'fly' };
  const crown = def.crown;
  const female = crown ? FEMALE.has(crown) : def.id.charCodeAt(def.id.length - 1) % 5 === 0;
  let look: SkinLook | undefined = crown ? CROWN_LOOK[crown] : undefined;
  if (!look) {
    const body = female ? WOMAN : MAN;
    const extra = RACE_GEAR[race];
    if (def.civilian) look = { ...body, hair: female ? 'Hair_Long' : 'Hair_SimpleParted' };
    else if (def.role === 'archer' && (race === 'human' || race === 'elf' || race === 'nord')) look = { ...(female ? RANGER_F : RANGER_M) };
    else if (extra) {
      const robe = def.role === 'mage';
      look = { ...body, gear: robe ? [...extra.gear.filter((g) => g === 'horns' || g === 'bigHorns' || g === 'ears' || g === 'tusks' || g === 'antlers'), 'robe'] : extra.gear, metal: extra.metal, trim: LEATHER, tint: mix(RACES[race].skin, extra.k ?? 0.6) };
    } else if (def.role === 'mage') look = { ...body, ...sets.robe };
    else if (crown) look = { ...body, ...(EAST.test(crown) ? sets.east : sets.royal) };
    else look = { ...body, ...humanSet(def) };
  }
  const tint = BOSS_TINT[def.id] ?? look.tint;
  // 冇頭盔就要有頭髮
  const covered = look.file.endsWith('R') || look.gear?.some((g) => HEAD_COVER.has(g));
  const hair = look.hair ?? (covered ? undefined : female ? 'Hair_Long' : 'Hair_SimpleParted');
  return { ...look, tint, hair, weapon: look.weapon ?? model, shield };
}

const MOUNT: Record<string, Pick<SkinLook, 'file' | 'tint'>> = {
  hunter: { file: 'a_Horse' }, steppe: { file: 'a_Horse' }, warhorse: { file: 'a_Horse', tint: 0x8a8a90 }, pack: { file: 'a_Horse', tint: 0xc0a080 },
  wolf: { file: 'a_Wolf' }, dire_wolf: { file: 'a_Wolf', tint: 0x707078 }, tiger: { file: 'a_Fox', tint: 0xffc060 }, buffalo: { file: 'a_Bull', tint: 0x80705a }, rhino: { file: 'a_Bull', tint: 0xa0a0a8 },
  camel: { file: 'a_Alpaca', tint: 0xe0c080 }, elk: { file: 'a_Stag' }, seahorse: { file: 'a_Horse_White', tint: 0x80d0e0 }, unicorn: { file: 'a_Horse_White' }, pegasus: { file: 'a_Horse_White' },
  griffin_mount: { file: 'a_Horse_White', tint: 0xf0d8a0 }, nightmare: { file: 'a_Horse', tint: 0x503040 }, drake: { file: 'a_Bull', tint: 0xa05040 }, hoverbike: { file: 'a_Horse', tint: 0x9098a8 }, jetskimmer: { file: 'a_Horse', tint: 0x6090b0 },
};

export const mountLook = (def: HorseDef): SkinLook => ({ ...(MOUNT[def.id] ?? MOUNT.hunter), family: 'beast' });
