# Coba di Sepolia

Sepolia adalah jaringan uji publik milik Ethereum. Uang di dalamnya tidak nyata, jadi Anda
bisa menjalankan seluruh siklusnya gratis. Pool USDC mengundi tiap jam dan enam pool lainnya
tiap enam jam, jadi pilih USDC kalau Anda ingin menyaksikan undian untuk periode tempat Anda
menyetor. Jalur dua menit di bagian bawah halaman ini tidak menunggu undian.

Aplikasi live-nya ada di https://hearth-ram.vercel.app. Semua di bawah ini juga bisa
dilakukan langsung dari block explorer kalau Anda lebih suka menonton panggilan mentahnya.

## 0. Pilih sebuah token

Hearth menjalankan tujuh pool, satu untuk tiap token rahasia yang Zama terbitkan di Sepolia.
Masing-masing adalah set kontrak terpisah dengan penabungnya sendiri, uang hadiahnya sendiri
dan jamnya sendiri, jadi memilih token berarti memilih pool. Nama token di puncak rel kiri
membuka pemilihnya, dan pool tempat Anda berada adalah bagian pertama URL: `/app/usdc`,
`/app/weth` dan seterusnya.

| Token | Slug | Mengundi tiap | Token publik dengan `mint` terbuka |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 jam | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 jam | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 jam | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 jam | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 jam | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 jam | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 jam | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

Pemilih itu juga mencantumkan **Confidential tGBP** resmi milik Zama, dalam keadaan abu-abu,
karena mint token dasarnya milik penerbit dan tak seorang pun lain bisa memperoleh tokennya.
Memilihnya membuka halaman yang menyebut nama token, menautkan kedua kontraknya dan tidak
menawarkan aksi dompet apa pun, alih-alih tombol setor yang akan gagal.

Aplikasi ini bisa dibaca dalam enam belas bahasa, dipilih dari tombol di bilah atas. Bahasa
Inggris memakai URL polos dan bahasa lain menaruh kodenya di depan, jadi layar yang sama
dalam bahasa Jepang adalah `/ja/app/usdc`.

## Kontrak yang akan Anda sentuh

Panduan di bawah memakai pool USDC. Semua pool lain adalah set kontrak yang sama di alamat
berbeda, terdaftar di [pool dan token](../concepts/pools-and-tokens.md).

| Apa | Alamat | Siapa yang men-deploy |
| --- | --- | --- |
| Mock USDC (ERC-20 publik, `mint` terbuka) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, wrapper ERC-7984) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Dua alamat Zama itu adalah yang diterbitkan dalam rujukan alamat Confidential Vault milik
Zama sendiri untuk Sepolia, jadi token ujinya milik Zama, bukan milik kami. Setiap wrapper
rahasia di daftar itu memakai 6 desimal, artinya tiap jumlah on-chain di wrapper dihitung
dalam sepersejuta: 1.000 USDC ditulis `1000000000`. Token publik di bawahnya bisa memakai
skala berbeda, dan `rate()` milik wrapper adalah konversinya. Mock USDC juga memakai 6, jadi
keduanya sepakat; mock WETH memakai 18, jadi rate-nya sejuta juta.

## 1. Dapatkan ETH Sepolia

Anda perlu sedikit ETH Sepolia untuk membayar gas. Faucet Sepolia mana pun bisa dipakai. Yang
umum dipakai adalah faucet Google Cloud Web3, faucet Sepolia milik Alchemy dan faucet
Chainlink, dan masing-masing memberi cukup untuk panduan ini dalam satu permintaan.
Sepersepuluh ETH sudah jauh lebih dari cukup.

## 2. Mint token uji

Setiap satu dari tujuh mock publik itu punya `mint(address, uint256)` publik tanpa pemeriksaan
pemilik, dibatasi satu juta token per panggilan, dan alamatnya ada di tabel di atas. Aplikasi
mengeksposnya sebagai satu tombol di layar Setor pada pool mana pun yang sedang Anda buka, di
langkah pertama dari tiga langkahnya, berlabel "Get test USDC" selagi dompet Anda belum
memilikinya dan "Get a million more" begitu sudah, dengan token pool itu sendiri di labelnya.
Secara manual, untuk USDC, perintahnya:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Minta lebih banyak dari yang Anda butuhkan. Tidak ada apa pun di sini yang bernilai.

## 3. Shield: bungkus USDC menjadi confidential USDC

Confidential USDC adalah wrapper ERC-7984 milik Zama di atas mock USDC itu. ERC-7984 adalah
standar token rahasia: saldo tersimpan di rantai sebagai nilai terenkripsi, bukan angka yang
bisa dibaca siapa saja. Membungkusnya adalah dua panggilan:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

