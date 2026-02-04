-- Function to sync mailroom_location_total_lockers
CREATE OR REPLACE FUNCTION public.fn_sync_mailroom_location_total_lockers()
RETURNS TRIGGER AS $$
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.location_locker_deleted_at IS NULL) THEN
            UPDATE public.mailroom_location_table
            SET mailroom_location_total_lockers = mailroom_location_total_lockers + 1
            WHERE mailroom_location_id = NEW.mailroom_location_id;
        END IF;
    
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Case 1: Location changed
        IF (OLD.mailroom_location_id <> NEW.mailroom_location_id) THEN
            -- Decrement old if it wasn't deleted
            IF (OLD.location_locker_deleted_at IS NULL) THEN
                UPDATE public.mailroom_location_table
                SET mailroom_location_total_lockers = GREATEST(0, mailroom_location_total_lockers - 1)
                WHERE mailroom_location_id = OLD.mailroom_location_id;
            END IF;
            -- Increment new if it isn't deleted
            IF (NEW.location_locker_deleted_at IS NULL) THEN
                UPDATE public.mailroom_location_table
                SET mailroom_location_total_lockers = mailroom_location_total_lockers + 1
                WHERE mailroom_location_id = NEW.mailroom_location_id;
            END IF;
        
        -- Case 2: Soft delete status changed (but location stayed same)
        ELSIF (OLD.location_locker_deleted_at IS NULL AND NEW.location_locker_deleted_at IS NOT NULL) THEN
            UPDATE public.mailroom_location_table
            SET mailroom_location_total_lockers = GREATEST(0, mailroom_location_total_lockers - 1)
            WHERE mailroom_location_id = NEW.mailroom_location_id;
        ELSIF (OLD.location_locker_deleted_at IS NOT NULL AND NEW.location_locker_deleted_at IS NULL) THEN
            UPDATE public.mailroom_location_table
            SET mailroom_location_total_lockers = mailroom_location_total_lockers + 1
            WHERE mailroom_location_id = NEW.mailroom_location_id;
        END IF;

    -- Handle DELETE (hard delete)
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.location_locker_deleted_at IS NULL) THEN
            UPDATE public.mailroom_location_table
            SET mailroom_location_total_lockers = GREATEST(0, mailroom_location_total_lockers - 1)
            WHERE mailroom_location_id = OLD.mailroom_location_id;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Trigger
DROP TRIGGER IF EXISTS trg_sync_mailroom_location_total_lockers ON public.location_locker_table;
CREATE TRIGGER trg_sync_mailroom_location_total_lockers
AFTER INSERT OR UPDATE OR DELETE ON public.location_locker_table
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_mailroom_location_total_lockers();

-- Initial sync (optional but recommended to ensure consistency)
UPDATE public.mailroom_location_table l
SET mailroom_location_total_lockers = (
    SELECT COUNT(*) 
    FROM public.location_locker_table ll 
    WHERE ll.mailroom_location_id = l.mailroom_location_id 
    AND ll.location_locker_deleted_at IS NULL
);
