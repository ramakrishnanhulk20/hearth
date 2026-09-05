# Hadiah dan tier

Imbal hasil masuk sebagai satu bongkahan tiap periode. Tier adalah cara bongkahan itu menjadi
campuran hadiah kecil yang sering dan satu hadiah besar yang langka. Halaman ini menjelaskan
sisi uangnya: bagaimana likuiditas dibagi, bagaimana besar sebuah hadiah ditentukan, apa yang
terjadi ketika sebuah tier membayar lebih banyak daripada rencananya, dan tiga tempat kami
sengaja berbeda dari PoolTogether V5.

Besar hadiah, likuiditas tier dan jumlah hadiah selalu publik di PoolTogether, dan bagian terang
dari ketiganya juga publik di sini. Yang tetap terenkripsi adalah siapa yang menang, dan satu
total berjalan per tier yang disebut carry.

## Likuiditas dan share

Tiap tier memegang sebuah pot yang disebut likuiditasnya, dalam angka terang yang bisa dibaca
siapa pun. Dua hal mengalir masuk ke sana:

- **Panen.** Tiap penetapan hadiah membagi panen yang terverifikasi ke seluruh tier menurut
  bobot share mereka. Sisa bulat dari pembagian itu, yaitu beberapa unit dasar yang tidak habis
  dibagi, jatuh ke tier utama alih-alih dibuang. Panen yang dibukukan pada penetapan hadiah
  undian `p` ditawarkan pada penutupan berikutnya, bukan pada undian `p` itu sendiri.
- **Carry yang direkonsiliasi.** Apa pun yang ditawarkan sebuah tier di undian sebelumnya dan
  tidak dimenangkan siapa pun kembali ketika tier itu direkonsiliasi, yang di Sepolia adalah
  satu undian kemudian.

Tiap tier juga memegang pot kedua, yaitu **carry**, dan yang satu itu terenkripsi. Ia adalah
total berjalan dari semua yang ditawarkan tier itu dan tidak dimenangkan siapa pun, dan ia
ditambahkan ke tawaran tier itu pada tiap penutupan meski besarnya rahasia.

Pada penutupan, untuk tiap tier:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Dua hal yang bisa dibaca dari itu. Besar hadiah datang dari bagian terangnya saja, dan itulah
yang menjaganya tetap publik. Carry terenkripsi hanya pernah menambah kapasitas, jadi sebuah
tier selalu setidaknya sesanggup membayar seperti yang disiratkan besar hadiah publiknya.

`UTILISATION` adalah 50 persen. Itu tingkat utilisasi milik PoolTogether, dan itulah pertahanan
terhadap kelebihan pemenang: sebuah tier menawarkan seluruh likuiditasnya tetapi menentukan
besar tiap hadiah seolah-olah ia hanya punya setengahnya. Karena itu sebuah tier bisa membayar
dua kali lipat jumlah hadiah yang diperkirakannya sebelum ia kering.

**Semua ini ditetapkan pada penutupan, sebelum seed acak untuk undian itu ada.** Seed ditarik
belakangan dalam transaksi yang sama. Tidak ada yang bisa melihat sebuah seed, menghitung bahwa
dia menang, lalu memindahkan uang antar tier supaya kemenangan itu lebih besar.

## Tiga tier di Sepolia

Tiap pool membawa set tier-nya sendiri, karena peluangnya adalah pecahan dari periode pool itu
sendiri. Pool USDC yang per jam:

| Tier | Hadiah per undian (`count`) | Peluang | Shares | Direkonsiliasi tiap | Rasanya seperti apa |
| --- | --- | --- | --- | --- | --- |
| Utama | 1 | 1 dari 24 | 40 | 1 undian | Langka dan besar |
| Menengah | 1 | 1 dari 6 | 20 | 1 undian | Beberapa kali sehari |
| Sering | 4 | 1 dari 1 | 40 | 1 undian | Empat hadiah tiap undian |

