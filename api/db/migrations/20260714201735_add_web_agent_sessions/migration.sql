-- CreateTable
CREATE TABLE "web_agent_sessions" (
    "profile" TEXT NOT NULL,
    "storage_state" JSONB NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_agent_sessions_pkey" PRIMARY KEY ("profile")
);
