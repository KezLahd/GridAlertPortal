-- Create user invitations table (separate from user_profiles to avoid FK constraint issues)
CREATE TABLE IF NOT EXISTS gridalert.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES gridalert.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  region_access TEXT[] NOT NULL DEFAULT '{}',
  notify_providers TEXT[] NOT NULL DEFAULT '{}',
  notify_outage_types TEXT[] NOT NULL DEFAULT '{}',
  invitation_token TEXT NOT NULL UNIQUE,
  invitation_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add RLS policies for user_invitations
ALTER TABLE gridalert.user_invitations ENABLE ROW LEVEL SECURITY;

-- Allow anyone with a valid token to read their invitation
CREATE POLICY "user_invitations_select_by_token" ON gridalert.user_invitations
  FOR SELECT
  USING (invitation_token IS NOT NULL);

-- Allow admins to insert invitations for their company
CREATE POLICY "user_invitations_insert_admin" ON gridalert.user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gridalert.user_profiles
      WHERE user_id = auth.uid()
      AND company_id = user_invitations.company_id
      AND role = 'admin'
    )
  );

-- Allow anyone with a valid token to update their invitation status
CREATE POLICY "user_invitations_update_by_token" ON gridalert.user_invitations
  FOR UPDATE
  USING (invitation_token IS NOT NULL);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON gridalert.user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON gridalert.user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON gridalert.user_invitations(status);
