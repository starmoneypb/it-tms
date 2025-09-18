-- Revert back to RANK() function
CREATE OR REPLACE VIEW user_rankings AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(us.points), 0) as total_points,
  COUNT(us.ticket_id) as tickets_completed,
  RANK() OVER (ORDER BY COALESCE(SUM(us.points), 0) DESC) as rank
FROM users u
LEFT JOIN user_scores us ON u.id = us.user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_points DESC;
