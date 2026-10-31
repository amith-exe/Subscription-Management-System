-- Auth security schema: run with `prisma migrate deploy` against the existing database.
ALTER TYPE "InvoiceStatus" ADD VALUE IF NOT EXISTS 'OVERDUE';
ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "User" DROP COLUMN IF EXISTS "resetTokenHash";
ALTER TABLE "User" DROP COLUMN IF EXISTS "resetExpiry";

CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFY', 'PASSWORD_RESET', 'LOGIN_2FA');

CREATE TABLE "Otp" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "OtpPurpose" NOT NULL,
  "codeHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 5,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Otp_userId_purpose_idx" ON "Otp"("userId", "purpose");
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "RefreshToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "replacedById" TEXT,
  "userAgent" TEXT,
  "ip" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_replacedById_key" ON "RefreshToken"("replacedById");
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_replacedById_fkey" FOREIGN KEY ("replacedById") REFERENCES "RefreshToken"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
