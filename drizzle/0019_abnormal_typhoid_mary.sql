CREATE TABLE `automationEmailDeliveries` (
	`deliveryKey` varchar(150) NOT NULL,
	`claimedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `automationEmailDeliveries_deliveryKey` PRIMARY KEY(`deliveryKey`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `appointmentReminderClaimedAt` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `appointmentReminderSentAt` timestamp;