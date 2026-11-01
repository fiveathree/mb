import { RACES, type Race } from './races';
import type { HorseDef } from './horses';
import type { UnitDef } from './units';
import type { WeaponDef } from './weapons';

/** 骨架家族：同一家族動作名一樣；q 同 kk 全家共用一份動作檔 */
export type SkinFamily = 'q' | 'kk' | 'mon' | 'fly' | 'beast';

export const FAMILY_CLIPS: Record<SkinFamily, { idle: string; walk: string; run: string; slash: string; shot: string; hit: string; die: string; sit?: string; source?: string; bones: { hand: string; off: string; head?: string; headScale?: number } }> = {
  q: { idle: 'Idle', walk: 'Walk', run: 'Run', slash: 'SwordSlash', shot: 'Shoot_OneHanded', hit: 'RecieveHit', die: 'Death', sit: 'SitDown', source: 'c_Knight_Male', bones: { hand: 'FistR', off: 'FistL', head: 'Head', headScale: 0.8 } },
  kk: { idle: 'Idle', walk: 'Walking_A', run: 'Running_A', slash: '1H_Melee_Attack_Chop', shot: '1H_Ranged_Shoot', hit: 'Hit_A', die: 'Death_A', sit: 'Sit_Chair_Pose', source: 'knight', bones: { hand: 'handslotr', off: 'handslotl', head: 'head', headScale: 0.62 } },
  mon: { idle: 'Idle', walk: 'Walk', run: 'Run', slash: 'Punch', shot: 'Weapon', hit: 'HitReact', die: 'Death', bones: { hand: 'FistR', off: 'FistL' } },
  fly: { idle: 'Flying_Idle', walk: 'Flying_Idle', run: 'Fast_Flying', slash: 'Headbutt', shot: 'Punch', hit: 'HitReact', die: 'Death', bones: { hand: 'FistR', off: 'FistL' } },
  beast: { idle: 'Idle', walk: 'Walk', run: 'Gallop', slash: 'Attack', shot: 'Attack', hit: 'Idle_HitReact1', die: 'Death', bones: { hand: 'Head', off: 'Head' } },
};

export interface SkinLook {
  file: string;
  family: SkinFamily;
  /** 乘落顏色，冇就原色 */
  tint?: number;
  /** 手持武器，冇代表徒手或者模型自帶 */
  weapon?: string;
  /** 動物模型骨架名唔同，冇就唔掛 */
  shield?: boolean;
}

const q = (file: string, tint?: number): SkinLook => ({ file: `c_${file}`, family: 'q', tint });
const mon = (file: string, tint?: number): SkinLook => ({ file: `m_${file}`, family: 'mon', tint });
const fly = (file: string, tint?: number): SkinLook => ({ file: `f_${file}`, family: 'fly', tint });
const kk = (file: string, weapon?: string): SkinLook => ({ file, family: 'kk', weapon });

