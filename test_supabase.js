const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://lavyumkjhlophpuennel.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxhdnl1bWtqaGxvcGhwdWVubmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDE2OTEsImV4cCI6MjA5NjExNzY5MX0.NOz1tuY9zUl56hPWzOdcbIO9j29O0t62iboGOIpfO7c";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('tabel_user').select('*').limit(1);
  console.log("tabel_user schema:", data ? Object.keys(data[0]) : null, error);

  const { data: d2 } = await supabase.from('tabel_matakuliah').select('*').limit(1);
  console.log("tabel_matakuliah schema:", d2 ? Object.keys(d2[0]) : null);

  const { data: d3 } = await supabase.from('tabel_jadwal').select('*').limit(1);
  console.log("tabel_jadwal schema:", d3 ? Object.keys(d3[0]) : null);
}

test();
