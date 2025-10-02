const { createClient } = require('@supabase/supabase-js')

// Supabase configuration
const supabaseUrl = 'https://bbuxfnchflhtulainndm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJidXhmbmNoZmxodHVsYWlubmRtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NDYzMjYsImV4cCI6MjA2OTQyMjMyNn0.AF6IiaeGB9-8FYZNKQsbnl5yZmSjBMj7Ag4eUunEbtc'

const supabase = createClient(supabaseUrl, supabaseKey)

// Role users sesuai struktur baru
const roleUsers = [
  {
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    displayName: 'Administrator'
  },
  {
    username: 'executive',
    password: 'executive123',
    role: 'executive',
    displayName: 'Executive'
  },
  {
    username: 'manager_myr',
    password: 'manager_myr123',
    role: 'manager_myr',
    displayName: 'Manager MYR'
  },
  {
    username: 'manager_sgd',
    password: 'manager_sgd123',
    role: 'manager_sgd',
    displayName: 'Manager SGD'
  },
  {
    username: 'manager_usc',
    password: 'manager_usc123',
    role: 'manager_usc',
    displayName: 'Manager USC'
  },
  {
    username: 'sq_myr',
    password: 'sq_myr123',
    role: 'sq_myr',
    displayName: 'SQ MYR'
  },
  {
    username: 'sq_sgd',
    password: 'sq_sgd123',
    role: 'sq_sgd',
    displayName: 'SQ SGD'
  },
  {
    username: 'sq_usc',
    password: 'sq_usc123',
    role: 'sq_usc',
    displayName: 'SQ USC'
  }
]

async function updateRolesSupabase() {
  console.log('🚀 Updating NEXMAX role permissions in Supabase...')
  
  try {
    // 1. Hapus semua users yang ada (HATI-HATI!)
    console.log('🗑️ Deleting existing users...')
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records
    
    if (deleteError) {
      console.error('❌ Error deleting existing users:', deleteError)
    } else {
      console.log('✅ Existing users deleted successfully')
    }

    // 2. Insert role users baru
    console.log('📝 Inserting new role users...')
    
    for (const user of roleUsers) {
      try {
        console.log(`📝 Adding user: ${user.username} (${user.role}) - ${user.displayName}`)
        
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

    // 3. Verifikasi data yang sudah di-insert
    console.log('🔍 Verifying inserted data...')
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .order('role')

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError)
    } else {
      console.log('✅ Users in database:')
      users.forEach(user => {
        console.log(`  - ${user.username} (${user.role})`)
      })
    }

    console.log('🎉 Role permissions update completed!')
    console.log('\n📋 ROLE PERMISSIONS SUMMARY:')
    console.log('Admin = All Access All Page')
    console.log('Executive = Limited Access > Dashboard, MYR, SGD, USC')
    console.log('Manager MYR = Limited Access > MYR')
    console.log('Manager SGD = Limited Access > SGD')
    console.log('Manager USC = Limited Access > USC')
    console.log('SQ_MYR = Limited Access > MYR')
    console.log('SQ_SGD = Limited Access > SGD')
    console.log('SQ_USC = Limited Access > USC')

  } catch (error) {
    console.error('❌ Exception during role update:', error)
  }
}

updateRolesSupabase()