Di aplikasi, dua panggilan itu adalah langkah 2 dari Setor, "Shield your USDC". Tombolnya
bertuliskan "Shield", dan "Approve the wrapper" selagi kuota izin wrapper masih kurang dari
jumlah yang Anda ketik.

Sekarang Anda memegang 1.000 confidential USDC. Mulai dari sini, saldo Anda adalah handle
ciphertext dan hanya Anda yang bisa membacanya.

Pembungkusan bersifat publik. Wrapper memancarkan event `Wrap` yang memuat jumlah terangnya,
transfer ERC-20 di bawahnya memuatnya lagi, dan jumlah itu muncul ketiga kalinya di catatan
enkripsi trivial milik koprosesor. Tidak ada cara menghindarinya: mengubah token publik
menjadi token rahasia menurut definisinya adalah tindakan publik.

## 4. Setor ke pool

Satu panggilan, dan jumlahnya terenkripsi sejak awal:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

Aplikasi membangun masukan terenkripsi dan buktinya untuk Anda dengan SDK milik Zama. Hook
penerima di vault mengkreditkan persis jumlah yang menurut token benar-benar berpindah, bukan
jumlah yang Anda minta, jadi transfer yang kurang karena alasan apa pun tidak bisa menciptakan
dana pokok fiktif.

Vault menolak setoran yang jumlahnya, atau yang dana pokok hasilnya, akan mendorong Anda
melewati batas per penabung, yang pada periode satu jam kira-kira 5 miliar token dan pada
periode enam jam kira-kira 854 juta. Kedua bagian pemeriksaan itu penting: penjumlahan
terenkripsi berputar diam-diam pada 64 bit, jadi membatasi jumlah yang masuk sekaligus
totalnya adalah yang mencegah setoran raksasa memutar jumlahnya menjadi angka kecil dan lolos.
Penolakannya sendiri terenkripsi: hook mengembalikan sebuah false terenkripsi dan token
mengembalikan dana Anda di dalam transaksi yang sama, jadi sebuah penolakan tidak memberi tahu
siapa pun berapa saldo Anda.

### Mengapa bungkus dan setor adalah dua langkah, bukan satu

Kebanyakan aplikasi di bidang ini menggabungkan "approve, wrap, deposit" di balik satu tombol.
Itu lebih ramah dan itu membocorkan setoran Anda.

Kami mengukurnya pada deployment kami sendiri sebelumnya. Membaca log publik blok Sepolia
11528000 sampai 11618500, tiga dari lima setoran duduk dua sampai empat blok setelah sebuah
`Wrap` publik senilai persis 100 USDC oleh alamat yang sama. Siapa pun yang membaca rantai
bisa menghargai ketiga setoran itu masing-masing 100 USDC tanpa membobol apa pun. Dokumentasi
Zama sendiri menyebut masalah yang sama dan menamainya korelasi shield-join: "A user who wraps
50,000 USDC and joins a batch minutes later has effectively published only the upper bound on
their join amount."

Jadi Hearth sengaja memisahkan keduanya:

- Bungkus sekali, dalam angka bulat, pada waktu yang Anda pilih sendiri.
- Pegang saldo rahasia yang mengendap dan setorkan sebagiannya kemudian.
- Setor lagi dari saldo yang sama tanpa membungkus lagi.

Korelasinya melemah seiring waktu, seiring pemakaian ulang saldo yang mengendap, dan seiring
lalu lintas wrapper orang lain. Melakukannya dalam satu klik menghapus ketiga pertahanan itu.
Aplikasi menampilkan peringatannya di langkah shield alih-alih menyembunyikan pertukarannya.

Ada baiknya berterus terang soal harga dari saldo yang bisa dipatok, karena harganya lebih
dari sekadar jumlah setoran. Ambang batas bersifat publik menurut desain, sebab itulah yang
membuat undian bisa diperiksa. Jadi siapa pun yang tahu saldo Anda dapat menghitung apakah
Anda menang, di tiap tier, di tiap undian sejak saat itu, tanpa mendekripsi apa pun. Itulah
sebabnya ini dua langkah dan bukan satu.

## 5. Tunggu sebuah undian

Satu periode adalah satu jam di pool USDC dan enam jam di enam pool lainnya, karena alasan gas
di [pool dan token](../concepts/pools-and-tokens.md). Undian untuk sebuah periode hanya bisa
ditutup setelah periode itu berakhir, dan semua tentangnya harus selesai dalam dua periode
berikutnya. Penutupannya sendiri punya tenggat yang lebih ketat, yaitu tengah periode kedua
dari dua itu, supaya perjalanan bolak-balik dekripsi dan penetapan hadiah selalu punya ruang.
Jadi setoran yang Anda buat sekarang memperoleh peluang untuk periode berjalan, dan hasil
periode itu mendarat dalam beberapa jam berikutnya.

