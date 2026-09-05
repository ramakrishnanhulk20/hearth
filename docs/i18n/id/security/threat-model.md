# Model ancaman

Sembilan penyerang, apa yang diincar masing-masing, apa yang menghentikannya, dan apa yang tidak.
Kolom terakhir adalah yang layak dibaca. Model ancaman yang hanya mendaftar pertahanan itu pemasaran.

Kontrak inti Hearth tidak bisa diubah begitu di-deploy. Tidak ada proxy dan tidak ada jalur
peningkatan, jadi tidak ada apa pun di halaman ini yang bisa diubah setelahnya kecuali dengan
men-deploy pool baru.

**Tiap pool terisolasi.** Tujuh pool di Sepolia adalah tujuh deployment terpisah dari kode yang sama,
satu per token rahasia, dan mereka tidak berbagi penyimpanan, saldo maupun registry. Sebuah pool hanya
memegang tokennya sendiri, hanya mendanai vault-nya sendiri dan digerakkan akun keeper-nya sendiri,
jadi bug di wrapper satu token, pemilik yang menjeda satu vault, atau keeper yang berhenti tidak bisa
menjangkau penabung pool lain atau uang hadiah pool lain. Yang menyusul menggambarkan satu pool, dan
berlaku untuk tiap satu dari tujuh pool secara terpisah.

## 1. Pengamat yang penasaran

Seseorang dengan node arsip, block explorer dan waktu. Tanpa modal, tanpa akses istimewa.

**Menginginkan:** tahu siapa menabung berapa, siapa yang peluangnya terbaik, dan siapa yang menang
tiap undian.

**Dihentikan oleh:** tiap nilai per orang adalah ciphertext. Dana pokok, kemenangan, bobot per undian
dan kredit per undian hanya bisa dibaca penabung pemiliknya, ditegakkan daftar kontrol akses milik
Zama, yang membuat relayer menolak permintaan dekripsi dari alamat lain mana pun. Tidak ada transaksi
klaim untuk diintai, dan evaluasi tidak bisa diarahkan ke diri sendiri, jadi tidak ada transaksi yang
hanya akan dikirim seorang pemenang. Pemenang dan yang kalah menerima penulisan yang identik di batch
yang sama, karena pembayarannya adalah select terenkripsi alih-alih sebuah percabangan, jadi bentuk
transaksi dan biaya gas-nya cocok.

**Satu kebocoran yang dihapus desain ini.** Draf lebih awal mempublikasikan total saldo tertimbang
waktu pool yang persis di tiap undian. Dengan angka itu publik untuk dua periode berurutan, ditambah
stempel waktu publik dari transaksi penabung itu sendiri, penabung yang satu-satunya memindahkan uang
dalam sebuah periode akan terbongkar jumlahnya secara persis, bukan sekadar terbatasi. Vault sekarang
hanya mempublikasikan bracket pangkat dua di atas totalnya, dilacak lewat lima perbandingan
terenkripsi per undian, dan persamaannya tidak punya apa pun lagi untuk dipecahkan. Pernyataan
lengkapnya adalah aturan 1 di [apa yang tetap privat](what-stays-private.md).

**Tidak dihentikan oleh apa pun:**

- Daftar penabung, dan blok tempat tiap penabung menyetor, menarik atau dievaluasi.
- Bracket tempat total pool jatuh, yang dengan kurang dari tiga penabung mematok bobot seorang
  penabung dalam rentang faktor dua. Lihat aturan himpunan anonimitas di
  [apa yang tetap privat](what-stays-private.md).
- **Saldo yang bisa dipatok pengamat punya hasil publik di tiap undian.** Ambang batas bersifat publik
  menurut desain, dan uji pemenang adalah fungsi deterministik atas satu rahasia dan selebihnya data
  publik. Bungkus 1.000 USDC lalu setor 1.000 USDC beberapa detik kemudian dan tiap kemenangan dan
  kekalahan Anda, di tiap tier, di tiap undian sejak saat itu, menjadi aritmetika publik.
