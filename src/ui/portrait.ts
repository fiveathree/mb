import type { CrownDef } from '../data/crowns';
import { RACES } from '../data/races';

const cache = new Map<string, string>();
const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const EAST = ['threekingdoms', 'fivedynasties', 'xiyou', 'fengshen', 'shenhua', 'jianghu', 'maoshan', 'xianxia', 'tianjie', 'fengdu'];
const CLASS_BG: Record<string, [string, string]> = {
  武力: ['#7a1e18', '#2a0a0a'], 智略: ['#1e4a6a', '#0a1a2a'], 統率: ['#7a5a1a', '#2a1e08'], 弓術: ['#2a5a30', '#0a200e'], 騎術: ['#5a3a1e', '#20140a'], 魔導: ['#4a2a80', '#160a30'], 暗影: ['#2a2a3a', '#08080e'],
};

/** 冠位頭像：背景跟類別，面同頭飾跟種族同劇本 */
export function portrait(c: CrownDef): string {
  const hit = cache.get(c.id);
  if (hit) return hit;
  const el = document.createElement('canvas');
  el.width = 120;
  el.height = 150;
  const g = el.getContext('2d')!;
  const [hi, lo] = CLASS_BG[c.cls];
  const bg = g.createRadialGradient(60, 60, 8, 60, 76, 96);
  bg.addColorStop(0, hi);
  bg.addColorStop(1, lo);
  g.fillStyle = bg;
  g.fillRect(0, 0, 120, 150);
  const race = RACES[c.race];
  const skin = hex(race.skin);
  const main = hex(c.color);
  const east = EAST.includes(c.scenario);
  const mage = c.cls === '魔導' || c.cls === '智略';
  // 肩膊同衣服
  g.fillStyle = main;
  g.beginPath();
  g.moveTo(6, 150);
  g.quadraticCurveTo(14, 96, 44, 92);
  g.lineTo(76, 92);
  g.quadraticCurveTo(106, 96, 114, 150);
  g.closePath();
  g.fill();
  g.fillStyle = 'rgba(0,0,0,.28)';
  g.beginPath();
  g.moveTo(60, 94);
  g.lineTo(82, 94);
  g.quadraticCurveTo(106, 98, 114, 150);
  g.lineTo(60, 150);
  g.closePath();
  g.fill();
  if (east) {
    // 交領
    g.strokeStyle = '#f0e0b0';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(44, 94);
    g.lineTo(66, 134);
    g.moveTo(76, 94);
    g.lineTo(54, 134);
    g.stroke();
  } else if (!mage) {
    // 肩甲
    g.fillStyle = '#9aa2ac';
    for (const x of [24, 96]) {
      g.beginPath();
      g.ellipse(x, 108, 19, 12, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // 面
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(60, 62, 22, 28, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(50, 84, 20, 12);
  // 五官
  g.fillStyle = race.look === 'skull' ? '#121018' : '#1c1612';
  const ey = c.race === 'undead' ? 7 : 3.4;
  g.beginPath();
  g.ellipse(50, 60, 5, ey, 0, 0, Math.PI * 2);
  g.ellipse(70, 60, 5, ey, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(0,0,0,.5)';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(52, 80);
  g.lineTo(68, 80);
  g.stroke();
  // 頭飾
  if (race.look === 'bull' || c.race === 'demon') {
    g.fillStyle = '#e8dcc0';
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(60 + s * 16, 42);
      g.quadraticCurveTo(60 + s * 40, 30, 60 + s * 38, 6);
      g.quadraticCurveTo(60 + s * 26, 28, 60 + s * 8, 34);
      g.fill();
    }
  }
  if (race.look === 'ears' || c.race === 'elf') {
    g.fillStyle = skin;
    for (const s of [1, -1]) {
      g.beginPath();
      g.moveTo(60 + s * 20, 58);
      g.lineTo(60 + s * 40, 42);
      g.lineTo(60 + s * 20, 68);
      g.fill();
    }
  }
  g.fillStyle = mage ? main : '#1c1612';
  if (c.race !== 'undead' && race.look !== 'bull') {
    if (east) {
      g.fillStyle = '#17120e';
      g.beginPath();
      g.ellipse(60, 44, 24, 18, 0, Math.PI, 0);
      g.fill();
      g.fillRect(52, 18, 16, 14);
      g.fillStyle = '#d8b84a';
      g.fillRect(44, 24, 32, 4);
      if (c.cls === '武力' || c.cls === '統率') {
        g.fillStyle = main;
        g.fillRect(36, 34, 48, 7);
      }
    } else if (mage) {
      g.beginPath();
      g.moveTo(28, 44);
      g.lineTo(60, 2);
      g.lineTo(92, 44);
      g.closePath();
      g.fill();
    } else {
      g.fillStyle = '#8a929c';
      g.beginPath();
      g.arc(60, 46, 25, Math.PI, 0);
      g.fill();
      g.fillRect(57, 44, 6, 22);
    }
  }
  g.strokeStyle = 'rgba(214,176,104,.7)';
  g.lineWidth = 3;
  g.strokeRect(1.5, 1.5, 117, 147);
  const url = el.toDataURL('image/jpeg', 0.88);
  cache.set(c.id, url);
  return url;
}
