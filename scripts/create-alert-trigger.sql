-- Create PostgreSQL trigger to automatically create alerts when measurements are inserted
-- This handles the case where IoT devices insert directly into the database

-- Function to check temperature thresholds and create alerts
CREATE OR REPLACE FUNCTION xai4heat_db.check_thermionix_thresholds()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_device_name TEXT;
    v_temp_min FLOAT;
    v_temp_max FLOAT;
    v_humidity_min FLOAT;
    v_humidity_max FLOAT;
    v_co2_min FLOAT;
    v_co2_max FLOAT;
    v_severity TEXT;
    v_deviation FLOAT;
BEGIN
    -- Get all users and their settings (in a real system, you'd associate devices with users)
    FOR v_user_id, v_temp_min, v_temp_max, v_humidity_min, v_humidity_max, v_co2_min, v_co2_max IN
        SELECT user_id, expected_temp_min, expected_temp_max,
               expected_pressure_min, expected_pressure_max,
               expected_co2_min, expected_co2_max
        FROM xai4heat_db.user_settings
    LOOP
        -- Get device name (if exists)
        SELECT name INTO v_device_name
        FROM xai4heat_db.devices
        WHERE device_id = NEW.device_id::TEXT
        LIMIT 1;

        -- Check TEMPERATURE HIGH
        IF NEW.temperature IS NOT NULL AND NEW.temperature > v_temp_max THEN
            v_deviation := ABS((NEW.temperature - v_temp_max) / v_temp_max * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            -- Check if alert already exists in last 30 minutes
            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'TEMP_HIGH'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'TEMP_HIGH', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.temperature, v_temp_max, NEW.datetime, '°C',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

        -- Check TEMPERATURE LOW
        IF NEW.temperature IS NOT NULL AND NEW.temperature < v_temp_min THEN
            v_deviation := ABS((v_temp_min - NEW.temperature) / v_temp_min * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'TEMP_LOW'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'TEMP_LOW', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.temperature, v_temp_min, NEW.datetime, '°C',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

        -- Check HUMIDITY HIGH
        IF NEW.relative_humidity IS NOT NULL AND NEW.relative_humidity > v_humidity_max THEN
            v_deviation := ABS((NEW.relative_humidity - v_humidity_max) / v_humidity_max * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'HUMIDITY_HIGH'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'HUMIDITY_HIGH', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.relative_humidity, v_humidity_max, NEW.datetime, '%',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

        -- Check HUMIDITY LOW
        IF NEW.relative_humidity IS NOT NULL AND NEW.relative_humidity < v_humidity_min THEN
            v_deviation := ABS((v_humidity_min - NEW.relative_humidity) / v_humidity_min * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'HUMIDITY_LOW'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'HUMIDITY_LOW', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.relative_humidity, v_humidity_min, NEW.datetime, '%',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

        -- Check CO2 HIGH
        IF NEW.co2 IS NOT NULL AND NEW.co2 > v_co2_max THEN
            v_deviation := ABS((NEW.co2 - v_co2_max) / v_co2_max * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'CO2_HIGH'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'CO2_HIGH', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.co2, v_co2_max, NEW.datetime, 'ppm',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

        -- Check CO2 LOW
        IF NEW.co2 IS NOT NULL AND NEW.co2 < v_co2_min THEN
            v_deviation := ABS((v_co2_min - NEW.co2) / v_co2_min * 100);
            v_severity := CASE
                WHEN v_deviation > 20 THEN 'HIGH'
                WHEN v_deviation > 10 THEN 'MEDIUM'
                ELSE 'LOW'
            END;

            IF NOT EXISTS (
                SELECT 1 FROM xai4heat_db.alerts
                WHERE alert_type = 'CO2_LOW'
                  AND source = 'THERMIONIX'
                  AND device_id = NEW.device_id::TEXT
                  AND user_id = v_user_id
                  AND created_at > NOW() - INTERVAL '30 minutes'
                  AND resolved_at IS NULL
            ) THEN
                INSERT INTO xai4heat_db.alerts (
                    id, alert_type, source, severity, device_id, apartment_name,
                    measured_value, threshold_value, measurement_time, unit,
                    is_read, is_acknowledged, user_id, created_at, updated_at
                ) VALUES (
                    gen_random_uuid(), 'CO2_LOW', 'THERMIONIX', v_severity::xai4heat_db.alert_severity,
                    NEW.device_id::TEXT, v_device_name,
                    NEW.co2, v_co2_min, NEW.datetime, 'ppm',
                    false, false, v_user_id, NOW(), NOW()
                );
            END IF;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS thermionix_alert_trigger ON xai4heat_db.thermionyx_measurements;

CREATE TRIGGER thermionix_alert_trigger
    AFTER INSERT ON xai4heat_db.thermionyx_measurements
    FOR EACH ROW
    EXECUTE FUNCTION xai4heat_db.check_thermionix_thresholds();

-- Test it!
-- Now insert a test measurement and it should automatically create an alert:
-- INSERT INTO xai4heat_db.thermionyx_measurements (datetime, device_id, probe_id, temperature, relative_humidity, co2)
-- VALUES (NOW(), 42, 1, 29.5, 50.0, 800.0);
