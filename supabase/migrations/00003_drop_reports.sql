-- Remove the Reports feature (dropped from the product).

drop policy if exists "pw_insert_reports" on public.reports;
drop policy if exists "pw_read_reports_admin" on public.reports;
drop policy if exists "pw_delete_reports_admin" on public.reports;
drop table if exists public.reports;