Enam pool yang mengundi tiap enam jam memakai count, shares dan irama yang sama dan hanya
mengubah peluangnya: utama 1 dari 4, menengah 1 dari 2, sering 1 dari 1. Undian enam jam enam
kali lebih langka, jadi 1 dari 4 membuat hadiah utama cair kira-kira sekali sehari, irama yang
sama dengan yang diberikan set per jam. Tier menengah adalah satu-satunya perbedaan: sekitar dua
kali sehari di pool enam jam melawan sekitar empat kali sehari di pool per jam. Mengapa enam
jam: [pool dan token](pools-and-tokens.md).

Total share adalah 100 di kedua set, jadi tier utama mengambil 40 persen dari tiap panen, tier
menengah 20 persen dan tier sering 40 persen. Setiap tier di setiap pool direkonsiliasi tiap
undian, yang merupakan pilihan dengan harga di kedua sisinya; itu punya bagiannya sendiri di
bawah.

### Apa yang dihasilkan pengaturan itu

Tulis `H` untuk panen yang terkumpul dalam satu periode. Jumlah hadiah nominal yang diharapkan
sebuah tier per undian adalah `count * odds`. Masukkan itu kembali ke rumus penentuan besar
hadiah dan tiap tier mengendap pada keadaan tunak:

| Tier | Likuiditas saat tunak | Besar hadiah | Pembayaran yang diharapkan per undian | Seberapa sering cair |
| --- | --- | --- | --- | --- |
| Utama | 19,2 H | 9,6 H | 0,4 H | Sekitar sekali sehari |
| Menengah | 2,4 H | 1,2 H | 0,2 H | Sekitar tiap enam jam |
| Sering | 0,8 H | 0,1 H | 0,4 H (empat hadiah) | Tiap undian |

Ketiga pembayaran yang diharapkan itu berjumlah persis `H`. Seluruh imbal hasil keluar sebagai
hadiah dan tidak ada yang menumpuk selamanya.

Tabel itu untuk pool per jam. Pool enam jam mengumpulkan enam kali lipat dalam satu periode dan
mengundi enam kali lebih jarang, dan peluangnya yang lebih pendek menyebarkan pemasukan itu ke
jumlah hadiah yang sama: tier utama mengendap pada 3,2 H likuiditas dan hadiah 1,6 H, tier
menengah pada 0,8 H dan 0,4 H, dan tier sering tidak berubah pada 0,1 H per hadiah. Diukur dalam
uang sungguhan alih-alih dalam `H`, hadiah utama pool enam jam sama besarnya dengan hadiah utama
pool per jam yang menghasilkan pada laju yang sama, karena undian yang lebih langka membawa
panen enam kali lipat.

Itu angka nominalnya. Undian berjalan terhadap bracket `M` alih-alih total persis `W`, dan `M`
berada di antara `W` dan `2W`, jadi sebuah tier sebenarnya membayar antara setengah dan seluruh
jumlah hadiah nominalnya tiap undian. Lihat [pemilihan pemenang](winner-selection.md). Yang
tidak dibayarkannya masuk ke carry dan ditawarkan lagi, jadi tidak ada yang hilang; yang terjadi
justru besar hadiah mengendap di suatu titik antara angka di atas dan dua kali lipatnya,
tergantung di mana total pool duduk di dalam bracket-nya. Pool yang dekat puncak sebuah bracket
membayar mendekati tabel. Pool yang baru saja melewati sebuah pangkat dua membayar hadiah yang
lebih sedikit dan lebih besar untuk sementara.

Satu alasan tabel itu menggambarkan deployment yang hidup alih-alih yang ideal: setiap tier
direkonsiliasi tiap undian. Apa yang ditawarkan sebuah tier dan tidak dimenangkan siapa pun
dipublikasikan pada finalisasi undian itu dan langsung dibukukan kembali ke likuiditas publiknya,
jadi likuiditas tunak sebuah tier benar-benar mengendap di angka yang disebut tabel, dan pot yang
ditampilkan aplikasi adalah pot yang benar-benar dibawa tier itu. Pada irama yang lebih lambat,
uang yang sama tetap ditawarkan dan tetap bisa dimenangkan, tetapi ia akan duduk di carry
terenkripsi di antara rekonsiliasi, dan likuiditas publik, yang menentukan besar hadiah, hanya
akan berisi panen yang dibukukan sejak rekonsiliasi terakhir tier itu. Bagian berikutnya adalah
pertukaran itu selengkapnya.

