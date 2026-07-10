/*
  Warnings:

  - Made the column `friendly_name` on table `devices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hardware_version` on table `devices` required. This step will fail if there are existing NULL values in that column.
  - Made the column `metadata` on table `devices` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "devices" ALTER COLUMN "friendly_name" SET NOT NULL,
ALTER COLUMN "hardware_version" SET NOT NULL,
ALTER COLUMN "metadata" SET NOT NULL;
