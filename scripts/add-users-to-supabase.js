// Script untuk menambah user dengan role HOD DEPARTMENT dan TOP MANAGER ke Supabase
// Jalankan dengan: node scripts/add-users-to-supabase.js

const { createClient } = require('@supabase/supabase-js')

// Konfigurasi Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Supabase URL atau Key tidak ditemukan')
  console.error('Pastikan environment variables sudah diset:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addUsersToSupabase() {
  try {
    console.log('🚀 Memulai penambahan user ke Supabase...')

    // Data user yang akan ditambahkan
    const usersToAdd = [
      {
        username: 'usc_dep',
        password: 'Hod123!',
        email: 'hod@nexmax.com',
        role: 'hod_department',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        username: 'executive',
        password: 'Exec123!',
        email: 'executive@nexmax.com',
        role: 'top_manager',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    console.log('📝 Data user yang akan ditambahkan:')
    usersToAdd.forEach((user, index) => {
      console.log(`${index + 1}. ${user.username} - ${user.role.toUpperCase()}`)
    })

    // Tambah user satu per satu
    for (const user of usersToAdd) {
      console.log(`\n➕ Menambahkan user: ${user.username}...`)
      
      const { data, error } = await supabase
        .from('users')
        .insert([user])
        .select()

      if (error) {
        console.error(`❌ Error menambahkan ${user.username}:`, error.message)
      } else {
        console.log(`✅ Berhasil menambahkan ${user.username}:`, data[0])
      }
    }

    console.log('\n🎉 Script selesai!')
    console.log('\n📊 Verifikasi data:')
    console.log('1. Login ke Supabase Dashboard')
    console.log('2. Buka Table "users"')
    console.log('3. Pastikan user baru sudah ada dengan role yang benar')

  } catch (error) {
    console.error('❌ Error dalam script:', error)
  }
}

// Jalankan script
addUsersToSupabase() 