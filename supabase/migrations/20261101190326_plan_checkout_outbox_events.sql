begin;
set local lock_timeout='5s';
set local statement_timeout='30s';
-- Extend the existing durable outbox. No new stock ledger, scheduler or
-- public privileges; historical payment events and their identities survive.
alter table public.core360_commerce_outbox drop constraint core360_commerce_outbox_event_type_check;
alter table public.core360_commerce_outbox add constraint core360_commerce_outbox_event_type_check
 check(event_type in ('web_order.created','web_order.payment_approved','web_order.cancellation_requested','web_order.refund_observed'));
alter table public.core360_commerce_outbox enable row level security;
notify pgrst,'reload schema';
commit;
