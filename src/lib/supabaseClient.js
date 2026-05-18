// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = "https://marispwfnzezwetzmzdc.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcmlzcHdmbnplendldHptemRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODI5NzEsImV4cCI6MjA2MzM1ODk3MX0.sAxm9dE_qywNjm62qXQ1W3LdircDY-MeSxe7GYZWbSQ";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);