Dasbor menampilkan periode berjalan dan sisa waktunya di "The pool right now", dan "My draws"
di bilah samping menampilkan status beberapa undian terakhir. Anda tidak perlu melakukan apa
pun. Kalau Anda ingin mendorongnya sendiri, tiap langkah sebuah undian bisa dipanggil siapa
saja, dan "Run a draw" di bilah samping memuat kelimanya; lihat
[halaman keeper](../operations/keeper.md).

Peluang Anda untuk sebuah periode didasarkan pada saldo rata-rata Anda sepanjang periode itu,
bukan saldo Anda di akhirnya. Menyetor lima menit sebelum periode satu jam ditutup membeli
seperdua belas peluang dibanding memegang jumlah yang sama sepanjang periode. Itu disengaja;
lihat [saldo tertimbang waktu](../concepts/time-weighted-balance.md).

## 6. Buka apa yang Anda pegang dan apa yang Anda menangkan

Tekan ikon mata di samping "Principal" pada kartu "What you hold" di dasbor, lalu tanda
tangani pesan yang ditunjukkan dompet Anda. Nilai yang tersegel ditampilkan sebagai tanda
bintang sampai Anda melakukannya, dan mata itu satu-satunya yang membukanya.

Tanda tangan itu adalah dekripsi pengguna EIP-712: tanda tangan bertipe di luar rantai yang
membuktikan kepada relayer Zama bahwa Anda menguasai alamat itu, ditukar dengan teks terang
dari nilai-nilai yang aksesnya diberikan kontrak kepada Anda. Ini bukan transaksi. Tidak ada
biaya gas dan tidak ada yang ditulis ke rantai.

Ada empat hal tentang diri Anda yang bisa Anda buka:

| Nilai | Artinya |
| --- | --- |
| Dana pokok | Berapa yang sudah Anda tabung. |
| Kemenangan | Uang hadiah yang dikreditkan kepada Anda dan belum ditarik. |
| Bobot, per undian | Saldo tertimbang waktu Anda untuk periode itu, angka yang dibandingkan uji pemenang. |
| Kredit, per undian | Berapa yang dibayarkan undian itu kepada Anda. Nol kalau Anda tidak menang. |

Dua yang pertama terbuka bersama dari satu mata di "What you hold", di dasbor. Dua yang
terakhir terbuka bersama dari mata di samping "Your prize", di bawah "Your result" pada kartu
undian itu di "My draws". Saldo Anda dan hasil sebuah undian bisa terbuka bersamaan, tanda
tangan dari yang pertama melayani yang kedua, dan menekan mata yang terbuka hanya menyegel
kartu tempat mata itu berada.

Dua yang terakhir adalah yang memungkinkan Anda memeriksa undiannya sendiri: ambil bobot Anda,
ambil seed publik dan bracket publik, hitung ulang ambang batas Anda, dan pastikan kreditnya
cocok. Vault mengekspos aritmetika ambang batas sebagai view, `thresholdOf`, jadi Anda bisa
membandingkan hitungan Anda sendiri dengan hitungan kontrak. Lihat
[keacakan dan verifikasi](../security/randomness-and-verification.md).

Tidak ada orang lain yang bisa membaca keempatnya. Relayer menolak permintaan dekripsi dari
alamat yang tidak diberi izin oleh kontrak, dan penolakan itu adalah penegakannya, bukan
sekadar kebijakan.

## 7. Klaim

Tidak ada transaksi klaim, hanya ada tombol klaim.

Hadiah Anda sudah ada di saldo kemenangan Anda begitu penelusuran mencapai Anda. Langkah 6
adalah cara Anda mengetahuinya. Begitu hasil undian itu terbuka, kartunya di "My draws"
menampilkan tombol klaim yang memuat jumlahnya, misalnya "Claim 1.00 USDC"; menekannya
mengirim penarikan biasa untuk persis jumlah itu, dan langkah 8 membawa sisanya pulang. Di
on-chain, sebuah klaim dan sebuah penarikan adalah panggilan yang sama dengan bentuk yang
sama, dan itulah yang membuat pemenang tidak menonjol.

Tidak ada juga yang perlu ditekan supaya dikreditkan. Evaluasi menelusuri daftar penabung dari
titik yang ditentukan seed undian itu. Tombol "Advance the draw" di kartu undian itu, dan
"Advance" di layar "Run a draw", keduanya memajukan penelusuran bersama itu alih-alih memilih
Anda darinya. Penabung yang menekan salah satunya tidak sedang memberi tahu siapa pun bahwa
dia menang.

## 8. Tarik

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

