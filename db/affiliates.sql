-- 農時價 VeggiePrice TW — 聯盟版位獨立資料庫 schema
-- ---------------------------------------------------------------------------
-- 請使用 SUP_DATABASE_URL 連線到獨立 PostgreSQL，再執行本檔。
-- affiliates 表由另一個系統維護；本專案只讀取 enabled = TRUE 的資料。

CREATE TABLE IF NOT EXISTS affiliates (
  id          TEXT PRIMARY KEY,
  enabled     BOOLEAN NOT NULL DEFAULT TRUE,
  sponsored   BOOLEAN NOT NULL DEFAULT FALSE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  cta_label   TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,
  categories  TEXT[] NOT NULL DEFAULT ARRAY['all']::TEXT[],
  crops       TEXT[],
  priority    INTEGER NOT NULL DEFAULT 0,
  partner     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliates_enabled_priority
  ON affiliates (enabled, priority DESC);

-- 目前 affiliates.ts 原有的初始資料。
-- 使用 DO NOTHING，重跑本檔不會覆蓋外部維護系統的修改。
INSERT INTO affiliates
  (id, enabled, sponsored, title, description, cta_label, url, icon, categories, crops, priority, partner)
VALUES
  ('ich-lidaniang', TRUE, FALSE, 'up2you-保健{crop}', '希望以保健食品、最新的營養保健知識、讓大家愈來愈健康。', '去買保健食品', 'https://afflink.one/s/oRwTQ', 'shopping_cart', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 9, 'up2you-保健'),
  ('ich-sevenstore', TRUE, FALSE, 'Eternal永恆選物{crop}', '美食特產, 生鮮食品。', '逛永恆選物', 'https://onelink.one/s/4Ucpq', 'spa', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 9, '永恆選物'),
  ('ich-unilohas', TRUE, FALSE, '統一生機・有機生機食品', '有機與健康食材一站購齊,吃得安心。', '逛統一生機', 'https://greenmall.info/3RVKx', 'spa', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 8, '統一生機'),
  ('a1-36life', TRUE, FALSE, '鮮綠生活・生鮮水產宅配', '嚴選水產與生鮮食材,產地直送到府。', '前往選購', 'https://linkgo.one/s/BoVGf', 'set_meal', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 7, '36Life 鮮綠生活'),
  ('a1-goodfoodyou', TRUE, FALSE, '好歐食庫・歐陸食材冷凍生鮮', '進口肉品、海鮮與冷凍食材一次補齊。', '逛好歐食庫', 'https://afflink.one/s/QOFbF', 'kitchen', ARRAY['meat','seafood','vegetable'], NULL, 6, 'Good Food You 好歐食庫'),
  ('a1-ubereats', TRUE, FALSE, '想吃{crop}料理?Uber Eats 外送', '不想開伙,現成美食直接送到家。', '叫 Uber Eats', 'https://linkgo.one/s/VwTic', 'delivery_dining', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 6, 'Uber Eats'),
  ('ich-yuanshanlu', TRUE, FALSE, '猿山鹿水餃・水餃代工大王', '皮薄餡多手工水餃,免開伙快速上桌。', '看猿山鹿水餃', 'https://joymall.co/3RVKm', 'lunch_dining', ARRAY['vegetable'], ARRAY['高麗','白菜','韭','蔥'], 8, '猿山鹿水餃'),
  ('ich-menqianyinwei', TRUE, FALSE, '門前隱味・天然食材手作水餃', '天然食材手工現做,冷凍宅配到家。', '逛門前隱味', 'https://wonderfulapple.net/3RVKo', 'dinner_dining', ARRAY['vegetable'], ARRAY['高麗','白菜','韭'], 6, '門前隱味'),
  ('kkday-farm', TRUE, FALSE, '採果體驗・產地小旅行', '趁{crop}產季,安排一趟親子採果與農場體驗。', '看採果體驗', 'https://www.kkday.com/zh-tw/product/productlist?keyword=採果&cid=25570', 'agriculture', ARRAY['fruit'], ARRAY['草莓','葡萄','火龍果','藍莓','水梨','番茄','柑'], 7, 'KKday'),
  ('a1-chunlian', TRUE, FALSE, '純煉滴雞精・日常保養', '純粹濃醇滴雞精,為家人補一下。', '看滴雞精', 'https://linkgo.one/s/Ywe0v', 'health_and_safety', ARRAY['meat'], ARRAY['雞'], 7, '純煉營養研究室'),
  ('ich-basefood', TRUE, FALSE, 'BASE FOOD・完全營養食', '一份補齊多種營養的日系機能食。', '認識 BASE FOOD', 'https://adcenter.conn.tw/3RVKn', 'nutrition', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 5, 'BASE FOOD'),
  ('a1-tea', TRUE, FALSE, '天下第一好茶・茶葉禮品', '送禮自用兩相宜的台灣好茶。', '逛茶葉禮盒', 'https://linkgo.one/s/GKPRr', 'emoji_food_beverage', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 4, '天下第一好茶'),
  ('a1-icookie', TRUE, FALSE, 'iCookie 私房手作點心', '手工餅乾與甜點,下午茶的好選擇。', '看私房點心', 'https://afflink.one/s/5bSJu', 'bakery_dining', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 3, 'iCookie 私房手作'),
  ('a1-byfood', TRUE, FALSE, 'byFood・美食體驗與預訂', '探索各地美食體驗與餐廳預訂。', '探索美食體驗', 'https://afflink.one/s/AmLVG', 'restaurant', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 3, 'byFood'),
  ('a1-i3Fresh', TRUE, FALSE, 'i3Fresh 愛上新鮮 臺灣', '探索新鮮蔬果預訂。', '探索蔬果體驗', 'https://onelink.one/s/FN2vG', 'restaurant', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 3, 'byFood'),
  ('a1-uni-prosperity', TRUE, FALSE, '萬家福線上購物', '探索新鮮蔬果預訂。', '探索蔬果體驗', 'https://onelink.one/s/CPHek', 'restaurant', ARRAY['vegetable','fruit','mushroom','meat','seafood'], NULL, 3, 'byFood')
ON CONFLICT (id) DO NOTHING;
