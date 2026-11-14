## Table `role`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `role_id` | `uuid` | Primary |
| `role_name` | `text` |  Unique |

## Table `branch`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `branch_id` | `uuid` | Primary |
| `name` | `text` |  |
| `address` | `text` |  |
| `phone` | `text` |  |

## Table `category`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `category_id` | `uuid` | Primary |
| `name` | `text` |  Unique |
| `description` | `text` |  Nullable |

## Table `supplier`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `supplier_id` | `uuid` | Primary |
| `name` | `text` |  |
| `phone` | `text` |  |
| `email` | `text` |  Unique |
| `address` | `text` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `profiles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `role_id` | `uuid` |  |
| `username` | `text` |  Nullable Unique |
| `status` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |
| `last_seen_at` | `timestamptz` |  Nullable |
| `must_change_password` | `bool` |  Nullable |

## Table `employee`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `employee_id` | `uuid` | Primary |
| `profile_id` | `uuid` |  Unique |
| `branch_id` | `uuid` |  Nullable |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `phone` | `text` |  Nullable |
| `address` | `text` |  Nullable |
| `position` | `text` |  Nullable |
| `salary` | `numeric` |  Nullable |
| `hire_date` | `date` |  Nullable |
| `availability_status` | `text` |  |
| `commission_per_parcel` | `numeric` |  |
| `created_by_profile_id` | `uuid` |  Nullable |

## Table `customer`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `customer_id` | `uuid` | Primary |
| `profile_id` | `uuid` |  Unique |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `contact_phone` | `text` |  Nullable |
| `contact_email` | `text` |  Unique |
| `created_at` | `timestamptz` |  Nullable |

## Table `attendance`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `attendance_id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `date` | `date` |  |
| `check_in` | `timestamptz` |  Nullable |
| `check_out` | `timestamptz` |  Nullable |
| `status` | `text` |  Nullable |

## Table `product`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `product_id` | `uuid` | Primary |
| `category_id` | `uuid` |  Nullable |
| `supplier_id` | `uuid` |  Nullable |
| `name` | `text` |  |
| `description` | `text` |  Nullable |
| `base_price` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `is_sold_out` | `bool` |  |

## Table `product_variant`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `variant_id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `sku` | `text` |  Unique |
| `price_adjustment` | `numeric` |  Nullable |
| `color_id` | `uuid` |  |
| `size_id` | `uuid` |  |
| `status` | `text` |  |

## Table `inventory`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `inventory_id` | `uuid` | Primary |
| `variant_id` | `uuid` |  |
| `branch_id` | `uuid` |  Nullable |
| `quantity` | `int4` |  |
| `reorder_level` | `int4` |  Nullable |
| `last_updated` | `timestamptz` |  Nullable |
| `employee_id` | `uuid` |  Nullable |

## Table `cart`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cart_id` | `uuid` | Primary |
| `customer_id` | `uuid` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `cart_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `cart_item_id` | `uuid` | Primary |
| `cart_id` | `uuid` |  |
| `variant_id` | `uuid` |  |
| `quantity` | `int4` |  |

## Table `orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `order_id` | `uuid` | Primary |
| `customer_id` | `uuid` |  Nullable |
| `employee_id` | `uuid` |  Nullable |
| `branch_id` | `uuid` |  Nullable |
| `order_date` | `timestamptz` |  Nullable |
| `total_amount` | `numeric` |  |
| `payment_method` | `text` |  |
| `order_status` | `text` |  |
| `product_total` | `numeric` |  |
| `delivery_fee` | `numeric` |  |
| `checkout_id` | `uuid` |  |
| `updated_at` | `timestamptz` |  |
| `claimed_at` | `timestamptz` |  Nullable |
| `preparing_at` | `timestamptz` |  Nullable |
| `parcel_ready_at` | `timestamptz` |  Nullable |
| `sent_at` | `timestamptz` |  Nullable |
| `delivered_at` | `timestamptz` |  Nullable |
| `completed_at` | `timestamptz` |  Nullable |

