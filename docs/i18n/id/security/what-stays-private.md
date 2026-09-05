# Apa yang tetap privat

Tiga hal penting soal kerahasiaan: apa yang tetap terenkripsi, apakah undiannya terbukti adil dan
ditimbang berdasarkan setoran, dan apakah tiap kebocoran disebutkan. Halaman ini menjawab yang
pertama dan yang ketiga. Pendirian kami adalah menyebut sendiri tiap celah lebih bernilai daripada
klaim yang tidak bisa dicek siapa pun.

Semua di sini ditulis untuk satu pool, dan Hearth menjalankan tujuh pool, satu per token rahasia.
Mereka tidak berbagi apa pun, jadi himpunan anonimitas tiap pool adalah penabungnya sendiri dan
bukan orang lain, dan pool dengan tiga penabung tidak terbantu oleh pool lain yang punya tiga puluh.

## Tabelnya

| Nilai | Status | Siapa yang bisa membacanya |
| --- | --- | --- |
| Dana pokok Anda | Terenkripsi | Hanya Anda, lewat tanda tangan EIP-712 |
| Kemenangan Anda yang belum diklaim | Terenkripsi | Hanya Anda |
| Bobot tertimbang waktu Anda, per undian | Terenkripsi | Hanya Anda |
| Kredit Anda, per undian, dan karenanya apakah Anda menang | Terenkripsi | Hanya Anda |
| Jumlah yang Anda setor | Terenkripsi dari ujung ke ujung | Hanya Anda |
| Jumlah yang Anda tarik | Terenkripsi dari ujung ke ujung | Hanya Anda |
| **Bobot total pool untuk sebuah periode** | **Terenkripsi, tidak pernah dipublikasikan** | **Tidak ada** |
| Carry tiap tier di antara rekonsiliasi | Terenkripsi | Tidak ada |
| Bracket tempat total pool jatuh, sebuah pangkat dua | Publik setelah periodenya berakhir | Semua orang |
| Apakah ada orang yang memegang saldo sama sekali di periode itu | Publik setelah periodenya berakhir | Semua orang |
| Seed acak untuk tiap undian | Publik setelah periodenya berakhir | Semua orang |
| Imbal hasil yang dipanen tiap undian | Publik setelah periodenya berakhir | Semua orang |
| Besar hadiah dan likuiditas terang yang ditawarkan tiap tier | Publik sejak penutupan | Semua orang |
| Berapa hadiah yang dibayarkan tier sering | Publik satu undian kemudian | Semua orang |
| Berapa hadiah yang dibayarkan tier menengah | Publik satu undian kemudian | Semua orang |
| Berapa hadiah yang dibayarkan tier utama | Publik satu undian kemudian | Semua orang |
| Daftar alamat penabung | Publik | Semua orang |
| Kapan Anda menyetor, menarik, atau dievaluasi, dan di batch mana | Publik | Semua orang |
| Penghitung dana yang tidak terpenuhi | Publik saat finalisasi | Semua orang |
| Jumlah sponsor dan laju tetesan | Publik | Semua orang |
| Jumlah yang Anda bungkus masuk ke, atau buka bungkus keluar dari, token rahasia | Publik | Semua orang |
| Tiap ambang batas yang harus dilewati alamat mana pun, di tier mana pun | Bisa dihitung publik | Semua orang |

Ada dua cara membaca tabel itu. Kolom kiri berisi rahasia yang persis merupakan informasi per
orang, ditambah dua total tingkat pool yang ternyata merupakan informasi per orang dalam
penyamaran. Kolom kanan berisi fakta publik yang dibutuhkan orang luar untuk memeriksa bahwa
undiannya jujur. Pembagian itulah desainnya.

## Apa yang bisa dan tidak bisa disimpulkan seorang pengamat

Pengamat dengan node arsip lengkap dan kesabaran tanpa batas bisa membangun:

- Daftar lengkap penabung dan blok persis tempat masing-masing bertindak.
- Seed, bracket, panen dan besar hadiah tiap undian, serta jumlah hadiah tiap tier, satu undian
  setelah undian asalnya.
- Tiap ambang batas yang harus dilewati tiap alamat. Mereka benar-benar bisa menghitung tangga
  Anda.
- Total kepemilikan pool atas token rahasianya sebagai handle terenkripsi, yang tidak bisa mereka
  baca.

Yang tidak bisa mereka dapatkan:

- Saldo perorangan mana pun, kapan pun.
- Bobot perorangan mana pun, jadi tidak ada peluang perorangan.
- Alamat mana yang memenangkan undian mana pun, atau berapa yang dibayarkan kepada siapa pun.
- Total bobot persis pool, hanya pangkat dua di atasnya.

Jarak antara kedua daftar itulah yang dijual Hearth. Sisa halaman ini adalah catatan jujur tentang
di mana jarak itu menyempit.

## Aturan 1: bracket, dan kebocoran yang kami hapus

Sampai 3 September 2026, desain ini mempublikasikan total saldo tertimbang waktu pool yang persis
`W` di tiap undian, dengan alasan bahwa mempublikasikannya adalah yang membuat undian bisa
diverifikasi. Sebuah tinjauan membuktikan alasan itu terlalu mahal.

Inilah kebocorannya, dalam istilah peninjau. Untuk periode `p` mana pun yang sudah ditutup,
`W_p = B * L + jumlah atas tiap aksi dari D_i * (periodEnd(p) - t_i)`, di mana `B` adalah total dana
pokok yang dibawa masuk ke periode itu dan `D_i` adalah perubahan bertanda yang dibuat tiap aksi.
`B`, `L`, `periodEnd(p)` dan tiap `t_i` bersifat publik, karena event setoran dan penarikan membawa
stempel waktunya. Jadi **penabung yang satu-satunya memindahkan uang dalam sebuah periode punya
jumlah itu yang bisa dipulihkan dari dua total yang dipublikasikan dan stempel waktu publik dari
transaksinya sendiri.** Bukan terbatasi, melainkan dipulihkan persis, sisa nol. Ia makin buruk
dengan makin banyak data, bukan makin baik: tiap periode yang ditutup adalah satu persamaan lagi,
tiap aksi adalah satu variabel tak diketahui, rantainya berjangkar di nol, dan event-nya menyebut
siapa yang bertindak dan kapan, jadi dua pemindah di antara dua periode yang sepi juga terpulihkan
persis.

Kebocoran itu sudah tidak ada, karena angka yang dibutuhkannya tidak lagi dipublikasikan. Yang
dipublikasikan vault sekarang adalah bracket: pangkat dua terkecil pada atau di atas `W`, ditulis
`M`. Lima perbandingan terenkripsi per undian melacak di mana `W` duduk relatif terhadap bracket
undian sebelumnya, dan hanya hitungan kecil dari penjumlahannya yang didekripsi. Di antara
perlintasan sebuah pangkat dua, undian-undian berurutan mempublikasikan angka yang sama, dan
menyelisihkannya menghasilkan nol.

Yang tersisa adalah versi yang jauh lebih kecil dari hal yang sama.

- **Satu penabung.** Bracket yang dipublikasikan adalah bobot penabung itu dalam rentang faktor dua.
- **Dua penabung.** Masing-masing bisa mengurangkan bobotnya sendiri dan membatasi bobot yang lain,
  lagi-lagi dalam rentang faktor dua.
- **Tiga atau lebih.** Pembagian apa pun yang konsisten dengan bracket itu mungkin, dan himpunannya
  tumbuh dengan tiap penabung tambahan.

Aplikasi menyatakan ini di atas tiap layar kapan pun pool punya kurang dari tiga penabung.
Dokumentasi Zama sendiri menyampaikan hal yang sama tentang batcher mereka, dengan kata-kata yang
sama: "the sum of one value is the value." Sebuah bracket adalah versi yang lebih lemah dari kalimat
itu, bukan jalan keluar darinya.

