-- Core360 signs retries with the same event id. Keep one durable receipt per
-- event without changing the existing Mercado Pago receipt model.
--
-- Apply only after reviewing the preflight below in the target database. A
-- duplicate aborts the migration rather than choosing or deleting evidence.
begin;

do $$
begin
  if exists (
    select 1
    from public.payment_events
    where provider = 'core360'
      and provider_event_id is not null
    group by provider, provider_event_id
    having count(*) > 1
  ) then
    raise exception 'CORE360_WEBHOOK_RECEIPT_DUPLICATES_REVIEW_REQUIRED';
  end if;
end;
$$;

create unique index if not exists payment_events_core360_event_unique_idx
  on public.payment_events (provider, provider_event_id)
  where provider = 'core360' and provider_event_id is not null;

comment on index public.payment_events_core360_event_unique_idx is
  'Idempotencia de notificaciones firmadas Core360; no afecta eventos Mercado Pago.';

alter table public.core360_commerce_outbox
  drop constraint if exists core360_commerce_outbox_event_type_check;

alter table public.core360_commerce_outbox
  add constraint core360_commerce_outbox_event_type_check
  check (event_type in (
    'web_order.created',
    'web_order.payment_approved',
    'web_order.cancellation_requested',
    'web_order.refund_observed'
  ));

comment on constraint core360_commerce_outbox_event_type_check on public.core360_commerce_outbox is
  'Crea la orden web pendiente, observa el pago y conserva los únicos hechos operativos permitidos: cancelación o reembolso observado. Cada tipo es idempotente por order_id y event_type.';

commit;
