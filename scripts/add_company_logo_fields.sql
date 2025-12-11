-- Add logo customization fields to companies table

alter table gridalert.companies 
add column if not exists logo_letters text check (length(logo_letters) <= 2),
add column if not exists logo_bg_color text default '#3b82f6',
add column if not exists logo_text_color text default '#ffffff';

-- Set default logo letters based on company name for existing companies
update gridalert.companies
set logo_letters = upper(left(name, 1))
where logo_letters is null;
