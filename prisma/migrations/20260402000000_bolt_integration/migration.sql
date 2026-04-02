-- Recreate participants table: drop bolt_card_url, card_number, card_balance; add bolt_user_id
CREATE TABLE "new_participants" (
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
    "bolt_user_id" TEXT,
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

INSERT INTO "new_participants" (
    "id", "tsk_id", "registration_date", "profile_picture",
    "surname", "full_names", "known_as", "gender", "id_number", "date_of_birth",
    "bolt_user_id",
    "is_junior_coach", "ethnicity", "language", "school", "grade",
    "guardian", "guardian_id", "guardian_relationship",
    "address", "contact_1", "contact_2", "housing_type",
    "id_document_url", "id_document_uploaded_at",
    "indemnity_form_url", "indemnity_uploaded_at",
    "tsk_status", "weight_kg", "height_cm", "tshirt_size", "shoe_size", "wetsuit_size",
    "notes", "status", "created_at", "updated_at"
)
SELECT
    "id", "tsk_id", "registration_date", "profile_picture",
    "surname", "full_names", "known_as", "gender", "id_number", "date_of_birth",
    NULL,
    "is_junior_coach", "ethnicity", "language", "school", "grade",
    "guardian", "guardian_id", "guardian_relationship",
    "address", "contact_1", "contact_2", "housing_type",
    "id_document_url", "id_document_uploaded_at",
    "indemnity_form_url", "indemnity_uploaded_at",
    "tsk_status", "weight_kg", "height_cm", "tshirt_size", "shoe_size", "wetsuit_size",
    "notes", "status", "created_at", "updated_at"
FROM "participants";

DROP TABLE "participants";
ALTER TABLE "new_participants" RENAME TO "participants";

CREATE UNIQUE INDEX "participants_tsk_id_key" ON "participants"("tsk_id");
CREATE UNIQUE INDEX "participants_id_number_key" ON "participants"("id_number");
