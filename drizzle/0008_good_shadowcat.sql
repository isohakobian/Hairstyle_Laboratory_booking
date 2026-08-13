CREATE TABLE `automationSettings` (
	`key` varchar(100) NOT NULL,
	`scheduleCronTaskUid` varchar(65),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automationSettings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `repeatFollowUpSentAt` timestamp;