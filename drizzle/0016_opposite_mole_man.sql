CREATE TABLE `manualDepositSettings` (
	`key` varchar(100) NOT NULL,
	`recipientName` varchar(255) NOT NULL DEFAULT '',
	`cardDetails` varchar(255) NOT NULL DEFAULT '',
	`instagramUrl` varchar(500) NOT NULL DEFAULT '',
	`policyRu` text NOT NULL,
	`policyEn` text NOT NULL,
	`isEnabled` enum('yes','no') NOT NULL DEFAULT 'no',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manualDepositSettings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
ALTER TABLE `bookings` ADD `manualDepositAmountAmd` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `manualDepositStatus` enum('not_required','awaiting_proof','proof_received','verified','waived') DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` ADD `manualDepositConfirmedAt` timestamp;