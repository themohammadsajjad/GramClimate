CREATE TABLE `profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`organization` text DEFAULT '' NOT NULL,
	`role` text DEFAULT 'Researcher' NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
