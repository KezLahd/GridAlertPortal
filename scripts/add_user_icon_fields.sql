-- Add icon customization fields to user_profiles table
-- Similar to companies table logo fields

alter table gridalert.user_profiles 
add column if not exists icon_letters text check (length(icon_letters) <= 2),
add column if not exists icon_bg_color text default '#f97316',
add column if not exists icon_text_color text default '#ffffff';

-- Set default icon letters based on first_name and last_name for existing users
update gridalert.user_profiles
set icon_letters = upper(
  coalesce(
    left(first_name, 1), 
    ''
  ) || 
  coalesce(
    left(last_name, 1), 
    ''
  )
)
where icon_letters is null 
  and (first_name is not null or last_name is not null);

-- For users without names, use first letter of email
update gridalert.user_profiles
set icon_letters = upper(left(email, 1))
where icon_letters is null 
  and email is not null;

-- For users without email, use 'U'
update gridalert.user_profiles
set icon_letters = 'U'
where icon_letters is null;
