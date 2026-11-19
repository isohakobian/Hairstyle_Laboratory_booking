CREATE TABLE `loyaltyRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`bookingId` int,
	`rewardAmountAmd` int NOT NULL DEFAULT 10000,
	`note` text,
	`redeemedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `loyaltyRedemptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `loyaltyRedemptions_clientId_idx` ON `loyaltyRedemptions` (`clientId`);--> statement-breakpoint
CREATE INDEX `loyaltyRedemptions_redeemedAt_idx` ON `loyaltyRedemptions` (`redeemedAt`);