Untuk memberinya angka, misalkan sumber USDC Sepolia meneteskan 10 USDC per periode. Maka hadiah
utama duduk di dekat 96 USDC dan cair kira-kira sekali sehari, hadiah menengah di dekat 12 USDC
kira-kira tiap enam jam, dan empat hadiah sekitar 1 USDC mendarat di tiap undian, dengan
masing-masing angka itu bebas naik sampai dua kali lipat tergantung bracket-nya. Laju tetesan
yang hidup di pool itu adalah
`5,555 base units a second, which is 19.998 USDC a period`, laju tiap pool terdaftar di
[pool dan token](pools-and-tokens.md), dan besar hadiah yang hidup ada di kartu "The pool right
now" pada dasbor pool itu di `/app/<slug>`, dibaca dari rantai.

Ini adalah argumen konstruktor, dipilih dengan rumus peluang PoolTogether V5 dan ditulis per pool
di `packages/contracts/hearth.config.ts`. Deployment mainnet dengan periode harian akan memakai
angka yang berbeda lagi; lihat [deployment](../operations/deploying.md).

## Irama rekonsiliasi, dan berapa harga menaikkannya

Merekonsiliasi sebuah tier mempublikasikan carry-nya, dan carry itu persis uang yang ditawarkan
tier tersebut dan tidak dimenangkan siapa pun. Kurangkan dari yang ditawarkan, bagi dengan besar
hadiahnya, dan Anda tahu berapa hadiah yang dibayarkan tier itu. Angka itu adalah pengungkapan
nyata: ia adalah pengukuran atas saldo terenkripsi, dalam bentuk "berapa banyak dari para
penabung ini yang bobotnya di atas ambang batas mereka masing-masing yang dipublikasikan".

`reconcileEvery[t]` adalah tombol pengatur pengungkapan itu, dan ia adalah argumen konstruktor
per tier. Menaikkannya menyembunyikan hitungan itu selama sekian undian lalu mempublikasikan
satu angka untuk keseluruhan rentang. Setel tier utama ke 24 dan hitungannya menjadi angka
harian, dan orang-orang yang mungkin dimaksud adalah semua yang berhak kapan pun sepanjang hari
itu alih-alih kira-kira empat persen pool yang berhak dalam satu undian. Pada tier 1 dari 24
perbedaan itu bukan kosmetik: hitungan per undian menyebut pemenang jackpot dari himpunan kecil.

Harga menaikkannya adalah jackpot itu sendiri. Sebuah penutupan memindahkan seluruh likuiditas
publik sebuah tier ke dalam undian dan meninggalkan tier itu di nol, dan uang itu hanya kembali
pada sebuah rekonsiliasi. Jadi dengan irama 24, pada 23 dari tiap 24 undian likuiditas publik
tier utama hanyalah panen yang dibukukan sejak rekonsiliasi terakhir, hadiah yang dipublikasikan
ditentukan dari porsi satu undian itu, dan pot yang menumpuk baru muncul terbuka pada undian
rekonsiliasi. Uangnya tidak menganggur sementara itu, karena carry terenkripsi ditambahkan ke
tawaran tier itu pada tiap penutupan dan bisa dimenangkan sepanjang waktu. Namun ia tak terlihat,
dan jackpot yang tak bisa ditonton bertumbuh sebenarnya bukan jackpot.

Hitungan hadiah yang tersembunyi dan jackpot yang terlihat menumpuk tidak bisa berlaku bersamaan.
**Deployment ini memilih jackpot yang terlihat.** Ketiga tier berjalan pada `reconcileEvery = 1`,
jadi carry tiap tier dipublikasikan pada finalisasi undian asalnya, diverifikasi di on-chain
terhadap handle yang dipublikasikan vault, dan dibukukan kembali ke likuiditas publik oleh
`reconcile`. Pot menumpuk secara terbuka, seperti pot PoolTogether, dan berapa hadiah yang
dibayarkan tiap tier menjadi publik satu undian kemudian, juga seperti PoolTogether. Tidak pernah
siapa yang menang, dalam kedua kasus.

