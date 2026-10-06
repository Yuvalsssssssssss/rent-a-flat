export type Category = {
  id: string;
  name: string;
  weight: number;
  position: number;
};

export type Apartment = {
  id: string;
  name: string;
  address: string | null;
  rent_eur: number | null;
  size_m2: number | null;
  rooms: number | null;
  floor: string | null;
  listing_url: string | null;
  visited_on: string | null;
  video_urls: string[];
  notes: string | null;
  pros: string | null;
  cons: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
};

export type ApartmentInput = Omit<Apartment, 'id' | 'created_at' | 'lat' | 'lng'>;

export type Place = {
  id: string;
  name: string;
  emoji: string;
  lat: number;
  lng: number;
};

export type Score = {
  apartment_id: string;
  category_id: string;
  user_id: string;
  score: number;
};

export type Member = {
  user_id: string | null;
  email: string;
  display_name: string;
};
