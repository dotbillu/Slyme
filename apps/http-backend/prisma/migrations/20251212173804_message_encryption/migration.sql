/*
  Warnings:

  - Added the required column `nonce` to the `DirectMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderPublicKey` to the `DirectMessage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "nonce" TEXT NOT NULL,
ADD COLUMN     "senderPublicKey" TEXT NOT NULL;
