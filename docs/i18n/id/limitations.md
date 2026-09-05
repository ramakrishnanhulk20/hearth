# Batasan

Setiap batasan yang kami ketahui, dinomori, di satu tempat. Halaman lain merujuk ke nomor-nomor
ini.

Alasan halaman ini ada sederhana. Klaim kerahasiaan hanya bernilai sebesar celah yang bersedia
disebut penulisnya. Apa pun di bawah ini yang mengejutkan Anda belakangan adalah kegagalan kami,
bukan penemuan Anda.

## 1. Evaluasi di-batch, dan batch-nya dibatasi

Uji pemenang berjalan di atas angka terenkripsi, dan Zama membatasi satu transaksi pada 20.000.000
unit komputasi dengan 5.000.000 pada kedalaman sekuensial di Sepolia. Evaluasi satu penabung
memakan `3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` dari jatah itu, jadi paling banyak `4` penabung yang membutuhkan kerja
terenkripsi muat dalam satu panggilan.

**Artinya:** pool dengan banyak penabung butuh banyak transaksi per undian. Biayanya tumbuh linear
terhadap jumlah penabung, dan dibayar dalam bentuk gas oleh siapa pun yang mengevaluasi.

**Bukan artinya:** tidak ada batas berapa banyak penabung yang didukung pool. Beberapa proyek di
bidang ini membatasi partisipasi pada 32 alamat. Hearth tidak membatasi partisipasi sama sekali;
ia membatasi berapa banyak yang muat dalam satu transaksi. `evaluate` menerima count berapa pun,
jadi batch yang lebih kecil tidak butuh deploy ulang.

## 2. Jendela dua periode, dan hadiah yang kedaluwarsa

Sebuah undian harus ditutup, ditetapkan hadiahnya dan dievaluasi selama dua periode yang
mengikutinya. Itu dua jam di pool USDC dan setengah hari di pool enam jam. Penutupan punya tenggat
yang lebih ketat lagi: tengah dari periode kedua itu, sehingga perjalanan bolak-balik dekripsi dan
penetapan hadiah selalu punya sisa setidaknya setengah periode. Setelah jendela tertutup, undian
itu selesai.

**Artinya:** penabung yang tidak dicapai penelusuran evaluasi di dalam jendela kehilangan undian
itu, bahkan kalau ambang batasnya mengatakan dia menang. Porsi mereka atas likuiditas tier dilipat
ke dalam carry tier itu dan mendanai undian berikutnya. Ini perilaku yang sama dengan hadiah
PoolTogether V5 yang tidak diklaim dan kedaluwarsa, dan ini satu-satunya kasus di sistem ini di
mana penabung sungguhan kehilangan sesuatu yang mungkin menjadi miliknya.

**Mengapa jendela itu ada:** ia membatasi seberapa jauh ke belakang vault harus mengingat saldo,
dan itulah yang membuat tiga observasi tersimpan per penabung sudah cukup. Jendela satu periode
pernah dicoba dan terlalu rapuh terhadap relayer yang lambat.

**Apa yang menguranginya:** keeper menelusuri seluruh daftar, siapa pun bisa memajukan penelusuran
lebih jauh dari aplikasi, dan penelusuran dimulai dari titik berbeda tiap undian, jadi tidak ada
yang duduk permanen di belakang antrean.

## 3. Ada batas berapa banyak yang bisa dipegang satu penabung

Setoran ditolak ketika jumlahnya, atau dana pokok hasilnya, berada di atas
`maxPrincipal = (2^64 - 1) / periodLength`. Pada periode satu jam itu kira-kira 5 miliar token,
pada periode enam jam yang dipakai pool lain kira-kira 854 juta, dan pada periode harian kira-kira
213 juta.

**Artinya:** batas itu nyata, dan pada periode harian di mainnet ia angka yang bisa dicapai
institusi besar.

