ALTER TABLE `bookingEvents` MODIFY COLUMN `eventType` enum('created','confirmed','declined','cancelled','rescheduled','completed','note') NOT NULL;--> statement-breakpoint
ALTER TABLE `bookings` MODIFY COLUMN `status` enum('pending','confirmed','declined','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancelledAt` timestamp;--> statement-breakpoint
ALTER TABLE `bookings` ADD `cancellationReason` text;