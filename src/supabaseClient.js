/**
 * supabaseClient.js
 * Shared Supabase client, loaded from the ESM CDN since this project has
 * no bundler/build step.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
