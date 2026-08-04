ALTER TABLE `services` MODIFY COLUMN `priceRub` int;--> statement-breakpoint
ALTER TABLE `services` ADD `priceMinRub` int;--> statement-breakpoint
ALTER TABLE `services` ADD `priceMaxRub` int;