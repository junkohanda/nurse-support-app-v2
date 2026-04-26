-- =====================================================
-- 看護師サポートアプリ - Supabase テーブル設計
-- Supabase の SQL Editor にそのまま貼り付けて実行する
-- =====================================================

-- ① ユーザー設定
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profession TEXT DEFAULT '',
  department TEXT DEFAULT '',
  shift_system TEXT DEFAULT '2',
  shift_times JSONB DEFAULT '{
    "day":       {"start": "08:00", "end": "16:30"},
    "night":     {"start": "16:00", "end": "09:00"},
    "evening":   {"start": "16:00", "end": "24:30"},
    "lateNight": {"start": "00:00", "end": "08:30"},
    "am":        {"start": "08:00", "end": "12:00"},
    "pm":        {"start": "12:00", "end": "16:30"},
    "late":      {"start": "12:00", "end": "20:30"},
    "early":     {"start": "07:00", "end": "15:30"}
  }',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ② 日記
CREATE TABLE diaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ③ シフト
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date)
);

-- ④ ToDo
CREATE TABLE todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  due_date DATE NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  completed BOOLEAN DEFAULT false,
  from_study_note BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ⑤ 勉強ノート
CREATE TABLE study_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  middle_category TEXT DEFAULT '',
  small_category TEXT DEFAULT '',
  content TEXT NOT NULL,
  review_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ⑥ 医療用語辞典
CREATE TABLE medical_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  term TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  meaning TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ⑦ 日記テンプレート（ユーザーが追加したもの）
CREATE TABLE diary_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ⑧ デフォルトテンプレートの非表示設定
CREATE TABLE hidden_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  UNIQUE(user_id, content)
);

-- =====================================================
-- RLS（Row Level Security）- 自分のデータしか見えない設定
-- =====================================================

ALTER TABLE user_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE diaries         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shifts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_notes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_terms   ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_templates ENABLE ROW LEVEL SECURITY;

-- 各テーブルのポリシー（自分のデータのみ操作可能）
CREATE POLICY "自分のデータのみ" ON user_settings   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON diaries         FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON shifts          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON todos           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON study_notes     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON medical_terms   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON diary_templates FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "自分のデータのみ" ON hidden_templates FOR ALL USING (auth.uid() = user_id);