Itu membuat hitungan di atas menjadi sisa risiko yang diungkapkan alih-alih yang dimitigasi.
Penalarannya tidak berubah dan tetap benar: hitungan per undian pada tier 1 dari 24 adalah
pengukuran atas himpunan kecil penabung yang berhak dalam undian itu, dan ia menumpuk terhadap
saldo yang tidak pernah bergerak. Pengukurannya lebih lemah di pool enam jam, yang tier utamanya
1 dari 4, jadi tiap hitungan mencakup sekitar seperempat pool alih-alih seperdua puluh empat, dan
jumlahnya empat sehari alih-alih dua puluh empat. Itu ditulis di
[apa yang tetap privat](../security/what-stays-private.md) dan dibawa di
[daftar batasan](../limitations.md). Dua hal masih membatasinya. Hitungannya kasar, karena tidak
ada yang lebih halus daripada bilangan bulat hadiah yang pernah dipublikasikan. Dan ambang
batasnya tidak bisa diarahkan ke saldo yang dicurigai, karena seed ditarik di dalam koprosesor
dan diungkap hanya setelah periodenya berakhir.

Deployment yang lebih suka pengukuran yang lambat daripada pot yang terlihat menyetel tombolnya
lebih tinggi dan mengambil pertukaran itu ke arah sebaliknya. Itu satu kali deploy ulang.

## Kelebihan pemenang: ketika sebuah tier membayar lebih dari rencananya

Hadiah bersifat independen, jadi tier yang mengharapkan empat hadiah kadang membagikan enam, atau
sembilan. Tiap hadiah adalah seperdelapan likuiditas tier sering, jadi ia bisa membayar delapan.
Lewat dari itu, tier-nya kosong.

Hearth menangani ini dengan penghitung terenkripsi per tier per undian. Tiap pembayaran dibatasi
ke yang lebih kecil antara yang dimenangkan penabung dan yang tersisa di tier itu, dan
penghitungnya turun sebesar jumlah yang sudah dibatasi. Tidak ada transaksi yang gagal, dan
aritmetika siapa pun tidak meluap.

### Apa yang dialami pemenang yang terlambat

Evaluasi menelusuri daftar penabung dari titik awal yang diturunkan dari seed undian itu. Kalau
tier-nya kosong di tengah penelusuran:

- Penabung yang sedang dievaluasi pada saat itu mendapat apa pun yang tersisa, yang mungkin lebih
  sedikit daripada hadiah yang menurut ambang batasnya dia menangkan.
- Penabung yang lebih belakangan dalam penelusuran tidak mendapat apa pun dari tier itu pada
  undian itu. Tier lain tidak terpengaruh: tiap tier punya penghitungnya sendiri.

Tidak ada yang bisa membeli posisi lebih baik di antrean itu. Urutan penelusuran ditetapkan oleh
seed, pemanggil `evaluate` memilih berapa banyak penabung yang dimajukan dan tidak pernah yang
mana, dan titik awalnya berpindah tiap undian, jadi tidak ada alamat yang secara sistematis
berada di belakang.

Ini terlihat oleh penabung yang terkena, bukan diam-diam. Bobot tersimpan dan kredit tersimpan
mereka untuk undian itu keduanya bisa mereka dekripsi, jadi mereka bisa menghitung ulang ambang
batasnya dari seed publik dan melihat bahwa kreditnya kurang.

### Seberapa sering itu terjadi

Untuk tier sering, dengan banyak penabung kecil, jumlah hadiah yang dibagikan mendekati sebaran
Poisson dengan rata-rata 4, dan tier itu bisa membayar 8. Peluang membutuhkan yang kesembilan
sekitar 2 persen per undian. Karena undian berjalan terhadap bracket alih-alih total persisnya,
hitungan yang benar-benar diharapkan adalah antara 2 dan 4, jadi 2 persen adalah batas atas dan
bukan kasus yang khas. Untuk dua tier dengan `count = 1`, jumlah hadiah yang diharapkan jauh di
bawah satu sementara kapasitasnya tetap dua, jadi pembatasan di sana lebih jarang beberapa orde
besaran.