## Table `order_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `order_item_id` | `uuid` | Primary |
| `order_id` | `uuid` |  |
| `variant_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `unit_price` | `numeric` |  |
| `subtotal` | `numeric` |  |

## Table `delivery`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `delivery_id` | `uuid` | Primary |
| `order_id` | `uuid` |  Unique |
| `delivery_status` | `text` |  |
| `delivered_at` | `timestamptz` |  Nullable |
| `courier_name` | `text` |  |
| `courier_reference` | `text` |  Nullable |
| `waybill_number` | `text` |  Nullable |
| `submission_status` | `text` |  |
| `submitted_at` | `timestamptz` |  Nullable |
| `failure_reason` | `text` |  Nullable |
| `updated_at` | `timestamptz` |  |
| `shipment_reference` | `text` |  Nullable |
| `external_order_id` | `text` |  Nullable |
| `package_weight_grams` | `int4` |  Nullable |
| `number_of_pieces` | `int4` |  |
| `package_description` | `text` |  Nullable |
| `cod_amount` | `numeric` |  |
| `courier_status` | `text` |  Nullable |
| `courier_status_type` | `text` |  Nullable |
| `last_tracking_sync_at` | `timestamptz` |  Nullable |
| `pod_image_url` | `text` |  Nullable |
| `receiver_name` | `text` |  Nullable |
| `receiver_nic` | `text` |  Nullable |
| `submitted_by_employee_id` | `uuid` |  Nullable |
| `package_length_cm` | `numeric` |  Nullable |
| `package_width_cm` | `numeric` |  Nullable |
| `package_height_cm` | `numeric` |  Nullable |

## Table `notification`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `notification_id` | `uuid` | Primary |
| `order_id` | `uuid` |  Nullable |
| `message` | `text` |  |
| `type` | `text` |  |
| `sent_at` | `timestamptz` |  Nullable |
| `status` | `text` |  |
| `title` | `text` |  |
| `is_read` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `checkout_id` | `uuid` |  Nullable |
| `recipient_profile_id` | `uuid` |  Nullable |
| `channel` | `text` |  |

## Table `images`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `int8` | Primary Identity |
| `image_url` | `text` |  |
| `created_at` | `timestamp` |  Nullable |
| `variant_id` | `uuid` |  |

## Table `delivery_fee_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `rule_id` | `uuid` | Primary |
| `district` | `text` |  Unique |
| `base_delivery_fee` | `numeric` |  |
| `base_item_limit` | `int4` |  |
| `additional_item_block_size` | `int4` |  |
| `additional_block_fee` | `numeric` |  |
| `fuel_surcharge_percentage` | `numeric` |  |
| `is_active` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `user_addresses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `address_id` | `uuid` | Primary |
| `customer_id` | `uuid` |  |
| `receiver_name` | `text` |  |
| `phone` | `text` |  |
| `address_line_1` | `text` |  |
| `address_line_2` | `text` |  Nullable |
| `city` | `text` |  |
| `district` | `text` |  |
| `postal_code` | `text` |  Nullable |
| `is_primary` | `bool` |  |
| `created_at` | `timestamptz` |  Nullable |
| `updated_at` | `timestamptz` |  |

## Table `order_customer_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `detail_id` | `uuid` | Primary |
| `order_id` | `uuid` |  Unique |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `email` | `text` |  |
| `phone` | `text` |  |
| `created_at` | `timestamptz` |  Nullable |

## Table `order_shipping_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `shipping_id` | `uuid` | Primary |
| `order_id` | `uuid` |  Unique |
| `receiver_name` | `text` |  |
| `phone` | `text` |  |
| `address_line_1` | `text` |  |
| `address_line_2` | `text` |  Nullable |
| `city` | `text` |  |
| `district` | `text` |  |
| `postal_code` | `text` |  Nullable |
| `delivery_note` | `text` |  Nullable |
| `created_at` | `timestamptz` |  Nullable |

## Table `review`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_id` | `uuid` | Primary |
| `product_id` | `uuid` |  |
| `customer_id` | `uuid` |  |
| `rating` | `int4` |  |
| `comment` | `text` |  |
| `created_at` | `timestamptz` |  |
| `order_item_id` | `uuid` |  Unique |
| `is_hidden` | `bool` |  Nullable |

## Table `_prisma_migrations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `varchar` | Primary |
| `checksum` | `varchar` |  |
| `finished_at` | `timestamptz` |  Nullable |
| `migration_name` | `varchar` |  |
| `logs` | `text` |  Nullable |
| `rolled_back_at` | `timestamptz` |  Nullable |
| `started_at` | `timestamptz` |  |
| `applied_steps_count` | `int4` |  |

## Table `stock_reservation`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `reservation_id` | `uuid` | Primary |
| `inventory_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `status` | `text` |  |
| `expires_at` | `timestamptz` |  Nullable |
| `created_at` | `timestamptz` |  |
| `checkout_id` | `uuid` |  |

## Table `inventory_commitment`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `commitment_id` | `uuid` | Primary |
| `inventory_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `status` | `text` |  |
| `committed_at` | `timestamptz` |  |
| `restored_at` | `timestamptz` |  Nullable |
| `order_item_id` | `uuid` |  |
| `restore_reason` | `text` |  Nullable |

