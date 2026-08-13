CREATE TABLE `reviewTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bookingId` int NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reviewTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviewTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `reviewTokens_bookingId_idx` ON `reviewTokens` (`bookingId`);