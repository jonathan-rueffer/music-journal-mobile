import { supabase } from './supabase';

export type EventRef = {
  id: string;
  name: string;
};

// Events have no separate "create" flow (see DESIGN_2.md) — tagging a song
// memory with a new event name creates the events row implicitly, right
// here, the first time that name is used.
export async function findOrCreateEvent(userId: string, name: string): Promise<EventRef> {
  const trimmed = name.trim();

  const { data: existing, error: selectError } = await supabase
    .from('events')
    .select('id, name')
    .eq('user_id', userId)
    .ilike('name', trimmed)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as EventRef;

  const { data: inserted, error: insertError } = await supabase
    .from('events')
    .insert({ user_id: userId, name: trimmed })
    .select('id, name')
    .single();

  if (insertError) {
    // Another tag on the same event name landed first (unique on
    // (user_id, name)) — use their row instead of erroring.
    if (insertError.code === '23505') {
      const { data: raceWinner, error: refetchError } = await supabase
        .from('events')
        .select('id, name')
        .eq('user_id', userId)
        .ilike('name', trimmed)
        .single();
      if (refetchError) throw refetchError;
      return raceWinner as EventRef;
    }
    throw insertError;
  }

  return inserted as EventRef;
}