## Aturan 2: saldo yang bisa dipatok pengamat sama sekali tidak punya privasi undian

Ini pernyataan tunggal paling tajam di halaman ini, jadi ia mendapat aturannya sendiri.

Uji pemenang adalah fungsi deterministik atas satu rahasia, yaitu bobot Anda, dan selebihnya data
yang sepenuhnya publik. Ambang batas bersifat publik menurut desain, karena itulah yang membuat
undian bisa diperiksa. Jadi **siapa pun yang bisa mematok saldo Anda dapat menghitung hasil menang
atau kalah Anda untuk tiap tier di tiap undian, tanpa dekripsi sama sekali**, dan juga untuk tiap
undian berikutnya, karena kemenangan duduk di saldo terpisah yang tidak pernah masuk ke peluang.

Cara saldo biasanya dipatok adalah celah pembungkusan di aturan 3: mengubah token publik menjadi
bentuk rahasianya adalah pergerakan publik, jadi penabung yang membungkus lalu menyetor jumlah yang
sama beberapa detik kemudian sudah mempublikasikan setorannya. Sejak titik itu hasil undiannya
menjadi aritmetika publik.

Bahkan batas yang longgar pun menggigit. Pengamat yang hanya memegang batas atas atas saldo Anda
membuktikan kekalahan yang pasti di tier mana pun yang ambang batasnya duduk di atas batas itu.

Apa yang dilakukan aplikasi soal itu: menjaga shield dan setor sebagai langkah terpisah di layar
Setor, dan pada langkah shield memberi tahu Anda dalam satu paragraf untuk memakai angka bulat
supaya sebuah shield menjadi keranjang alih-alih setoran persis, untuk melakukan shield pada waktu
yang Anda pilih sendiri, dan untuk menyetor sebagiannya kemudian, sehingga sebuah setoran diambil
dari akumulasi dengan komposisi yang tak diketahui. Yang tidak bisa dilakukan perubahan kontrak apa
pun adalah membuat ambang batas menjadi privat, karena ambang batas yang privat berarti undian yang
tak bisa diperiksa.

## Aturan 3: celah pembungkusan, di kedua arah

Mengubah token publik menjadi bentuk rahasianya adalah pergerakan ERC-20 publik. Jumlahnya muncul
di event `Wrap` milik wrapper, di `Transfer` milik token dasarnya, dan sekali lagi di catatan
koprosesor saat mengenkripsi teks terang itu. Tidak ada cara rahasia untuk mengubah token publik.

Kami mengukur korelasinya pada deployment kami sendiri yang lebih awal. Memindai blok Sepolia
11528000 sampai 11618500, tiga dari lima setoran duduk dua sampai empat blok setelah pembungkusan
publik senilai persis 100 USDC oleh alamat yang sama. Siapa pun yang membaca log publik bisa
menghargai ketiga setoran itu 100 USDC tanpa membobol satu pun jaminan kriptografis. Zama
mendokumentasikan efek yang sama untuk batcher mereka dan menyebutnya korelasi shield-join.

Membuka bungkus juga mempublikasikan sebuah jumlah, dan yang pertama dari dua panggilan unwrap-lah
yang melakukannya, jadi unwrap yang tidak pernah dituntaskan pun tetap bocor. Itu memberi
pengungkapan kedua yang disebutkan: **kemenangan kumulatif menjadi batas bawah publik untuk alamat
mana pun yang membungkus masuk dan membuka bungkus keluar sepenuhnya.** Untuk alamat yang
satu-satunya lawan transaksinya dalam token rahasia itu adalah Hearth, total publik yang dibuka
bungkusnya dikurangi total publik yang dibungkus persis sama dengan kemenangan seumur hidup yang
ditarik, dikurangi berapa pun dana pokok dan saldo rahasia yang masih dipegang alamat itu. Keduanya
tersembunyi dan tidak negatif, jadi selisihnya selalu batas bawah, dan ia menjadi persis begitu
alamat itu mengosongkan diri.

