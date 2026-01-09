-- Create RPC for user to fetch storage files and usage stats
-- Updated to support pagination, filtering, and sorting at database level
-- This improves performance by moving logic from application to database

CREATE OR REPLACE FUNCTION get_user_storage_files(
    input_user_id UUID,
    search_query TEXT DEFAULT NULL,
    sort_by TEXT DEFAULT 'uploaded_at',
    sort_dir TEXT DEFAULT 'desc',
    page_limit INTEGER DEFAULT 10,
    page_offset INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    var_total_limit_mb NUMERIC := 0;
    var_total_used_mb NUMERIC := 0;
    var_scans JSONB := '[]'::JSONB;
    var_total_count INTEGER := 0;
    var_return_data JSONB;
    var_search_pattern TEXT;
    var_sort_direction TEXT;
    validated_limit INTEGER;
    validated_offset INTEGER;
BEGIN
    -- Validate sort_by parameter (use validated value directly)
    IF sort_by NOT IN ('file_name', 'file_size_mb', 'uploaded_at') THEN
        sort_by := 'uploaded_at';
    END IF;
    
    -- Validate sort_dir parameter
    var_sort_direction := CASE 
        WHEN UPPER(sort_dir) = 'ASC' THEN 'ASC'
        ELSE 'DESC'
    END;
    
    -- Build search pattern for ILIKE (case-insensitive search)
    IF search_query IS NOT NULL AND LENGTH(TRIM(search_query)) > 0 THEN
        var_search_pattern := '%' || TRIM(search_query) || '%';
    ELSE
        var_search_pattern := NULL;
    END IF;
    
    -- Validate pagination parameters
    validated_limit := page_limit;
    IF validated_limit < 1 THEN
        validated_limit := 10;
    END IF;
    IF validated_limit > 100 THEN
        validated_limit := 100; -- Max limit to prevent abuse
    END IF;
    
    validated_offset := page_offset;
    IF validated_offset < 0 THEN
        validated_offset := 0;
    END IF;

    -- 1. Calculate total storage limit across all user registrations
    SELECT COALESCE(SUM(mpt.mailroom_plan_storage_limit), 0)
    INTO var_total_limit_mb
    FROM mailroom_registration_table mrt
    JOIN mailroom_plan_table mpt ON mrt.mailroom_plan_id = mpt.mailroom_plan_id
    WHERE mrt.user_id = input_user_id;

    -- 2. Fetch scans with filtering, sorting, and pagination at database level
    WITH user_mailbox_items AS (
        SELECT 
            mit.mailbox_item_id, 
            mit.mailbox_item_name,
            mit.mailroom_registration_id
        FROM mailbox_item_table mit
        JOIN mailroom_registration_table mrt ON mit.mailroom_registration_id = mrt.mailroom_registration_id
        WHERE mrt.user_id = input_user_id
    ),
    filtered_files AS (
        SELECT 
            mft.mailroom_file_id AS id,
            mft.mailroom_file_name AS file_name,
            mft.mailroom_file_url AS file_url,
            mft.mailroom_file_size_mb AS file_size_mb,
            mft.mailroom_file_mime_type AS mime_type,
            mft.mailroom_file_uploaded_at AS uploaded_at,
            mft.mailbox_item_id AS package_id,
            umi.mailbox_item_name AS package_name,
            umi.mailbox_item_id AS package_item_id
        FROM mailroom_file_table mft
        JOIN user_mailbox_items umi ON mft.mailbox_item_id = umi.mailbox_item_id
        WHERE 
            -- Apply search filter if provided (search in file name, package name, or package ID)
            (
                var_search_pattern IS NULL
                OR mft.mailroom_file_name ILIKE var_search_pattern
                OR umi.mailbox_item_name ILIKE var_search_pattern
                OR mft.mailbox_item_id::TEXT ILIKE var_search_pattern
            )
    ),
    sorted_files AS (
        SELECT *
        FROM filtered_files
        ORDER BY 
            CASE WHEN sort_by = 'file_name' AND var_sort_direction = 'ASC' THEN file_name END ASC NULLS LAST,
            CASE WHEN sort_by = 'file_name' AND var_sort_direction = 'DESC' THEN file_name END DESC NULLS LAST,
            CASE WHEN sort_by = 'file_size_mb' AND var_sort_direction = 'ASC' THEN file_size_mb END ASC NULLS LAST,
            CASE WHEN sort_by = 'file_size_mb' AND var_sort_direction = 'DESC' THEN file_size_mb END DESC NULLS LAST,
            CASE WHEN sort_by = 'uploaded_at' AND var_sort_direction = 'ASC' THEN uploaded_at END ASC NULLS LAST,
            CASE WHEN sort_by = 'uploaded_at' AND var_sort_direction = 'DESC' THEN uploaded_at END DESC NULLS LAST,
            -- Fallback: Always sort by uploaded_at DESC as final tiebreaker
            uploaded_at DESC NULLS LAST
    ),
    paginated_files AS (
        SELECT 
            id,
            file_name,
            file_url,
            file_size_mb,
            mime_type,
            uploaded_at,
            package_id,
            JSONB_BUILD_OBJECT(
                'id', package_item_id,
                'package_name', package_name
            ) AS package
        FROM sorted_files
        LIMIT validated_limit
        OFFSET validated_offset
    ),
    total_counts AS (
        SELECT 
            COUNT(*) AS total_count,
            COALESCE(SUM(file_size_mb), 0) AS total_size
        FROM filtered_files
    ),
    combined_data AS (
        SELECT 
            COALESCE(
                JSONB_AGG(
                    JSONB_BUILD_OBJECT(
                        'id', pf.id,
                        'file_name', pf.file_name,
                        'file_url', pf.file_url,
                        'file_size_mb', pf.file_size_mb,
                        'mime_type', pf.mime_type,
                        'uploaded_at', pf.uploaded_at,
                        'package_id', pf.package_id,
                        'package', pf.package
                    )
                ),
                '[]'::JSONB
            ) AS scans_json,
            (SELECT total_count FROM total_counts) AS total_count,
            (SELECT total_size FROM total_counts) AS total_size
        FROM paginated_files pf
        -- Use CROSS JOIN with total_counts to ensure we always get a row
        CROSS JOIN total_counts
    )
    -- Get all data from the combined CTE (will always return at least one row)
    SELECT 
        COALESCE(scans_json, '[]'::JSONB),
        COALESCE(total_count, 0),
        COALESCE(total_size, 0)
    INTO var_scans, var_total_count, var_total_used_mb
    FROM combined_data
    LIMIT 1;

    -- 3. Construct return data with pagination metadata
    var_return_data := JSONB_BUILD_OBJECT(
        'scans', var_scans,
        'pagination', JSONB_BUILD_OBJECT(
            'total', var_total_count,
            'limit', validated_limit,
            'offset', validated_offset,
            'has_more', (validated_offset + validated_limit) < var_total_count
        ),
        'usage', JSONB_BUILD_OBJECT(
            'used_mb', var_total_used_mb,
            'limit_mb', var_total_limit_mb,
            'percentage', CASE 
                WHEN var_total_limit_mb > 0 THEN LEAST((var_total_used_mb / var_total_limit_mb) * 100, 100)
                ELSE 0
            END
        )
    );

    RETURN var_return_data;
END;
$$;

-- Grant permissions (updated for new signature with pagination and filtering)
GRANT EXECUTE ON FUNCTION get_user_storage_files(UUID, TEXT, TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
