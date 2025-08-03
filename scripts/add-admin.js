const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function ensureAdmin() {
  console.log('🔄 Ensuring admin user exists...')
  
  try {
    // First check if admin already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'admin')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking admin:', checkError)
      return
    }

    if (existingAdmin) {
      console.log('📝 Admin exists, updating role and password...')
      const { data, error } = await supabase
        .from('users')
        .update({
          password: 'admin123',
          role: 'admin',
          updated_at: new Date().toISOString()
        })
        .eq('username', 'admin')

      if (error) {
        console.error('❌ Error updating admin:', error)
      } else {
        console.log('✅ Admin updated successfully')
      }
    } else {
      console.log('📝 Creating new admin user...')
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: 'admin',
          password: 'admin123',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        console.error('❌ Error creating admin:', error)
      } else {
        console.log('✅ Admin created successfully')
      }
    }
  } catch (error) {
    console.error('❌ Exception:', error)
  }
  
  console.log('🎉 Admin setup completed!')
}

ensureAdmin()