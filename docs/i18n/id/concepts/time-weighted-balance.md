# Saldo tertimbang waktu

Peluang Anda dalam sebuah undian tidak didasarkan pada apa yang Anda pegang saat undian
berlangsung. Peluang itu didasarkan pada saldo rata-rata Anda sepanjang periode. Halaman ini
menjelaskan alasannya, berapa harganya bagi penyetor yang terlambat, dan mengapa vault hanya
perlu mengingat tiga momen per penabung.

## Mengapa rata-rata, bukan saldo akhir

Ambil dulu desain yang sederhana: bobot semua orang berdasarkan saldo mereka pada detik undian
diambil. Itu mudah dibangun, dan itu rusak.

Seorang penyerang menyetor jumlah besar, menunggu undian, menang, lalu menarik. Uangnya ada di
pool selama satu blok. Ia tidak menghasilkan imbal hasil untuk siapa pun, tidak menanggung
risiko apa pun, dan mengambil hadiah yang didanai penabung yang sabar. Lalu ia mengulanginya di
undian berikutnya.

Kami mengeksekusi ini terhadap desain kami sendiri yang lebih awal pada 2 September 2026. Di
sebuah pool di mana satu penabung jujur memegang 100 USDC, seorang penyerang yang memutar 9.000
USDC masuk-keluar di sekitar tiap undian memenangkan 19 dari 20 undian dan menguras cadangan
hadiah 5.000 USDC. Modal penyerang tidak pernah berisiko, karena pool tanpa kehilangan modal
menurut definisinya mengembalikannya. Seluruh siklusnya bahkan muat dalam satu transaksi:
setor, buka undian, pindai, tarik, gas 2.189.992.

Perbaikannya sama dengan yang dipakai PoolTogether. Dokumentasi mereka sendiri mengatakannya
begini: kemampuan menengok ke belakang itu penting "so that users can deposit and withdraw
freely into a prize pool while having their liquidity contribution measured perfectly." Ukur
kontribusinya, bukan potretnya.

## Berapa nilai setoran yang terlambat

Satu periode adalah 3.600 detik di pool USDC dan 21.600 di enam lainnya. Bobot adalah saldo
dikalikan detik ia dipegang, jadi satuannya adalah saldo-detik dari token pool itu sendiri.
Contoh di bawah adalah pool USDC yang per jam.

| Penabung | Yang mereka lakukan | Bobot untuk periode itu |
| --- | --- | --- |
| Ada | Memegang 100 USDC selama 3.600 detik penuh | 100 x 3600 = 360.000 |
| Ben | Menyetor 1.000 USDC ketika tersisa 360 detik | 1.000 x 360 = 360.000 |
| Cy | Memegang 1.000 USDC sepanjang periode | 1.000 x 3600 = 3.600.000 |

Ben memasukkan uang sepuluh kali lipat milik Ada dan membeli peluang yang persis sama, karena
dia hanya hadir sepersepuluh waktunya. Cy, yang melakukan apa yang memang tujuan produk ini,
punya peluang sepuluh kali lipat dibanding keduanya.

Kasus cerminnya juga berlaku. Tarik dana Anda tepat saat sebuah undian ditutup dan Anda tetap
memegang bobot yang sudah Anda peroleh untuk periode yang selesai, dan Anda hampir tidak
membawa apa-apa ke periode berikutnya. Anda tidak bisa menyewa peluang.

Tidak satu pun dari ini menghentikan seseorang yang benar-benar memegang saldo besar selama
satu periode penuh untuk menang sering. Itu bukan serangan. Itu produk yang bekerja: uang
mereka ada di pool, menghasilkan imbal hasil yang membayar hadiah semua orang, sepanjang waktu
itu.

## Bagaimana vault mengingat

Vault menyimpan tiga potret per penabung, yang disebut observasi. Masing-masing memuat tiga
hal: total berjalan saldo-detik, saldo tepat setelah perubahan itu, dan stempel waktunya. Tiga
slot itu bernama `current`, `previous` dan `older`.

Total berjalan direset di awal tiap periode. Reset itulah yang menjaga angkanya tetap kecil: di
dalam satu periode ia tidak pernah bisa melebihi saldo dikalikan panjang periode.

Ketika saldo Anda berubah, salah satu dari tiga hal terjadi:

- **Perubahan pertama Anda.** Slot `current` dibuat dengan total berjalan nol dan saldo baru
  Anda.
- **Perubahan di periode yang sama dengan `current`.** Vault menambahkan saldo-detik yang Anda
  peroleh sejak perubahan terakhir, lalu menimpa `current` di tempat. Tidak ada slot baru yang
  terpakai.
- **Perubahan di periode yang lebih baru daripada `current`.** Ketiga slot bergeser turun:
  `older` mengambil `previous` yang lama, `previous` mengambil `current` yang lama, dan
  `current` yang segar ditulis, membawa saldo-detik yang Anda peroleh dari awal periode ini
  sampai sekarang.

Membaca bobot Anda untuk periode `p` memakai observasi terbaru pada atau sebelum periode itu:

- Kalau observasinya duduk di dalam periode `p`, bobot Anda adalah total berjalan yang
  dibawanya ditambah saldo Anda dikalikan detik dari momen itu sampai akhir periode.
- Kalau ia duduk sebelum periode `p`, Anda tidak menyentuh saldo Anda selama periode itu sama
  sekali, jadi bobot Anda hanyalah saldo itu dikalikan panjang periode penuh.
- Kalau Anda tidak punya observasi pada atau sebelum periode `p`, Anda belum menjadi penabung,
  dan bobot Anda nol. Kasus itu diputuskan dari stempel waktu publik tanpa aritmetika
  terenkripsi sama sekali.

