# NexMax Dashboard - Sistem Autentikasi Lengkap

Dashboard interaktif yang modern dan responsif dengan sistem autentikasi Supabase. Dashboard ini menampilkan berbagai statistik, grafik, dan aktivitas dalam antarmuka yang user-friendly dengan keamanan yang terjamin.

## 🚀 Fitur

### ✨ Fitur Utama
- **Sistem Autentikasi Lengkap** - Login, Register, dan Logout dengan Supabase
- **Tema Gelap/Terang** - Toggle antara mode gelap dan terang
- **Sidebar Responsif** - Menu navigasi yang dapat disembunyikan di mobile
- **Grafik Interaktif** - Menggunakan Chart.js untuk visualisasi data
- **Statistik Real-time** - Update otomatis setiap 30 detik
- **Animasi Smooth** - Transisi dan animasi yang halus
- **Responsif** - Berfungsi sempurna di desktop, tablet, dan mobile
- **Keamanan** - Row Level Security (RLS) di database

### 🔐 Fitur Autentikasi
- **Login/Register** - Form yang user-friendly dengan validasi
- **Password Reset** - Sistem reset password via email
- **Session Management** - Manajemen session yang aman
- **User Profile** - Dropdown menu dengan logout
- **Remember Me** - Opsi untuk menyimpan login
- **Email Verification** - Konfirmasi email untuk registrasi

### 📊 Komponen Dashboard
1. **Header** - Dengan search box, theme toggle, dan user profile dropdown
2. **Sidebar** - Navigasi menu dengan ikon
3. **Stat Cards** - Menampilkan metrik penting
4. **Charts** - Grafik penjualan dan distribusi pengguna
5. **Activity Feed** - Aktivitas terbaru dalam sistem

## 🛠️ Teknologi yang Digunakan

- **HTML5** - Struktur semantik
- **CSS3** - Styling modern dengan CSS Variables
- **JavaScript (ES6+)** - Interaktivitas dan logika
- **Supabase** - Backend-as-a-Service untuk autentikasi dan database
- **Chart.js** - Library untuk grafik interaktif
- **Font Awesome** - Ikon yang indah

## 📁 Struktur File

```
nexmax-dashboard/
├── index.html              # Dashboard utama
├── login.html              # Halaman login/register
├── styles.css              # Styling dashboard
├── login-styles.css        # Styling halaman login
├── script.js               # JavaScript dashboard
├── login-script.js         # JavaScript autentikasi
├── database-setup.sql      # Setup database Supabase
└── README.md              # Dokumentasi ini
```

## 🗄️ Setup Database Supabase

