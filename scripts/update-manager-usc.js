const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updateManagerUSC() {
  console.log('🔄 Updating manager_usc user...')
  
  try {
    // Check if manager_usc exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('username', 'manager_usc')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', checkError)
      return
    }

    if (existingUser) {
      // Update existing user
      console.log('📝 Updating existing manager_usc user...')
      const { data, error } = await supabase
        .from('users')
        .update({
          password: 'managerusc123',
          role: 'manager_usc',
          email: 'managerusc@nexmax.com',
          updated_at: new Date().toISOString()
        })
        .eq('username', 'manager_usc')

      if (error) {
        console.error('❌ Error updating manager_usc:', error)
      } else {
        console.log('✅ Successfully updated manager_usc')
      }
    } else {
      // Insert new user
      console.log('📝 Creating new manager_usc user...')
      const { data, error } = await supabase
        .from('users')
        .insert([{
          username: 'manager_usc',
          password: 'managerusc123',
          role: 'manager_usc',
          email: 'managerusc@nexmax.com',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) {
        console.error('❌ Error creating manager_usc:', error)
      } else {
        console.log('✅ Successfully created manager_usc')
      }
    }
  } catch (error) {
    console.error('❌ Exception:', error)
  }
  
  console.log('🎉 manager_usc user setup completed!')
}

updateManagerUSC()
