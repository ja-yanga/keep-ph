-- Seeding script for address_schema
-- Includes major regions, provinces, cities, and barangays in the Philippines.

BEGIN;

-- 1. Seed Regions
INSERT INTO address_schema.region_table (region) VALUES
('NCR'),
('Region_IV-A'),
('Region_III')
ON CONFLICT DO NOTHING;

-- 2. Seed Provinces
DO $$
DECLARE
    ncr_id UUID;
    r4a_id UUID;
    r3_id UUID;
BEGIN
    SELECT region_id INTO ncr_id FROM address_schema.region_table WHERE region = 'NCR';
    SELECT region_id INTO r4a_id FROM address_schema.region_table WHERE region = 'Region_IV-A';
    SELECT region_id INTO r3_id FROM address_schema.region_table WHERE region = 'Region_III';

    -- NCR Provinces (usually just Metro Manila)
    INSERT INTO address_schema.province_table (province, province_region_id) VALUES
    ('Metro_Manila', ncr_id)
    ON CONFLICT DO NOTHING;

    -- Region IV-A Provinces
    INSERT INTO address_schema.province_table (province, province_region_id) VALUES
    ('Cavit', r4a_id),
    ('Laguna', r4a_id),
    ('Rizal', r4a_id)
    ON CONFLICT DO NOTHING;

    -- Region III Provinces
    INSERT INTO address_schema.province_table (province, province_region_id) VALUES
    ('Bulacan', r3_id),
    ('Pampanga', r3_id)
    ON CONFLICT DO NOTHING;
END $$;

-- 3. Seed Cities
DO $$
DECLARE
    mm_id UUID;
    cav_id UUID;
    lag_id UUID;
    riz_id UUID;
    bul_id UUID;
    pam_id UUID;
BEGIN
    SELECT province_id INTO mm_id FROM address_schema.province_table WHERE province = 'Metro_Manila';
    SELECT province_id INTO cav_id FROM address_schema.province_table WHERE province = 'Cavit';
    SELECT province_id INTO lag_id FROM address_schema.province_table WHERE province = 'Laguna';
    SELECT province_id INTO riz_id FROM address_schema.province_table WHERE province = 'Rizal';
    SELECT province_id INTO bul_id FROM address_schema.province_table WHERE province = 'Bulacan';
    SELECT province_id INTO pam_id FROM address_schema.province_table WHERE province = 'Pampanga';

    -- Metro Manila Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('Makati', mm_id),
    ('Quezon_City', mm_id),
    ('Manila', mm_id),
    ('Taguig', mm_id),
    ('Pasig', mm_id)
    ON CONFLICT DO NOTHING;

    -- Cavite Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('Bacoor', cav_id),
    ('Imus', cav_id),
    ('Dasmarinas', cav_id)
    ON CONFLICT DO NOTHING;

    -- Laguna Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('Santa_Rosa', lag_id),
    ('Calamba', lag_id),
    ('Binan', lag_id)
    ON CONFLICT DO NOTHING;

    -- Rizal Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('Antipolo', riz_id),
    ('Taytay', riz_id)
    ON CONFLICT DO NOTHING;

    -- Bulacan Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('Malolos', bul_id),
    ('Meycauayan', bul_id)
    ON CONFLICT DO NOTHING;

    -- Pampanga Cities
    INSERT INTO address_schema.city_table (city, city_province_id) VALUES
    ('San_Fernando', pam_id),
    ('Angeles', pam_id)
    ON CONFLICT DO NOTHING;
END $$;

-- 4. Seed Barangays (Sample)
DO $$
DECLARE
    makati_id UUID;
    qc_id UUID;
    manila_id UUID;
    antipolo_id UUID;
BEGIN
    SELECT city_id INTO makati_id FROM address_schema.city_table WHERE city = 'Makati';
    SELECT city_id INTO qc_id FROM address_schema.city_table WHERE city = 'Quezon_City';
    SELECT city_id INTO manila_id FROM address_schema.city_table WHERE city = 'Manila';
    SELECT city_id INTO antipolo_id FROM address_schema.city_table WHERE city = 'Antipolo';

    -- Makati Barangays
    INSERT INTO address_schema.barangay_table (barangay, barangay_zip_code, barangay_city_id) VALUES
    ('Bel-Air', '1209', makati_id),
    ('Poblacion', '1210', makati_id),
    ('San_Lorenzo', '1223', makati_id)
    ON CONFLICT DO NOTHING;

    -- QC Barangays
    INSERT INTO address_schema.barangay_table (barangay, barangay_zip_code, barangay_city_id) VALUES
    ('Diliman', '1101', qc_id),
    ('Loyola_Heights', '1108', qc_id),
    ('Socorro', '1109', qc_id)
    ON CONFLICT DO NOTHING;

    -- Manila Barangays
    INSERT INTO address_schema.barangay_table (barangay, barangay_zip_code, barangay_city_id) VALUES
    ('Ermita', '1000', manila_id),
    ('Malate', '1004', manila_id),
    ('Binondo', '1006', manila_id)
    ON CONFLICT DO NOTHING;

    -- Antipolo Barangays
    INSERT INTO address_schema.barangay_table (barangay, barangay_zip_code, barangay_city_id) VALUES
    ('San_Roque', '1870', antipolo_id),
    ('Dela_Paz', '1870', antipolo_id)
    ON CONFLICT DO NOTHING;
END $$;

COMMIT;
