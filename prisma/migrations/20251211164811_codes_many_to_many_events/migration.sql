/*
  Warnings:

  - You are about to drop the column `eventId` on the `EventCode` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `EventCode` DROP FOREIGN KEY `EventCode_eventId_fkey`;

-- DropIndex
DROP INDEX `EventCode_eventId_idx` ON `EventCode`;

-- AlterTable
ALTER TABLE `EventCode` DROP COLUMN `eventId`;

-- CreateTable
CREATE TABLE `EventCodeEvent` (
    `id` VARCHAR(191) NOT NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `eventCodeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventCodeEvent_eventId_idx`(`eventId`),
    INDEX `EventCodeEvent_eventCodeId_idx`(`eventCodeId`),
    UNIQUE INDEX `EventCodeEvent_eventId_eventCodeId_key`(`eventId`, `eventCodeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EventCodeEvent` ADD CONSTRAINT `EventCodeEvent_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventCodeEvent` ADD CONSTRAINT `EventCodeEvent_eventCodeId_fkey` FOREIGN KEY (`eventCodeId`) REFERENCES `EventCode`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