Setiap langkah terenkripsi di sini adalah satu perkalian dengan angka publik dan satu
penjumlahan. Itulah yang membuat evaluasi cukup murah untuk di-batch.

Satu detail yang penting untuk argumen penghitungan di bawah. Setiap keluar menulis sebuah
observasi, entah ia memindahkan dana pokok atau tidak, karena vault tidak bisa melihat dari
saldo mana di antara dua saldo Anda penarikan itu diambil. Itu tidak berbahaya: sebuah slot
hanya bergeser ketika periode baru sudah dimulai, jadi penarikan kemenangan saja tidak memakan
slot melebihi yang memang akan dipakai periode Anda.

## Mengapa tiga observasi sudah cukup

Ini pertanyaan yang seharusnya diajukan seorang peninjau, dan jawabannya adalah argumen
penghitungan.

Slot baru hanya didorong ketika perubahan saldo mendarat di periode yang lebih baru daripada
periode tempat `current` berada. Paling banyak satu dorongan terjadi per periode, tidak peduli
berapa kali Anda menyetor atau menarik di dalamnya.

Undian `p` hanya bisa ditutup, ditetapkan hadiahnya dan dievaluasi selama periode `p+1` dan
`p+2`. Jadi pada saat siapa pun membaca bobot Anda untuk periode `p`, paling banyak dua periode
setelah `p` sudah dimulai, dan karenanya paling banyak dua observasi baru sudah didorong di
atas apa pun yang paling baru pada atau sebelum periode `p`. Tiga slot menampungnya: yang kita
butuhkan, ditambah paling banyak dua yang mendarat setelahnya.

Itulah sebabnya jendelanya dua periode dan tidak lebih. Perlebar jendelanya dan Anda butuh slot
keempat; persempit menjadi satu periode dan satu respons relayer yang tertunda bisa membuat
sebuah undian hilang, yang justru sangat mungkin terjadi pada periode pendek. Penutupan punya
tenggatnya sendiri, setengah periode sebelum jendela berakhir, jadi tiga slot yang sama selalu
mencakup perjalanan bolak-balik yang mengikuti sebuah penutupan.

Vault menyimpan tiga observasi yang sama untuk total saldo pool, jadi bobot agregat sebuah
periode dihitung dengan aturan yang identik dan berlaku pada jendela yang sama. Agregat itu
tidak pernah dipublikasikan. Yang dipublikasikan vault adalah bracket pangkat dua di atasnya,
dan ia menghitung bracket itu dengan membandingkan angka terakumulasi yang sama terhadap lima
pangkat dua tetap di bawah enkripsi. Lihat
[apa yang tetap privat](../security/what-stays-private.md).

## Dua batas ukuran

Nilai terenkripsi di sini adalah bilangan bulat tak bertanda 64 bit, jadi aritmetikanya harus
tetap di dalam rentang itu. Meluapkan angka terenkripsi lebih buruk daripada meluapkan angka
biasa, karena tidak ada yang gagal dan tidak ada yang melihatnya terjadi.

**Per penabung.** Vault menolak setoran mana pun yang jumlahnya, atau yang dana pokok hasilnya,
berada di atas `maxPrincipal = (2^64 - 1) / L`. Pada periode satu jam itu kira-kira 5 miliar
token, pada periode enam jam kira-kira 854 juta, dan pada periode harian kira-kira 213 juta.
Karena total berjalan Anda tidak bisa melebihi saldo Anda dikalikan panjang periode, dan saldo
Anda tidak bisa melebihi batas itu, total berjalan Anda tidak bisa melebihi 64 bit. Penolakannya
dikembalikan sebagai false terenkripsi dan token mengembalikan dana Anda di transaksi yang
sama, jadi menyentuh batas itu tidak membocorkan saldo Anda.

Pemeriksaannya membatasi jumlah yang masuk sekaligus hasilnya, dan batas kedua itu bukan
hiasan. Penjumlahan terenkripsi berputar pada 64 bit tanpa gagal, jadi setoran sebesar `2^64`
dikurangi dana pokok Anda akan menghasilkan jumlah nol, dan pemeriksaan yang hanya melihat
jumlahnya akan meloloskannya. Dengan jumlah masuk dan dana pokok yang ada sama-sama ditahan di
bawah batas, jumlahnya tidak bisa mencapai `2^64` pada panjang periode mana pun yang
diizinkan konstruktor, jadi putaran itu tidak terjangkau alih-alih sekadar tidak mungkin.

**Untuk total pool.** Akumulator berjalan milik total itu berukuran 128 bit alih-alih 64, jadi
agregatnya tidak bisa meluap untuk pasokan berapa pun yang mampu dicetak wrapper.

Versi lebih awal desain ini mengklaim akumulator 64 bit tidak mungkin meluap. Itu salah, sebuah
tinjauan desain menangkapnya, dan batas per penabung plus total 128 bit adalah perbaikannya.

## Apa yang tidak dibahas halaman ini

Halaman ini tidak membahas apa yang terjadi setelah bobot Anda diketahui. Itu ada di
[uji pemenang](winner-selection.md). Halaman ini juga tidak mengklaim bahwa pembobotan waktu
adalah fitur privasi: bobot Anda terenkripsi, tetapi bracket tempat total pool jatuh
dipublikasikan tiap undian, dan dengan sangat sedikit penabung bracket itu mematok sebuah bobot
dalam rentang faktor dua. Lihat [apa yang tetap privat](../security/what-stays-private.md).
