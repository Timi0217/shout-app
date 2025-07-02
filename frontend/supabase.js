import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://avtchljrvfbnvsbfbqdy.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2dGNobGpydmZibnZzYmZicWR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDgwNjAsImV4cCI6MjA2NjYyNDA2MH0.QEL6M4pr4stziseb0YAaDgePctFTlnwv4vc4K_gn1Og';
 
export const supabase = createClient(supabaseUrl, supabaseAnonKey); 