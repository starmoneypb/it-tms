-- Create knowledge_sharing_documents table
CREATE TABLE IF NOT EXISTS knowledge_sharing_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  topic VARCHAR(100) NOT NULL,
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create knowledge_sharing_contributors table
CREATE TABLE IF NOT EXISTS knowledge_sharing_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_sharing_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(document_id, user_id)
);

-- Create knowledge_sharing_likes table
CREATE TABLE IF NOT EXISTS knowledge_sharing_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES knowledge_sharing_documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Create knowledge_sharing_scores table to track points from likes
CREATE TABLE IF NOT EXISTS knowledge_sharing_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES knowledge_sharing_documents(id) ON DELETE CASCADE,
  points DECIMAL(10,2) NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_author_id ON knowledge_sharing_documents(author_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_topic ON knowledge_sharing_documents(topic);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_created_at ON knowledge_sharing_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_published ON knowledge_sharing_documents(is_published);

CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_contributors_document_id ON knowledge_sharing_contributors(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_contributors_user_id ON knowledge_sharing_contributors(user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_likes_document_id ON knowledge_sharing_likes(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_likes_user_id ON knowledge_sharing_likes(user_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_scores_user_id ON knowledge_sharing_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_scores_document_id ON knowledge_sharing_scores(document_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_scores_points ON knowledge_sharing_scores(points DESC);

-- Drop and recreate user_rankings view to include knowledge sharing points
DROP VIEW IF EXISTS user_rankings;
CREATE VIEW user_rankings AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(us.points), 0) + COALESCE(SUM(ks.points), 0) as total_points,
  COUNT(us.ticket_id) as tickets_completed,
  COUNT(DISTINCT ks.document_id) as knowledge_documents_created,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.points), 0) + COALESCE(SUM(ks.points), 0) DESC, u.name ASC) as rank
FROM users u
LEFT JOIN user_scores us ON u.id = us.user_id
LEFT JOIN knowledge_sharing_scores ks ON u.id = ks.user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_points DESC, u.name ASC;
