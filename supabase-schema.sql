-- =============================================
-- GAME VAULT DATABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- GAMES TABLE
-- =============================================
CREATE TABLE games (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  region TEXT DEFAULT 'NTSC',
  condition_type TEXT DEFAULT 'cib',
  grading_company TEXT,
  grade DECIMAL(3,1),
  seal_rating TEXT,
  purchase_price DECIMAL(10,2) NOT NULL,
  current_value DECIMAL(10,2) NOT NULL,
  purchase_date DATE DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast user queries
CREATE INDEX idx_games_user_id ON games(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- Each user can only see/edit their own games
-- =============================================
ALTER TABLE games ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own games
CREATE POLICY "Users can view own games" ON games
  FOR SELECT USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

-- Policy: Users can insert their own games
CREATE POLICY "Users can insert own games" ON games
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own games
CREATE POLICY "Users can update own games" ON games
  FOR UPDATE USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

-- Policy: Users can delete their own games
CREATE POLICY "Users can delete own games" ON games
  FOR DELETE USING (auth.uid()::text = user_id OR user_id = current_setting('app.current_user_id', true));

-- =============================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================
-- DONE! Your database is ready.
-- =============================================
