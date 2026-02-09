-- RUN THIS IN SUPABASES SQL EDITOR
-- This script adds a specific Trigger to automatically create a "Profile"
-- whenever a new "User" signs up via Supabase Auth.

-- 1. Create the Function
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Create the Trigger
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. (Optional) Fix existing users who might be missing profiles
insert into public.profiles (id)
select id from auth.users
where id not in (select id from profiles)
on conflict do nothing;
