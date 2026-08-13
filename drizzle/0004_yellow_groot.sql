CREATE TABLE `bookingServices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`serviceId` int NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`durationMinutes` int NOT NULL,
	`priceSummary` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingServices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `serviceSummary` varchar(1000) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `totalDurationMinutes` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `totalPriceSummary` varchar(255) DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE INDEX `bookingServices_bookingId_idx` ON `bookingServices` (`bookingId`);--> statement-breakpoint
CREATE INDEX `bookingServices_bookingId_serviceId_idx` ON `bookingServices` (`bookingId`,`serviceId`);
