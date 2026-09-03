CREATE TABLE `manualVisits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`visitDate` varchar(10) NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`priceAmd` int NOT NULL DEFAULT 0,
	`paidAmd` int NOT NULL DEFAULT 0,
	`note` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manualVisits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `manualVisits_clientId_idx` ON `manualVisits` (`clientId`);--> statement-breakpoint
CREATE INDEX `manualVisits_visitDate_idx` ON `manualVisits` (`visitDate`);