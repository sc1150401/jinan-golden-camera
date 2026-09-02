CREATE TABLE `usage_devices` (
	`device_hash` text PRIMARY KEY NOT NULL,
	`first_used_at` integer NOT NULL,
	`last_used_at` integer NOT NULL,
	`completions` integer DEFAULT 1 NOT NULL
);
