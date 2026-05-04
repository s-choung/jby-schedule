import { supabase } from './supabase-client.js';
import { getUser } from './auth.js';
import { getWeekStart, toISODate, addDays } from './scheduler-core.js';

export async function saveToSupabase(weekStart, data) {
  const user = getUser();
  if (!user) return;

  const { error } = await supabase
    .from('schedules')
    .upsert(
      { user_id: user.id, week_start: weekStart, data, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,week_start' }
    );

  if (error) console.error('Supabase 저장 실패:', error.message);
  return !error;
}

export async function loadFromSupabase(weekStart) {
  const user = getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('schedules')
    .select('data')
    .eq('user_id', user.id)
    .eq('week_start', weekStart)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') console.error('Supabase 로드 실패:', error.message);
    return null;
  }
  return data?.data ?? null;
}

export async function loadPreviousWeek(currentWeekStart) {
  const prevMonday = toISODate(addDays(currentWeekStart, -7));
  return loadFromSupabase(prevMonday);
}