**Mengapa ia ada:** nilai terenkripsi di sini berukuran 64 bit, dan saldo-detik terakumulasi
seorang penabung harus tetap di dalamnya. Luapan terenkripsi tidak menggagalkan transaksi dan tak
ada yang melihatnya terjadi, jadi batasnya ditegakkan di pintu masuk. Pemeriksaannya membatasi
jumlah yang masuk sekaligus totalnya, karena kalau tidak, setoran yang cukup besar untuk memutar
jumlahnya melewati `2^64` akan menghasilkan angka kecil yang lolos pemeriksaan.

**Bagaimana penolakannya berperilaku:** ia dikembalikan sebagai false terenkripsi dan token
mengembalikan setoran itu di transaksi yang sama, jadi menyentuh batas tidak membocorkan saldo
Anda.

## 4. Tidak ada tier cadangan

PoolTogether V5 menyimpan porsi cadangan yang menambah tier yang kelebihan pemenang. Hearth tidak
punya cadangan. Tingkat utilisasi 50 persen adalah satu-satunya bantalannya.

**Artinya:** ketika sebuah tier membagikan lebih banyak hadiah daripada yang bisa didanainya, yang
terjadi paling banyak pada kira-kira 2 persen undian untuk tier sering, penabung yang paling
belakang dicapai penelusuran mendapat lebih sedikit atau tidak sama sekali alih-alih ditambah.

**Mengapa:** cadangan butuh jalur penarikan yang dikendalikan pemilik supaya berguna, dan tiap
kuasa pemilik di pool rahasia adalah sesuatu yang harus dipercaya penabung.

## 5. Peluang tier utama diukur atas satu periode

V5 mengukur peluang tier utama atas seluruh jendela akrual tier itu. Hearth mengukurnya atas satu
periode, seperti tier lainnya.

**Artinya:** pemegang besar yang bergabung untuk satu periode mendapat kesempatan proporsional
penuh atas pot yang butuh 24 periode untuk terbangun. Orang yang menabung sepanjang 24 periode itu
tidak punya klaim tambahan atasnya.

**Perbaikan yang diketahui, ditunda:** akumulasikan saldo-detik sejak pembayaran tier utama
terakhir dan bobotkan tier utama dengan itu. Itu menambah akumulator kedua dengan analisis
luapannya sendiri, jadi ia perubahan untuk versi dua alih-alih tambahan yang belum terbukti di
versi satu.

## 6. Privasi butuh tiga penabung atau lebih

Total saldo tertimbang waktu pool yang persis tidak pernah dipublikasikan. Yang dipublikasikan tiap
undian adalah pangkat dua terkecil di atasnya, karena undian butuh skala publik untuk dijadikan
pembanding.

**Kebocoran yang digantikannya:** mempublikasikan total persisnya membuat siapa pun bisa
memulihkan jumlah setoran seorang pemindah tunggal secara persis. Dua total berurutan, stempel
waktu publik dari event setoran dan penarikan, lalu aritmetikanya adalah satu pembagian tanpa sisa.
Itu adalah desainnya sampai 3 September 2026 dan sebuah tinjauan mematahkannya.

**Artinya sekarang:** dengan satu penabung, bracket yang dipublikasikan adalah bobot penabung itu
dalam rentang faktor dua. Dengan dua, masing-masing bisa membatasi yang lain dengan cara yang sama.
Di bawah tiga penabung tidak ada himpunan anonimitas yang berarti. Bracket berurutan tetap bisa
diselisihkan, tetapi nilainya sama kecuali pool melewati sebuah pangkat dua, jadi penyelisihan itu
menghasilkan sebuah pita, bukan sebuah angka.

**Apa yang dilakukan aplikasi:** ia menyatakan ini kapan pun pool punya kurang dari tiga penabung,
alih-alih menampilkan klaim privasi yang tidak benar pada ukuran itu.

## 7. Lapisan token adalah milik Zama, dan kuasanya berlaku

Aset Hearth adalah wrapper confidential USDC milik Zama, bukan milik kami.

