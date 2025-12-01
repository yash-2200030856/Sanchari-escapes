/*
  # Setup Admin Account
  
  This creates an admin user profile in the system.
  Admin credentials:
  - Email: admin@sanchariescapes.com
  - Password: Admin@123456
  
  To create the auth account, sign up with these credentials in the UI.
  Then update their role to 'admin' using the SQL below.
*/

-- This will be done via the signup flow in the UI
-- Once the user signs up with email: admin@sanchariescapes.com
-- Run this to make them an admin:

UPDATE profiles 
SET role = 'admin' 
WHERE email = 'admin@sanchariescapes.com';