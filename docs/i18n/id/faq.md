# FAQ

## 1. Token apa saja yang bisa saya tabung?

Tujuh: USDC, USDT, WETH, BRON, ZAMA, tGBP dan XAUt, semuanya token rahasia milik Zama di Sepolia.
Masing-masing adalah pool terpisah dengan kontraknya sendiri, penabungnya sendiri dan uang
hadiahnya sendiri, dan pool tempat Anda berada adalah bagian pertama URL setelah `/app`. Pemilih
pool juga menampilkan Confidential tGBP resmi milik Zama, dalam keadaan abu-abu: token publiknya
hanya bisa dicetak penerbitnya, jadi tidak ada yang bisa membungkusnya dan tidak ada pool yang
bisa ada di atasnya. Semua hal lain di halaman ini berlaku untuk tiap pool secara terpisah.
Rinciannya di [pool dan token](concepts/pools-and-tokens.md).

## 2. Di mana tombol klaimnya?

Di "My draws" pada aplikasi, di kartu undian itu, di bawah "Your result" setelah Anda membukanya
dengan ikon mata. Ia hanya muncul kalau undian itu mengkreditkan sesuatu kepada Anda. Di balik
layar ia sengaja bukan transaksi terpisah: hadiah dikreditkan ke saldo kemenangan terenkripsi Anda
selama evaluasi, dan tombol klaim, yang memuat jumlahnya, mengirim penarikan biasa untuk itu, yang
di on-chain terlihat persis seperti penarikan lain mana pun. Di kebanyakan protokol hadiah, hanya
pemenang yang punya alasan mengirim transaksi klaim, jadi daftar transaksi diam-diam menyebut
mereka; di sini tidak ada transaksi semacam itu untuk diintai. Uang yang sama keluar dari tab "Out
of the vault" pada layar Tarik, karena sebuah klaim adalah penarikan dengan nama lain.

## 3. Bisakah saya kehilangan dana pokok saya?

Tidak. Hadiah dibayar dari imbal hasil, tidak pernah dari setoran siapa pun, dan `withdraw` selalu
terbuka, termasuk selagi undian berjalan. Satu hal yang bisa Anda kehilangan adalah hadiah yang
seharusnya Anda menangkan: kalau penelusuran evaluasi tidak mencapai Anda di dalam jendela dua
periode, undian itu tidak membayar Anda apa pun dan uangnya kembali ke tier. Lihat batasan 2.

## 4. Bisakah Anda melihat saldo atau kemenangan saya?

Tidak. Dana pokok Anda, kemenangan Anda, bobot Anda untuk tiap undian dan kredit Anda untuk tiap
undian adalah nilai terenkripsi yang aksesnya hanya diberikan kepada alamat Anda, dan daftar
kontrol akses milik Zama menegakkannya di on-chain, bukan sebagai kebijakan yang kami janjikan.
Kami bisa melihat hal yang sama dengan yang dilihat orang asing: bahwa Anda menyetor, kapan, dan
tidak apa pun soal jumlahnya.

## 5. Bagaimana peluang saya dihitung?

Dari saldo rata-rata Anda sepanjang periode, bukan saldo Anda saat undian berlangsung. Satu
periode adalah satu jam di pool USDC dan enam jam di enam pool lainnya. Pegang 100 USDC selama
satu periode satu jam penuh dan bobot Anda adalah 360.000 saldo-detik; hadiah yang Anda harapkan
di sebuah tier adalah bobot itu dibagi bracket yang dipublikasikan, dikalikan peluang tier dan
jumlah hadiahnya. Memecah uang Anda ke beberapa dompet tidak mengubah apa pun, karena ekspektasinya
persis sebanding dengan bobot.

## 6. Saya menyetor lima menit sebelum undian dan tidak menang apa pun. Kenapa?

Karena lima menit dari periode satu jam adalah seperdua belas peluang yang akan Anda dapat dengan
memegang sepanjang periode, dan sepertujuh puluh dua dari periode enam jam. Itulah yang mencegah
seseorang mengibaskan saldo besar tepat sebelum tiap undian, menang, lalu menarik; kami
mengeksekusi serangan itu terhadap desain kami sendiri yang lebih awal dan ia mengambil 19 dari 20
undian. Setor lalu tinggalkan, dan Anda mendapat porsi penuh Anda dari periode penuh berikutnya.

## 7. Apakah kemenangan saya juga menghasilkan peluang?

Tidak dengan sendirinya. Kemenangan duduk di saldo terenkripsi terpisah yang tidak dihitung ke
dalam bobot Anda, jadi penggandaan tidak otomatis: tarik lalu setorkan kembali untuk membuatnya
bekerja. Pemisahan itulah yang membuat penarikan hadiah terlihat identik dengan penarikan
tabungan.

## 8. Siapa yang memicu undian, dan apa yang terjadi kalau mereka berhenti?

