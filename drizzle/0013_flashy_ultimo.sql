CREATE TABLE `bookingStatusRecoveryTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientEmail` varchar(320) NOT NULL,
	`tokenHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bookingStatusRecoveryTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `bookingStatusRecoveryTokens_tokenHash_unique` UNIQUE(`tokenHash`)
);
--> statement-breakpoint
CREATE INDEX `bookingStatusRecoveryTokens_email_idx` ON `bookingStatusRecoveryTokens` (`clientEmail`);