CREATE TABLE `api_call_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_email` text NOT NULL,
	`endpoint_id` text NOT NULL,
	`module` text NOT NULL,
	`route` text NOT NULL,
	`method` text NOT NULL,
	`request_summary` text NOT NULL,
	`response_code` text,
	`status` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`error_message` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credentials` (
	`user_email` text PRIMARY KEY NOT NULL,
	`host` text DEFAULT 'https://openapi.lingxing.com' NOT NULL,
	`app_id` text NOT NULL,
	`encrypted_secret` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tokens` (
	`user_email` text PRIMARY KEY NOT NULL,
	`encrypted_access_token` text NOT NULL,
	`encrypted_refresh_token` text,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