- **Kemenangan kumulatif adalah batas bawah publik** untuk alamat yang membungkus masuk dan membuka
  bungkus keluar sepenuhnya, karena kedua pergerakan itu publik di lapisan token.
- **Saldo yang statis dipersempit perlahan.** Hitungan hadiah yang dipublikasikan adalah pengukuran
  kecil atas sebaran saldo dan menumpuk terhadap penabung yang saldonya tidak pernah berubah. Tiap
  tier mempublikasikan hitungannya satu undian kemudian, jadi pengukurannya berjalan sekali per tier
  per undian. Irama yang akan memperlambatnya adalah tombol konstruktor yang disetel deployment ini ke
  satu, karena langkah yang sama itulah yang mengembalikan uang tak termenangkan ke pot publik dan
  menjaga jackpot tetap terlihat. Batasan 14.
- Sisa risiko perilaku: menarik dana hanya setelah undian yang dimenangkan, sepanjang banyak undian.

## 2. Paus

Seseorang dengan banyak modal yang menginginkan peluang secara murah.

**Menginginkan:** merebut hadiah tanpa meninggalkan uang di pool, atau memanen mekanismenya.

**Dihentikan oleh:**

- **Pembobotan waktu.** Peluang datang dari saldo rata-rata sepanjang periode. Setoran yang dibuat
  ketika tersisa 6 menit dari periode satu jam memperoleh sepersepuluh peluang dari jumlah yang sama
  yang dipegang sepanjang periode. Ini pertahanan yang tidak dimiliki desain kami sebelumnya, dan
  serangan yang dimungkinkannya sudah dieksekusi: penyerang yang memutar 9.000 USDC di sekitar tiap
  undian memenangkan 19 dari 20 undian dan menguras cadangan 5.000 USDC.
- **Linearitas.** Hadiah yang diharapkan persis sebanding dengan bobot, dan bracket yang dijadikan
  pembanding undian tidak bergantung pada bagaimana bobot pool dibagi di antara alamat. Memecah satu
  dompet menjadi enam tidak menguntungkan, dan menggabungkan enam menjadi satu juga tidak.
- **Batas per penabung.** Setoran ditolak ketika jumlahnya, atau dana pokok hasilnya, berada di atas
  `(2^64 - 1) / L`, dan penolakannya terenkripsi sehingga tidak membocorkan apa pun. Membatasi
  jumlahnya sekaligus totalnya adalah yang mencegah penjumlahan terenkripsi di dalam pemeriksaan itu
  berputar.

**Tidak dihentikan:**

- Paus yang benar-benar memegang saldo besar sepanjang periode menang sering. Itu produknya, bukan
  serangan: uang mereka menghasilkan imbal hasil yang membayar hadiahnya.
- Peluang tier utama diukur atas satu periode, jadi paus yang bergabung untuk satu periode mendapat
  kesempatan proporsional penuh atas pot yang butuh 24 periode untuk terbangun. Itu penyimpangan yang
  dinyatakan dari PoolTogether V5 dan merupakan batasan 5.

## 3. Pengganggu yang mendaftarkan penabung palsu

Seseorang yang menambahkan banyak alamat tak bernilai ke daftar penabung.

**Menginginkan:** memacetkan undian, mengencerkan peluang, atau membuat pool mahal dijalankan.

Pendaftaran terbuka menurut konstruksinya. Hook setoran tidak bisa melihat jumlah terenkripsi yang
diserahkan kepadanya, jadi alamat mana pun yang memicunya bergabung ke daftar penabung, bahkan dengan
nol terenkripsi, dan daftarnya tidak pernah dipangkas.

**Dihentikan oleh:**

- **Peluang tidak tersentuh.** Penabung tanpa saldo punya bobot nol. Bobot nol tidak bisa melewati
  ambang batas mana pun, dan ia tidak menyumbang apa pun ke total, jadi peluang tiap penabung
  sungguhan persis sama dengan tanpa adanya yang palsu. Desain kami sebelumnya butuh jaminan
  pendaftaran untuk ini. Yang ini tidak.
