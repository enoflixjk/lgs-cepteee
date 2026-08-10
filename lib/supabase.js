import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Bu iki değer gizli değildir; uygulamaya gömülmesi normaldir.
// Verinin güvenliğini veritabanındaki RLS kuralları sağlar.
const SUPABASE_URL = 'https://fijryotgejjnwuadihuw.supabase.co';
const SUPABASE_ANAHTAR = 'sb_publishable_US5K1DvdzHuFoTSHSLlvrg_Zqjx2Tgv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANAHTAR, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // Mobilde URL üzerinden oturum algılama yok
    detectSessionInUrl: false,
  },
});