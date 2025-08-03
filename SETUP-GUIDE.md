# Setup Guide untuk NexMax Dashboard

## Langkah 1: Setup Database di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project `nexmax-dashboard`
3. Buka **SQL Editor**
4. Copy dan paste isi file `setup-admin-user.sql`
5. Klik **Run** untuk menjalankan script

## Langkah 2: Verifikasi Setup

Setelah menjalankan script, cek apakah tabel dan user admin sudah dibuat:

```sql
-- Cek tabel users
SELECT * FROM public.users;

-- Cek user admin
SELECT * FROM public.users WHERE username = 'admin';
```

## Langkah 3: Test Login

Setelah setup selesai, coba login dengan:
- **Username:** admin
- **Password:** Admin123!

## Troubleshooting

### Jika masih error "Username atau password salah":

1. **Cek RLS Policies:**
   ```sql
   -- Disable RLS sementara untuk testing
   ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
   ```

2. **Cek apakah user admin ada:**
   ```sql
   SELECT * FROM public.users WHERE username = 'admin';
   ```

3. **Buat user admin manual jika belum ada:**
   ```sql
   INSERT INTO public.users (username, password, role) 
   VALUES ('admin', 'Admin123!', 'admin');
   ```

### Jika ada error permission:

1. Pastikan menggunakan **Service Role Key** untuk operasi admin
2. Atau disable RLS sementara untuk development

## Langkah 4: Deploy ke Vercel

Setelah login berhasil di local, deploy ke Vercel:

```bash
npx vercel --prod
```

## Environment Variables untuk Vercel

Pastikan environment variables berikut sudah diset di Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` 