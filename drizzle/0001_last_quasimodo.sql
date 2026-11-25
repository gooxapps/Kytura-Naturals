ALTER TABLE "site_settings" ADD COLUMN "brand_tagline" text DEFAULT 'BOTANICAL WELLNESS · NATURAL LIVING' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "logo_light_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "logo_dark_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "brand_icon_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "favicon_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "header_links" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "footer_config" jsonb DEFAULT '{}'::jsonb NOT NULL;