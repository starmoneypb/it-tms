-- Drop the updated user_rankings view
DROP VIEW IF EXISTS user_rankings;

-- Drop indexes
DROP INDEX IF EXISTS idx_knowledge_sharing_scores_points;
DROP INDEX IF EXISTS idx_knowledge_sharing_scores_document_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_scores_user_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_likes_user_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_likes_document_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_contributors_user_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_contributors_document_id;
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_published;
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_created_at;
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_topic;
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_author_id;

-- Drop tables
DROP TABLE IF EXISTS knowledge_sharing_scores;
DROP TABLE IF EXISTS knowledge_sharing_likes;
DROP TABLE IF EXISTS knowledge_sharing_contributors;
DROP TABLE IF EXISTS knowledge_sharing_documents;

-- Recreate the original user_rankings view
CREATE OR REPLACE VIEW user_rankings AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(us.points), 0) as total_points,
  COUNT(us.ticket_id) as tickets_completed,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.points), 0) DESC, u.name ASC) as rank
FROM users u
LEFT JOIN user_scores us ON u.id = us.user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_points DESC, u.name ASC;
