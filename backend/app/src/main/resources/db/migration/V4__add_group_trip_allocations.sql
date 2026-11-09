ALTER TABLE trips ADD COLUMN group_trip BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE trips ADD COLUMN travelers_json TEXT;
ALTER TABLE trips ADD COLUMN category_share_modes_json TEXT;

ALTER TABLE activities ADD COLUMN share_mode VARCHAR(8);
ALTER TABLE activities ADD COLUMN shared_traveler_ids_json TEXT;
ALTER TABLE activities ADD COLUMN personal_amounts_json TEXT;
