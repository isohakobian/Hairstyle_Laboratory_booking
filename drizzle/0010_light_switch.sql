CREATE TABLE `announcements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleRu` varchar(255) NOT NULL,
	`titleEn` varchar(255) NOT NULL,
	`bodyRu` text NOT NULL,
	`bodyEn` text NOT NULL,
	`startDate` varchar(10) NOT NULL,
	`endDate` varchar(10) NOT NULL,
	`isPublished` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `announcements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `availabilityWindows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`date` varchar(10) NOT NULL,
	`startTime` varchar(5) NOT NULL,
	`endTime` varchar(5) NOT NULL,
	`slotIntervalMinutes` int NOT NULL DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `availabilityWindows_id` PRIMARY KEY(`id`),
	CONSTRAINT `availabilityWindows_date_range_idx` UNIQUE(`date`,`startTime`,`endTime`)
);
--> statement-breakpoint
CREATE TABLE `bookingEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`eventType` enum('created','confirmed','declined','rescheduled','completed','note') NOT NULL,
	`previousDate` varchar(10),
	`previousTime` varchar(5),
	`nextDate` varchar(10),
	`nextTime` varchar(5),
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`lookupKey` varchar(360) NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`email` varchar(320),
	`birthday` varchar(10),
	`instagram` varchar(100),
	`preferredHairLength` text,
	`preferredBeardShape` text,
	`preferredStyling` text,
	`dislikes` text,
	`skinSensitivity` text,
	`stylistNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `clients_lookupKey_unique` UNIQUE(`lookupKey`)
);
--> statement-breakpoint
CREATE TABLE `reviewRequestHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`sentAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewRequestHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visitMedia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`mediaType` enum('before','after') NOT NULL,
	`storageKey` varchar(500) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`caption` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visitMedia_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `clientId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `completedAt` timestamp;--> statement-breakpoint
CREATE INDEX `announcements_period_idx` ON `announcements` (`startDate`,`endDate`);--> statement-breakpoint
CREATE INDEX `availabilityWindows_date_idx` ON `availabilityWindows` (`date`);--> statement-breakpoint
CREATE INDEX `bookingEvents_bookingId_idx` ON `bookingEvents` (`bookingId`);--> statement-breakpoint
CREATE INDEX `reviewRequestHistory_bookingId_idx` ON `reviewRequestHistory` (`bookingId`);--> statement-breakpoint
CREATE INDEX `visitMedia_bookingId_idx` ON `visitMedia` (`bookingId`);--> statement-breakpoint
CREATE INDEX `bookings_clientId_idx` ON `bookings` (`clientId`);--> statement-breakpoint
CREATE INDEX `bookings_date_time_idx` ON `bookings` (`bookingDate`,`bookingTime`);