/** 冠位外觀：有對應模型嘅用專屬，其餘按性別同地區 */
const CROWN_LOOK: Record<string, SkinLook> = {
  crown_wukong: mon('Monkroose'), crown_niumo: mon('Orc_Skull', 0x8a5a3a), crown_bajie: mon('Orc', 0xf0b0c0), crown_wujing: mon('Tribal', 0x7a9ac0),
  crown_honghai: q('Kimono_Male', 0xff8a6a), crown_nezha: q('Kimono_Male', 0xffa0a0), crown_tangseng: q('Casual_Bald', 0xffd080), crown_luzhishen: q('Casual_Bald'),
  crown_jingke: q('Ninja_Male'), crown_nieyinniang: q('Ninja_Female'), crown_hongxian: q('Ninja_Female'), crown_baiyutang: q('Ninja_Male', 0xf0f0ff), crown_liuxiang: q('Kimono_Male', 0xf0e8c0),
  crown_owl: q('Ninja_Male', 0x8a8aa0), crown_lane: q('Ninja_Male', 0x505060), crown_daoling: q('Wizard', 0xffe8a0), crown_kongming: q('Wizard', 0xf0f0f0), crown_ziya: q('Wizard', 0xc0d0ff), crown_taibai: q('Wizard', 0xfff0c0), crown_meruna: q('Witch', 0xb08aff),
  crown_zhongkui: q('Knight_Male', 0xff9a8a), crown_yanluo: mon('Demon', 0x8060c0), crown_niutou: mon('Orc_Skull', 0x9a6a3a), crown_mamian: mon('Orc_Skull', 0xc0a080), crown_wuchang: kk('skel_mage'), crown_zanghun: kk('skel_mage'), crown_baigu: q('Zombie_Female', 0xf0e8d8),
  crown_hald: fly('Demon', 0xbfe0ff), crown_daji: q('Elf', 0xffa0c0), crown_xiaoqian: fly('Ghost', 0xd8e0ff), crown_chiyou: mon('Demon', 0xc8342c), crown_xingtian: mon('Orc_Skull', 0xc08060), crown_kuafu: mon('Yeti', 0xc08050), crown_juling: mon('Orc', 0xffd080), crown_ares: mon('Demon', 0xff8a5a),
  crown_hades: mon('Demon', 0x505070), crown_anubis: mon('Tribal', 0x303040), crown_osiris: q('Zombie_Male', 0x80d080), crown_modis: mon('Demon', 0x503080), crown_lilis: q('Witch', 0xff80b0), crown_sheji: mon('Dino', 0x80c090), fig_warchief: mon('Orc'), fig_treelord: mon('Tribal', 0x60a050),
  crown_tiege: q('Soldier_Male', 0x808890), crown_leijie: q('BlueSoldier_Male'), crown_wendy: q('Casual_Female'), fig_marshal: q('BlueSoldier_Male'), fig_alchemist: q('Worker_Female'),
  crown_atalanta: q('Elf'), fig_windranger: q('Elf'), crown_change: q('Kimono_Female', 0xe0f0ff), crown_nvwa: mon('Dino', 0xc0f0d0), crown_jingwei: q('Kimono_Female', 0xffa080), crown_tieshan: q('Viking_Female', 0xff9a6a),
};
const FEMALE = new Set(['crown_persephone', 'crown_hecate', 'crown_hela', 'crown_mengpo', 'crown_ira', 'crown_lumen', 'crown_oserin', 'crown_feiye', 'crown_heiyao', 'crown_xuance', 'crown_wuyin']);
const EAST = /crown_(lubu|caocao|zhaoyun|taishici|guanyu|zhangfei|zhouyu|simayi|cunxiao|abaoji|qianliu|lijing|leigong|yangjian|wenzhong|leizhen|feihu|tuxing|huangdi|houyi|dayu|wusong|linchong|qiuran|zhanzhao|yanguichen|wuchen|xuehe|yanchixia|shouyi)/;

const dim = (color: number, k: number) => {
  const c = [16, 8, 0].map((s) => Math.round(255 + (((color >> s) & 255) - 255) * k));
  return (c[0] << 16) | (c[1] << 8) | c[2];
};

/** 冇專屬模型嘅種族：用最接近嘅形體再染膚色 */
const RACE_LOOK: Partial<Record<Race, (def: UnitDef) => SkinLook>> = {
  orc: () => mon('Orc'),
  ogre: () => mon('Orc', 0xc0b080),
  goblin: (d) => q(d.tier > 2 ? 'Goblin_Female' : 'Goblin_Male'),
  demon: (d) => (d.role === 'mage' ? mon('BlueDemon') : mon('Demon')),
  minotaur: () => mon('Orc_Skull', 0x9a6a4a),
  lizard: () => mon('Dino'),
  dragonkin: () => mon('Dino', 0xe08060),
  werewolf: () => mon('Yeti', 0x8a7a6a),
  beastkin: () => mon('Tribal'),
  treant: () => mon('Tribal', 0x60a050),
  golem: () => mon('Yeti', 0x9a9aa8),
  giant: () => mon('Yeti', 0xc0a080),
  swarm: () => mon('Dino', 0x9a60b0),
  slime: () => mon('Frog', 0x60c0f0),
  dragon: (d) => fly(d.id === 'boss_wyrm' ? 'Dragon_Evolved' : 'Dragon'),
  harpy: () => fly('Demon', 0xd8b48c),
  fairy: () => q('Elf', 0xf0d8f0),
  merfolk: () => q('Elf', 0x7fc8c0),
  nord: (d) => q(d.role === 'mage' ? 'Wizard' : 'Viking_Male'),
  vampire: () => q('OldClassy_Male', 0xd0d0e0),
  darkelf: () => q('Elf', 0x8a84a8),
  elf: () => q('Elf'),
  dwarf: () => q('Viking_Male', 0xd8a070),
  halfling: () => q('Worker_Male'),
  psionic: () => q('Wizard', 0xc8a860),
  centaur: () => q('Viking_Male', 0xc89a70),
};

