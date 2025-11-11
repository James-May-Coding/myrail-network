import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dmjazdpluclinainckit.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export { supabase };
