import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`role\` text DEFAULT 'editor' NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `)
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`users_email_idx\` ON \`users\` (\`email\`);`)
  await db.run(sql`CREATE TABLE \`users_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`sites_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sites_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`users_rels_order_idx\` ON \`users_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_parent_idx\` ON \`users_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_path_idx\` ON \`users_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`users_rels_sites_id_idx\` ON \`users_rels\` (\`sites_id\`);`)
  await db.run(sql`CREATE TABLE \`sites_domains\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`domain\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`sites_domains_order_idx\` ON \`sites_domains\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`sites_domains_parent_id_idx\` ON \`sites_domains\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`sites\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`domain\` text NOT NULL,
  	\`status\` text DEFAULT 'active',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`sites_domain_idx\` ON \`sites\` (\`domain\`);`)
  await db.run(sql`CREATE INDEX \`sites_updated_at_idx\` ON \`sites\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`sites_created_at_idx\` ON \`sites\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_header_links_children\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	\`open_in_new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings_header_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_header_links_children_order_idx\` ON \`site_settings_header_links_children\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_header_links_children_parent_id_idx\` ON \`site_settings_header_links_children\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_header_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	\`open_in_new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_header_links_order_idx\` ON \`site_settings_header_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_header_links_parent_id_idx\` ON \`site_settings_header_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_footer_links_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text NOT NULL,
  	\`url\` text NOT NULL,
  	\`open_in_new_tab\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings_footer_links\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_links_order_idx\` ON \`site_settings_footer_links_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_links_parent_id_idx\` ON \`site_settings_footer_links_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings_footer_links\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`group_label\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_order_idx\` ON \`site_settings_footer_links\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_footer_links_parent_id_idx\` ON \`site_settings_footer_links\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`site_settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_id\` integer NOT NULL,
  	\`theme_primary_color\` text DEFAULT '#3B82F6' NOT NULL,
  	\`theme_secondary_color\` text DEFAULT '#10B981' NOT NULL,
  	\`theme_accent_color\` text DEFAULT '#F59E0B',
  	\`theme_background_color\` text DEFAULT '#FFFFFF',
  	\`theme_text_color\` text DEFAULT '#1F2937',
  	\`theme_font_family\` text DEFAULT 'inter',
  	\`theme_heading_font_family\` text DEFAULT 'inherit',
  	\`theme_border_radius\` text DEFAULT 'md',
  	\`theme_layout_theme\` text DEFAULT 'modern',
  	\`footer_content_copyright_text\` text DEFAULT '© {year} All rights reserved.',
  	\`footer_content_show_powered_by\` integer DEFAULT false,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`site_settings_site_idx\` ON \`site_settings\` (\`site_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_seo_seo_og_image_idx\` ON \`site_settings\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_updated_at_idx\` ON \`site_settings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`site_settings_created_at_idx\` ON \`site_settings\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`style\` text DEFAULT 'centered',
  	\`heading\` text,
  	\`subheading\` text,
  	\`background_image_id\` integer,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`cta_variant\` text DEFAULT 'primary',
  	\`secondary_cta_label\` text,
  	\`secondary_cta_url\` text,
  	\`overlay_opacity\` numeric DEFAULT 40,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_order_idx\` ON \`pages_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_parent_id_idx\` ON \`pages_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_path_idx\` ON \`pages_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_hero_background_image_idx\` ON \`pages_blocks_hero\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`rich_text\` text,
  	\`width\` text DEFAULT 'full',
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_order_idx\` ON \`pages_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_columns_parent_id_idx\` ON \`pages_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_content\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`layout\` text DEFAULT 'default',
  	\`background_color\` text DEFAULT 'transparent',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_order_idx\` ON \`pages_blocks_content\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_parent_id_idx\` ON \`pages_blocks_content\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_content_path_idx\` ON \`pages_blocks_content\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_image_gallery_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`alt\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_image_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_order_idx\` ON \`pages_blocks_image_gallery_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_parent_id_idx\` ON \`pages_blocks_image_gallery_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_images_image_idx\` ON \`pages_blocks_image_gallery_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_image_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_order_idx\` ON \`pages_blocks_image_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_parent_id_idx\` ON \`pages_blocks_image_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_image_gallery_path_idx\` ON \`pages_blocks_image_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_contact_form_fields_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_contact_form_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_fields_options_order_idx\` ON \`pages_blocks_contact_form_fields_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_fields_options_parent_id_idx\` ON \`pages_blocks_contact_form_fields_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_contact_form_fields\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`field_type\` text,
  	\`required\` integer DEFAULT false,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages_blocks_contact_form\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_fields_order_idx\` ON \`pages_blocks_contact_form_fields\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_fields_parent_id_idx\` ON \`pages_blocks_contact_form_fields\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`pages_blocks_contact_form\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Get in Touch',
  	\`description\` text,
  	\`submit_label\` text DEFAULT 'Send Message',
  	\`success_message\` text DEFAULT 'Thank you! We will be in touch.',
  	\`recipient_email\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_order_idx\` ON \`pages_blocks_contact_form\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_parent_id_idx\` ON \`pages_blocks_contact_form\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_blocks_contact_form_path_idx\` ON \`pages_blocks_contact_form\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`pages\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_id\` integer,
  	\`title\` text,
  	\`slug\` text,
  	\`status\` text DEFAULT 'draft',
  	\`is_home_page\` integer DEFAULT false,
  	\`page_style_template\` text DEFAULT 'default',
  	\`page_style_override_primary_color\` text,
  	\`page_style_override_background_color\` text,
  	\`page_style_custom_c_s_s\` text,
  	\`seo_meta_title\` text,
  	\`seo_meta_description\` text,
  	\`seo_og_image_id\` integer,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`pages_site_idx\` ON \`pages\` (\`site_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_slug_idx\` ON \`pages\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`pages_seo_seo_og_image_idx\` ON \`pages\` (\`seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`pages_updated_at_idx\` ON \`pages\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`pages_created_at_idx\` ON \`pages\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`pages__status_idx\` ON \`pages\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_hero\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`style\` text DEFAULT 'centered',
  	\`heading\` text,
  	\`subheading\` text,
  	\`background_image_id\` integer,
  	\`cta_label\` text,
  	\`cta_url\` text,
  	\`cta_variant\` text DEFAULT 'primary',
  	\`secondary_cta_label\` text,
  	\`secondary_cta_url\` text,
  	\`overlay_opacity\` numeric DEFAULT 40,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`background_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_order_idx\` ON \`_pages_v_blocks_hero\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_parent_id_idx\` ON \`_pages_v_blocks_hero\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_path_idx\` ON \`_pages_v_blocks_hero\` (\`_path\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_hero_background_image_idx\` ON \`_pages_v_blocks_hero\` (\`background_image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_content_columns\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`rich_text\` text,
  	\`width\` text DEFAULT 'full',
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_content\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_order_idx\` ON \`_pages_v_blocks_content_columns\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_columns_parent_id_idx\` ON \`_pages_v_blocks_content_columns\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_content\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`layout\` text DEFAULT 'default',
  	\`background_color\` text DEFAULT 'transparent',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_order_idx\` ON \`_pages_v_blocks_content\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_parent_id_idx\` ON \`_pages_v_blocks_content\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_content_path_idx\` ON \`_pages_v_blocks_content\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_image_gallery_images\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`caption\` text,
  	\`alt\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_image_gallery\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_order_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_parent_id_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_images_image_idx\` ON \`_pages_v_blocks_image_gallery_images\` (\`image_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_image_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text,
  	\`layout\` text DEFAULT 'grid',
  	\`columns\` text DEFAULT '3',
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_order_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_parent_id_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_image_gallery_path_idx\` ON \`_pages_v_blocks_image_gallery\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_contact_form_fields_options\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`value\` text,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_contact_form_fields\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_fields_options_order_idx\` ON \`_pages_v_blocks_contact_form_fields_options\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_fields_options_parent_id_idx\` ON \`_pages_v_blocks_contact_form_fields_options\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_contact_form_fields\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`label\` text,
  	\`field_type\` text,
  	\`required\` integer DEFAULT false,
  	\`_uuid\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v_blocks_contact_form\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_fields_order_idx\` ON \`_pages_v_blocks_contact_form_fields\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_fields_parent_id_idx\` ON \`_pages_v_blocks_contact_form_fields\` (\`_parent_id\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v_blocks_contact_form\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`_path\` text NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`heading\` text DEFAULT 'Get in Touch',
  	\`description\` text,
  	\`submit_label\` text DEFAULT 'Send Message',
  	\`success_message\` text DEFAULT 'Thank you! We will be in touch.',
  	\`recipient_email\` text,
  	\`_uuid\` text,
  	\`block_name\` text,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_pages_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_order_idx\` ON \`_pages_v_blocks_contact_form\` (\`_order\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_parent_id_idx\` ON \`_pages_v_blocks_contact_form\` (\`_parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_blocks_contact_form_path_idx\` ON \`_pages_v_blocks_contact_form\` (\`_path\`);`)
  await db.run(sql`CREATE TABLE \`_pages_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_site_id\` integer,
  	\`version_title\` text,
  	\`version_slug\` text,
  	\`version_status\` text DEFAULT 'draft',
  	\`version_is_home_page\` integer DEFAULT false,
  	\`version_page_style_template\` text DEFAULT 'default',
  	\`version_page_style_override_primary_color\` text,
  	\`version_page_style_override_background_color\` text,
  	\`version_page_style_custom_c_s_s\` text,
  	\`version_seo_meta_title\` text,
  	\`version_seo_meta_description\` text,
  	\`version_seo_og_image_id\` integer,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_site_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_seo_og_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`_pages_v_parent_idx\` ON \`_pages_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_site_idx\` ON \`_pages_v\` (\`version_site_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_slug_idx\` ON \`_pages_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_seo_version_seo_og_image_idx\` ON \`_pages_v\` (\`version_seo_og_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_updated_at_idx\` ON \`_pages_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version_created_at_idx\` ON \`_pages_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_version_version__status_idx\` ON \`_pages_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_created_at_idx\` ON \`_pages_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_updated_at_idx\` ON \`_pages_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_pages_v_latest_idx\` ON \`_pages_v\` (\`latest\`);`)
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_id\` integer NOT NULL,
  	\`alt\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric,
  	FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`media_site_idx\` ON \`media\` (\`site_id\`);`)
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`)
  await db.run(sql`CREATE TABLE \`form_submissions\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_id\` integer NOT NULL,
  	\`page\` text,
  	\`data\` text NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`form_submissions_site_idx\` ON \`form_submissions\` (\`site_id\`);`)
  await db.run(sql`CREATE INDEX \`form_submissions_updated_at_idx\` ON \`form_submissions\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`form_submissions_created_at_idx\` ON \`form_submissions\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	\`sites_id\` integer,
  	\`site_settings_id\` integer,
  	\`pages_id\` integer,
  	\`media_id\` integer,
  	\`form_submissions_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`sites_id\`) REFERENCES \`sites\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`site_settings_id\`) REFERENCES \`site_settings\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`pages_id\`) REFERENCES \`pages\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`form_submissions_id\`) REFERENCES \`form_submissions\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_sites_id_idx\` ON \`payload_locked_documents_rels\` (\`sites_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_site_settings_id_idx\` ON \`payload_locked_documents_rels\` (\`site_settings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_pages_id_idx\` ON \`payload_locked_documents_rels\` (\`pages_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_form_submissions_id_idx\` ON \`payload_locked_documents_rels\` (\`form_submissions_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`)
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`users_sessions\`;`)
  await db.run(sql`DROP TABLE \`users\`;`)
  await db.run(sql`DROP TABLE \`users_rels\`;`)
  await db.run(sql`DROP TABLE \`sites_domains\`;`)
  await db.run(sql`DROP TABLE \`sites\`;`)
  await db.run(sql`DROP TABLE \`site_settings_header_links_children\`;`)
  await db.run(sql`DROP TABLE \`site_settings_header_links\`;`)
  await db.run(sql`DROP TABLE \`site_settings_footer_links_links\`;`)
  await db.run(sql`DROP TABLE \`site_settings_footer_links\`;`)
  await db.run(sql`DROP TABLE \`site_settings\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_content\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_image_gallery_images\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_image_gallery\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_contact_form_fields_options\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_contact_form_fields\`;`)
  await db.run(sql`DROP TABLE \`pages_blocks_contact_form\`;`)
  await db.run(sql`DROP TABLE \`pages\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_hero\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_content_columns\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_content\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_image_gallery_images\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_image_gallery\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_contact_form_fields_options\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_contact_form_fields\`;`)
  await db.run(sql`DROP TABLE \`_pages_v_blocks_contact_form\`;`)
  await db.run(sql`DROP TABLE \`_pages_v\`;`)
  await db.run(sql`DROP TABLE \`media\`;`)
  await db.run(sql`DROP TABLE \`form_submissions\`;`)
  await db.run(sql`DROP TABLE \`payload_kv\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences\`;`)
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_migrations\`;`)
}
