export interface Transaction {
  id: string;
  user_id: string;
  booking_id: string;
  amount: number;
  payment_method: string;
  status: 'pending' | 'completed' | 'failed' | 'approved' | 'rejected' | 'cancelled' | 'refunded';
  refund_status?: string;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  trip_id: string;
  booking_date: string;
  status: string;
  number_of_people: number;
  total_price: number;
  created_at: string;
}

export interface Trip {
  id: string;
  destination: string;
  description: string;
  price: number;
  duration: string;
  start_date: string;
  end_date: string;
  image_url: string;
  available_seats: number;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'user' | 'admin';
  created_at: string;
}
