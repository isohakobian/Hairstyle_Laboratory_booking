CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referenceNumber` varchar(12) NOT NULL,
	`serviceId` int NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`bookingDate` varchar(10) NOT NULL,
	`bookingTime` varchar(5) NOT NULL,
	`clientName` varchar(255) NOT NULL,
	`clientPhone` varchar(20) NOT NULL,
	`clientEmail` varchar(320),
	`comment` text,
	`status` enum('pending','confirmed','declined') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bookings_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookings_referenceNumber_unique` UNIQUE(`referenceNumber`)
);
--> statement-breakpoint
CREATE TABLE `services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nameEn` varchar(255) NOT NULL,
	`nameRu` varchar(255) NOT NULL,
	`descriptionEn` text,
	`descriptionRu` text,
	`durationMinutes` int NOT NULL,
	`priceRub` int NOT NULL,
	`noteEn` text,
	`noteRu` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
