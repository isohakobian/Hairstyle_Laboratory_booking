ALTER TABLE `services` ADD `isActive` enum('yes','no') DEFAULT 'yes' NOT NULL;--> statement-breakpoint
ALTER TABLE `services` ADD `displayOrder` int DEFAULT 0 NOT NULL;