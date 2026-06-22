-- 農時價 VeggiePrice TW — Neon Postgres schema
-- ---------------------------------------------------------------------------
-- 請在 Neon Console 的 SQL Editor（或 psql）執行本檔，建立「意見回饋」與
-- 「行為稽核 AuditLog」所需的資料表。可重複執行（IF NOT EXISTS）。
--
-- 取得連線字串後，於 Vercel 專案與本機 .env.local 設定：
--   DATABASE_URL="postgres://<user>:<password>@<host>/<db>?sslmode=require"
-- ---------------------------------------------------------------------------

-- 1) 意見回饋 ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS feedback (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category    TEXT        NOT NULL DEFAULT 'other',  -- suggestion | bug | data | other
  message     TEXT        NOT NULL,                  -- 回饋內容
  contact     TEXT,                                  -- 使用者自願留下的聯絡方式（可空）
  path        TEXT,                                  -- 送出當下的頁面路徑
  session_id  TEXT,                                  -- 匿名訪客識別碼（前端 localStorage 產生）
  user_agent  TEXT,                                  -- 瀏覽器 UA
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category   ON feedback (category);

-- 2) 行為稽核 AuditLog -------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id  TEXT,                                  -- 匿名訪客識別碼
  action      TEXT        NOT NULL,                  -- page_view | nav_click | search_submit | suggestion_select | feedback_open | feedback_submit ...
  target      TEXT,                                  -- 點擊目標（連結 href、作物名稱…）
  path        TEXT,                                  -- 事件發生的頁面路徑
  metadata    JSONB,                                 -- 額外結構化資料（可空）
  user_agent  TEXT,                                  -- 瀏覽器 UA
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_session    ON audit_log (session_id);

-- 常用查詢範例 --------------------------------------------------------------
-- 最新 50 筆回饋：
--   SELECT created_at, category, message, contact FROM feedback ORDER BY created_at DESC LIMIT 50;
-- 各動作的點擊次數（近 7 天）：
--   SELECT action, count(*) FROM audit_log WHERE created_at > now() - interval '7 days' GROUP BY action ORDER BY 2 DESC;
-- 熱門頁面（近 7 天 page_view）：
--   SELECT path, count(*) FROM audit_log WHERE action = 'page_view' AND created_at > now() - interval '7 days' GROUP BY path ORDER BY 2 DESC;