function humanLook(def: UnitDef, tier: number): SkinLook {
  if (def.civilian) return q(['Worker_Male', 'Casual_Female', 'OldClassy_Male', 'Worker_Female'][Math.abs(def.id.charCodeAt(def.id.length - 1)) % 4]);
  if (def.role === 'mage') return q('Wizard');
  if (def.role === 'archer') return q(tier >= 4 ? 'Ninja_Male' : 'Soldier_Female');
  if (def.hero || tier >= 6) return q('Knight_Golden_Male');
  if (tier >= 4) return q('Knight_Male');
  return q(tier >= 3 ? 'Soldier_Male' : 'BlueSoldier_Male');
}

function undeadLook(def: UnitDef, model?: string): SkinLook {
  if (def.role === 'mage') return kk('skel_mage', 'Skeleton_Staff');
  if (def.role === 'archer') return kk('skel_rogue', 'Skeleton_Crossbow');
  if (def.tier <= 1) return q('Zombie_Male');
  if (def.tier <= 2) return kk('skel_minion', 'Skeleton_Blade');
  return kk('skeleton', model === 'axe' ? 'Skeleton_Axe' : 'Skeleton_Blade');
}

const BOSS_LOOK: Record<string, SkinLook> = {
  boss_hive: mon('Dino', 0x9a60b0), boss_ancient: mon('Tribal', 0x8a7a5a), boss_lightgod: q('Knight_Golden_Male'), boss_jiangwang: q('Zombie_Male'), boss_mutant: mon('Yeti', 0xc08080),
  boss_cyclops: mon('Yeti', 0xc0a080), boss_gonggong: mon('Dino', 0x60a0d0), boss_kronos: mon('Orc_Skull', 0xa08060), boss_asura: mon('Demon', 0xff8a70), boss_demongod: mon('Demon', 0xe07080), boss_voidgod: mon('BlueDemon', 0xc0a0ff),
};

/** 按兵種、武器、種族揀外觀：所有單位都有 */
export function skinLook(def: UnitDef, weapons: WeaponDef[]): SkinLook {
  const race: Race = def.race ?? 'human';
  const model = weapons[0]?.model;
  const shield = weapons.some((w) => w.hasShield);
  const crown = def.crown;
  let look: SkinLook | undefined = BOSS_LOOK[def.id] ?? (crown ? CROWN_LOOK[crown] : undefined);
  if (!look && crown) {
    if (race === 'human' || race === 'nord') look = q(FEMALE.has(crown) ? 'Witch' : EAST.test(crown) ? 'Kimono_Male' : 'Knight_Golden_Male');
  }
  if (!look && race === 'undead') look = undeadLook(def, model);
  if (!look) look = RACE_LOOK[race]?.(def);
  if (!look) look = humanLook(def, def.tier);
  // 模型冇獨立膚色資料嘅種族：輕輕染色
  const tint = look.tint ?? (race !== 'human' && look.family === 'q' && !RACE_LOOK[race] ? dim(RACES[race].skin, 0.6) : undefined);
  const armed = look.family === 'q' || (look.family === 'mon' && look.file !== 'm_Frog');
  return { ...look, tint, weapon: look.weapon ?? (armed ? model : undefined), shield: armed && shield && def.role !== 'mage' };
}

const MOUNT: Record<string, Pick<SkinLook, 'file' | 'tint'>> = {
  hunter: { file: 'a_Horse' }, steppe: { file: 'a_Horse' }, warhorse: { file: 'a_Horse', tint: 0x8a8a90 }, pack: { file: 'a_Horse', tint: 0xc0a080 },
  wolf: { file: 'a_Wolf' }, dire_wolf: { file: 'a_Wolf', tint: 0x707078 }, tiger: { file: 'a_Fox', tint: 0xffc060 }, buffalo: { file: 'a_Bull', tint: 0x80705a }, rhino: { file: 'a_Bull', tint: 0xa0a0a8 },
  camel: { file: 'a_Alpaca', tint: 0xe0c080 }, elk: { file: 'a_Stag' }, seahorse: { file: 'a_Horse_White', tint: 0x80d0e0 }, unicorn: { file: 'a_Horse_White' }, pegasus: { file: 'a_Horse_White' },
  griffin_mount: { file: 'a_Horse_White', tint: 0xf0d8a0 }, nightmare: { file: 'a_Horse', tint: 0x503040 }, drake: { file: 'a_Bull', tint: 0xa05040 }, hoverbike: { file: 'a_Horse', tint: 0x9098a8 }, jetskimmer: { file: 'a_Horse', tint: 0x6090b0 },
};

export const mountLook = (def: HorseDef): SkinLook => ({ ...(MOUNT[def.id] ?? MOUNT.hunter), family: 'beast' });
