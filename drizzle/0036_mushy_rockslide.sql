CREATE TABLE `siteSettings` (
	`id` int NOT NULL DEFAULT 1,
	`homepageTheme` enum('original','gta','new-year','new-york') NOT NULL DEFAULT 'gta',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `siteSettings_id` PRIMARY KEY(`id`)
);
