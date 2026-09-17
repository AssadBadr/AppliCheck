import { createClient } from '@supabase/supabase-js'

// Credentials loaded from environment variables
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data, error } = await supabase
  .rpc('exec_sql', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
  })

if (error) {
  console.error('Error:', error.message)
} else {
  console.log('Tables:', data)
}
