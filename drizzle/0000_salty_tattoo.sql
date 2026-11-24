CREATE TABLE "activity_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_email" text DEFAULT 'system' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text DEFAULT '' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"delivery_address" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "homepage_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"section_key" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"cta_primary_label" text DEFAULT '' NOT NULL,
	"cta_primary_href" text DEFAULT '' NOT NULL,
	"cta_secondary_label" text DEFAULT '' NOT NULL,
	"cta_secondary_href" text DEFAULT '' NOT NULL,
	"image_url" text DEFAULT '' NOT NULL,
	"extra_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "homepage_sections_section_key_unique" UNIQUE("section_key")
);
--> statement-breakpoint
CREATE TABLE "media_library" (
	"id" text PRIMARY KEY NOT NULL,
	"file_name" text NOT NULL,
	"bucket" text DEFAULT 'media-library' NOT NULL,
	"file_url" text NOT NULL,
	"mime_type" text NOT NULL,
	"file_size_bytes" integer DEFAULT 0 NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_subscribers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text DEFAULT '' NOT NULL,
	"content_markdown" text DEFAULT '' NOT NULL,
	"extra_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"product_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "product_categories_product_id_category_id_pk" PRIMARY KEY("product_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"image_url" text NOT NULL,
	"alt_text" text DEFAULT '' NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"price_cad" numeric(10, 2) NOT NULL,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"sku" text NOT NULL,
	"short_description" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"retail_price_cad" numeric(10, 2) NOT NULL,
	"compare_at_price_cad" numeric(10, 2),
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" text DEFAULT '' NOT NULL,
	"seo_description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_slug_unique" UNIQUE("slug"),
	CONSTRAINT "products_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "retail_order_items" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"product_id" text,
	"variant_id" text,
	"product_name" text NOT NULL,
	"variant_name" text DEFAULT '' NOT NULL,
	"unit_price_cad" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total_cad" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "retail_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_reference" text NOT NULL,
	"customer_id" text,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"customer_phone" text NOT NULL,
	"country" text NOT NULL,
	"city" text NOT NULL,
	"delivery_address" text NOT NULL,
	"order_notes" text DEFAULT '' NOT NULL,
	"internal_notes" text DEFAULT '' NOT NULL,
	"subtotal_cad" numeric(10, 2) NOT NULL,
	"total_cad" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'CAD' NOT NULL,
	"order_status" text DEFAULT 'Awaiting WhatsApp Confirmation' NOT NULL,
	"payment_status" text DEFAULT 'Unpaid' NOT NULL,
	"whatsapp_message_payload" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retail_orders_order_reference_unique" UNIQUE("order_reference")
);
--> statement-breakpoint
CREATE TABLE "site_settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"business_name" text DEFAULT 'Kytura Naturals' NOT NULL,
	"owner_name" text DEFAULT 'Dr Ann Merah' NOT NULL,
	"email" text DEFAULT 'kyturanaturals@gmail.com' NOT NULL,
	"whatsapp_number" text DEFAULT '+14033719687' NOT NULL,
	"currency" text DEFAULT 'CAD' NOT NULL,
	"region_label" text DEFAULT 'Global / All Regions' NOT NULL,
	"announcement_left" text DEFAULT 'Discover Natural Wellness with Kytura Naturals' NOT NULL,
	"announcement_center" text DEFAULT 'Free Worldwide Shipping on Orders Over $100 CAD' NOT NULL,
	"free_shipping_threshold_cad" numeric(10, 2) DEFAULT '100.00' NOT NULL,
	"seo_title" text DEFAULT 'Kytura Naturals | Botanical Wellness, Diffuser Oils & Ultrasonic Diffusers' NOT NULL,
	"seo_description" text DEFAULT 'Explore botanical diffuser oil blends, body and massage oils, and ultrasonic diffusers from Kytura Naturals.' NOT NULL,
	"social_facebook" text DEFAULT '' NOT NULL,
	"social_instagram" text DEFAULT '' NOT NULL,
	"social_youtube" text DEFAULT '' NOT NULL,
	"social_pinterest" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "testimonials" (
	"id" text PRIMARY KEY NOT NULL,
	"customer_name" text NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"quote" text NOT NULL,
	"rating" integer DEFAULT 5 NOT NULL,
	"avatar_url" text DEFAULT '' NOT NULL,
	"is_approved" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"full_name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "wholesale_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"applicant_name" text NOT NULL,
	"business_email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"business_address" text NOT NULL,
	"business_type" text NOT NULL,
	"website_or_social" text DEFAULT '' NOT NULL,
	"additional_info" text DEFAULT '' NOT NULL,
	"password_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"rejection_reason" text DEFAULT '' NOT NULL,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_applications_business_email_unique" UNIQUE("business_email")
);
--> statement-breakpoint
CREATE TABLE "wholesale_inquiries" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_reference" text NOT NULL,
	"wholesale_profile_id" text NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"estimated_total_cad" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'Submitted' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_inquiries_inquiry_reference_unique" UNIQUE("inquiry_reference")
);
--> statement-breakpoint
CREATE TABLE "wholesale_inquiry_items" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"product_id" text,
	"product_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"quoted_unit_price_cad" numeric(10, 2) NOT NULL,
	"line_total_cad" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wholesale_price_tiers" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"moq" integer DEFAULT 10 NOT NULL,
	"base_wholesale_price_cad" numeric(10, 2) NOT NULL,
	"tier_2_min_qty" integer,
	"tier_2_price_cad" numeric(10, 2),
	"tier_3_min_qty" integer,
	"tier_3_price_cad" numeric(10, 2),
	"is_wholesale_available" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_price_tiers_product_id_unique" UNIQUE("product_id")
);
--> statement-breakpoint
CREATE TABLE "wholesale_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"application_id" text,
	"business_name" text NOT NULL,
	"contact_name" text NOT NULL,
	"business_email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"business_address" text NOT NULL,
	"business_type" text NOT NULL,
	"status" text DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wholesale_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "wholesale_profiles_business_email_unique" UNIQUE("business_email")
);
--> statement-breakpoint
CREATE TABLE "wholesale_quotations" (
	"id" text PRIMARY KEY NOT NULL,
	"inquiry_id" text NOT NULL,
	"quoted_total_cad" numeric(10, 2) NOT NULL,
	"shipping_estimate_cad" numeric(10, 2) DEFAULT '0' NOT NULL,
	"terms" text DEFAULT '' NOT NULL,
	"valid_until" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_order_id_retail_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."retail_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_order_items" ADD CONSTRAINT "retail_order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "retail_orders" ADD CONSTRAINT "retail_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_inquiries" ADD CONSTRAINT "wholesale_inquiries_wholesale_profile_id_wholesale_profiles_id_fk" FOREIGN KEY ("wholesale_profile_id") REFERENCES "public"."wholesale_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_inquiry_items" ADD CONSTRAINT "wholesale_inquiry_items_inquiry_id_wholesale_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."wholesale_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_inquiry_items" ADD CONSTRAINT "wholesale_inquiry_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_price_tiers" ADD CONSTRAINT "wholesale_price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_profiles" ADD CONSTRAINT "wholesale_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_profiles" ADD CONSTRAINT "wholesale_profiles_application_id_wholesale_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."wholesale_applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wholesale_quotations" ADD CONSTRAINT "wholesale_quotations_inquiry_id_wholesale_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."wholesale_inquiries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_activity_logs_created" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_products_published" ON "products" USING btree ("is_published","is_featured");--> statement-breakpoint
CREATE INDEX "idx_retail_orders_ref" ON "retail_orders" USING btree ("order_reference");--> statement-breakpoint
CREATE INDEX "idx_retail_orders_status" ON "retail_orders" USING btree ("order_status","payment_status");--> statement-breakpoint
CREATE INDEX "idx_wholesale_apps_status" ON "wholesale_applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_wholesale_inquiries_profile" ON "wholesale_inquiries" USING btree ("wholesale_profile_id");