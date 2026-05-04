import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://fnfzxdrepagztutsdenl.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_Yt6cmQYiQSnNkygIBdh2KQ_3_aeD65U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
