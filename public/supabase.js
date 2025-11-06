// Frontend Supabase client
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://dmjazdpluclinainckit.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtamF6ZHBsdWNsaW5haW5ja2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyOTYyNDEsImV4cCI6MjA3Nzg3MjI0MX0.BtKwm3wds62gOrabC5lY4561zawTdT_f-o9_frO2TRk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
