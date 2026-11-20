-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Testament" AS ENUM ('OT', 'NT');

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "licenseUrl" TEXT,
    "provenanceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3),
    "checksum" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleBook" (
    "id" INTEGER NOT NULL,
    "osis" TEXT NOT NULL,
    "testament" "Testament" NOT NULL,
    "group" TEXT NOT NULL,
    "deuterocanonical" BOOLEAN NOT NULL DEFAULT false,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameLa" TEXT NOT NULL,
    "abbrEs" TEXT NOT NULL,

    CONSTRAINT "BibleBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleVersion" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "edition" TEXT,
    "versification" TEXT NOT NULL DEFAULT 'vulgate',
    "tsConfig" TEXT NOT NULL DEFAULT 'simple',
    "completeness" TEXT NOT NULL DEFAULT 'complete',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sourceId" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BibleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleChapter" (
    "id" SERIAL NOT NULL,
    "versionId" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verseCount" INTEGER NOT NULL,

    CONSTRAINT "BibleChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleVerse" (
    "id" SERIAL NOT NULL,
    "versionId" TEXT NOT NULL,
    "bookId" INTEGER NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "ts_config" TEXT NOT NULL,
    "tsv" tsvector,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerseMapping" (
    "id" SERIAL NOT NULL,
    "fromScheme" TEXT NOT NULL,
    "toScheme" TEXT NOT NULL,
    "fromKey" TEXT NOT NULL,
    "toKey" TEXT NOT NULL,
    "sourceNote" TEXT,

    CONSTRAINT "VerseMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userAgent" TEXT,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "fontScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lineHeight" DOUBLE PRECISION NOT NULL DEFAULT 1.7,
    "margin" TEXT NOT NULL DEFAULT 'normal',
    "readingMode" TEXT NOT NULL DEFAULT 'chapter',
    "defaultVersion" TEXT,
    "parallelVersions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionId" TEXT,
    "bookOsis" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "versionCode" TEXT NOT NULL,
    "bookOsis" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReadingPosition" (
    "userId" TEXT NOT NULL,
    "versionCode" TEXT NOT NULL,
    "bookOsis" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReadingPosition_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_key_key" ON "Source"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BibleBook_osis_key" ON "BibleBook"("osis");

-- CreateIndex
CREATE UNIQUE INDEX "BibleVersion_code_key" ON "BibleVersion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BibleChapter_versionId_bookId_chapter_key" ON "BibleChapter"("versionId", "bookId", "chapter");

-- CreateIndex
CREATE INDEX "BibleVerse_bookId_chapter_verse_idx" ON "BibleVerse"("bookId", "chapter", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "BibleVerse_versionId_bookId_chapter_verse_key" ON "BibleVerse"("versionId", "bookId", "chapter", "verse");

-- CreateIndex
CREATE UNIQUE INDEX "VerseMapping_fromScheme_toScheme_fromKey_key" ON "VerseMapping"("fromScheme", "toScheme", "fromKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_idx" ON "RefreshToken"("familyId");

-- CreateIndex
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_bookOsis_chapter_verse_key" ON "Bookmark"("userId", "bookOsis", "chapter", "verse");

-- CreateIndex
CREATE INDEX "ReadingHistory_userId_readAt_idx" ON "ReadingHistory"("userId", "readAt" DESC);

-- AddForeignKey
ALTER TABLE "BibleVersion" ADD CONSTRAINT "BibleVersion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleChapter" ADD CONSTRAINT "BibleChapter_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BibleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleChapter" ADD CONSTRAINT "BibleChapter_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleVerse" ADD CONSTRAINT "BibleVerse_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BibleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleVerse" ADD CONSTRAINT "BibleVerse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "BibleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingHistory" ADD CONSTRAINT "ReadingHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReadingPosition" ADD CONSTRAINT "ReadingPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Búsqueda de texto completo ─────────────────────────────────────────────
-- tsv se mantiene por trigger (una columna generada no admite ts_config::regconfig,
-- porque el cast no es IMMUTABLE).
CREATE FUNCTION bible_verse_tsv_update() RETURNS trigger AS $$
BEGIN
  NEW.tsv := to_tsvector(NEW.ts_config::regconfig, NEW.text);
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER bible_verse_tsv_trg
  BEFORE INSERT OR UPDATE OF text, ts_config ON "BibleVerse"
  FOR EACH ROW EXECUTE FUNCTION bible_verse_tsv_update();

CREATE INDEX "BibleVerse_tsv_idx" ON "BibleVerse" USING GIN (tsv);
-- Búsqueda aproximada / por subcadena
CREATE INDEX "BibleVerse_text_trgm_idx" ON "BibleVerse" USING GIN (lower(text) gin_trgm_ops);
