CREATE TABLE yonder.trip_shares (
    id VARCHAR(36) PRIMARY KEY,
    trip_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT uq_trip_shares_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_trip_shares_trip FOREIGN KEY (trip_id) REFERENCES yonder.trips (id) ON DELETE CASCADE
);

CREATE INDEX idx_trip_shares_trip_active ON yonder.trip_shares (trip_id, revoked_at);
