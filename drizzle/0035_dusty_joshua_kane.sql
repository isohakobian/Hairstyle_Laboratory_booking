CREATE TABLE `loyaltyRegistrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`accessTokenHash` varchar(64) NOT NULL,
	`enrolledAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `loyaltyRegistrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `loyaltyRegistrations_clientId_unique` UNIQUE(`clientId`),
	CONSTRAINT `loyaltyRegistrations_accessTokenHash_unique` UNIQUE(`accessTokenHash`)
);
--> statement-breakpoint
CREATE INDEX `loyaltyRegistrations_clientId_idx` ON `loyaltyRegistrations` (`clientId`);