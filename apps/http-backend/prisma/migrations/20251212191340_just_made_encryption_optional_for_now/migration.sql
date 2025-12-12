-- AlterTable
ALTER TABLE "DirectMessage" ALTER COLUMN "nonce" DROP NOT NULL,
ALTER COLUMN "senderPublicKey" DROP NOT NULL;
