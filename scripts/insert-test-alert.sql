-- Insert test alert into the database
-- Run with: psql -d <database_name> -f scripts/insert-test-alert.sql

-- First, get your user_id (replace with your actual user email)
-- SELECT id FROM xai4heat_db.users WHERE email = 'your-email@example.com';

-- Insert a test HIGH temperature alert
INSERT INTO xai4heat_db.alerts (
    id,
    alert_type,
    source,
    severity,
    device_id,
    location,
    apartment_name,
    measured_value,
    threshold_value,
    measurement_time,
    unit,
    is_read,
    is_acknowledged,
    user_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TEMP_HIGH',
    'THERMIONIX',
    'HIGH',
    '42',
    'Building A',
    'Apartment 101',
    28.5,
    24.0,
    NOW() - INTERVAL '5 minutes',
    '°C',
    false,
    false,
    '57a35c50-bdc3-4283-a826-dc014e86f189', -- REPLACE THIS with your actual user_id
    NOW(),
    NOW()
);

-- Insert a test LOW temperature alert
INSERT INTO xai4heat_db.alerts (
    id,
    alert_type,
    source,
    severity,
    device_id,
    location,
    apartment_name,
    measured_value,
    threshold_value,
    measurement_time,
    unit,
    is_read,
    is_acknowledged,
    user_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'TEMP_LOW',
    'THERMIONIX',
    'MEDIUM',
    '42',
    'Building A',
    'Apartment 101',
    15.2,
    18.0,
    NOW() - INTERVAL '3 minutes',
    '°C',
    false,
    false,
    '57a35c50-bdc3-4283-a826-dc014e86f189', -- REPLACE THIS with your actual user_id
    NOW(),
    NOW()
);

-- Insert a HIGH CO2 alert
INSERT INTO xai4heat_db.alerts (
    id,
    alert_type,
    source,
    severity,
    device_id,
    location,
    apartment_name,
    measured_value,
    threshold_value,
    measurement_time,
    unit,
    is_read,
    is_acknowledged,
    user_id,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'CO2_HIGH',
    'THERMIONIX',
    'HIGH',
    '42',
    'Building A',
    'Apartment 101',
    1800.0,
    1000.0,
    NOW() - INTERVAL '1 minute',
    'ppm',
    false,
    false,
    '57a35c50-bdc3-4283-a826-dc014e86f189', -- REPLACE THIS with your actual user_id
    NOW(),
    NOW()
);

-- Verify the alerts were inserted
SELECT
    alert_type,
    severity,
    apartment_name,
    measured_value,
    threshold_value,
    unit,
    is_read,
    is_acknowledged,
    created_at
FROM xai4heat_db.alerts
WHERE user_id = '57a35c50-bdc3-4283-a826-dc014e86f189' -- REPLACE THIS with your actual user_id
ORDER BY created_at DESC
LIMIT 5;
