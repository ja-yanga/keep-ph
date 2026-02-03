DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'activity_entity_type'
      AND e.enumlabel = 'ADMIN_IP_WHITELIST'
  ) THEN
    ALTER TYPE activity_entity_type ADD VALUE 'ADMIN_IP_WHITELIST';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_ip_whitelist_table (
  admin_ip_whitelist_id UUID NOT NULL DEFAULT gen_random_uuid(),
  ip_cidr CIDR NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users_table(users_id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE,
  updated_by UUID REFERENCES users_table(users_id) ON DELETE SET NULL,
  CONSTRAINT admin_ip_whitelist_table_pkey PRIMARY KEY (admin_ip_whitelist_id),
  CONSTRAINT admin_ip_whitelist_table_ip_cidr_key UNIQUE (ip_cidr)
);

CREATE INDEX IF NOT EXISTS idx_admin_ip_whitelist_created_at
  ON admin_ip_whitelist_table (created_at);
