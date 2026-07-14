import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only created when first used
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    _supabase = createClient(supabaseUrl, supabaseKey);
  }
  return _supabase;
}

// Helper functions for database operations
export const dbQueries = {
  // User operations
  async getUser(id: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .select('*, subscription(*), usage(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  async createUser(userData: { email: string; name?: string; provider?: string; provider_id?: string }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Transcription operations
  async getUserTranscriptions(userId: string, limit = 20, offset = 0) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('transcriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data;
  },

  async createTranscription(transcriptionData: { user_id: string; title: string; text: string; chunks: { text: string; timestamp: [number, number | null] }[]; duration: number; model: string; language?: string }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('transcriptions')
      .insert(transcriptionData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateTranscription(id: string, updates: { text?: string; chunks?: { text: string; timestamp: [number, number | null] }[]; status?: string }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('transcriptions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Usage operations
  async getUserUsage(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUsage(userId: string, minutesUsed: number) {
    const supabase = getSupabase();
    const { data: currentUsage } = await supabase
      .from('usage')
      .select('total_minutes, transcriptions_count')
      .eq('user_id', userId)
      .single();

    const prevMinutes = (currentUsage as any)?.total_minutes || 0;
    const prevCount = (currentUsage as any)?.transcriptions_count || 0;

    const { data, error } = await supabase
      .from('usage')
      .update({
        current_period_minutes: minutesUsed,
        total_minutes: prevMinutes + minutesUsed,
        transcriptions_count: prevCount + 1
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Subscription operations
  async getUserSubscription(userId: string) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateSubscription(userId: string, subscriptionData: { plan_id?: string; status?: string; current_period_start?: Date; current_period_end?: Date; stripe_subscription_id?: string }) {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({ user_id: userId, ...subscriptionData })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// For direct supabase access (used by auth.ts)
export function getSupabaseClient() {
  return getSupabase();
}
