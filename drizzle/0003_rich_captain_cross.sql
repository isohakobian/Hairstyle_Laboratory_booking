CREATE TABLE `blockedDates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `blockedDates_id` PRIMARY KEY(`id`),
	CONSTRAINT `blockedDates_date_unique` UNIQUE(`date`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`referenceNumber` varchar(12) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`rating` int NOT NULL,
	`text` text,
	`isPublished` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_bookingId_unique` UNIQUE(`bookingId`)
);
