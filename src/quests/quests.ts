import { PLACES, type PlaceDef } from '../data/world';
import { QUESTS as Q, type QuestKind } from '../data/quests';
import { FAVORS, FAVOR_DAYS } from '../data/figures';
import { CHAPTERS, STORY_RULES } from '../data/story';
import { currentScenario } from '../data/scenarios';
import type { World, WorldSave } from '../worldmap/world';
import { dayOf } from '../worldmap/world';

export interface Quest {
  id: number;
  kind: QuestKind | 'boss';
  /** 主線第幾章 */
  story?: number;
  title: string;
  giver: string;
  /** 目的地 */
  target?: string;
  /** 人物委託：做完招請半價 */
  figure?: string;
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
  if (w.quests.filter((x) => x.story === undefined).length >= Q.maxActive) return `最多同時接 ${Q.maxActive} 個任務`;
  w.quests.push({ ...q });
  return `接咗任務：${q.title}`;
}

/** 人物委託變成任務 */
export function acceptFavor(world: World, figure: string, giver: string): string {
  const f = FAVORS[figure];
  const w = world.save;
  const id = hash(1, figure);
  return accept(world, {
    id, kind: f.kind, title: f.title, giver, target: f.target, figure, need: f.need ?? 1, progress: 0, food: f.food ?? 0,
    gold: 0, relation: 0, renown: 2, deadline: dayOf(w) + FAVOR_DAYS,
  });
}

function finish(world: World, q: Quest) {
  const w = world.save;
  w.quests = w.quests.filter((x) => x !== q);
  world.roster.gold += q.gold;
  w.pol.renown += q.renown;
  const owner = w.pol.owners[q.giver];
  if (owner) world.politics.addRelation(owner, q.relation);
  if (q.figure && !w.pol.favors.includes(q.figure)) w.pol.favors.push(q.figure);
  w.questsDone++;
  world.politics.deed('quest');
  world.note(`完成任務「${q.title}」，獎金 ${q.gold} 金`);
  if (q.story !== undefined) nextChapter(world, q.story + 1);
}

/** 將故事入面嘅地名換成呢個劇本嘅叫法 */
function storyText(world: World, text: string): string {
  const name = (id: string) => PLACES.find((p) => p.id === id)?.name ?? '';
  return text.replace('{hook}', currentScenario().desc).replace(/\{a\}/g, name('griffon')).replace(/\{b\}/g, name('linjiang'))
    .replace(/\{c\}/g, name('xuan_city')).replace(/\{d\}/g, name('dragonlair')).replace(/\{name\}/g, () => world.roster.hero.name);
}

/** 開新一章：主線唔過期，亦唔佔任務名額 */
export function nextChapter(world: World, index: number) {
  const w = world.save;
  w.storyChapter = index;
  const c = CHAPTERS[index];
  if (!c) {
    world.roster.gold += STORY_RULES.finalGold;
    w.pol.renown += STORY_RULES.finalRenown;
    world.tellStory('主線完結', `${storyText(world, STORY_RULES.ending)}（${STORY_RULES.finalGold} 金、聲望 +${STORY_RULES.finalRenown}）`);
    return;
  }
  w.quests.unshift({
    id: 900000 + index, kind: c.kind, story: index, title: c.title, giver: 'griffon', target: c.target, need: c.need ?? 1, progress: 0, food: c.food ?? 0,
    gold: (index + 1) * STORY_RULES.goldPerChapter, relation: 0, renown: STORY_RULES.renown, deadline: 999999,
  });
  world.tellStory(c.title, storyText(world, c.text));
}

/** 舊存檔同新遊戲都由呢度開始主線 */
export function ensureStory(world: World) {
  if (world.save.storyChapter === undefined) nextChapter(world, 0);
}

/** 打贏主線 Boss 地點 */
export function onBossBeaten(world: World, place: string) {
  const q = world.save.quests.find((x) => x.kind === 'boss' && x.target === place);
  if (q) finish(world, q);
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
    if (q.target !== place.id || q.kind === 'boss') continue;
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