### 1. Buat Project Supabase
1. Kunjungi [supabase.com](https://supabase.com)
2. Buat project baru dengan nama "nexmax-dashboard"
3. Catat URL dan API keys

### 2. Setup Database
1. Buka SQL Editor di Supabase Dashboard
2. Jalankan script dari file `database-setup.sql`
3. Script akan membuat:
   - Tabel `users` untuk profil pengguna
   - Tabel `dashboard_stats` untuk data statistik
   - Tabel `user_sessions` untuk tracking aktivitas
   - Row Level Security (RLS) policies
   - Triggers untuk otomatisasi

### 3. Konfigurasi Environment
Update URL dan API keys di file JavaScript:
```javascript
const SUPABASE_URL = 'https://bbuxfnchflhtulainndm.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';
```

## 🎨 Tema dan Warna

### Light Theme
- Primary: `#6366f1` (Indigo)
- Background: `#ffffff` (White)
- Text: `#1e293b` (Slate 800)

### Dark Theme
- Primary: `#6366f1` (Indigo)
- Background: `#0f172a` (Slate 900)
- Text: `#f1f5f9` (Slate 100)

## 🚀 Cara Menjalankan

### 1. Setup Database
```sql
-- Jalankan di Supabase SQL Editor
-- Copy isi dari database-setup.sql
```

### 2. Update Konfigurasi
Edit file `login-script.js` dan `script.js`:
```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-anon-key';
```

### 3. Jalankan Aplikasi
1. **Buka file `login.html`** di browser web
2. **Register akun baru** atau login dengan akun yang ada
3. **Nikmati dashboard** yang sudah siap digunakan!

### Opsi Lain:
- Gunakan live server di VS Code
- Atau buka dengan Python: `python -m http.server 8000`

## 📱 Responsivitas

Dashboard ini responsif dan berfungsi optimal di:
- **Desktop** (1024px+)
- **Tablet** (768px - 1023px)
- **Mobile** (< 768px)

## 🎯 Fitur Interaktif

### 1. Autentikasi
- **Login** - Email dan password
- **Register** - Form registrasi lengkap
- **Password Reset** - Reset via email
- **Session Management** - Auto logout jika tidak aktif

### 2. Theme Toggle
- Klik ikon bulan/matahari di header
- Tema tersimpan di localStorage
- Transisi smooth antar tema

### 3. Sidebar Navigation
- Menu aktif dengan highlight
- Toggle sidebar di mobile
- Animasi slide yang halus

### 4. Charts
- **Line Chart** - Tren penjualan
- **Doughnut Chart** - Distribusi pengguna
- **Bar Chart** - Analitik traffic
- **Radar Chart** - Metrik kinerja

### 5. Real-time Updates
- Statistik update otomatis setiap 30 detik
- Animasi loading yang smooth
- Data simulasi untuk demo

## 🔐 Keamanan

### Row Level Security (RLS)
- Setiap user hanya bisa akses data miliknya
- Policies yang ketat untuk mencegah akses tidak sah
- Audit trail untuk aktivitas user

### Autentikasi
- JWT tokens untuk session management
- Password hashing otomatis
- Email verification untuk registrasi
- Rate limiting untuk mencegah brute force

## 🎨 Customization

### Mengubah Warna
Edit variabel CSS di `styles.css`:
```css
:root {
    --primary-color: #6366f1;
    --bg-primary: #ffffff;
    /* ... */
}
```

### Menambah Menu
Edit HTML di `index.html`:
```html
<li>
    <a href="#new-section">
        <i class="fas fa-icon"></i>
        <span>Menu Baru</span>
    </a>
</li>
```

### Menambah Chart
Edit JavaScript di `script.js`:
```javascript
function getNewSectionContent() {
    return `
        <div class="chart-container">
            <h3>Chart Baru</h3>
            <canvas id="newChart"></canvas>
        </div>
    `;
}
```

## 🔧 Dependencies

### CDN Links (sudah include di HTML):
- Font Awesome: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css`
- Chart.js: `https://cdn.jsdelivr.net/npm/chart.js`
- Supabase: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`

## 📈 Data Sample

Dashboard menggunakan data sample untuk demo:
- **Total Pengguna**: 1,234 (+12.5%)
- **Penjualan**: $45,678 (+8.3%)
- **Tampilan**: 89,432 (+15.2%)
- **Pertumbuhan**: 23.4% (-2.1%)

## 🎯 Penggunaan

Dashboard ini cocok untuk:
- **Admin Panel** - Manajemen sistem dengan autentikasi
- **Analytics Dashboard** - Monitoring performa per user
- **E-commerce** - Tracking penjualan dengan user management
- **Social Media** - Monitoring engagement per user
- **Project Management** - Tracking progress dengan tim

## 🚀 Optimasi

### Performance
- CSS dan JS teroptimasi
- Lazy loading untuk charts
- Minimal dependencies
- Database indexing untuk query cepat

### SEO
- Semantic HTML
- Meta tags yang proper
- Alt text untuk gambar

### Accessibility
- Keyboard navigation
- Screen reader friendly
- High contrast mode
- Focus indicators

## 🔧 Troubleshooting

### Masalah Umum:
1. **Login tidak berfungsi**
   - Pastikan Supabase URL dan API key benar
   - Cek console browser untuk error
   - Pastikan database sudah disetup

2. **Charts tidak muncul**
   - Pastikan Chart.js CDN terload
   - Cek console untuk error JavaScript

3. **Styling tidak konsisten**
   - Clear browser cache
   - Pastikan semua CSS file terload

## 🤝 Contributing

1. Fork repository
2. Buat feature branch
3. Commit changes
4. Push ke branch
5. Buat Pull Request

## 📄 License

Proyek ini open source dan tersedia di bawah [MIT License](LICENSE).

## 📞 Support

Jika ada pertanyaan atau masalah:
- Buat issue di repository
- Email: support@nexmax.com
- Dokumentasi lengkap tersedia di Wiki

---

**Dibuat dengan ❤️ menggunakan HTML, CSS, JavaScript, dan Supabase**
