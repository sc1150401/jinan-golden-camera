CREATE TABLE `usage_daily` (
	`day` text NOT NULL,
	`device_hash` text NOT NULL,
	`completions` integer DEFAULT 1 NOT NULL,
	PRIMARY KEY(`day`, `device_hash`)
);