- **Evaluasi tidak bisa dimacetkan.** Penabung yang sudah dievaluasi untuk sebuah undian, alamat yang
  bukan penabung, dan penabung yang observasi pertamanya setelah periode itu, semuanya dilewati tanpa
  menggagalkan transaksi, dan pelewatannya diputuskan dari stempel waktu terang tanpa biaya
  terenkripsi. Satu entri buruk tidak bisa menggagalkan satu batch.
- **Batch dibatasi** pada `4` penabung yang membutuhkan kerja terenkripsi per panggilan, jadi tidak
  ada satu transaksi pun yang bisa didorong melewati batas komputasi Zama.

**Tidak dihentikan:** biaya keeper per undian tumbuh mengikuti daftar penabung, yang hanya bisa
bertambah. Pengganggu tidak bisa mengubah peluang siapa pun, tetapi mereka bisa membuat mengevaluasi
semua orang menjadi mahal. Jawaban keeper adalah batas atas biaya, bukan anggaran. `KEEPER_MAX_FEE_GWEI`
membuatnya duduk diam sepanjang satu tik selama biaya jaringan di atas batas itu (`gasIsAffordable` di
`packages/keeper/src/keeper.ts`), dan di bawah batas itu ia terus mengirim sampai kursornya mencapai
akhir penelusuran. Penabung tanpa observasi sebelum periode itu dilewati dari stempel waktu terang
tanpa biaya terenkripsi, jadi memadati daftar itu memakan gas keeper alih-alih memakan hadiah para
penabung. Tidak ada apa pun di on-chain yang membatasi evaluasi, jadi konsekuensi jujurnya adalah kalau
gas tetap di atas batas atas di pool yang digenggu berat, penelusuran mungkin tidak mencapai tiap
penabung sungguhan di dalam jendela.
Dua hal melunakkannya. Penelusuran dimulai dari titik berbeda tiap undian, diturunkan dari seed undian
itu, jadi tidak ada yang secara sistematis berada di belakang. Dan siapa pun bisa memajukan penelusuran
lebih jauh dari aplikasi, yang memakan gas dan tidak mengungkap apa pun tentang siapa yang meminta.
Lihat [halaman keeper](../operations/keeper.md).

## 4. Keeper yang malas atau bermusuhan

Alamat yang biasanya mendorong undian maju. Milik kami, atau milik orang lain.

**Menginginkan:** melewati undian yang tidak dimenangkannya, memilih urutan pembayaran penabung, atau
sekadar berhenti bekerja.

**Dihentikan oleh:**

- **Tiap langkah tanpa izin.** Close, award, evaluate, finalize dan reconcile bisa dipanggil siapa pun,
  termasuk penabung mana pun dari aplikasi. Keeper yang menolak menetapkan hadiah sebuah undian tidak
  bisa membuatnya lenyap; orang lain akan menetapkannya.
- **Keeper tidak bisa memilih siapa yang dievaluasi.** `evaluate(drawId, count)` menerima sebuah count,
  bukan daftar. Urutan penelusuran ditetapkan seed undian, jadi keeper tidak bisa menaruh dirinya atau
  temannya paling depan di tier yang kelebihan pemenang, dan tidak bisa meninggalkan penabung tertentu.
- **Penutupan yang terlambat ditolak, bukan ditoleransi.** Penutupan harus mendarat sebelum
  `closeDeadline(p)`, yaitu tengah periode kedua jendela. Penutupan di blok terakhir jendela akan
  menyisakan ruang nol untuk perjalanan bolak-balik dekripsi dan akan mendamparkan undian itu selamanya.
  Sekarang transaksi itu sekadar gagal. Undian yang penutupannya tidak pernah mendarat tetap tidak
  tertutup selamanya: likuiditasnya tidak pernah dipindahkan ke dalamnya, jadi tidak ada yang perlu
  dikembalikan dan tidak ada yang perlu difinalisasi.
