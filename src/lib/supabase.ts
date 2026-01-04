import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  full_name: string;
  email: string;
  role?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
};

export type Destination = {
  id: string;
  name: string;
  country: string;
  description: string;
  image_url: string;
  price_per_person: number;
  created_at: string;
};

export type Trip = {
  id: string;
  user_id: string;
  destination_id: string;
  start_date: string;
  end_date: string;
  travelers_count: number;
  total_amount: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  destinations?: Destination;
};

export type Booking = {
  id: string;
  user_id: string;
  trip_id: string; // references a destination id
  start_date: string;
  end_date: string;
  travelers_count: number;
  total_amount: number;
  status: 'upcoming' | 'completed' | 'cancelled';
  booking_date?: string;
  created_at: string;
  updated_at: string;
  destinations?: Destination;
  transactions?: Transaction[];
};

export type Transaction = {
  id: string;
  user_id: string;
  booking_id?: string;
  amount: number;
  transaction_date: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed';
  refund_status?: 'none' | 'pending' | 'processed' | 'failed';
  created_at: string;
  bookings?: Booking;
};
