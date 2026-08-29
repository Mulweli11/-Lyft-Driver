alter table public.drivers
  add column if not exists driver_verification_status text;

update public.drivers
set driver_verification_status = case
  when verified = true then 'approved'
  when status = 'approved' then 'approved'
  when status = 'pending' then 'pending'
  when status = 'rejected' then 'rejected'
  else 'not_submitted'
end
where driver_verification_status is null;

alter table public.drivers
  alter column driver_verification_status set default 'not_submitted';