- **Undian yang dilewati tidak berbiaya apa pun.** Likuiditas yang tidak pernah ditawarkan tetap di
  tier-nya dan ditawarkan lagi. Penetapan hadiah yang terlambat tetap membukukan panennya, tetap
  mengembalikan likuiditas yang ditawarkan ke tier-tier, dan menandai undian itu `Skipped`. Periode itu
  tidak membayar hadiah, dan tidak ada uang yang hilang atau terdampar.
- **Keeper tidak bisa mengubah hasil.** Pemilihan pemenang ditetapkan begitu seed dan bracket
  terverifikasi. Evaluasi menuliskan hasil yang sudah ada.

**Teruji tanpa sengaja, 3 September 2026.** Daemon pm2 mati bersama proses terminal yang memulainya
pada 03:45 UTC, dan tidak ada yang menyadarinya sampai 04:52, jadi keeper mati selama 67 menit. Saat
dinyalakan ulang ia langsung memfinalisasi undian 4 dan menutup undian 6 pada 04:53. Periode 6 sudah
berakhir pada 04:00, jadi penutupan itu terlambat 53 menit terhadap tenggat 05:30, yaitu tengah dari
periode kedua sesudahnya. Tidak ada undian yang hilang, tidak ada likuiditas yang terdampar, dan tidak
ada yang perlu turun tangan selain menyalakan ulang prosesnya. Inilah klaim "keeper yang macet membuat
undian hilang, tidak pernah uang" di [FAQ](../faq.md) dan di butir-butir di atas, dijalankan sungguhan
alih-alih diperdebatkan.

**Tidak dihentikan:**

- Begitu seed dan bracket publik, siapa pun yang hendak memanggil `awardDraw` bisa menghitung hasilnya
  sendiri lebih dulu dan memutuskan apakah mau repot. Menetapkan hadiah bersifat tanpa izin dan
  aplikasi menawarkannya kepada siapa pun, jadi ini gangguan alih-alih penyensoran, tetapi ia nyata dan
  ia dinyatakan.
- Kalau sama sekali tidak ada yang bertindak di dalam jendela dua periode, undian itu tidak membayar
  apa pun.

## 5. Pemilik pool

Kami. Alamat yang men-deploy kontraknya.

**Menginginkan:** dienumerasi di sini supaya penabung tidak perlu menebak.

**Kuasa, selengkapnya:**

| Kuasa | Batasnya |
| --- | --- |
| Jeda | Menghentikan setoran dan penutupan undian. Tidak pernah menghentikan penarikan, evaluasi, penetapan hadiah, finalisasi atau rekonsiliasi. |
| Menyetel sumber imbal hasil | Memancarkan `YieldSourceSet`. Tidak bisa memengaruhi saldo mana pun yang sudah ada. |
| Menyelamatkan token asing | Tidak bisa menyentuh dana pokok atau kemenangan penabung. |
| Mengalihkan kepemilikan | Dua langkah. Pelepasan dinonaktifkan, jadi kepemilikan tidak bisa dijatuhkan ke kehampaan. |

**Tidak bisa:** membaca dana pokok, kemenangan, bobot atau kredit penabung mana pun, karena kontraknya
tidak pernah memberi pemilik akses ke sana. Tidak bisa mengubah hasil sebuah undian. Tidak bisa
memindahkan uang siapa pun. Tidak bisa meningkatkan kontraknya, karena tidak ada jalur peningkatan.

**Tidak dihentikan:** pemilik yang bermusuhan bisa menjeda setoran tanpa batas waktu, dan bisa
mengarahkan pool ke sumber imbal hasil yang tidak membayar apa-apa. Itu membuat sisi hadiah produk
kelaparan. Itu tidak lagi menghentikan jam: sumber yang gagal ditangkap, panen undian itu dibukukan
sebagai nol, `HarvestFailed` dipancarkan dan penutupan tetap berhasil. Tidak satu pun dari kedua kuasa
itu mengambil satu unit dana pokok siapa pun, dan penarikan tetap bekerja sepanjang waktu.

