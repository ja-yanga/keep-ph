DO $$
DECLARE
    var_email TEXT;
    var_user_id UUID;
BEGIN
    FOR var_email IN
        SELECT format('admin%s@example.com', gs)
        FROM generate_series(0,5) gs   -- admin@example.com, admin1..admin5
    LOOP

        -- Check if user exists
        SELECT id INTO var_user_id
        FROM auth.users
        WHERE email = var_email;

        -- Create auth.users if not exists
        IF var_user_id IS NULL THEN
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                gen_random_uuid(),
                'authenticated',
                'authenticated',
                var_email,
                crypt('admin123', gen_salt('bf')),
                current_timestamp,
                current_timestamp,
                current_timestamp,
                '{"provider":"email","providers":["email"]}',
                '{"role":"admin"}',
                current_timestamp,
                current_timestamp,
                '',
                '',
                '',
                ''
            )
            RETURNING id INTO var_user_id;
        END IF;

        -- Ensure identity exists
        IF NOT EXISTS (
            SELECT 1 FROM auth.identities WHERE user_id = var_user_id
        ) THEN
            INSERT INTO auth.identities (
                id,
                user_id,
                provider_id,
                identity_data,
                provider,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                var_user_id,
                var_user_id,
                format('{"sub":"%s","email":"%s"}', var_user_id::text, var_email)::jsonb,
                'email',
                current_timestamp,
                current_timestamp,
                current_timestamp
            );
        END IF;

        -- Update role if trigger already created user row
        UPDATE public.users_table
        SET users_role = 'admin',
            users_is_verified = true
        WHERE users_id = var_user_id;

        -- Insert users_table row if missing
        IF NOT EXISTS (
            SELECT 1 FROM public.users_table WHERE users_id = var_user_id
        ) THEN
            INSERT INTO public.users_table (
                users_id,
                users_email,
                users_role,
                users_is_verified,
                users_referral_code
            ) VALUES (
                var_user_id,
                var_email,
                'admin',
                true,
                'ADMIN' || upper(substring(md5(random()::text) FROM 1 FOR 6))
            );
        END IF;

    END LOOP;
END $$;
