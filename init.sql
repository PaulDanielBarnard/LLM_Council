-- Create extensions (if needed)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── CONVERSATIONS TABLE ────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  user_query TEXT NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('local', 'cloud')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_updated_at
  ON conversations(updated_at DESC);

-- ── MESSAGES TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL
    CHECK (role IN ('council', 'combiner', 'synthesis', 'verdict')),
  member_name VARCHAR(100) NOT NULL,
  model_id VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation_id
  ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp
  ON messages(timestamp DESC);

-- ── SEARCH RESULTS TABLE ──────────────────────────────────

CREATE TABLE IF NOT EXISTS search_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results JSONB NOT NULL,  -- stores full search result as JSON
  source VARCHAR(50) NOT NULL DEFAULT 'duckduckgo',
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_search_results_conversation_id
  ON search_results(conversation_id);