CREATE UNIQUE INDEX IF NOT EXISTS "RefreshToken_tokenHash_key"
  ON "RefreshToken"("tokenHash");

CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_tokenHash_key"
  ON "PasswordResetToken"("tokenHash");
