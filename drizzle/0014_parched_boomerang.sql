CREATE TABLE `emailTemplates` (
	`key` varchar(100) NOT NULL,
	`subjectRu` varchar(255) NOT NULL,
	`subjectEn` varchar(255) NOT NULL,
	`bodyRu` text NOT NULL,
	`bodyEn` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailTemplates_key` PRIMARY KEY(`key`)
);