## Table `pending_checkout`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `checkout_id` | `uuid` | Primary |
| `customer_id` | `uuid` |  Nullable |
| `payment_method` | `text` |  |
| `status` | `text` |  |
| `delivery_fee` | `numeric` |  |
| `expires_at` | `timestamptz` |  Nullable |
| `admin_notes` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `reviewed_by_profile_id` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `product_total` | `numeric` |  |
| `total_amount` | `numeric` |  |

## Table `pending_checkout_item`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `checkout_item_id` | `uuid` | Primary |
| `checkout_id` | `uuid` |  |
| `variant_id` | `uuid` |  |
| `quantity` | `int4` |  |
| `unit_price` | `numeric` |  |

## Table `pending_checkout_customer_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `detail_id` | `uuid` | Primary |
| `checkout_id` | `uuid` |  Unique |
| `first_name` | `text` |  |
| `last_name` | `text` |  |
| `email` | `text` |  |
| `phone` | `text` |  |

## Table `pending_checkout_shipping_details`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `shipping_id` | `uuid` | Primary |
| `checkout_id` | `uuid` |  Unique |
| `receiver_name` | `text` |  |
| `phone` | `text` |  |
| `address_line_1` | `text` |  |
| `address_line_2` | `text` |  Nullable |
| `city` | `text` |  |
| `district` | `text` |  |
| `postal_code` | `text` |  Nullable |
| `delivery_note` | `text` |  Nullable |

