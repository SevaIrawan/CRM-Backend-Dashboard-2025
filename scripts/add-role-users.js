const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

const supabase = createClient(supabaseUrl, supabaseKey)

// User roles sesuai dengan rules
const roleUsers = [
  {
    username: 'admin',
    password: 'admin123',
    email: 'admin@nexmax.com',
    role: 'admin'
  },
  {
    username: 'executive',
    password: 'executive123',
    email: 'executive@nexmax.com',
    role: 'executive'
  },
  {
    username: 'manager',
    password: 'manager123',
    email: 'manager@nexmax.com',
    role: 'manager'
  },
  {
    username: 'manager_usc',
    password: 'managerusc123',
    email: 'managerusc@nexmax.com',
    role: 'manager_usc'
  },
  {
    username: 'usc_dep',
    password: 'usc123',
    email: 'usc@nexmax.com',
    role: 'usc_dep'
  },
  {
    username: 'user',
    password: 'user123',
    email: 'user@nexmax.com',
    role: 'user'
  }
]

async function addRoleUsers() {
  console.log('🚀 Adding role-based users to Supabase...')
  
  for (const user of roleUsers) {
    try {
      console.log(`📝 Adding user: ${user.username} (${user.role})`)
      
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: user.username,
          password: user.password,
          role: user.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        console.error(`❌ Error adding ${user.username}:`, error)
      } else {
        console.log(`✅ Successfully added ${user.username}`)
      }
    } catch (error) {
      console.error(`❌ Exception adding ${user.username}:`, error)
    }
  }
  
  console.log('🎉 Role-based users setup completed!')
}

addRoleUsers() 