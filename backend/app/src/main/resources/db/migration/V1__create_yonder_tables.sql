CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    home_city VARCHAR(120) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE trips (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    name VARCHAR(120) NOT NULL,
    destination VARCHAR(120) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description VARCHAR(1000) NOT NULL DEFAULT '',
    budget_limit DECIMAL(12, 2),
    color VARCHAR(32),
    cover_url VARCHAR(2048),
    tagline VARCHAR(160),
    latitude DOUBLE,
    longitude DOUBLE,
    CONSTRAINT fk_trips_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT ck_trips_date_range CHECK (start_date <= end_date),
    INDEX idx_trips_user_start (user_id, start_date)
);

CREATE TABLE activities (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    category VARCHAR(24),
    title VARCHAR(120) NOT NULL,
    activity_date DATE NOT NULL,
    start_time TIME NOT NULL,
    location VARCHAR(160) NOT NULL DEFAULT '',
    estimated_cost DECIMAL(12, 2) NOT NULL,
    actual_cost DECIMAL(12, 2),
    status VARCHAR(16),
    notes VARCHAR(1000) NOT NULL DEFAULT '',
    image_url VARCHAR(2048),
    latitude DOUBLE,
    longitude DOUBLE,
    CONSTRAINT fk_activities_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT ck_activities_estimated_cost CHECK (estimated_cost >= 0),
    CONSTRAINT ck_activities_actual_cost CHECK (actual_cost IS NULL OR actual_cost >= 0),
    INDEX idx_activities_trip_order (trip_id, activity_date, start_time, id)
);

CREATE TABLE trip_extras (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    label VARCHAR(120) NOT NULL,
    category VARCHAR(24) NOT NULL,
    estimated_cost DECIMAL(12, 2) NOT NULL,
    actual_cost DECIMAL(12, 2),
    CONSTRAINT fk_extras_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT ck_extras_estimated_cost CHECK (estimated_cost >= 0),
    CONSTRAINT ck_extras_actual_cost CHECK (actual_cost IS NULL OR actual_cost >= 0)
);

CREATE TABLE checklist_items (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    item_text VARCHAR(120) NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_checklist_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
);

CREATE TABLE memories (
    id VARCHAR(64) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    activity_id VARCHAR(64),
    kind VARCHAR(8) NOT NULL,
    text VARCHAR(5000) NOT NULL DEFAULT '',
    file_url VARCHAR(2048),
    created_at TIMESTAMP NOT NULL,
    edited_at TIMESTAMP,
    CONSTRAINT fk_memories_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    CONSTRAINT fk_memories_activity FOREIGN KEY (activity_id) REFERENCES activities (id) ON DELETE CASCADE,
    INDEX idx_memories_trip (trip_id)
);
