CREATE TABLE `bookingReminderDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`offsetMinutes` int NOT NULL,
	`claimedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookingReminderDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookingReminderDeliveries_booking_offset_idx` UNIQUE(`bookingId`,`offsetMinutes`)
);
--> statement-breakpoint
CREATE TABLE `bookingReminderSettings` (
	`id` int NOT NULL DEFAULT 1,
	`firstOffsetMinutes` int NOT NULL DEFAULT 1440,
	`firstEnabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`secondOffsetMinutes` int NOT NULL DEFAULT 120,
	`secondEnabled` enum('yes','no') NOT NULL DEFAULT 'yes',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookingReminderSettings_id` PRIMARY KEY(`id`)
);
