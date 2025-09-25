ALTER TABLE comment_attachments
  DROP COLUMN IF EXISTS hidden_by,
  DROP COLUMN IF EXISTS hidden_at,
  DROP COLUMN IF EXISTS is_hidden;

ALTER TABLE comments
  DROP COLUMN IF EXISTS hidden_by,
  DROP COLUMN IF EXISTS hidden_at,
  DROP COLUMN IF EXISTS is_hidden,
  DROP COLUMN IF EXISTS edited_by,
  DROP COLUMN IF EXISTS edited_at,
  DROP COLUMN IF EXISTS updated_at;
