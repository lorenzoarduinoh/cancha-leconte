-- Migration: Add username column to admin_users
-- Created: 2025-08-17
-- Description: Add username column and update existing structure

-- Add username column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'admin_users' AND column_name = 'username') THEN
        ALTER TABLE admin_users ADD COLUMN username VARCHAR(50) UNIQUE;
        
        -- Add index for username
        CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
        
        -- Make email nullable
        ALTER TABLE admin_users ALTER COLUMN email DROP NOT NULL;
        
        RAISE NOTICE 'Username column added successfully';
    ELSE
        RAISE NOTICE 'Username column already exists';
    END IF;
END $$;

-- Clean existing data if needed (optional)
-- DELETE FROM admin_users WHERE username IS NULL;