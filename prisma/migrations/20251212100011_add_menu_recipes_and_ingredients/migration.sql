-- CreateTable
CREATE TABLE `MenuRecipe` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `eventId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MenuRecipe_eventId_idx`(`eventId`),
    INDEX `MenuRecipe_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MenuIngredient` (
    `id` VARCHAR(191) NOT NULL,
    `recipeId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,
    `contributionId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MenuIngredient_contributionId_key`(`contributionId`),
    INDEX `MenuIngredient_recipeId_idx`(`recipeId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MenuRecipe` ADD CONSTRAINT `MenuRecipe_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuRecipe` ADD CONSTRAINT `MenuRecipe_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuIngredient` ADD CONSTRAINT `MenuIngredient_recipeId_fkey` FOREIGN KEY (`recipeId`) REFERENCES `MenuRecipe`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MenuIngredient` ADD CONSTRAINT `MenuIngredient_contributionId_fkey` FOREIGN KEY (`contributionId`) REFERENCES `Contribution`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
