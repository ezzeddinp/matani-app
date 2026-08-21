export type EducationPriority = 'Kritis' | 'Tinggi' | 'Sedang';

export interface EducationArticle {
  id: string;
  title: string;
  summary: string;
  priority: EducationPriority;
  duration: string;
  icon: string;
  category: string;
  keywords: string[];
  detail: {
    overview: string;
    warningSigns: string[];
    actionSteps: {
      title: string;
      description: string;
    }[];
    monitoring: string[];
    recommendations: string[];
  };
}

export const EDUCATION_ARTICLES: EducationArticle[] = [
  {
    id: 'banjir-pertanian',
    title: 'Mengatasi Risiko Banjir di Lahan Pertanian',
    summary: 'Strategi mitigasi, drainase darurat, dan pemulihan tanah setelah banjir untuk melindungi tanaman dan struktur lahan.',
    priority: 'Kritis',
    duration: '5m',
    icon: '🌧️',
    category: 'Cuaca',
    keywords: ['banjir', 'drainase', 'genangan', 'cuaca ekstrem'],
    detail: {
      overview:
        'Curah hujan ekstrem dapat menyebabkan genangan berkepanjangan yang merusak perakaran tanaman serta memicu penyakit akar. Langkah mitigasi cepat diperlukan untuk menjaga produktivitas lahan tetap stabil.',
      warningSigns: [
        'Genangan air bertahan lebih dari 24 jam di sekitar perakaran tanaman',
        'Terbentuknya alur erosi pada bedengan atau saluran air utama',
        'Daun menguning dan tampak layu akibat kekurangan oksigen pada akar',
      ],
      actionSteps: [
        {
          title: 'Bangun Saluran Drainase Darurat',
          description:
            'Buat parit kecil selebar 20–30 cm di titik terendah untuk mengalirkan air keluar. Pastikan kemiringan minimal 1% agar aliran tidak terhambat.',
        },
        {
          title: 'Pasang Pompa Portabel',
          description:
            'Gunakan pompa celup dengan kapasitas 1–2 liter/detik untuk lahan <1 ha. Jalankan pompa bergantian guna mengurangi beban listrik dan cek filter pompa setiap 3 jam.',
        },
        {
          title: 'Perkuat Bedengan dan Tanggul',
          description:
            'Tambahkan karung pasir atau mulsa jerami di sisi bedengan untuk menahan arus. Setelah air surut, ratakan kembali permukaan tanah yang tergerus.',
        },
      ],
      monitoring: [
        'Gunakan sensor kelembapan tanah atau lakukan tes genggam setiap pagi dan sore.',
        'Catat tinggi muka air harian untuk memantau efektivitas drainase.',
        'Evaluasi kembali jalur air masuk dari saluran irigasi atau sungai terdekat.',
      ],
      recommendations: [
        'Tanam varietas tahan genangan pada musim hujan (misalnya padi Inpari 43).',
        'Pasang pintu air sederhana dari papan kayu untuk mengatur aliran irigasi.',
        'Sediakan stok kapur pertanian untuk menetralkan tanah setelah banjir.',
      ],
    },
  },
  {
    id: 'wereng-coklat',
    title: 'Pengendalian Hama Wereng Coklat',
    summary: 'Identifikasi awal, strategi pengendalian terpadu, dan perlindungan varietas padi dari ledakan populasi wereng.',
    priority: 'Tinggi',
    duration: '7m',
    icon: '🐛',
    category: 'Hama',
    keywords: ['wereng', 'insektisida', 'padi', 'pengendalian hama terpadu'],
    detail: {
      overview:
        'Wereng coklat dapat menyebabkan hopper burn dan menularkan virus kerdil. Pengamatan rutin serta penggunaan musuh alami menekan populasi sebelum menimbulkan kerugian ekonomi.',
      warningSigns: [
        'Tanaman menguning berkelompok menyerupai terbakar',
        'Adanya wereng dewasa di pangkal batang saat inspeksi pagi',
        'Banyak telur wereng pada permukaan bawah daun',
      ],
      actionSteps: [
        {
          title: 'Monitoring Populasi Mingguan',
          description:
            'Gunakan perangkap kuning dan lakukan perhitungan wereng per rumpun minimal 5 titik sampling. Jika populasi >20 ekor/rumpun, segera lakukan tindakan.',
        },
        {
          title: 'Utamakan Musuh Alami',
          description:
            'Lepaskan predator laba-laba Lycosa atau kepik Cyrtorhinus jika tersedia. Hindari penggunaan insektisida spektrum luas pada pagi hari saat predator aktif.',
        },
        {
          title: 'Rotasi Formulasi Insektisida',
          description:
            'Gunakan insektisida berbahan aktif berbeda (misal buprofezin, pymetrozine) secara bergantian untuk mencegah resistensi. Ikuti dosis label dan waktu karantina panen.',
        },
      ],
      monitoring: [
        'Catat populasi wereng setiap minggu pada buku lapang.',
        'Pantau keberadaan musuh alami seperti kumbang kepik dan laba-laba.',
        'Evaluasi efektivitas insektisida 3 hari setelah aplikasi.',
      ],
      recommendations: [
        'Tanam varietas toleran wereng seperti Inpari 33 atau Ciherang.',
        'Jaga kebersihan gulma di pematang dan saluran air.',
        'Atur jarak tanam 25 x 25 cm untuk meningkatkan sirkulasi udara.',
      ],
    },
  },
  {
    id: 'hawar-daun-bakteri',
    title: 'Mengendalikan Hawar Daun Bakteri pada Padi',
    summary: 'Langkah pencegahan dan pengobatan alami untuk menekan penyebaran hawar daun bakteri akibat Xanthomonas oryzae.',
    priority: 'Tinggi',
    duration: '6m',
    icon: '🦠',
    category: 'Penyakit',
    keywords: ['hawar daun', 'bakteri', 'penyakit padi', 'sanitasi lahan'],
    detail: {
      overview:
        'Hawar daun bakteri menyebar cepat melalui percikan air hujan dan luka pada daun. Pencegahan melalui sanitasi lahan serta varietas tahan penting untuk menjaga produktivitas.',
      warningSigns: [
        'Muncul bercak hijau pucat memanjang dari ujung daun ke arah pangkal',
        'Daun mengering berwarna cokelat keputihan di tepi',
        'Aroma tengik saat daun terinfeksi diremas',
      ],
      actionSteps: [
        {
          title: 'Sanitasi dan Pemangkasan Daun Terinfeksi',
          description:
            'Potong daun yang menunjukkan gejala awal dan kubur di luar areal tanam untuk menghentikan sumber inokulum.',
        },
        {
          title: 'Semprotkan Bakterisida Nabati',
          description:
            'Gunakan campuran ekstrak sereh + bawang putih (perbandingan 1:1) yang dilarutkan dalam 10 liter air. Aplikasikan sore hari setiap 5 hari sekali.',
        },
        {
          title: 'Tambahkan Silika pada Pemupukan',
          description:
            'Campurkan pupuk silika 100 kg/ha pada fase vegetatif untuk memperkuat dinding sel daun dan mengurangi infeksi.',
        },
      ],
      monitoring: [
        'Catat perkembangan gejala setiap 3 hari setelah tindakan.',
        'Pastikan saluran irigasi tidak memercik langsung ke kanopi tanaman.',
        'Amati pH tanah, jaga pada kisaran 5,5–6,5.',
      ],
      recommendations: [
        'Gunakan benih bersertifikat dan lakukan perendaman fungisida sebelum tanam.',
        'Rotasi dengan tanaman non-padi selama satu musim untuk memutus siklus patogen.',
        'Jaga kebersihan alat pertanian sebelum pindah lahan.',
      ],
    },
  },
  {
    id: 'stress-panas-tanaman',
    title: 'Mencatat Dampak Suhu Tinggi pada Padi',
    summary: 'Panduan observasi lapangan dan pencatatan kondisi padi saat suhu tinggi tanpa menghasilkan diagnosis otomatis.',
    priority: 'Tinggi',
    duration: '4m',
    icon: '🌡️',
    category: 'Cuaca',
    keywords: ['suhu tinggi', 'padi', 'observasi lapangan', 'cuaca'],
    detail: {
      overview:
        'Suhu tinggi dapat bertepatan dengan perubahan kondisi tanaman padi. Catat waktu, fase pertumbuhan, kondisi air, dan gejala yang terlihat agar pengamatan dapat dibandingkan dengan cuaca dan deret waktu indeks secara hati-hati.',
      warningSigns: [
        'Daun menggulung atau berubah warna pada waktu tertentu',
        'Perubahan kondisi malai atau pertumbuhan yang terlihat di lapangan',
        'Perubahan terjadi berdekatan dengan periode suhu tinggi',
      ],
      actionSteps: [
        {
          title: 'Catat Waktu dan Lokasi',
          description:
            'Rekam tanggal, jam, petak, fase pertumbuhan, dan kondisi yang terlihat tanpa menyimpulkan penyebab.',
        },
        {
          title: 'Bandingkan Kondisi Air',
          description:
            'Periksa kondisi air sawah dan bandingkan dengan catatan lapangan sebelumnya.',
        },
        {
          title: 'Hubungkan dengan Data Cuaca',
          description:
            'Bandingkan catatan lapangan dengan suhu dan curah hujan pada periode yang sama.',
        },
      ],
      monitoring: [
        'Gunakan alat ukur yang tersedia dan catat satuan serta waktu pengukuran.',
        'Ambil foto dari titik yang konsisten untuk membandingkan perubahan visual.',
        'Mintalah penilaian ahli lapangan jika diperlukan; aplikasi tidak menentukan diagnosis.',
      ],
      recommendations: [
        'Gunakan catatan berulang, bukan satu observasi, untuk mendokumentasikan perubahan.',
        'Pisahkan fakta yang diamati dari dugaan penyebab dalam setiap catatan.',
        'Konsultasikan tindakan budidaya dengan penyuluh atau ahli setempat.',
      ],
    },
  },
  {
    id: 'irigasi-efisien',
    title: 'Pengelolaan Air untuk Efisiensi Irigasi',
    summary: 'Panduan penjadwalan irigasi tetes, kalibrasi debit, dan pemanfaatan sensor kelembapan untuk menekan pemborosan air.',
    priority: 'Sedang',
    duration: '6m',
    icon: '💧',
    category: 'Irigasi',
    keywords: ['irigasi', 'kelembapan tanah', 'sensor', 'hemat air'],
    detail: {
      overview:
        'Penggunaan air yang tidak terkontrol meningkatkan biaya produksi dan mengurangi efisiensi nutrisi. Sistem irigasi presisi menjaga kelembapan optimal sekaligus menekan penyakit akar.',
      warningSigns: [
        'Tanah sering tergenang setelah penyiraman',
        'Daun bagian bawah menguning karena kekurangan oksigen',
        'Biaya listrik pompa meningkat drastis dalam satu bulan',
      ],
      actionSteps: [
        {
          title: 'Kalibrasi Debit Emiter',
          description:
            'Ukur volume air yang keluar dari emiter tetes selama 5 menit. Sesuaikan tekanan hingga debit seragam 1–1,5 liter/jam.',
        },
        {
          title: 'Gunakan Sensor Kelembapan',
          description:
            'Pasang sensor tensiometer pada kedalaman 15 cm dan 30 cm. Siram hanya saat pembacaan mencapai 30–40 kPa.',
        },
        {
          title: 'Buat Jadwal Irigasi Mingguan',
          description:
            'Susun jadwal berdasarkan ETc tanaman dan prakiraan cuaca. Prioritaskan penyiraman pagi hari untuk mengurangi evaporasi.',
        },
      ],
      monitoring: [
        'Catat volume air harian yang digunakan dan bandingkan dengan target sebelumnya.',
        'Periksa kemungkinan bocor pada selang atau sambungan setiap dua minggu.',
        'Evaluasi kesehatan daun untuk memastikan tidak ada gejala kekurangan air.',
      ],
      recommendations: [
        'Mulsa permukaan untuk mengurangi evaporasi hingga 20%.',
        'Tambahkan penampung air hujan sebagai cadangan saat musim kemarau.',
        'Lakukan flushing berkala untuk menghindari penumpukan garam pada emiter.',
      ],
    },
  },
];
