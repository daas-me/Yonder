CREATE TABLE trip_shares (
    id VARCHAR(36) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    CONSTRAINT uq_trip_shares_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_trip_shares_trip FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
    INDEX idx_trip_shares_trip_active (trip_id, revoked_at)
);
