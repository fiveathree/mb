/** 本機 AI 生成、放喺 public/art 嘅圖；冇列出嘅繼續用程式畫 */
export const CROWN_ART = new Set([
  'lubu', 'wukong', 'niumo', 'baigu', 'meruna', 'hald', 'zanghun', 'feiye', 'sheji', 'anubis', 'nvwa', 'leijie',
  'kongming', 'caocao', 'zhaoyun', 'taishici', 'guanyu', 'zhangfei', 'zhouyu', 'simayi', 'cunxiao', 'abaoji', 'qianliu',
  'caesar', 'hannibal', 'spartacus', 'richard', 'saladin', 'achilles', 'odysseus', 'atalanta',
  'lumen', 'owl', 'gareth', 'lane', 'ira', 'ulf', 'oserin', 'karon', 'wuchen', 'xuehe',
  'lijing', 'juling', 'leigong', 'change', 'xuehai', 'taibai', 'tangseng', 'bajie', 'wujing', 'tieshan', 'honghai',
  'ziya', 'nezha', 'yangjian', 'wenzhong', 'daji', 'leizhen', 'feihu', 'tuxing',
  'huangdi', 'chiyou', 'houyi', 'xingtian', 'kuafu', 'dayu', 'jingwei', 'zhongkui',
  'yanluo', 'wuchang', 'mengpo', 'qinguang', 'chujiang', 'songdi', 'wuguan', 'biancheng', 'taishan', 'dushi', 'pingdeng',
  'zhuanlun', 'cuijue', 'niutou', 'mamian',
  'hades', 'persephone', 'orpheus', 'hecate', 'osiris', 'hela', 'helion', 'ares', 'modis', 'lilis',
  'daoling', 'shouyi', 'yanchixia', 'xiaoqian', 'tiege', 'wendy', 'xuance', 'heiyao', 'wuyin',
  'wusong', 'luzhishen', 'linchong', 'jingke', 'nieyinniang', 'qiuran', 'hongxian', 'zhanzhao', 'baiyutang',
  'yanguichen', 'liuxiang',
  'fig_fallen', 'fig_warchief', 'fig_marshal', 'fig_prelate', 'fig_treelord', 'fig_windranger', 'fig_alchemist', 'fig_pethunter',
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
