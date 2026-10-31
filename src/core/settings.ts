/** 玩家設定：跟部機，唔跟存檔 */
export interface Settings {
  /** 滑鼠靈敏度倍率 */
  sensitivity: number;
  volume: number;
  /** 0 低、1 中、2 高 */
  quality: number;
  invertY: boolean;
}

const KEY = 'mb-settings';
const DEFAULTS: Settings = { sensitivity: 1, volume: 1, quality: 2, invertY: false };

function load(): Settings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export const settings = load();

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // 私隱模式存唔到都照玩
  }
}
