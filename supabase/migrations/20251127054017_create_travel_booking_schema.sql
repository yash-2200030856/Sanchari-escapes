/*
  # Travel Booking Database Schema

  ## New Tables
  
  ### 1. profiles
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `email` (text)
  - `phone` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. destinations
  - `id` (uuid, primary key)
  - `name` (text)
  - `country` (text)
  - `description` (text)
  - `image_url` (text)
  - `price_per_person` (numeric)
  - `created_at` (timestamptz)

  ### 3. trips
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `destination_id` (uuid, references destinations)
  - `start_date` (date)
  - `end_date` (date)
  - `travelers_count` (integer)
  - `total_amount` (numeric)
  - `status` (text: 'upcoming', 'completed', 'cancelled')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. transactions
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `trip_id` (uuid, references trips)
  - `amount` (numeric)
  - `transaction_date` (timestamptz)
  - `payment_method` (text)
  - `status` (text: 'completed', 'pending', 'failed')
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Destinations table is publicly readable
  - Users can read/write their own profiles, trips, and transactions
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create destinations table
CREATE TABLE IF NOT EXISTS destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text NOT NULL,
  description text,
  image_url text,
  price_per_person numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view destinations"
  ON destinations FOR SELECT
  TO authenticated
  USING (true);

-- Create trips table
CREATE TABLE IF NOT EXISTS trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  destination_id uuid NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date NOT NULL,
  travelers_count integer NOT NULL DEFAULT 1,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'upcoming',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trips"
  ON trips FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips"
  ON trips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips"
  ON trips FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips"
  ON trips FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trip_id uuid REFERENCES trips(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  transaction_date timestamptz DEFAULT now(),
  payment_method text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Insert sample destinations
INSERT INTO destinations (name, country, description, image_url, price_per_person) VALUES
  ('Paris', 'France', 'The City of Light awaits with its iconic Eiffel Tower, world-class museums, and charming cafes.', 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg', 1200),
  ('Tokyo', 'Japan', 'Experience the perfect blend of ancient tradition and cutting-edge technology in Japan''s vibrant capital.', 'https://images.pexels.com/photos/2506923/pexels-photo-2506923.jpeg', 1500),
  ('Bali', 'Indonesia', 'Discover tropical paradise with stunning beaches, lush rice terraces, and spiritual temples.', 'https://images.pexels.com/photos/2166559/pexels-photo-2166559.jpeg', 800),
  ('New York', 'USA', 'The city that never sleeps offers endless entertainment, culture, and iconic landmarks.', 'https://images.pexels.com/photos/466685/pexels-photo-466685.jpeg', 1400),
  ('Santorini', 'Greece', 'White-washed buildings and blue-domed churches overlooking the stunning Aegean Sea.', 'https://images.pexels.com/photos/161815/santorini-oia-greece-travel-161815.jpeg', 1100),
  ('Dubai', 'UAE', 'Ultra-modern architecture, luxury shopping, and desert adventures in the Middle East.', 'https://images.pexels.com/photos/1470502/pexels-photo-1470502.jpeg', 1300)
ON CONFLICT DO NOTHING;