## Table `payment_proof`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `payment_proof_id` | `uuid` | Primary |
| `checkout_id` | `uuid` |  Unique |
| `file_url` | `text` |  |
| `storage_public_id` | `text` |  Nullable |
| `uploaded_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `file_name` | `text` |  Nullable |
| `mime_type` | `text` |  Nullable |
| `file_size_bytes` | `int4` |  Nullable |
| `status` | `text` |  |
| `reviewed_by_profile_id` | `uuid` |  Nullable |
| `reviewed_at` | `timestamptz` |  Nullable |
| `rejection_reason` | `text` |  Nullable |

## Table `employee_commission`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `commission_id` | `uuid` | Primary |
| `employee_id` | `uuid` |  |
| `order_id` | `uuid` |  Unique |
| `rate_used` | `numeric` |  |
| `commission_amount` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `paid_at` | `timestamptz` |  Nullable |

## Table `color`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `color_id` | `uuid` | Primary |
| `name` | `text` |  |
| `hex_code` | `text` |  Nullable |
| `display_order` | `int4` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `image_url` | `text` |  Nullable |

## Table `size`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `size_id` | `uuid` | Primary |
| `name` | `text` |  |
| `display_order` | `int4` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `courier_shipper_profile`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `profile_id` | `uuid` | Primary |
| `courier_name` | `text` |  |
| `branch_id` | `uuid` |  Nullable |
| `shipper_name` | `text` |  |
| `address_line_1` | `text` |  |
| `address_line_2` | `text` |  Nullable |
| `address_line_3` | `text` |  Nullable |
| `address_line_4_city` | `text` |  |
| `contact_name` | `text` |  |
| `contact_number_1` | `text` |  |
| `contact_number_2` | `text` |  Nullable |
| `is_default` | `bool` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `delivery_waybill`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `waybill_id` | `uuid` | Primary |
| `delivery_id` | `uuid` |  |
| `tracking_number` | `text` |  |
| `reference` | `text` |  Nullable |
| `delivery_facility_code` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `delivery_tracking_event`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `event_id` | `uuid` | Primary |
| `delivery_id` | `uuid` |  |
| `waybill_id` | `uuid` |  Nullable |
| `tracking_number` | `text` |  |
| `status` | `text` |  |
| `status_type` | `text` |  Nullable |
| `status_code` | `text` |  Nullable |
| `description` | `text` |  Nullable |
| `reason` | `text` |  Nullable |
| `location` | `text` |  Nullable |
| `event_at` | `timestamptz` |  |
| `source` | `text` |  |
| `external_item_id` | `int4` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `courier_pickup_request`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `pickup_request_id` | `uuid` | Primary |
| `courier_name` | `text` |  |
| `external_pickup_id` | `int4` |  Nullable |
| `requested_by_employee_id` | `uuid` |  Nullable |
| `branch_id` | `uuid` |  Nullable |
| `pickup_address_line_1` | `text` |  |
| `pickup_address_line_2` | `text` |  Nullable |
| `pickup_address_line_3` | `text` |  Nullable |
| `pickup_address_line_4_city` | `text` |  |
| `pickup_contact_person` | `text` |  |
| `pickup_contact_number_1` | `text` |  |
| `estimated_pickup_weight_grams` | `int4` |  |
| `estimated_waybill_count` | `int4` |  |
| `pickup_from_datetime` | `timestamptz` |  |
| `pickup_to_datetime` | `timestamptz` |  |
| `status` | `text` |  |
| `submitted_at` | `timestamptz` |  |
| `failure_reason` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `courier_pickup_delivery`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `pickup_request_id` | `uuid` | Primary |
| `delivery_id` | `uuid` | Primary |
| `created_at` | `timestamptz` |  |

## Table `review_image`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `review_image_id` | `uuid` | Primary |
| `review_id` | `uuid` |  |
| `image_url` | `text` |  |
| `created_at` | `timestamptz` |  |

## RLS Policies

### `supplier`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `supplier_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `pending_checkout_item`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `pending_checkout_item_delete_policy` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_item_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `pending_checkout_item_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_item_update_policy` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_item.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `pending_checkout_customer_details`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `pending_checkout_cust_details_delete` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_cust_details_insert` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `pending_checkout_cust_details_select` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_cust_details_update` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_customer_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `pending_checkout_shipping_details`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `pending_checkout_ship_details_delete` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_ship_details_insert` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `pending_checkout_ship_details_select` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `pending_checkout_ship_details_update` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pending_checkout_shipping_details.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `orders_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `orders_insert_policy` | INSERT | public | PERMISSIVE | — | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `orders_select_policy` | SELECT | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `orders_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `branch`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `branch_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `branch_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `branch_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `branch_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `category`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `category_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `category_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `category_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `category_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `profiles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `profiles_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `profiles_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin))` |
| `profiles_select_policy` | SELECT | authenticated | PERMISSIVE | `((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `profiles_update_policy` | UPDATE | authenticated | PERMISSIVE | `((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `customer`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customer_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `customer_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `customer_select_policy` | SELECT | authenticated | PERMISSIVE | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `customer_update_policy` | UPDATE | authenticated | PERMISSIVE | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `employee`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employee_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `employee_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `( SELECT private.is_admin() AS is_admin)` |
| `employee_select_policy` | SELECT | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `employee_update_policy` | UPDATE | authenticated | PERMISSIVE | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin))` | `((profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin))` |

### `attendance`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `attendance_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `attendance_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((employee_id = ( SELECT private.get_employee_id() AS get_employee_id)) OR ( SELECT private.is_admin() AS is_admin))` |
| `attendance_select_policy` | SELECT | authenticated | PERMISSIVE | `((employee_id = ( SELECT private.get_employee_id() AS get_employee_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `attendance_update_policy` | UPDATE | authenticated | PERMISSIVE | `((employee_id = ( SELECT private.get_employee_id() AS get_employee_id)) OR ( SELECT private.is_admin() AS is_admin))` | `((employee_id = ( SELECT private.get_employee_id() AS get_employee_id)) OR ( SELECT private.is_admin() AS is_admin))` |

### `cart`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cart_delete_policy` | DELETE | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `cart_insert_policy` | INSERT | public | PERMISSIVE | — | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `cart_select_policy` | SELECT | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `cart_update_policy` | UPDATE | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `cart_item`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cart_item_delete_policy` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM cart c   WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (c.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `cart_item_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM cart c   WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (c.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `cart_item_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM cart c   WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (c.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `cart_item_update_policy` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM cart c   WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (c.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM cart c   WHERE ((c.cart_id = cart_item.cart_id) AND ((c.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (c.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `_prisma_migrations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `deny_delete_prisma_migrations` | DELETE | anon, authenticated | PERMISSIVE | `false` | — |
| `deny_insert_prisma_migrations` | INSERT | anon, authenticated | PERMISSIVE | — | `false` |
| `deny_select_prisma_migrations` | SELECT | anon, authenticated | PERMISSIVE | `false` | — |
| `deny_update_prisma_migrations` | UPDATE | anon, authenticated | PERMISSIVE | `false` | `false` |

### `role`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `role_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `role_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `( SELECT private.is_admin() AS is_admin)` |
| `role_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `role_update_policy` | UPDATE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | `( SELECT private.is_admin() AS is_admin)` |

### `user_addresses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `user_addresses_delete_policy` | DELETE | authenticated | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `user_addresses_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `user_addresses_select_policy` | SELECT | authenticated | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `user_addresses_update_policy` | UPDATE | authenticated | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `order_customer_details`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `order_customer_details_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `order_customer_details_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_customer_details.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `order_customer_details_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_customer_details.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `order_customer_details_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `order_shipping_details`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `order_shipping_details_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `order_shipping_details_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_shipping_details.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `order_shipping_details_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_shipping_details.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `order_shipping_details_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `notification`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `notification_delete_policy` | DELETE | authenticated | PERMISSIVE | `((recipient_profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `notification_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((recipient_profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `notification_select_policy` | SELECT | authenticated | PERMISSIVE | `((recipient_profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `notification_update_policy` | UPDATE | authenticated | PERMISSIVE | `((recipient_profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((recipient_profile_id = ( SELECT auth.uid() AS uid)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `delivery_fee_rules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delivery_fee_rules_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `delivery_fee_rules_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `delivery_fee_rules_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `delivery_fee_rules_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `inventory`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `inventory_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `product`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `product_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `product_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `product_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `product_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `product_variant`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `product_variant_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `product_variant_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `product_variant_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `product_variant_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `images`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `images_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `images_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `images_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `images_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `stock_reservation`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `stock_reservation_delete_policy` | DELETE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `stock_reservation_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `stock_reservation_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `stock_reservation_update_policy` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = stock_reservation.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `pending_checkout`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `pending_checkout_delete_policy` | DELETE | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `pending_checkout_insert_policy` | INSERT | public | PERMISSIVE | — | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `pending_checkout_select_policy` | SELECT | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `pending_checkout_update_policy` | UPDATE | public | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `review`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_delete_policy` | DELETE | authenticated | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `review_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `review_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `review_update_policy` | UPDATE | authenticated | PERMISSIVE | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `((customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `delivery`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delivery_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `payment_proof`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payment_proof_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `payment_proof_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `payment_proof_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `payment_proof_update_policy` | UPDATE | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM pending_checkout pc   WHERE ((pc.checkout_id = pc.checkout_id) AND ((pc.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (pc.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `inventory_commitment`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `inventory_commitment_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `employee_commission`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employee_commission_delete_policy` | DELETE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | — |
| `employee_commission_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `( SELECT private.is_admin() AS is_admin)` |
| `employee_commission_select_policy` | SELECT | authenticated | PERMISSIVE | `((employee_id = ( SELECT private.get_employee_id() AS get_employee_id)) OR ( SELECT private.is_admin() AS is_admin))` | — |
| `employee_commission_update_policy` | UPDATE | authenticated | PERMISSIVE | `( SELECT private.is_admin() AS is_admin)` | `( SELECT private.is_admin() AS is_admin)` |

### `color`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `color_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `color_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `color_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `color_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `size`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `size_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `size_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `size_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `size_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `courier_shipper_profile`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `courier_shipper_profile_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `order_item`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `order_item_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `order_item_insert_policy` | INSERT | public | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_item.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `order_item_select_policy` | SELECT | public | PERMISSIVE | `(EXISTS ( SELECT 1    FROM orders o   WHERE ((o.order_id = order_item.order_id) AND ((o.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR (o.customer_id IS NULL) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `order_item_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `review_image`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `review_image_delete_policy` | DELETE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM review r   WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | — |
| `review_image_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(EXISTS ( SELECT 1    FROM review r   WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |
| `review_image_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `review_image_update_policy` | UPDATE | authenticated | PERMISSIVE | `(EXISTS ( SELECT 1    FROM review r   WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` | `(EXISTS ( SELECT 1    FROM review r   WHERE ((r.review_id = review_image.review_id) AND ((r.customer_id = ( SELECT private.get_customer_id() AS get_customer_id)) OR ( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee)))))` |

### `delivery_waybill`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delivery_waybill_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `delivery_tracking_event`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delivery_tracking_event_delete_policy` | DELETE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | — |
| `delivery_tracking_event_insert_policy` | INSERT | authenticated | PERMISSIVE | — | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |
| `delivery_tracking_event_select_policy` | SELECT | public | PERMISSIVE | `true` | — |
| `delivery_tracking_event_update_policy` | UPDATE | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `courier_pickup_request`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `courier_pickup_request_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

### `courier_pickup_delivery`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `courier_pickup_delivery_all_policy` | ALL | authenticated | PERMISSIVE | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` | `(( SELECT private.is_admin() AS is_admin) OR ( SELECT private.is_employee() AS is_employee))` |

