CREATE TABLE `crmCampaignDeliveries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`campaignId` int NOT NULL,
	`clientId` int NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`deliveryStatus` enum('sent','failed','skipped') NOT NULL,
	`errorMessage` varchar(1000),
	`emailSubject` varchar(500) NOT NULL,
	`emailText` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `crmCampaignDeliveries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `clientCrmPreferences` MODIFY COLUMN `newsletterConsented` enum('yes','no') NOT NULL DEFAULT 'no';--> statement-breakpoint
CREATE INDEX `crmCampaignDeliveries_campaignId_idx` ON `crmCampaignDeliveries` (`campaignId`);--> statement-breakpoint
CREATE INDEX `crmCampaignDeliveries_clientId_idx` ON `crmCampaignDeliveries` (`clientId`);