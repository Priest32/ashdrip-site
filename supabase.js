const SUPABASE_URL = "https://tigofkgyscgbladjrcqn.supabase.co";

const SUPABASE_ANON_KEY =
"sb_publishable_Jn_-OI5G2TeSAc7kdVlbbQ_9AkDNvUk";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);