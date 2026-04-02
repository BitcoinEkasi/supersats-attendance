-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tsk_id" TEXT NOT NULL,
    "registration_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile_picture" TEXT,
    "surname" TEXT NOT NULL,
    "full_names" TEXT NOT NULL,
    "known_as" TEXT,
    "gender" TEXT NOT NULL,
    "id_number" TEXT NOT NULL,
    "date_of_birth" DATETIME NOT NULL,
    "bolt_card_url" TEXT,
    "card_number" TEXT,
    "card_balance" REAL,
    "is_junior_coach" BOOLEAN NOT NULL DEFAULT false,
    "ethnicity" TEXT,
    "language" TEXT,
    "school" TEXT,
    "grade" TEXT,
    "guardian" TEXT,
    "guardian_id" TEXT,
    "guardian_relationship" TEXT,
    "address" TEXT,
    "contact_1" TEXT,
    "contact_2" TEXT,
    "housing_type" TEXT,
    "id_document_url" TEXT,
    "id_document_uploaded_at" DATETIME,
    "indemnity_form_url" TEXT,
    "indemnity_uploaded_at" DATETIME,
    "tsk_status" TEXT,
    "weight_kg" REAL,
    "height_cm" REAL,
    "tshirt_size" TEXT,
    "shoe_size" TEXT,
    "wetsuit_size" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "participant_change_requests" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT,
    "requested_by" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" DATETIME,
    CONSTRAINT "participant_change_requests_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "performance_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "event_date" DATETIME NOT NULL,
    "event_name" TEXT NOT NULL,
    "location" TEXT,
    "division" TEXT,
    "result" TEXT NOT NULL,
    "verify_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "performance_events_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "certifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "certifications_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "category" TEXT NOT NULL,
    "note" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "participant_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "present" BOOLEAN NOT NULL,
    "on_tour" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "attendance_records_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "monthly_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "month" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,
    "approved_at" DATETIME,
    "approved_by" TEXT
);

-- CreateTable
CREATE TABLE "monthly_report_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "report_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "total_events" INTEGER NOT NULL,
    "attended" INTEGER NOT NULL,
    "percentage" REAL NOT NULL,
    "reward_sats" INTEGER NOT NULL,
    "payout_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "monthly_report_entries_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "monthly_reports" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "monthly_report_entries_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "participants_tsk_id_key" ON "participants"("tsk_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_id_number_key" ON "participants"("id_number");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_participant_id_event_id_key" ON "attendance_records"("participant_id", "event_id");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_reports_month_key" ON "monthly_reports"("month");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_report_entries_report_id_participant_id_key" ON "monthly_report_entries"("report_id", "participant_id");
