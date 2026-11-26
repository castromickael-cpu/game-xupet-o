// Cliente online do Pixel Battle (módulo de exemplo). Requer: npm i @supabase/supabase-js
// Ainda NÃO está ligado ao pixel-battle.html: ele é a base para essa integração.
import { createClient } from '@supabase/supabase-js';

export const sb = createClient('https://sesppgzjqhilixbvirob.supabase.co', 'sb_publishable_yXM-VwkNse7FCbH6lBviKA_B5yq81Im');


export async function login() {                       // login anônimo (habilite no painel)
  const { data: { session } } = await sb.auth.getSession();
  if (session) return session.user;
  const { data, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return data.user;
}
const rpc = async (fn, args) => { const { data, error } = await sb.rpc(fn, args); if (error) throw error; return data; };

export const createRoom = (hp = 100, damage = 20) => rpc('create_room', { p_hp: hp, p_damage: damage });
export const joinRoom = code => rpc('join_room', { p_code: code });
export const pickCharacter = (room, ch) => rpc('select_character', { p_room: room, p_char: ch });
export const setReady = (room, ready = true) => rpc('set_ready', { p_room: room, p_ready: ready });
export const attack = (room, op) => rpc('choose_attack', { p_room: room, p_op: op });
export const answer = (room, value) => rpc('submit_answer', { p_room: room, p_value: value });
export const timeout = room => rpc('resolve_timeout', { p_room: room });
export const claimAbandon = room => rpc('claim_abandon', { p_room: room });
export const leaveRoom = room => rpc('leave_room', { p_room: room });

// Tempo: use questions.deadline (relógio do servidor). Calcule o restante assim e
// chame timeout(room) quando chegar a zero (qualquer jogador pode chamar).
export const secondsLeft = q => Math.max(0, (new Date(q.deadline) - Date.now()) / 1000);

// Sincronização em tempo real: reage a mudanças de sala, jogadores e questões.
export function watchRoom(roomId, onChange) {
  const heartbeat = setInterval(() => sb.rpc('heartbeat', { p_room: roomId }), 15000);
  const ch = sb.channel('room-' + roomId);
  for (const table of ['rooms', 'room_players', 'questions']) {
    const filter = table === 'rooms' ? `id=eq.${roomId}` : `room_id=eq.${roomId}`;
    ch.on('postgres_changes', { event: '*', schema: 'public', table, filter }, p => onChange(table, p.new));
  }
  ch.subscribe();
  return () => { clearInterval(heartbeat); sb.removeChannel(ch); };
}

export const myHistory = async () => (await sb.from('v_my_history').select('*').limit(30)).data;
export const myStats = async () => (await sb.from('player_stats').select('*').single()).data;