Membuka bungkus ke alamat baru tidak membantu, karena transfer rahasia ke alamat itu justru adalah
kaitannya.

Apa yang dilakukan Hearth: langkah terpisah, sebuah peringatan di langkah shield pada Setor, satu
baris di langkah itu dan sekali lagi di tab "Back to plain USDC" pada Tarik yang menyuruh Anda
memindahkan angka bulat, dan saran untuk meninggalkan saldo rahasia yang mengendap. Jumlahnya tetap
Anda yang mengetik; aplikasi tidak menawarkan set denominasi. Yang tidak bisa dilakukan Hearth:
menghapus satu pun dari itu.

## Aturan 4: hitungan hadiah yang dipublikasikan adalah pengukuran yang lambat

Tiap rekonsiliasi mempublikasikan berapa hadiah yang dibayarkan sebuah tier. Karena ambang batas
tiap penabung bersifat publik, hitungan itu adalah kendala keras berbentuk "berapa banyak dari para
penabung ini yang bobotnya di atas ambang batas mereka masing-masing yang dipublikasikan". Ia hanya
membawa beberapa bit, tetapi ia pengukuran nyata, dan ia menumpuk.

**Saldo yang tidak pernah berubah sepanjang banyak undian secara bertahap dipersempit oleh hitungan
itu.** Penabung yang menyetor atau menarik mereset ketidaktahuan tentang dirinya sendiri dan memulai
penyempitan itu dari awal.

Dua hal membatasi lajunya. Hitungannya kasar: tidak ada yang lebih halus daripada bilangan bulat
hadiah yang pernah diungkapkan. Dan ambang batasnya tidak bisa dipilih penyerang, karena seed
ditarik di dalam koprosesor dan diungkap hanya setelah periodenya ditutup, jadi tidak ada yang bisa
mengarahkan pertanyaan ke saldo yang dicurigai.

Peredam ketiga sebenarnya tersedia, dan deployment ini melepaskannya dengan sengaja.
`reconcileEvery[t]` menentukan berapa undian yang berlalu di antara publikasi carry sebuah tier.
Menaikkannya mempublikasikan satu hitungan per rentang alih-alih satu per undian, sehingga sebuah
jackpot diatribusikan ke semua orang yang berhak sepanjang rentang itu. Harganya adalah jackpot itu
sendiri: sebuah penutupan memindahkan seluruh likuiditas publik tier ke dalam undian, dan uang itu
hanya kembali pada sebuah rekonsiliasi, jadi pada irama 24, likuiditas publik tier utama adalah
porsi panen satu undian pada 23 dari 24 undian, hadiah yang dipublikasikan ditentukan dari itu, dan
pot yang menumpuk baru muncul terbuka pada undian rekonsiliasi. Uangnya ditawarkan dan bisa
dimenangkan sepanjang waktu di dalam carry terenkripsi. Tidak ada yang bisa melihatnya.

Jadi ketiga tier berjalan pada `reconcileEvery = 1`. Pot menumpuk secara publik, hitungan tiap tier
menjadi publik satu undian kemudian, dan pengukuran di atas berjalan pada laju penuhnya, satu
hitungan per tier per undian. Pada tier utama itu berarti sebuah pembayaran menunjuk ke para
penabung yang berhak dalam satu undian itu, kira-kira empat persen pool, alih-alih ke satu hari
penuh penabung. Ini adalah sisa risiko yang diungkapkan, bukan yang dimitigasi, dan ini batasan 14.
Iramanya tetap argumen konstruktor, jadi deployment yang lebih menginginkan pengukuran yang lambat
daripada pot yang terlihat bisa mendapatkannya.

## Aturan 5: lapisan token milik Zama, bukan milik kami

