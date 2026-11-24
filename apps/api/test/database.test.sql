BEGIN;
SET LOCAL TIME ZONE 'UTC';

DO $$
DECLARE
    test_category_id INTEGER;
BEGIN
    SELECT id INTO STRICT test_category_id
    FROM incident_categories
    WHERE code = 'ACCIDENTAL_FALL'
      AND severity_level = 'medium'
      AND confidence_threshold = 0.75
      AND persistence_ms = 2000;

    IF (SELECT COUNT(*) FROM incident_categories) <> 5 THEN
        RAISE EXCEPTION 'Expected five initial incident categories';
    END IF;
    IF EXISTS (SELECT FROM incidents) THEN
        RAISE EXCEPTION 'Run this test against a freshly migrated database';
    END IF;
    IF (SELECT false_alarm_percentage FROM v_false_alarm_percentage) IS DISTINCT FROM 0 THEN
        RAISE EXCEPTION 'An empty database should report zero false alarms';
    END IF;

    INSERT INTO zones (id, name) VALUES (-1, 'Migration test zone');
    BEGIN
        INSERT INTO cameras (id, zone_id, name, source_type, source, fps)
        VALUES (-1, -1, 'Migration test camera', 'webcam', '0', 14);
        RAISE EXCEPTION 'Expected the minimum FPS to be enforced';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
    INSERT INTO cameras (id, zone_id, name, source_type, source)
    VALUES (-1, -1, 'Migration test camera', 'webcam', '0');

    INSERT INTO incidents (id, camera_id, category_id, confidence, occurred_at, review_status)
    VALUES
        (-1, -1, test_category_id, 0.90, '2026-01-01 12:10:00+00', 'confirmed'),
        (-2, -1, test_category_id, 0.90, '2026-01-01 12:20:00+00', 'false_positive'),
        (-3, -1, test_category_id, 0.90, '2026-01-01 12:30:00+00', 'system_test'),
        (-4, -1, test_category_id, 0.90, '2026-01-01 12:40:00+00', 'pending');

    IF (SELECT total_incidents FROM v_incidents_by_hour) IS DISTINCT FROM 3
        OR (SELECT total_incidents FROM v_incidents_by_category
            WHERE category_code = 'ACCIDENTAL_FALL') IS DISTINCT FROM 3 THEN
        RAISE EXCEPTION 'Incident totals should exclude system tests';
    END IF;
    IF NOT EXISTS (
        SELECT FROM v_false_alarm_percentage
        WHERE false_positive_count = 1 AND confirmed_count = 1 AND false_alarm_percentage = 50
    ) THEN
        RAISE EXCEPTION 'False-alarm statistics should count only classified incidents';
    END IF;
END
$$;

ROLLBACK;
