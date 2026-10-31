import { PLACES, type PlaceDef } from '../data/world';
import { QUESTS as Q, type QuestKind } from '../data/quests';
import type { World, WorldSave } from '../worldmap/world';
import { dayOf } from '../worldmap/world';

export interface Quest {
  id: number;
  kind: QuestKind;
  title: string;
  giver: string;
  /** 目的地 */
  target?: string;
  /** 要清幾多隊賊 */
  need: number;
  progress: number;
  /** 運糧數量 */
  food: number;
  gold: number;
  relation: number;
  renown: number;
  deadline: number;
}

function hash(a: number, b: string): number {
  let h = a * 31;
  for (const ch of b) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h;
}

/** 某城當日嘅任務，按日子同地點決定，唔使存檔 */
export function offersAt(w: WorldSave, town: PlaceDef): Quest[] {
  const period = Math.floor(dayOf(w) / Q.refreshDays);
  const others = PLACES.filter((p) => (p.kind === 'town' || p.kind === 'village') && p.id !== town.id);
  return Q.kinds.map((kind, i) => {
    const h = hash(period + i, town.id);
    const target = others[h % others.length];
    const id = (period + 1) * 100 + i + town.x * 1000;
    const base = { id, kind, giver: town.id, progress: 0, deadline: dayOf(w) + Q.deadlineDays };
    if (kind === 'bandits') {
      const need = 1 + (h % 2);
      return { ...base, title: `清剿 ${need} 夥山賊`, need, food: 0, gold: 250 * need, relation: 6, renown: 3 * need };
    }
    if (kind === 'grain') {
      const food = 20 + (h % 3) * 10;
      return { ...base, title: `運 ${food} 糧去${target.name}`, target: target.id, need: 1, food, gold: food * 7, relation: 5, renown: 2 };
    }
    return { ...base, title: `送信去${target.name}`, target: target.id, need: 1, food: 0, gold: 180, relation: 4, renown: 1 };
  });
}

export function accept(world: World, q: Quest): string {
  const w = world.save;
  if (w.quests.some((x) => x.id === q.id)) return '已經接咗';
  if (w.quests.length >= Q.maxActive) return `最多同時接 ${Q.maxActive} 個任務`;
  w.quests.push({ ...q });
  return `接咗任務：${q.title}`;
}

function finish(world: World, q: Quest) {
  const w = world.save;
  w.quests = w.quests.filter((x) => x !== q);
  world.roster.gold += q.gold;
  w.pol.renown += q.renown;
  const owner = w.pol.owners[q.giver];
  if (owner) world.politics.addRelation(owner, q.relation);
  w.questsDone++;
  world.politics.deed('quest');
  world.note(`完成任務「${q.title}」，獎金 ${q.gold} 金`);
}

/** 打贏山賊時更新 */
export function onBanditBeaten(world: World) {
  world.politics.deed('beatBandit');
  for (const q of [...world.save.quests]) {
    if (q.kind !== 'bandits') continue;
    q.progress++;
    if (q.progress >= q.need) finish(world, q);
  }
}

/** 到達地點時交任務；回傳提示 */
export function onArrive(world: World, place: PlaceDef): string[] {
  const out: string[] = [];
  for (const q of [...world.save.quests]) {
    if (q.target !== place.id) continue;
    if (q.food > world.save.food) {
      out.push(`糧唔夠，交唔到「${q.title}」`);
      continue;
    }
    world.save.food -= q.food;
    finish(world, q);
    out.push(`完成「${q.title}」，獎金 ${q.gold} 金`);
  }
  return out;
}

/** 過期任務 */
export function expireQuests(world: World, day: number) {
  for (const q of [...world.save.quests]) {
    if (day <= q.deadline) continue;
    world.save.quests = world.save.quests.filter((x) => x !== q);
    const owner = world.save.pol.owners[q.giver];
    if (owner) world.politics.addRelation(owner, -Q.failRelation);
    world.note(`任務「${q.title}」失敗`);
  }
}