**Artinya:** pemiliknya bisa menunjuk observer yang mampu mendekripsi tiap jumlah yang bergerak
melalui token itu, dan melakukannya secara **surut**, sehingga jumlah yang sudah ada di rantai pun
terbuka bagi observer yang ditunjuk belakangan. Mengawasi penunjukan itu lalu keluar bukan
pertahanan. Cakupannya adalah jumlah setoran, pembayaran penarikan, saldo pool itu sendiri, dan
satu transfer pendanaan hadiah per batch evaluasi. Pemiliknya juga bisa memblokir sebuah alamat,
dan kontraknya bisa ditingkatkan. Per 2 September 2026 tidak ada observer dan peran pauser belum
disetel.

**Apa yang tidak dijangkaunya:** buku besar Hearth sendiri. Dana pokok, kemenangan, bobot per
undian dan kredit per undian tinggal di vault, dan token tidak memegang hak akses apa pun atasnya.

**Satu konsekuensi produk, dan tiap pool yang hidup mengalaminya tiap undian:** transfer pendanaan
sebuah batch membawa total yang dikreditkan kepada semua orang di batch itu, jadi batch berisi satu
orang membawa hadiah persis satu penabung, di bawah asumsi observer. Batch terakhir dalam
penelusuran berisi satu penabung setiap kali jumlah penabung bukan kelipatan ukuran batch. Setiap
satu dari tujuh pool diisi awal dengan lima penabung pada ukuran batch 4 (`KEEPER_BATCH`,
`packages/keeper/src/config.ts`), jadi tiap undian berakhir dengan batch berisi satu, dan event
`Evaluated` di transaksi yang sama menyebut nama penabung pemiliknya.

Tujuh pool itu adalah tujuh wrapper terpisah dengan kuasa tujuh pemilik terpisah, jadi ini berlaku
pool demi pool alih-alih sekali untuk semuanya.

