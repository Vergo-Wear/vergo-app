CREATE TABLE public.inventory_commitment (
  commitment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  inventory_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'Committed'
    CHECK (status IN ('Committed', 'Restored')),
  committed_at timestamp with time zone NOT NULL DEFAULT now(),
  restored_at timestamp with time zone,

  CONSTRAINT inventory_commitment_pkey PRIMARY KEY (commitment_id),
  CONSTRAINT inventory_commitment_order_fkey
    FOREIGN KEY (order_id) REFERENCES public.orders(order_id),
  CONSTRAINT inventory_commitment_inventory_fkey
    FOREIGN KEY (inventory_id) REFERENCES public.inventory(inventory_id),
  CONSTRAINT inventory_commitment_order_inventory_unique
    UNIQUE (order_id, inventory_id)
);

CREATE INDEX inventory_commitment_order_status_index
  ON public.inventory_commitment (order_id, status);