Aset tiap pool adalah salah satu token rahasia milik Zama. Itu disengaja, dan itu berarti kuasa
token itu sendiri berlaku atas uang yang bergerak lewat Hearth, pool demi pool: tujuh wrapper,
kuasa yang sama di masing-masing. Menyebutnya satu per satu:

Kontrak Sepolia-nya adalah `ConfidentialWrapper` di balik proxy yang bisa ditingkatkan, dimiliki
Zama, dengan kepemilikan dua langkah dan pelepasan yang dinonaktifkan. Membaca sumbernya yang
terverifikasi pada 2 September 2026 memberi tiga fakta yang penting untuk privasi:

1. **Observer, secara surut.** Pemiliknya bisa memanggil `addObserver(address)`, yang memberi alamat
   itu dekripsi pengguna tanpa batas atas tiap handle yang hak aksesnya dipegang kontrak token. Itu
   mencakup tiap jumlah setoran, tiap pembayaran penarikan, dan tiap jumlah pendanaan hadiah per
   batch yang dikirim pool ke vault. Kata yang penting adalah surut: observer yang ditunjuk kapan pun
   di masa depan bisa mendekripsi jumlah yang sudah ada di rantai, jadi "awasi `ObserverAdded` lalu
   keluar" bukan pertahanan. Keadaan yang hidup pada 2 September 2026: `observerCount()` bernilai 0
   dan `observers()` kosong.
2. **Daftar larangan dan jeda.** Pemiliknya bisa memblokir sebuah alamat, yang menghentikannya
   menyetor, menarik atau membuka bungkus, karena masing-masing adalah pembaruan token dengan alamat
   itu di salah satu sisinya. Ada peran pauser; secara live ia disetel ke alamat nol, jadi penjedaan
   saat ini dinonaktifkan.
3. **Kemampuan ditingkatkan.** Implementasinya bisa diganti pemiliknya, jadi perilaku token,
   termasuk bagaimana ia menangani handle yang hak aksesnya dipegangnya, bisa berubah di bawah kaki
   kita.

Perhatikan cakupan persis butir 1. Tidak ada transfer hadiah per penabung di Hearth, jadi tidak ada
pembayaran per pemenang yang bisa dibaca observer. Yang bergerak di lapisan token adalah satu
transfer pendanaan per batch evaluasi, dari pool ke vault, membawa total yang dikreditkan kepada
semua orang di batch itu. Batch berisi satu membuat total itu menjadi hadiah persis satu penabung,
dan pool lima penabung yang hidup pada ukuran batch 4 mengakhiri tiap penelusuran dengan batch
berisi satu. `evaluate` bersifat tanpa izin dan mengambil ukuran batch dari pemanggilnya, jadi tidak
ada batch minimum yang bisa ditegakkan. [Batasan 7](../limitations.md) mencatatnya sebagai sisa
risiko yang diterima dan menyebut perbaikannya di sisi kontrak.

Yang tidak akan didapat observer di lapisan token adalah buku besar Hearth sendiri. Dana pokok Anda,
kemenangan Anda, bobot Anda dan kredit Anda tinggal di penyimpanan vault, dan token tidak punya hak
kontrol akses atas satu pun darinya. Kami memverifikasi itu pada deployment sebelumnya: alamat token
mengembalikan false untuk izin atas handle kemenangan dan dana pokok seorang penyetor, sementara
penyetor dan pool mengembalikan true.

Jadi pernyataan yang jujur adalah: pakai Hearth dan Anda memercayakan jumlah yang melintasinya
kepada wrapper milik Zama, persis seperti aplikasi ERC-7984 mana pun. Anda tidak memercayakan posisi
Anda kepadanya.

Alternatifnya adalah menulis token rahasia kami sendiri, seperti yang dilakukan beberapa proyek di
bidang ini. Itu menukar kontrak yang sudah dikenal, diaudit dan dioperasikan Zama dengan kontrak
yang kami nilai sendiri. Kami lebih memilih mendokumentasikan batas kepercayaan yang sebenarnya
daripada membuat-buat batas yang lebih kecil.

