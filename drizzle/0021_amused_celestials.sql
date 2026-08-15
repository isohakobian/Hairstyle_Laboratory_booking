CREATE TABLE `clientEmailDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`notificationType` varchar(80) NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`deliveryStatus` enum('sent','failed','skipped') NOT NULL,
	`errorMessage` varchar(1000),
	`isManualResend` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientEmailDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `clientEmailDeliveries_bookingId_idx` ON `clientEmailDeliveries` (`bookingId`);