CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL DEFAULT '小羊半夏',
  status TEXT NOT NULL DEFAULT '持续学习与更新中',
  signature TEXT NOT NULL DEFAULT '愿每一次学习，都有一点收获；愿每一次记录，都能照亮后来的人。',
  avatar_version BIGINT NOT NULL DEFAULT 0,
  avatar_mime TEXT NOT NULL DEFAULT 'image/webp',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO profiles (id, display_name, status, signature)
VALUES ('owner', '小羊半夏', '持续学习与更新中', '愿每一次学习，都有一点收获；愿每一次记录，都能照亮后来的人。')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS diaries (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'owner',
  diary_date DATE NOT NULL,
  mood TEXT NOT NULL DEFAULT '☕',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diaries_date_idx ON diaries (diary_date DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS diaries_public_idx ON diaries (is_public, diary_date DESC);
