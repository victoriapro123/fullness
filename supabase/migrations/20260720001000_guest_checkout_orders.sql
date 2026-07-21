begin;

alter table public.orders
  alter column client_id drop not null;

alter table public.orders
  drop constraint if exists orders_client_id_fkey;

alter table public.orders
  add constraint orders_client_id_fkey
  foreign key (client_id) references public.profiles(id) on delete set null not valid;

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.order_items
  drop constraint if exists order_items_product_id_fkey;

alter table public.order_items
  alter column product_id drop not null;

alter table public.order_items
  add constraint order_items_product_id_fkey
  foreign key (product_id) references public.menu_items(id) on delete set null not valid;

comment on column public.orders.client_id is
  'Optional authenticated customer. Guest checkout data lives in customer_snapshot.';

commit;
