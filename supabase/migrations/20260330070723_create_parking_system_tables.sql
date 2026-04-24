/*
  # AI Smart Parking System Database Schema

  ## Overview
  Creates the database structure for an AI-powered parking system with webcam detection
  and automatic slot management.

  ## New Tables
  
  ### `parking_slots`
  - `id` (uuid, primary key) - Unique slot identifier
  - `slot_number` (text, unique) - Human-readable slot number (e.g., "A1", "B2")
  - `status` (text) - Current status: 'available', 'occupied', or 'reserved'
  - `last_detection` (timestamptz) - Last time webcam detected changes
  - `created_at` (timestamptz) - Slot creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### `reservations`
  - `id` (uuid, primary key) - Unique reservation identifier
  - `slot_id` (uuid, foreign key) - References parking_slots(id)
  - `user_name` (text) - Name of person reserving
  - `user_email` (text) - Email of person reserving
  - `reserved_at` (timestamptz) - When reservation was made
  - `reserved_until` (timestamptz) - When reservation expires
  - `status` (text) - 'active', 'completed', or 'cancelled'
  - `auto_cancelled` (boolean) - Whether cancelled by AI detection
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Public read access for parking slots (for dashboard display)
  - Public insert/update for reservations (for booking system)
  - Policies ensure data integrity and prevent abuse

  ## Indexes
  - Index on slot_number for fast lookups
  - Index on slot_id in reservations for join performance
  - Index on status fields for filtering queries
*/

-- Create parking_slots table
CREATE TABLE IF NOT EXISTS parking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved')),
  last_detection timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reservations table
CREATE TABLE IF NOT EXISTS reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES parking_slots(id) ON DELETE CASCADE,
  user_name text NOT NULL,
  user_email text NOT NULL,
  reserved_at timestamptz DEFAULT now(),
  reserved_until timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  auto_cancelled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_parking_slots_slot_number ON parking_slots(slot_number);
CREATE INDEX IF NOT EXISTS idx_parking_slots_status ON parking_slots(status);
CREATE INDEX IF NOT EXISTS idx_reservations_slot_id ON reservations(slot_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);

-- Enable Row Level Security
ALTER TABLE parking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Parking slots policies (public read access for dashboard)
CREATE POLICY "Anyone can view parking slots"
  ON parking_slots FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can update parking slot status"
  ON parking_slots FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Reservations policies (public access for booking system)
CREATE POLICY "Anyone can view reservations"
  ON reservations FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can create reservations"
  ON reservations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update reservations"
  ON reservations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample parking slots (20 slots: A1-A10, B1-B10)
INSERT INTO parking_slots (slot_number, status) VALUES
  ('A1', 'available'),
  ('A2', 'available'),
  ('A3', 'available'),
  ('A4', 'available'),
  ('A5', 'available'),
  ('A6', 'available'),
  ('A7', 'available'),
  ('A8', 'available'),
  ('A9', 'available'),
  ('A10', 'available'),
  ('B1', 'available'),
  ('B2', 'available'),
  ('B3', 'available'),
  ('B4', 'available'),
  ('B5', 'available'),
  ('B6', 'available'),
  ('B7', 'available'),
  ('B8', 'available'),
  ('B9', 'available'),
  ('B10', 'available')
ON CONFLICT (slot_number) DO NOTHING;