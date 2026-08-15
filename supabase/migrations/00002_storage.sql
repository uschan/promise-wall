-- WishCollective — Storage setup (user-uploaded photos)

insert into storage.buckets (id, name, public)
values ('promise-photos', 'promise-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "pw_public_read_photos" on storage.objects;
create policy "pw_public_read_photos" on storage.objects
  for select using (bucket_id = 'promise-photos');

drop policy if exists "pw_auth_upload_photos" on storage.objects;
create policy "pw_auth_upload_photos" on storage.objects
  for insert with check (bucket_id = 'promise-photos' and auth.role() = 'authenticated');

drop policy if exists "pw_auth_update_photos" on storage.objects;
create policy "pw_auth_update_photos" on storage.objects
  for update using (bucket_id = 'promise-photos' and auth.role() = 'authenticated');

drop policy if exists "pw_auth_delete_photos" on storage.objects;
create policy "pw_auth_delete_photos" on storage.objects
  for delete using (bucket_id = 'promise-photos' and auth.role() = 'authenticated');
