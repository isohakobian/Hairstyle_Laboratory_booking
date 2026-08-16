CREATE TABLE `clientCrmPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`newsletterConsented` enum('yes','no') NOT NULL DEFAULT 'yes',
	`last14DayFollowUpSentAt` timestamp,
	`lastBirthdayGreetingYear` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientCrmPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientCrmPreferences_clientId_unique` UNIQUE(`clientId`)
);
--> statement-breakpoint
CREATE TABLE `crmCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`subjectRu` varchar(255) NOT NULL,
	`subjectEn` varchar(255) NOT NULL,
	`bodyRu` text NOT NULL,
	`bodyEn` text NOT NULL,
	`audienceFilter` varchar(50) NOT NULL DEFAULT 'all',
	`targetServiceId` int,
	`status` enum('draft','sending','completed','failed') NOT NULL DEFAULT 'draft',
	`totalRecipients` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`errorCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crmCampaigns_id` PRIMARY KEY(`id`)
);