## 6. Sponsor

Siapa pun yang mendanai sumber imbal hasil Sepolia.

**Menginginkan:** dalam kasus jujur, memberi uang hadiah untuk demo. Dalam kasus bermusuhan, mengatur
waktu atau menahan hadiah.

**Dihentikan oleh:** sponsor tidak punya pengaruh atas siapa yang menang. Mereka mendanai sebuah saldo;
seed, bobot dan ambang batas tidak ada hubungannya dengan mereka. Jumlah sponsor, laju tetesan dan tiap
panen bersifat publik, jadi siapa pun bisa melihat persis berapa uang hadiah yang ada dan seberapa cepat
ia tiba. Sponsorship adalah donasi: ia tidak bisa ditarik kembali setelah diberikan, dan hanya pemilik
sumber yang bisa mengubah laju tetesannya.

**Tidak dihentikan:** sponsor yang berhenti mensponsori mengakhiri hadiah begitu saldonya menetes habis.
Hadiah adalah imbal hasil, dan tanpa imbal hasil tidak ada hadiah. Dana pokok tidak tersentuh sepanjang
waktu itu, yang justru inti dari desain tanpa kehilangan modal.

## 7. Operator token

Zama, sebagai pemilik wrapper token rahasia. Aset tiap pool adalah kontrak mereka, bukan kontrak kami,
dan tiap pool duduk di balik salah satu dari wrapper itu.

**Menginginkan:** dienumerasi, bukan dituduhkan.

**Kuasa, dibaca dari sumber Sepolia yang terverifikasi pada 2 September 2026:**

- `addObserver(address)` memberi sebuah alamat dekripsi tanpa batas atas tiap handle yang hak aksesnya
  dipegang token, **secara surut**. Observer yang ditunjuk kapan pun di masa depan bisa mendekripsi
  jumlah yang sudah ada di rantai, jadi memantau penunjukannya lalu keluar bukan pertahanan. Cakupannya
  adalah tiap jumlah setoran, tiap pembayaran penarikan, saldo token pool sendiri, dan satu transfer
  pendanaan hadiah per batch evaluasi. Tidak ada pembayaran per pemenang untuk dibaca, karena Hearth
  tidak punya transfer hadiah per penabung. Batch yang berisi satu penabung memang membuat total batch
  itu menjadi hadiah persis penabung tersebut, dan pool lima penabung yang hidup pada ukuran batch 4
  menghasilkan satu batch semacam itu tiap undian. `evaluate` mengambil ukuran batch dari pemanggilnya
  dan bersifat tanpa izin, jadi tidak ada batch minimum yang bisa ditegakkan;
  [batasan 7](../limitations.md) mencatatnya sebagai sisa risiko yang diterima dan menyebut
  perbaikannya di sisi kontrak. Keadaan yang hidup hari itu: `observerCount()` bernilai 0 dan
  `observers()` kosong.
- Sebuah daftar larangan. Alamat yang diblokir tidak bisa menyetor, menarik atau membuka bungkus, karena
  masing-masing adalah transfer token dengan alamat itu di salah satu sisinya.
- Sebuah peran pauser, secara live disetel ke alamat nol, jadi penjedaan saat ini dinonaktifkan.
- Implementasinya bisa ditingkatkan pemiliknya di balik sebuah proxy.

**Dihentikan oleh:** tidak ada yang kami kendalikan. Ini asumsi kepercayaan, bukan pertahanan.

**Apa yang tidak dijangkaunya:** buku besar Hearth sendiri. Dana pokok, kemenangan, bobot dan kredit
tinggal di vault, dan token tidak punya hak akses atasnya, bahkan di bawah peningkatan token yang
bermusuhan. Kami memverifikasi ini pada deployment sebelumnya: alamat token mengembalikan false untuk
izin atas handle dana pokok dan kemenangan seorang penyetor, sementara penyetor dan pool mengembalikan
true.

## 8. Kuorum KMS milik Zama