Tidak ada batch minimum yang bisa memperbaikinya, karena `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) bersifat tanpa izin dan mengambil ukuran batch dari
pemanggilnya, jadi observer mana pun bisa memaksa batch berisi satu apa pun yang dilakukan keeper.
Kami mencatatnya sebagai sisa risiko yang diterima: ia hanya menggigit di bawah asumsi observer, dan
`observerCount()` yang hidup bernilai 0. Perbaikan di sisi kontrak, ditunda: akumulasikan kredit per
undian dan kirim satu transfer pendanaan saat finalisasi, atau padatkan tiap total batch.

**Alternatif yang kami tolak:** menulis token rahasia kami sendiri. Itu menukar kontrak yang sudah
dikenal, diaudit dan dioperasikan Zama dengan kontrak yang kami nilai sendiri.

## 8. Undian bergantung pada seseorang mengirim transaksi

Tidak ada apa pun di rantai yang menyala sendiri.

**Artinya:** kalau tidak ada keeper yang berjalan dan tidak ada penabung yang bertindak, sebuah
undian dilewati dan periode itu tidak membayar hadiah. Penutupan yang melewatkan tenggatnya ditolak
langsung alih-alih membuat undiannya terdampar, dan penetapan hadiah yang mendarat setelah jendela
tetap membukukan panennya, mengembalikan likuiditas yang ditawarkan dan menandai undian itu
`Skipped`.

**Bukan artinya:** uang berisiko. Undian yang dilewati menjaga likuiditasnya tetap di tier-tier,
panennya dibukukan oleh penetapan hadiah yang terlambat, dan setoran serta penarikan tidak
terpengaruh sepanjang waktu itu.

**Apa yang menguranginya:** tiap langkah bersifat tanpa izin dan aplikasi mengeksposnya, jadi
penabung mana pun bisa mendorong sebuah undian maju. Pool juga mengimplementasikan antarmuka
automation milik Chainlink untuk langkah penutupan, yaitu satu-satunya langkah yang tidak butuh data
di luar rantai dan satu-satunya yang punya tenggat, tetapi tidak ada upkeep yang terdaftar di satu
pun dari tujuh pool, jadi hari ini keeper dan aplikasi adalah keseluruhannya. Tiap pool punya proses
keeper sendiri di akunnya sendiri, jadi keeper yang berhenti, atau akun yang kehabisan ETH Sepolia,
hanya membuat pool itu kehilangan undiannya dan enam lainnya tetap berjalan.

## 9. Imbal hasil di Sepolia disponsori, bukan dihasilkan

Uang hadiah tiap pool datang dari saldo yang didanai sponsor miliknya sendiri, yang menetes pada
laju yang ditetapkan.

**Artinya:** ini bukan imbal hasil sungguhan. Tidak ada yang menghasilkannya dari pinjaman atau dari
sebuah vault. Ketika saldo bersponsor habis, hadiah berhenti. Sponsorship tidak bisa ditarik kembali
setelah diberikan, dan hanya pemilik sumber yang bisa mengubah lajunya.

**Mengapa:** tidak ada tempat di Sepolia yang membayar imbal hasil atas token mock milik Zama. Aave
menolak setoran itu, Compound menginginkan USDC milik Circle sendiri, dan vault Sepolia milik Zama
hanya idle tanpa adapter imbal hasil, yang merupakan deskripsi Zama sendiri tentangnya.

**Apa yang nyata darinya:** setiap unit uang hadiah benar-benar dibungkus, benar-benar ditransfer ke
pool sebagai transfer terenkripsi, dan benar-benar diverifikasi lewat dekripsi bertanda tangan KMS
sebelum dikreditkan. Sumber yang gagal juga tidak lagi menghentikan sebuah undian: panennya
dibukukan sebagai nol, `HarvestFailed` dipancarkan dan penutupan berhasil. Sumber uangnya adalah
mock. Pipa salurannya tidak.

## 10. Celah pembungkusan, dan berapa harga saldo yang bisa dipatok

Mengubah USDC publik menjadi confidential USDC adalah transfer publik, jadi jumlahnya terlihat.

**Artinya:** penabung yang membungkus lalu langsung menyetor jumlah yang sama sudah mempublikasikan
setorannya. Kami mengukurnya pada deployment kami sendiri yang lebih awal: tiga dari lima setoran
yang hidup duduk dua sampai empat blok setelah pembungkusan publik senilai persis 100 USDC.

**Berapa harganya, di luar jumlah itu:** ambang batas bersifat publik, karena itulah yang membuat
undian bisa diperiksa. Jadi saldo yang bisa dipatok pengamat punya hasil publik di tiap undian dan
tiap tier, dihitung tanpa dekripsi sama sekali, dan juga di tiap undian berikutnya, karena kemenangan
tidak pernah masuk ke peluang. Bahkan batas atas yang longgar pun membuktikan kekalahan yang pasti di
tier mana pun yang ambang batasnya duduk di atasnya.

**Apa yang dilakukan Hearth:** menjaga bungkus dan setor sebagai langkah terpisah, memberi tahu Anda
di langkah pembungkusan untuk memakai angka bulat sehingga pembungkusan menjadi keranjang alih-alih
angka persis, memperingatkan di langkah setoran, dan membiarkan penabung memegang saldo rahasia yang
mengendap sehingga sebuah setoran berasal dari akumulasi dengan komposisi yang tak diketahui.

**Apa yang tidak bisa dilakukan Hearth:** menghapusnya. Tidak ada cara rahasia untuk mengubah token
publik, dan tidak ada cara membuat sebuah ambang batas menjadi privat tanpa membuat undiannya tidak
bisa diperiksa.

## 11. Urutan penelusuran menentukan siapa yang kurang di tier yang kelebihan pemenang

Ketika sebuah tier kehabisan di tengah undian, penabung yang dicapai penelusuran pada saat itu
mendapat sisanya dan yang berikutnya tidak mendapat apa pun dari tier itu.

**Artinya:** pada undian langka yang kelebihan pemenang, ada orang yang dirugikan oleh posisi yang
tidak mereka pilih.

**Yang bukan lagi:** sebuah tuas. Versi lebih awal membolehkan pemanggil `evaluate` menyerahkan
daftar alamat, yang menaruh urutannya di tangan keeper dan membiarkan seorang penabung membeli posisi
depan antrean. Sekarang pemanggil mengoper sebuah count, penelusuran dimulai dari titik yang
diturunkan dari seed undian, dan titik awalnya berpindah tiap undian.

**Apa yang menguranginya:** penabung yang terkena bisa melihatnya, karena bobot dan kredit mereka
untuk undian itu keduanya bisa mereka dekripsi, jadi kredit yang kurang bisa dibuktikan alih-alih
menjadi misteri.

## 12. Undian berjalan terhadap sebuah bracket, jadi sebuah tier membayar antara setengah dan seluruh hadiahnya

Uji pemenang memakai `M`, pangkat dua terkecil di atas bobot total pool, sebagai ganti totalnya
sendiri. `M` karenanya berada di antara `W` dan `2W`.

**Artinya:** jumlah hadiah yang diharapkan tiap penabung diskalakan dengan `W / M`, sebuah angka
antara setengah dan satu, jadi sebuah tier membayar antara setengah dan seluruh hadiah nominal
`count * odds` miliknya tiap undian. Pool yang baru saja melewati sebuah pangkat dua membayar di
ujung bawah rentang itu sampai ia tumbuh mengisi bracket-nya.

**Bukan artinya:** uang hilang atau peluang terdistorsi. Tiap penabung di sebuah tier diskalakan
dengan faktor yang sama, jadi porsi siapa pun tidak berubah relatif terhadap porsi orang lain. Apa
yang tidak dibayarkan sebuah tier masuk ke carry terenkripsinya dan ditawarkan lagi, jadi besar
hadiah mengendap di suatu titik antara angka nominal dan dua kali lipatnya, dan seluruh imbal hasil
tetap keluar.

**Mengapa kami mengambilnya:** alternatifnya adalah mempublikasikan total persisnya, yaitu batasan 6.

## 13. Kemenangan kumulatif menjadi publik kalau Anda bolak-balik lewat wrapper

Membungkus masuk dan membuka bungkus keluar keduanya pergerakan publik di lapisan token, dan yang
pertama dari dua panggilan unwrap adalah yang mempublikasikan jumlahnya, jadi unwrap yang tidak
pernah Anda tuntaskan pun sudah membocorkannya.

**Artinya:** untuk alamat yang satu-satunya lawan transaksi confidential USDC-nya adalah Hearth,
total publik yang dibuka bungkusnya dikurangi total publik yang dibungkus adalah batas bawah atas
kemenangan seumur hidup yang ditarik, dan ia menjadi persis begitu alamat itu mengosongkan diri.
Membuka bungkus ke alamat baru tidak membantu, karena transfer rahasia ke alamat itu justru adalah
kaitannya.

**Apa yang menguranginya:** buka bungkus dalam denominasi bulat yang tidak berhubungan dengan posisi
Anda, atau tinggalkan saldo rahasia yang mengendap dan jangan pernah bolak-balik sepenuhnya.

## 14. Saldo yang tidak pernah berubah dipersempit oleh hitungan hadiah yang dipublikasikan

Tiap rekonsiliasi mempublikasikan berapa hadiah yang dibayarkan sebuah tier. Karena tiap ambang
batas bersifat publik, hitungan itu adalah kendala berbentuk "berapa banyak dari para penabung ini
yang bobotnya di atas ambang batas mereka masing-masing yang dipublikasikan", dan kendala itu
menumpuk.

**Artinya:** penabung yang saldonya tidak pernah berubah sepanjang banyak undian secara bertahap
dipersempit oleh hitungan-hitungan itu. Penabung yang menyetor atau menarik mereset ketidaktahuan
tentang dirinya sendiri.

**Apa yang membatasi lajunya:** tidak ada yang lebih halus daripada bilangan bulat hadiah yang pernah
diungkapkan, dan ambang batasnya tidak bisa dipilih penyerang, karena seed ditarik di dalam
koprosesor dan diungkap hanya setelah periodenya ditutup.

**Apa yang kami lakukan soal itu: tidak ada, dan inilah alasannya.** Kontrak punya tombol persis
untuk ini. `reconcileEvery[t]` adalah berapa undian yang berlalu di antara publikasi carry sebuah
tier, dan menaikkannya pada tier utama akan mempublikasikan satu hitungan sehari alih-alih satu per
jam, sehingga sebuah jackpot akan diatribusikan ke semua orang yang berhak sepanjang hari itu
alih-alih segelintir yang berhak dalam satu undian. Uji keadilan menunjukkan berapa harganya. Sebuah
penutupan memindahkan seluruh likuiditas publik sebuah tier ke dalam undian dan uang itu hanya kembali
pada sebuah rekonsiliasi, jadi pada irama 24, likuiditas publik tier utama hanyalah porsi panen satu
undian pada 23 dari 24 undian, dan besar hadiahnya diambil dari itu, dengan pot yang menumpuk baru
terlihat terbuka pada undian rekonsiliasi. Uangnya ditawarkan dan bisa dimenangkan sepanjang waktu,
duduk di carry terenkripsi, tetapi tidak ada yang bisa menonton jackpot itu tumbuh.

Hitungan yang tersembunyi dan jackpot yang terlihat menumpuk tidak bisa berlaku bersamaan, dan
deployment ini memilih jackpot yang terlihat. Ketiga tier berjalan pada `reconcileEvery = 1`, jadi
pengukuran di atas berjalan pada satu hitungan per tier per undian. Tombolnya adalah argumen
konstruktor dan deployment yang lebih menghargai pengukuran yang lambat daripada pot yang terlihat
menyetelnya lebih tinggi.

## Bukan batasan, tetapi layak dinyatakan terus terang

- **Enam dari tujuh pool mengundi tiap enam jam, dan itu keputusan soal gas.** Satu undian pada lima
  penabung memakan `8,456,388` gas, jadi tujuh pool per jam akan menghabiskan sekitar `1.43 ETH`
  sehari di Sepolia, yang tidak bisa diimbangi faucet publik. Hanya pool USDC, yang di-deploy
  pertama, yang masih mengundi tiap jam. Peluang tier tiap pool ditetapkan terhadap periodenya
  sendiri, jadi irama hadiahnya sama di kedua jam.
- **Enam belas bahasanya adalah terjemahan mesin.** Teks antarmuka dan halaman dokumentasi yang
  diterjemahkan ditulis oleh sebuah model, bukan oleh penutur asli, dan belum ditinjau secara
  profesional. Bahasa Inggris adalah sumber kebenaran untuk tiap angka, nama kontrak dan klaim di
  situs ini, dan halaman yang belum diterjemahkan jatuh kembali ke bahasa Inggris alih-alih ke
  tebakan.
- **Penabung besar menang sering.** Peluang sebanding dengan saldo tertimbang waktu, jadi orang yang
  memegang banyak dalam waktu lama menang banyak. Itu desainnya, bukan cacat.
- **Besar hadiah dan jumlah hadiah bersifat publik.** Keduanya selalu publik di PoolTogether. Yang
  rahasia di sini adalah siapa yang menang, bukan berapa yang dihasilkan pool.
- **Hearth belum diaudit pihak ketiga.** Ia diaudit sendiri dengan serangan yang dieksekusi dan
  pengujian properti, dan [model ancaman](security/threat-model.md) adalah pengganti yang jujur,
  bukan penggantinya yang setara.
