-- Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('Anonymous', 'User', 'Supervisor', 'Manager');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_status AS ENUM ('pending', 'in_progress', 'completed', 'canceled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_initial_type AS ENUM (
      'ISSUE_REPORT',
      'CHANGE_REQUEST_NORMAL',
      'SERVICE_REQUEST_DATA_CORRECTION',
      'SERVICE_REQUEST_DATA_EXTRACTION',
      'SERVICE_REQUEST_ADVISORY',
      'SERVICE_REQUEST_GENERAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_resolved_type AS ENUM ('EMERGENCY_CHANGE', 'DATA_CORRECTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE ticket_priority AS ENUM ('P0', 'P1', 'P2', 'P3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'User',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code SERIAL,
  created_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  contact_email TEXT NULL,
  contact_phone TEXT NULL,
  initial_type ticket_initial_type NOT NULL,
  resolved_type ticket_resolved_type NULL,
  status ticket_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  impact_score SMALLINT NOT NULL DEFAULT 0,
  urgency_score SMALLINT NOT NULL DEFAULT 0,
  final_score SMALLINT NOT NULL DEFAULT 0,
  red_flag BOOLEAN NOT NULL DEFAULT FALSE,
  priority ticket_priority NOT NULL DEFAULT 'P3',
  assignee_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ NULL
);

-- Attachments
CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size BIGINT NOT NULL,
  path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  author_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  before JSONB NULL,
  after JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);