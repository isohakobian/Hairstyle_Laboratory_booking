CREATE TABLE `manualVisitAuditLog` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitId` int NOT NULL,
	`action` enum('created','updated','deleted') NOT NULL,
	`visitDate` varchar(10) NOT NULL,
	`serviceName` varchar(255) NOT NULL,
	`priceAmd` int NOT NULL DEFAULT 0,
	`paidAmd` int NOT NULL DEFAULT 0,
	`note` text,
	`changedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `manualVisitAuditLog_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `manualVisitAuditLog_visitId_idx` ON `manualVisitAuditLog` (`visitId`);--> statement-breakpoint
CREATE INDEX `manualVisitAuditLog_changedAt_idx` ON `manualVisitAuditLog` (`changedAt`);