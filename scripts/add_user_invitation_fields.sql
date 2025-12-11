-- Add invitation-related fields to user_profiles table

alter table gridalert.user_profiles
add column if not exists invitation_token text,
add column if not exists invitation_sent_at timestamptz,
add column if not exists invitation_accepted_at timestamptz,
add column if not exists invited_by uuid references auth.users(id),
add column if not exists status text default 'active' check (status in ('pending', 'active', 'inactive'));

-- Create index on invitation_token for fast lookups
create index if not exists idx_user_profiles_invitation_token on gridalert.user_profiles(invitation_token);

-- Allow unauthenticated users to read their own pending invitation (by token)
create policy user_profiles_select_by_token on gridalert.user_profiles
  for select using (
    invitation_token is not null 
    and status = 'pending'
  );

-- Allow unauthenticated users to update their profile when completing invitation
create policy user_profiles_update_by_token on gridalert.user_profiles
  for update using (
    invitation_token is not null 
    and status = 'pending'
  );
