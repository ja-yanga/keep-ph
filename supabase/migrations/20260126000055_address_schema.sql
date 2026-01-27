
DROP SCHEMA IF EXISTS address_schema CASCADE;
CREATE SCHEMA address_schema AUTHORIZATION postgres;

CREATE TABLE address_schema.region_table (
    region_id UUID DEFAULT uuid_generate_v4() UNIQUE PRIMARY KEY NOT NULL,
    region VARCHAR(4000) NOT NULL,
    region_is_disabled BOOLEAN DEFAULT false NOT NULL,
    region_is_available BOOLEAN DEFAULT true NOT NULL
);

CREATE TABLE address_schema.province_table (
    province_id UUID DEFAULT uuid_generate_v4() UNIQUE PRIMARY KEY NOT NULL,
    province VARCHAR(4000) NOT NULL,
    province_is_disabled BOOLEAN DEFAULT false NOT NULL,
    province_is_available BOOLEAN DEFAULT true NOT NULL,

    province_region_id UUID REFERENCES address_schema.region_table (region_id) NOT NULL
);

CREATE TABLE address_schema.city_table (
    city_id UUID DEFAULT uuid_generate_v4() UNIQUE PRIMARY KEY NOT NULL,
    city VARCHAR(4000) NOT NULL,
    city_is_disabled BOOLEAN DEFAULT false NOT NULL,
    city_is_available BOOLEAN DEFAULT true NOT NULL,

    city_province_id UUID REFERENCES address_schema.province_table (province_id) NOT NULL
);

CREATE TABLE address_schema.barangay_table (
    barangay_id UUID DEFAULT uuid_generate_v4() UNIQUE PRIMARY KEY NOT NULL,
    barangay VARCHAR(4000) NOT NULL,
    barangay_zip_code VARCHAR(4000) NOT NULL,
    barangay_is_disabled BOOLEAN DEFAULT false NOT NULL,
    barangay_is_available BOOLEAN DEFAULT true NOT NULL,

    barangay_city_id UUID REFERENCES address_schema.city_table (city_id) NOT NULL
);

GRANT ALL ON ALL TABLES IN SCHEMA address_schema TO public;
GRANT ALL ON ALL TABLES IN SCHEMA address_schema TO postgres;
GRANT ALL ON SCHEMA address_schema TO postgres;
GRANT ALL ON SCHEMA address_schema TO public;

CREATE INDEX province_region_id_fkey
ON address_schema.province_table (province_region_id);

CREATE INDEX city_province_id_fkey
ON address_schema.city_table (city_province_id);

CREATE INDEX barangay_city_id_fkey
ON address_schema.barangay_table (barangay_city_id);

--- address_schema.region_table
ALTER TABLE address_schema.region_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow READ for anon users" ON address_schema.region_table;
CREATE POLICY "Allow READ for anon users" ON address_schema.region_table
AS PERMISSIVE FOR SELECT
USING (true);

--- address_schema.province_table
ALTER TABLE address_schema.province_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow READ for anon users" ON address_schema.province_table;
CREATE POLICY "Allow READ for anon users" ON address_schema.province_table
AS PERMISSIVE FOR SELECT
USING (true);

--- address_schema.city_table
ALTER TABLE address_schema.city_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow READ for anon users" ON address_schema.city_table;
CREATE POLICY "Allow READ for anon users" ON address_schema.city_table
AS PERMISSIVE FOR SELECT
USING (true);

--- address_schema.barangay_table
ALTER TABLE address_schema.barangay_table ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow READ for anon users" ON address_schema.barangay_table;
CREATE POLICY "Allow READ for anon users" ON address_schema.barangay_table
AS PERMISSIVE FOR SELECT
USING (true);