Para pihak yang memegang kunci dekripsi jaringan.

**Menginginkan:** dienumerasi karena ini asumsi terdalam di aplikasi FHEVM mana pun.

**Apa yang bisa mereka lakukan:** kontrak memverifikasi bahwa sebuah teks terang membawa tanda tangan
sah dari kuorum. Ia tidak bisa memverifikasi bahwa teks terang itu adalah teks terang yang sebenarnya
dari handle-nya. Kuorum yang tidak jujur karenanya bisa menandatangani nilai seed pilihannya, dan
kontrak akan menerimanya, yang akan membuatnya bisa memilih pemenang.

**Dihentikan oleh:** tidak ada apa pun di Hearth. Tiap aplikasi di protokol ini mewarisinya, dan
dokumentasi Zama sendiri menyatakan batasnya terus terang: protokol dipercaya untuk menghitung dengan
benar di atas ciphertext dan mendekripsi hanya apa yang ditandai bisa didekripsi publik.

**Layak diketahui:** kuorum tetap tidak bisa membaca apa pun yang tidak ditandai bisa didekripsi publik,
dan di Hearth itu hanya seed, hitungan skala, bendera tidak-kosong, panen, carry tiap tier ketika ia
jatuh tempo, dan penghitung dana yang tidak terpenuhi. Tidak ada nilai penabung perorangan yang pernah
ada di himpunan itu, begitu juga bobot total persis pool.

## 9. Relayer

Layanan yang merutekan permintaan dekripsi antara browser dan protokol.

**Menginginkan:** dienumerasi.

**Bisa:** menolak atau menunda layanan, yang menunda sebuah undian. Ia juga melihat alamat mana yang
meminta mendekripsi handle mana, jadi ia tahu bahwa Anda memeriksa angka Anda sendiri, meski tidak tahu
isinya.

**Tidak bisa:** mendekripsi apa pun sendiri, karena ia tidak memegang kuncinya. Tidak bisa memalsukan
tanda tangan KMS, dan untuk itulah verifikasi on-chain ada. Tidak bisa memberi dirinya akses ke sebuah
handle, karena itu tugas daftar kontrol akses dan ia tinggal di on-chain.

**Dihentikan oleh:** jendela dua periode menyerap relayer yang lambat, dan tenggat penutupan menjamin
setidaknya setengah periode masih tersisa ketika perjalanan bolak-baliknya dimulai. Lewat dari itu
undiannya dilewati, panennya tetap dibukukan dan likuiditasnya tetap ada. Relayer yang mati membuat
sebuah undian hilang, tidak pernah uang.

## Apa yang salah pada desain lama, dan bagaimana yang ini menutupnya

Sebelum pembangunan ulang ini, Hearth adalah satu kontrak bernama `LanternPool` yang membobot penabung
berdasarkan saldo mereka pada detik undian dan memindai penyetor dalam potongan-potongan. Kami
mengauditnya terhadap diri kami sendiri pada 2 September 2026 dan mengeksekusi serangannya alih-alih
menalarkannya. Enam dari delapan temuan di bawah direproduksi dalam kode yang berjalan.

