ALTER TABLE `bookings` ADD `manualDepositReceiptKey` varchar(500);--> statement-breakpoint
ALTER TABLE `bookings` ADD `manualDepositReceiptFileName` varchar(255);--> statement-breakpoint
ALTER TABLE `bookings` ADD `manualDepositReceiptMimeType` varchar(100);