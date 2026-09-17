import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://enpvsyzpcwpfkqhwebiv.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVucHZzeXpwY3dwZmtxaHdlYml2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1OTA0NDYsImV4cCI6MjEwNTE2NjQ0Nn0.5fswE-bt_oXTYC0zAKWszPEdrZEPDoUiizO2LsuHYTg'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkTable() {
  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('application_notifications')
      .select('count')
      .limit(1)
    
    if (error) {
      console.log('❌ Table does not exist or has an error:', error.message)
      console.log('\n📋 You need to run supabase/add_notifications.sql in Supabase SQL Editor')
      return false
    } else {
      console.log('✅ Table application_notifications exists!')
      return true
    }
  } catch (e) {
    console.error('Error:', e.message)
    return false
  }
}

checkTable()