Pendekatan itu mengasumsikan pool berisi banyak penabung kecil. Di pool berisi tiga penabung
dengan ukuran sangat berbeda, sebarannya berbeda, dan di pool demo kecil di Sepolia mudah sekali
menyusun undian yang terkena pembatasan. Itu sifat dari ukuran demo, bukan bug.

## Tiga perbedaan yang disengaja dari PoolTogether V5

Ketiganya dinyatakan di sini alih-alih dikubur, karena peninjau yang mengenal V5 akan mencarinya.

### 1. Undian berjalan terhadap sebuah bracket, bukan total persisnya

V5 menjalankan uji pemenangnya terhadap total pasokan persis untuk undian itu, yang bisa
dilakukannya karena angka itu publik di rantai yang transparan. Mempublikasikan total persis di
sini akan membocorkan jumlah setoran perorangan, jadi Hearth hanya mempublikasikan bracket
pangkat dua di atasnya.

Konsekuensinya adalah yang dijelaskan di atas: sebuah tier membayar antara setengah dan seluruh
jumlah hadiah nominalnya tiap undian, dan besar hadiah mengendap lebih tinggi seiring itu. Tidak
ada uang yang hilang dan peluang tidak ada penabung yang terdistorsi relatif terhadap penabung
lain, karena tiap penabung di sebuah tier diskalakan dengan `W / M` yang sama. Ini batasan 12.

### 2. Tidak ada tier cadangan

V5 mengambil sebagian dari tiap kontribusi ke dalam cadangan. Cadangan itu mendanai insentif untuk
menetapkan hadiah undian, dan ia meredam tier yang kelebihan pemenang dengan menambahnya.

Hearth tidak punya cadangan. Tingkat utilisasi 50 persen adalah satu-satunya bantalannya, dan itu
alternatif yang disebut dokumentasi V5 sendiri untuk deployment yang memakai
`tierLiquidityUtilizationRate` untuk tujuan ini. Konsekuensinya adalah pembatasan yang dijelaskan
di atas: pada undian langka yang kelebihan pemenang, pemenang terakhir dalam urutan penelusuran
mendapat kurang alih-alih ditambah.

Kami memilih ini karena cadangan butuh jalur penarikan yang dikendalikan pemilik supaya berguna,
dan tiap kuasa pemilik di pool rahasia adalah sesuatu yang harus dipercaya penabung.
Pertukarannya tertulis di [daftar batasan](../limitations.md) sebagai batasan 4.

### 3. Peluang tier utama diukur atas satu periode

V5 mengukur peluang tier utama atas seluruh jendela akrual tier itu, jadi peluang mengambil pot
yang sudah menumpuk setahun mencerminkan partisipasi setahun.

Hearth mengukur peluang tier utama atas satu periode, seperti tier lainnya. Artinya pemegang
besar yang muncul untuk satu periode mendapat kesempatan proporsional penuh atas pot yang diisi
orang lain selama 24 periode. Itu asimetri nyata dan itu dinyatakan sebagai batasan 5.

Perbaikan murahnya sudah diketahui dan dicatat untuk versi berikutnya: lacak saldo-detik yang
terakumulasi sejak pembayaran tier utama terakhir, dan bobotkan tier utama dengan itu alih-alih
dengan bobot satu periode. Itu ditinggalkan di versi satu karena menambah akumulator kedua dengan
analisis luapannya sendiri, dan mengirim hal sederhana yang terbukti penuh mengalahkan mengirim
hal lebih baik yang belum terbukti.

## Apa yang tidak dibahas halaman ini

Halaman ini tidak membahas dari mana panennya berasal atau bagaimana ia diverifikasi, yang ada di
[sumber imbal hasil](yield-source.md). Halaman ini tidak membahas uji per penabung yang
menentukan siapa yang menang, yang ada di [pemilihan pemenang](winner-selection.md). Dan halaman
ini tidak membuat klaim privasi soal besar hadiah: besaran itu publik di sini menurut desain, dan
apa yang diungkap oleh hitungan hadiah yang dipublikasikan diuraikan di
[apa yang tetap privat](../security/what-stays-private.md).
