/** 本機 AI 生成、放喺 public/art 嘅圖；冇列出嘅繼續用程式畫 */
export const CROWN_ART = new Set([
  'lubu', 'wukong', 'niumo', 'baigu', 'meruna', 'hald', 'zanghun', 'feiye', 'sheji', 'anubis', 'nvwa', 'leijie',
]);

/** 災厄地圖圖：key 同 calamityIcon 嘅快取鍵一樣 */
export const CALAMITY_ART: Record<string, string> = {
  'titan:boss_demongod': 'demongod',
  'titan:boss_asura': 'asura',
  dragon: 'dragon',
  wyrm: 'wyrm',
  witch: 'witch',
};

export const artUrl = (path: string) => `${import.meta.env.BASE_URL}art/${path}.webp`;
