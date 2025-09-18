-- Fix ranking numbers to be sequential instead of using RANK() which skips numbers on ties
-- Replace RANK() with ROW_NUMBER() for consecutive numbering
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
