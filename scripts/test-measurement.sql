-- Insert a test measurement directly into the database
-- This simulates what your IoT devices will do
-- Run with: psql $DATABASE_URL -f scripts/test-measurement.sql

-- Insert a HIGH temperature measurement (will trigger alert)
INSERT INTO xai4heat_db.thermionyx_measurements (
    datetime,
    device_id,
    probe_id,
    temperature,
    relative_humidity,
    co2
) VALUES (
    NOW(),
    42, -- device_id
    1,  -- probe_id
    29.5, -- HIGH temperature (above typical 24°C max)
    50.0,
    800.0
);

-- Insert a LOW temperature measurement (will trigger alert)
INSERT INTO xai4heat_db.thermionyx_measurements (
    datetime,
    device_id,
    probe_id,
    temperature,
    relative_humidity,
    co2
) VALUES (
    NOW() - INTERVAL '1 minute',
    42,
    1,
    15.0, -- LOW temperature (below typical 18°C min)
    50.0,
    800.0
);

-- Insert a HIGH CO2 measurement (will trigger alert)
INSERT INTO xai4heat_db.thermionyx_measurements (
    datetime,
    device_id,
    probe_id,
    temperature,
    relative_humidity,
    co2
) VALUES (
    NOW() - INTERVAL '2 minutes',
    42,
    1,
    22.0,
    50.0,
    1500.0 -- HIGH CO2 (above typical 1000ppm max)
);

-- Verify measurements were inserted
SELECT
    datetime,
    device_id,
    temperature,
    relative_humidity,
    co2
FROM xai4heat_db.thermionyx_measurements
WHERE device_id = 42
ORDER BY datetime DESC
LIMIT 5;