## Aturan 6: evaluasi bukan petunjuk, dan tidak ada yang memilih urutannya

`evaluate(drawId, count)` menerima sebuah angka, bukan daftar alamat. Vault menelusuri daftar
penabung dari titik awal yang diturunkan dari seed undian itu, dalam urutan daftar, dan pemanggilnya
hanya menentukan seberapa jauh penelusuran maju. Penabung yang menginginkan hasilnya sendiri
memajukan penelusuran yang sama yang dimajukan keeper.

Itu menutup dua hal sekaligus.

Ia menutup petunjuk evaluasi diri. Di versi sebelumnya, evaluasi menerima daftar alamat, jadi
seorang penabung bisa menghitung hasilnya sendiri dari masukan publik lalu membayar untuk dievaluasi
hanya ketika dia menang. Mengirim transaksi itu akan menjadi petunjuk pemenang yang sama kerasnya
dengan fungsi klaim. Sekarang tidak ada transaksi yang hanya akan dikirim seorang pemenang.

Ia menutup tuas urutan. Ketika sebuah tier kelebihan pemenang dan kehabisan, siapa pun yang dicapai
penelusuran paling akhir akan kurang. Urutan itu ditetapkan oleh seed, jadi tidak ada yang bisa
membeli posisi lebih baik dengan gas, dan titik awalnya berpindah tiap undian, jadi tidak ada alamat
yang secara sistematis berada di belakang. Konsekuensi keadilannya dijelaskan di
[hadiah dan tier](../concepts/prizes-and-tiers.md) dan merupakan batasan 11.

Tiap penabung yang dievaluasi dalam sebuah undian mendapat penulisan yang sama, dalam bentuk yang
sama, entah dia menang atau tidak, karena pembayarannya lewat select terenkripsi alih-alih sebuah
percabangan. Batch tempat seorang penabung mendarat, dan posisinya di dalamnya, bersifat publik dan
tidak mengatakan apa pun tentang hasilnya.

## Aturan 7: sisa risiko perilaku

Hearth tidak punya transaksi klaim, jadi tidak ada aksi berbentuk kemenangan untuk diintai.
Mengetahui bahwa Anda menang adalah tanda tangan di luar rantai yang tidak menyentuh apa pun, dan
tombol klaim aplikasi, yang memuat jumlahnya, mengirim penarikan biasa yang terlihat seperti
penarikan lain mana pun.

Sisa risikonya adalah apa yang Anda lakukan berikutnya. Penabung yang menarik dana segera setelah
tiap undian yang dimenangkannya, dan tidak pernah pada waktu lain, memberi pengamat petunjuk
statistik seiring waktu. Petunjuk itu lemah, butuh banyak undian untuk terbangun, dan sepenuhnya
dalam kendali penabung. Mitigasinya bersifat perilaku, bukan kriptografis: tariklah menurut jadwal
Anda sendiri, atau biarkan kemenangan menumpuk.

Kami menyatakan ini karena alternatifnya, mengklaim bahwa perilaku on-chain tidak mengungkap apa
pun, adalah kebohongan di tiap desain sejenis ini. Proyek-proyek di bidang ini yang menghapus fungsi
klaimnya sampai pada kesimpulan yang sama dan menuliskannya. Begitu juga kami.

## Apa yang tidak dibahas halaman ini

Halaman ini tidak membahas para penyerang dan motif mereka, yang ada di
[model ancaman](threat-model.md). Halaman ini tidak membahas cara memeriksa sebuah undian sendiri,
yang ada di [keacakan dan verifikasi](randomness-and-verification.md). Dan halaman ini tidak membuat
klaim soal privasi tingkat jaringan: alamat IP asal koneksi Anda, penyedia RPC yang Anda pakai dan
permintaan relayer yang Anda kirim berada di luar rantai dan di luar analisis ini.
