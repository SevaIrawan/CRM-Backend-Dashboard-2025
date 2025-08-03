const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

const supabase = createClient(supabaseUrl, supabaseKey)

// User roles untuk update
const roleUsers = [
  {
    username: 'executive',
    password: 'executive123',
    role: 'executive'
  },
  {
    username: 'manager', 
    password: 'manager123',
    role: 'manager'
  },
  {
    username: 'usc_dep',
    password: 'usc123', 
    role: 'usc_dep'
  },
  {
    username: 'user',
    password: 'user123',
    role: 'user'
  }
]

async function updateRoleUsers() {
  console.log('🔄 Updating existing users with correct roles and passwords...')
  
  for (const user of roleUsers) {
    try {
      console.log(`📝 Updating user: ${user.username} (${user.role})`)
      
      const { data, error } = await supabase
        .from('users')
        .update({
          password: user.password,
          role: user.role,
          updated_at: new Date().toISOString()
        })
        .eq('username', user.username)

      if (error) {
        console.error(`❌ Error updating ${user.username}:`, error)
      } else {
        console.log(`✅ Successfully updated ${user.username}`)
      }
    } catch (error) {
      console.error(`❌ Exception updating ${user.username}:`, error)
    }
  }
  
  console.log('🎉 User role updates completed!')
}

updateRoleUsers()