Kami menjalankan satu proses keeper per pool, masing-masing di akunnya sendiri, jadi keeper yang
berhenti hanya membuat satu pool kehilangan undiannya dan enam lainnya tetap berjalan. Pool juga
mengimplementasikan antarmuka automation milik Chainlink, jadi upkeep berbasis waktu bisa menutupi
langkah penutupan, meski belum ada yang terdaftar di pool mana pun. Bagaimanapun juga, tiap langkah
sebuah undian bisa dipanggil siapa saja, termasuk Anda dari aplikasi. Penutupan punya tenggatnya
sendiri, setengah periode sebelum jendela berakhir, sehingga sebuah penutupan tidak pernah bisa
mendarat terlalu telat untuk diikuti penetapan hadiah. Kalau tidak ada yang berjalan, undian itu
dilewati: likuiditasnya tetap di tier-tier untuk undian berikutnya, imbal hasilnya dibukukan kapan
pun penetapan hadiah yang terlambat mendarat, dan setoran serta penarikan tetap bekerja. Keeper
yang macet membuat undian hilang, tidak pernah uang.

## 9. Bisakah Anda mengatur angka acaknya, atau besar hadiahnya?

Keduanya tidak. Seed dihasilkan di dalam koprosesor Zama sebagai ciphertext, jadi tidak ada yang
melihatnya pada saat ia ditarik, dan menutup sebuah undian berhasil tepat satu kali, jadi tidak
ada undian kedua. Besar hadiah ditetapkan lebih awal di transaksi yang sama, sebelum seed ada,
jadi tidak ada yang bisa membaca sebuah seed, menghitung bahwa dia menang, lalu memperbesar
kemenangan itu. Setelah periodenya berakhir, seed dipublikasikan dengan tanda tangan dari layanan
pengelolaan kunci Zama yang diverifikasi kontrak di on-chain, dan dari situ siapa pun bisa
menghitung ulang ambang batas persis yang harus dilewati alamat mana pun.

## 10. Mengapa pool hanya mempublikasikan ukuran kasar alih-alih total persisnya?

Karena total persisnya membocorkan setoran perorangan. Dua total berurutan, ditambah stempel waktu
publik dari setoran Anda sendiri, memungkinkan siapa pun memecahkan jumlah persis Anda kalau Anda
satu-satunya yang memindahkan uang di periode itu. Bukan perkiraan, melainkan angkanya. Jadi vault
hanya mempublikasikan pangkat dua terkecil di atas totalnya, yang dipakai undian sebagai
pembanding. Biayanya adalah sebuah tier membayar antara setengah dan seluruh jumlah hadiah
nominalnya tiap undian, dengan sisanya dibawa maju dan ditawarkan lagi, jadi besar hadiah mengendap
sedikit lebih besar. Peluang siapa pun tidak terdistorsi relatif terhadap peluang orang lain.

## 11. Dari mana uang hadiahnya berasal?

Di Sepolia, dari saldo yang didanai sponsor yang menetes pada laju tetap, satu per pool, karena
tidak ada tempat di Sepolia yang membayar imbal hasil atas token mock milik Zama. Di mainnet,
antarmuka yang sama tersambung ke Confidential Vault milik Zama, yang menaruh confidential USDC ke
dalam yield vault ERC-4626 sungguhan lewat sebuah batcher. Bagaimanapun juga, pool hanya membukukan
jumlah yang menurut dekripsi terverifikasi KMS benar-benar tiba, tidak pernah angka yang dilaporkan
sumbernya tentang dirinya sendiri.

## 12. Apa yang bisa dipelajari orang yang mengawasi rantai tentang saya?

Bahwa Anda seorang penabung, di blok mana Anda menyetor atau menarik, dan di batch evaluasi mana
Anda berada. Bukan saldo Anda, bukan peluang Anda, bukan apakah Anda menang. Ada empat celah yang
perlu diketahui. Bracket yang dipublikasikan mendekati informasi pribadi ketika penabungnya kurang
dari tiga. Kalau seseorang bisa mematok saldo Anda, biasanya dengan mengamati pembungkusan publik
yang diikuti setoran berukuran sama, maka hasil Anda di tiap undian menjadi aritmetika publik sejak
saat itu, karena ambang batas bersifat publik menurut desain. Membungkus masuk dan membuka bungkus
keluar sepenuhnya mempublikasikan batas bawah atas semua yang pernah Anda menangkan. Dan tiap tier
mempublikasikan berapa hadiah yang dibayarkannya, satu undian kemudian, yang merupakan pengukuran
kasar atas saldo terenkripsi dan perlahan mempersempit saldo yang tidak pernah bergerak. Kami
mempublikasikan hitungan itu tiap undian karena ia adalah langkah yang sama yang mengembalikan uang
yang tak dimenangkan ke pot publik, dan itulah yang membuat jackpot menumpuk di tempat Anda bisa
menontonnya. Keempatnya dibahas di [apa yang tetap privat](security/what-stays-private.md).
