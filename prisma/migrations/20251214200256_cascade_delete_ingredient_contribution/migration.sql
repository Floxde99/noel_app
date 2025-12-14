-- DropForeignKey
ALTER TABLE `MenuIngredient` DROP FOREIGN KEY `MenuIngredient_contributionId_fkey`;

-- AddForeignKey
ALTER TABLE `MenuIngredient` ADD CONSTRAINT `MenuIngredient_contributionId_fkey` FOREIGN KEY (`contributionId`) REFERENCES `Contribution`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
