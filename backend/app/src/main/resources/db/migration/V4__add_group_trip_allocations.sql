ALTER TABLE yonder.trips ADD COLUMN group_trip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE yonder.trips ADD COLUMN travelers_json TEXT;
ALTER TABLE yonder.trips ADD COLUMN category_share_modes_json TEXT;

ALTER TABLE yonder.activities ADD COLUMN share_mode VARCHAR(8);
ALTER TABLE yonder.activities ADD COLUMN shared_traveler_ids_json TEXT;
ALTER TABLE yonder.activities ADD COLUMN personal_amounts_json TEXT;
