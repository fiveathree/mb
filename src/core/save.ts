import type { Roster } from './roster';
import type { WorldSave } from '../worldmap/world';

const DB_NAME = 'mb-saves';
const STORE = 'slots';
export const SLOT_COUNT = 3;

export interface GameSave {
  version: 2;
  savedAt: number;
  roster: Roster;
  world: WorldSave;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function writeSlot(slot: number, save: GameSave): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(save, slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function readSlots(): Promise<(GameSave | null)[]> {
  try {
    const db = await openDb();
    const all = await Promise.all(Array.from({ length: SLOT_COUNT }, (_, slot) => new Promise<GameSave | null>((resolve) => {
      const req = db.transaction(STORE).objectStore(STORE).get(slot);
      req.onsuccess = () => resolve((req.result as GameSave | undefined) ?? null);
      req.onerror = () => resolve(null);
    })));
    db.close();
    return all;
  } catch {
    // 私密模式可能開唔到資料庫，就當冇存檔
    return Array.from({ length: SLOT_COUNT }, () => null);
  }
}

/** 存檔碼：JSON → gzip → Base64 */
export async function exportCode(save: GameSave): Promise<string> {
  const stream = new Blob([JSON.stringify(save)]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/** 解碼存檔碼；壞咗回傳 null */
export async function importCode(code: string): Promise<GameSave | null> {
  try {
    const bin = atob(code.trim());
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const save = JSON.parse(await new Response(stream).text()) as GameSave;
    return save.roster && save.world ? save : null;
  } catch {
    return null;
  }
}

export async function deleteSlot(slot: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(slot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
  db.close();
}