Di aplikasi, keduanya adalah tombol "Withdraw" dan "Withdraw everything" di layar Tarik, pada
tab "Out of the vault". "All of it" di samping kolom isian bukan panggilan ketiga: ia mengisi
kolom itu dengan semua yang Anda pegang, setelah Anda membuka saldo Anda.

Penarikan membayar dari kemenangan dulu, baru dari dana pokok. Jumlahnya dibatasi ke angka
yang lebih kecil antara yang Anda pegang dan yang dipegang vault, karena transfer rahasia
memindahkan seluruh jumlah atau tidak sama sekali dan tidak pernah sebagian. Menghitung itu
sebelum transfer adalah yang menjaga buku besar tetap tepat tanpa perbaikan sesudahnya. Satu
transfer rahasia, satu event, satu jumlah terenkripsi.

Dana pokok tidak pernah dikunci. Anda bisa menarik di tengah sebuah undian, dan bobot yang
sudah ditetapkan undian itu untuk Anda tidak berubah.

## 9. Unshield: buka bungkus kembali ke USDC publik

Dua panggilan, karena membuka bungkus bersifat asinkron menurut desain. Pertama `unwrap`, lalu
`finalizeUnwrap`. Aplikasi mengirim keduanya dari tombol "Unshield" di tab "Back to plain
USDC" pada layar Tarik. Kalau panggilan kedua sempat tidak dituntaskan, sebuah kartu peringatan
duduk di atas kedua tab itu sampai Anda menekan "Finish the unshield" padanya. Daftar argumen
persisnya ada di wrapper milik Zama, bukan milik kami.

Panggilan pertama membakar jumlah terenkripsi itu dan menandainya untuk dekripsi publik. Yang
kedua melepaskan token terangnya begitu protokol Zama menghasilkan teks terang dan buktinya.
Jumlah yang Anda buka bungkusnya bersifat publik, persis seperti jumlah yang Anda bungkus, dan
panggilan pertamalah yang mempublikasikannya, jadi unwrap yang tidak pernah Anda tuntaskan pun
sudah bocor.

Itu memberi hal kedua yang perlu diketahui. Kalau Anda membungkus masuk dan membuka bungkus
keluar sepenuhnya, selisih antara kedua total publik itu adalah batas bawah atas segala yang
pernah Anda menangkan, dan begitu Anda mengosongkan semuanya, selisih itu menjadi persis.
Membuka bungkus ke alamat baru tidak membantu, karena transfer rahasia ke alamat itu justru
adalah kaitannya. Kalau ini penting bagi Anda, buka bungkus dalam angka bulat yang tidak
berhubungan dengan posisi Anda, atau tinggalkan saldo rahasia yang mengendap.

## Coba dalam dua menit

Aplikasi ini adalah konsol dengan rel di sisi kiri, satu tugas per layar, jadi jalurnya adalah
berjalan menuruni rel itu.

1. Buka https://hearth-ram.vercel.app, ikuti "The pool" di header menuju `/app`, dan
   sambungkan dompet di Sepolia. Anda mendarat di pool USDC pada `/app/usdc`; nama token di
   puncak rel mengganti pool. Dasbor terbuka dengan blok bertanda "Next" yang menyebut satu
   hal yang perlu dilakukan.
2. "Deposit" di bilah samping, yang terbuka pada langkah mana pun dari tiga langkahnya sesuai
   posisi dompet Anda. Klik "Get test USDC", lalu "Shield", lalu "Deposit".
3. Kembali ke dasbor, tekan mata di samping "Principal" di "What you hold" dan tanda tangani:
   dana pokok dan kemenangan Anda keduanya muncul, hanya di browser.
4. "Run a draw" di bilah samping, baris bertanda "Anyone". Tekan "Close", lalu "Award", untuk
   menutup dan menetapkan hadiah periode terakhir yang sudah selesai sendiri, atau tonton
   keeper melakukannya.
5. Tekan "Advance" di layar yang sama. Lalu buka "My draws" dan tekan mata di bawah "Your
   result" pada kartu undian itu: bobot dan kredit Anda untuk undian itu muncul, dan saldo dari
   langkah 3 tetap terbuka dengan satu tanda tangan.
6. Buka `/verify?pool=usdc`: seed publik dan bracket-nya ada di sana, "Thresholds for an
   address" menghitung ulang ambang batas Anda di depan Anda, dan perbandingannya cocok. Ganti
   parameter `pool` dengan slug lain untuk memeriksa pool tersebut.
7. "Withdraw" di bilah samping, tab "Out of the vault", "Withdraw everything". Dana pokok dan
   kemenangan apa pun kembali dalam satu transfer.

Tidak ada satu pun langkah di jalur itu yang butuh kami online. Setiap langkah undian bersifat
tanpa izin.