| # | Apa yang salah | Bukti | Bagaimana desain ini menutupnya |
| --- | --- | --- | --- |
| 1 | **Setoran kilat.** Tanpa pembobotan waktu, setoran yang dibuat satu blok sebelum undian dihitung penuh. | Dieksekusi di mock: 20 siklus, penyerang memenangkan 19 dari 20 dan menguras cadangan 5.000 USDC. Seluruh siklusnya juga muat dalam satu transaksi, 2.189.992 gas. | Peluang datang dari rata-rata tertimbang waktu sepanjang periode. Setoran menit terakhir memperoleh pecahan periodenya saja dan tidak lebih. |
| 2 | **Transaksi klaim adalah petunjuk pemenang.** Klaim pemenang dan yang kalah identik, tetapi hanya pemenang yang punya alasan mengirimnya. | Dieksekusi: klaim pemenang dan yang kalah masing-masing memakan 391.944 gas di mock dengan log yang identik. Di Sepolia sebuah klaim mendarat 48 detik setelah sebuah penyelesaian. | Tidak ada fungsi klaim. Hadiah mendarat di saldo kemenangan terenkripsi selama evaluasi, `withdraw` adalah satu-satunya jalan keluar, dan evaluasi tidak bisa diarahkan ke diri sendiri. |
| 3 | **Satu bit publik tiap undian.** Handle kemenangan sebuah tiket rumah dipublikasikan ulang sebagai bisa didekripsi publik di tiap undian, membocorkan apakah pihak rumah menang, yang dengan satu penabung sungguhan menyebutkan nama pemenangnya. | Dieksekusi di mock sepanjang 16 undian, dan dikonfirmasi di Sepolia pada tiga undian yang terselesaikan. | Tidak ada tiket rumah. Satu-satunya nilai yang bisa didekripsi publik adalah seed, hitungan skala, bendera tidak-kosong, panen, carry tier dan penghitung dana yang tidak terpenuhi. Tidak satu pun bersifat per penabung. |
| 4 | **Tidak bisa diverifikasi publik.** Total pool tidak pernah dipublikasikan, jadi orang luar sama sekali tidak bisa memeriksa undiannya. | Dibaca dari sumber yang di-deploy dan dikonfirmasi secara live. | Seed dan bracket dipublikasikan dengan bukti KMS yang diverifikasi di on-chain, dan tiap ambang batas bisa dihitung ulang siapa pun dari dua angka itu. |
| 5 | **Imbal hasil dibukukan dari laporan.** Penambahan cadangan dibukukan dari jumlah yang dioper masuk, sementara wrapper mencetak `amount / rate()`. Laten di Sepolia hanya karena rate-nya kebetulan 1. | Dieksekusi terhadap token uji berdesimal 18, di mana rate-nya sejuta juta. | Pool hanya membukukan jumlah terverifikasi KMS yang benar-benar ditransfer sumbernya. |
| 6 | **Penggangguan pendaftaran gratis.** Dompet yang tidak pernah memegang tokennya bisa mendaftarkan dirinya, dan seorang operator bisa mendaftarkan dompet lain dengan satu nol terenkripsi yang dipakai ulang. | Dieksekusi. | Pendaftaran tetap terbuka, menurut konstruksinya. Penabung palsu membawa bobot nol, tidak mengubah peluang siapa pun dan dilewati dalam teks terang. Satu-satunya biayanya adalah gas keeper, dan yang dibatasi keeper adalah harga gas yang mau dibayarnya, bukan pekerjaan yang mau dikerjakannya. |
| 7 | **Celah pembungkusan, tanpa mitigasi.** Aplikasi membungkus dan menyetor dalam satu alur. | Diukur secara live: tiga dari lima setoran duduk dua sampai empat blok setelah pembungkusan publik 100 USDC. | Bungkus dan setor adalah langkah terpisah dan aplikasi menjelaskan alasannya. Celahnya berkurang, bukan hilang, dan merupakan batasan 10. |
| 8 | **Tidak ada keeper.** Undian bersifat tanpa izin tetapi tidak ada yang menjalankannya: pool yang hidup duduk 26 jam dengan undian yang bisa dibuka. | Dibaca secara live dari rantai. | Sebuah skrip keeper menjalankan tiap langkah dan penabung mana pun bisa memajukan undian dari aplikasi. Pool mengimplementasikan antarmuka automation milik Chainlink untuk langkah penutupan sebagai redundansi tambahan, meski belum ada upkeep yang terdaftar. |

Dua perubahan desain lagi keluar dari tinjauan 3 September dan tidak ada di tabel itu, karena desain
lama tidak sampai sejauh itu untuk memilikinya: mempublikasikan agregat persis diganti dengan bracket
(penyerang 1 di atas), dan besar hadiah dipindahkan dari penetapan hadiah ke penutupan sehingga tidak
ada hadiah yang bisa diubah besarnya setelah seed-nya ada.

