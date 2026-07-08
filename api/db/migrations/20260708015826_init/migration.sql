-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateTable
CREATE TABLE "ai_summaries" (
    "id" SERIAL NOT NULL,
    "summary" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" BIGSERIAL NOT NULL,
    "request_body" JSONB,
    "response_body" JSONB,
    "response_time_ms" INTEGER,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "path" TEXT,
    "status_code" INTEGER,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_logs" (
    "id" SERIAL NOT NULL,
    "log_level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "details" JSONB,
    "source" TEXT,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_evals" (
    "id" SERIAL NOT NULL,
    "session_key" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "response_time_ms" INTEGER NOT NULL,
    "quality" BOOLEAN,
    "correctness" BOOLEAN,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_evals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" SERIAL NOT NULL,
    "session_key" TEXT NOT NULL,
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "summary" TEXT,
    "person_name" TEXT,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" SERIAL NOT NULL,
    "session_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_logs" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "log_level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_presence" (
    "device_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "last_boot" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_presence_pkey" PRIMARY KEY ("device_id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devices" (
    "id" SERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "friendly_name" TEXT,
    "hardware_version" TEXT,
    "software_version" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "room_id" INTEGER,
    "device_type" TEXT NOT NULL DEFAULT 'unknown',
    "has_ota" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "environment_readings" (
    "id" BIGSERIAL NOT NULL,
    "device_id" TEXT NOT NULL,
    "readings" JSONB NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "room_id" INTEGER,

    CONSTRAINT "environment_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hardware_releases" (
    "id" SERIAL NOT NULL,
    "version_string" VARCHAR(50) NOT NULL,
    "release_date" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "firmware_binary_path" TEXT,
    "hardware_model" VARCHAR(100) DEFAULT 'Adafruit Metro ESP32-S3',
    "notes" TEXT,
    "uploaded_by" VARCHAR(100),

    CONSTRAINT "hardware_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "home_knowledge" (
    "id" SERIAL NOT NULL,
    "subject" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fact" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "embedding" vector(768),

    CONSTRAINT "home_knowledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photo_reactions" (
    "id" SERIAL NOT NULL,
    "photo_filename" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tank_readings" (
    "id" SERIAL NOT NULL,
    "device_id" VARCHAR(50),
    "gallons" DECIMAL(5,2),
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "raw_value" INTEGER,
    "pct_full" INTEGER,

    CONSTRAINT "tank_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "watering_events" (
    "id" SERIAL NOT NULL,
    "device_id" VARCHAR(50) NOT NULL,
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "duration_ms" INTEGER NOT NULL,
    "gallons_used" DECIMAL(5,2),
    "status" VARCHAR(20) DEFAULT 'success',
    "started_by" VARCHAR(50),
    "action" VARCHAR(20),

    CONSTRAINT "watering_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_api_logs_timestamp" ON "api_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_app_logs_timestamp" ON "app_logs"("timestamp" DESC);

-- CreateIndex
CREATE INDEX "idx_chat_evals_timestamp" ON "chat_evals"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "chat_sessions_session_key_key" ON "chat_sessions"("session_key");

-- CreateIndex
CREATE INDEX "idx_device_logs_timestamp" ON "device_logs"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "rooms_name_key" ON "rooms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_id_key" ON "devices"("device_id");

-- CreateIndex
CREATE INDEX "idx_devices_status" ON "devices"("status");

-- CreateIndex
CREATE INDEX "environment_readings_readings_gin" ON "environment_readings" USING GIN ("readings");

-- CreateIndex
CREATE INDEX "environment_readings_recorded_at_idx" ON "environment_readings"("timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "photo_reactions_photo_filename_user_email_key" ON "photo_reactions"("photo_filename", "user_email");

-- CreateIndex (not expressible in schema.prisma: HNSW access method + partial index)
CREATE INDEX "idx_home_knowledge_embedding" ON "home_knowledge" USING hnsw ("embedding" vector_cosine_ops) WHERE ("embedding" IS NOT NULL);

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "environment_readings" ADD CONSTRAINT "environment_readings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