## Apa yang diperiksa, dan bagaimana

Tiap klaim di atas punya pengujian. Keluaran yang dieksekusi mendarat di `docs/security/attacks` dan
angkanya ditempelkan ke README.

| Klaim | Pemeriksaannya |
| --- | --- |
| Orang asing tidak bisa membaca nilai seorang penabung | Minta relayer mendekripsi dana pokok, kemenangan, bobot dan kredit alamat lain. Harapkan penolakan pada keempatnya. |
| Total persis pool tidak bisa diperoleh | Minta handle bobot agregat ke relayer. Harapkan penolakan. Lalu selisihkan bracket yang dipublikasikan dari undian berurutan di pool tempat satu penabung memindahkan uang, dan tunjukkan jawabannya adalah pita berfaktor dua, bukan sebuah angka. |
| Setoran kilat hampir tidak memperoleh apa-apa | Setor menjelang akhir periode, evaluasi, dan bandingkan bobot tersimpannya dengan pemegang satu periode penuh. |
| Penabung palsu tidak bisa memacetkan undian | Daftarkan banyak alamat kosong, lalu jalankan satu undian penuh. |
| Tidak ada yang bisa memilih siapa yang dievaluasi | Panggil `evaluate` dari alamat seorang penabung sendiri dan tunjukkan penelusuran maju dari kursor yang diturunkan dari seed, bukan dari penabung itu. |
| Penutupan yang terlambat ditolak | Panggil `closeDraw` setelah `closeDeadline` dan harapkan kegagalan; lalu pastikan undiannya bisa dilewati dan likuiditasnya tidak tersentuh. |
| Penetapan hadiah yang terlewat tidak menghilangkan apa pun | Biarkan jendelanya lewat, tetapkan hadiah terlambat, dan periksa panennya dibukukan, likuiditas yang ditawarkan kembali ke tier-tier dan undiannya terbaca `Skipped`. |
| Sumber imbal hasil yang gagal tidak menghentikan jam | Pasang sumber yang gagal, tutup sebuah undian, dan harapkan keberhasilan plus `HarvestFailed`. |
| Tier yang kelebihan pemenang membatasi alih-alih membayar lebih | Paksa lebih banyak pemenang daripada yang bisa didanai tier itu dan periksa bahwa yang dibayar tidak pernah melebihi yang ditawarkan. |
| Sebuah bukti tidak bisa diputar ulang | Kirim ulang bukti penetapan hadiah terhadap undian lain. Harapkan kegagalan. |
| Tidak ada yang menarik lebih dari yang dimilikinya | Pengujian properti: untuk tiap akun, penarikan tidak pernah melebihi dana pokok ditambah kemenangan. |
| Uang terkonservasi | Pengujian properti: saldo token vault sama dengan total dana pokok ditambah total kemenangan yang belum diklaim, dan saldo token pool sama dengan likuiditas terang ditambah tiap carry terenkripsi ditambah likuiditas yang ditawarkan dan belum difinalisasi ditambah panen yang diterima pada penutupan dan belum dibukukan oleh penetapan hadiah. Suku terakhir itu adalah panen di antara penutupan yang menerimanya dan penetapan hadiah yang membaginya ke tier-tier, ketika ia bukan milik tier mana pun dan undian mana pun. |

## Apa yang tidak dibahas model ancaman ini

- Apa pun di luar rantai: perangkat Anda, cara dompet Anda menangani kunci, endpoint RPC yang Anda
  pakai, dan metadata tingkat jaringan.
- Serangan ekonomi terhadap tempat imbal hasilnya sendiri. Di mainnet, risiko vault diwarisi sepenuhnya
  dari vault ERC-4626 di balik batcher milik Zama.
- Verifikasi formal. Hearth diaudit sendiri dengan serangan yang dieksekusi dan pengujian properti. Ia
  belum diaudit pihak ketiga, dan halaman ini adalah pengganti yang jujur, bukan penggantinya yang
  setara.
