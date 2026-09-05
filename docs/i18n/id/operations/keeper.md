# Keeper

Undian tidak terjadi dengan sendirinya. Sesuatu harus mengirim transaksinya. Halaman ini menjelaskan
apa yang dilakukan sesuatu itu, apa yang terjadi ketika ia berhenti, dan berapa biayanya.

Satu proses menggerakkan satu pool. Hearth menjalankan tujuh pool di Sepolia, jadi tujuh proses keeper
berjalan, masing-masing menandatangani dari akunnya sendiri pada frasa benih yang sama dan
masing-masing diarahkan ke berkas alamat satu pool. Bagian "Satu keeper per pool" di bawah adalah
tabelnya.

Kerangka pentingnya lebih dulu: keeper tidak punya hak istimewa. Setiap fungsi yang dipanggilnya bisa
dipanggil siapa pun, dan dua tuas yang mungkin disalahgunakan seorang keeper, yaitu memilih siapa yang
dievaluasi dan memilih urutan pembayaran, bukan lagi tuas. Ia adalah kemudahan yang menghemat repot
para penabung, bukan peran yang menjadi sandaran keamanan pool.

## Tugasnya, berurutan, untuk undian `p`

1. **Close.** Panggil `closeDraw(p)` setelah periode `p` berakhir dan sebelum `closeDeadline(p)`, yaitu
   tengah periode `p+2`. Awal periode `p+1` adalah kebiasaan yang tepat. Ini menetapkan besar hadiah
   dan likuiditas yang ditawarkan tiap tier, memindahkan likuiditas itu ke dalam undian, menarik seed
   terenkripsi, meminta hitungan skala terenkripsi dan bendera tidak-kosong ke vault, memanen sumber
   imbal hasil, dan menandai keempat handle bisa didekripsi publik.
2. **Ambil buktinya.** Minta relayer Zama mendekripsi publik keempat handle itu dalam urutan
   `[seed, scaleCount, nonEmpty, harvested]`. Relayer mengembalikan teks terangnya bersama tanda tangan
   dari layanan pengelolaan kunci.
3. **Award.** Panggil `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)`. Kontrak
   memverifikasi tanda tangannya di on-chain, membukukan panennya ke tier-tier, dan membuka undiannya.
   Para pemenang ditentukan pada saat ini.
4. **Evaluate.** Panggil `evaluate(p, count)` pada vault, berulang kali, sampai penelusuran berputar
   kembali ke titik awalnya. Tiap panggilan memajukan kursor per undian melalui daftar penabung dari
   titik awal yang diturunkan dari seed. Keeper memilih `count`, tidak pernah alamat mana; `4` adalah
   jumlah penabung terbanyak yang membutuhkan kerja terenkripsi yang muat dalam satu transaksi.
   Penabung tanpa observasi pada atau sebelum periode `p` dilewati oleh kontrak itu sendiri, dari
   stempel waktu terang, tanpa biaya terenkripsi.
5. **Finalize.** Setelah jendela tertutup di akhir periode `p+2`, panggil `finalizeDraw(p)`. Ini
   melipat sisa yang tak terbayarkan tiap tier ke dalam carry terenkripsi tier itu, mempublikasikan
   penghitung dana yang tidak terpenuhi, dan menandai carry bisa didekripsi publik untuk tier mana pun
   yang jatuh tempo direkonsiliasi, sambil memancarkan `CarryPublished`.
6. **Reconcile, per tier yang jatuh tempo.** Untuk tiap tier yang dipublikasikan `finalizeDraw`, ambil
   teks terang carry-nya dan panggil `reconcile(tier, carry, proof)`. Pool memeriksa buktinya terhadap
   handle yang dipublikasikan vault, membukukan angka yang terverifikasi ke likuiditas terang tier itu,
   vault mengurangkannya dari carry (yang mungkin sudah bertambah sejak dipublikasikan), dan
   `TierReconciled` dipancarkan.

Di Sepolia tiap tier di tiap pool jatuh tempo tiap undian, jadi langkah 6 berjalan sampai tiga kali
setelah tiap finalisasi. Iramanya adalah argumen konstruktor per tier dan keeper membacanya dari rantai
alih-alih mengasumsikannya, jadi deployment yang mempublikasikan carry sebuah tier lebih jarang tidak
butuh perubahan keeper. Mengapa yang ini mempublikasikan ketiganya tiap undian ada di
[hadiah dan tier](../concepts/prizes-and-tiers.md).

## Aturan urutan

**Finalisasi dan rekonsiliasi undian `p` di awal periode `p+3`, sebelum menutup undian `p+2` di periode
yang sama.**

Alasannya soal uang, bukan kebenaran. Sebuah penutupan menentukan besar hadiah tiap tier dari
likuiditas terang tier itu pada saat itu, dan rekonsiliasi adalah yang mengubah carry undian sebelumnya
kembali menjadi likuiditas terang. Rekonsiliasi lebih dulu dan uang itu langsung dihitung ke besar
hadiah; rekonsiliasi belakangan dan ia menunggu satu undian.

Kedua tugas menjadi tersedia pada saat yang sama. Jendela undian `p` berakhir di akhir periode `p+2`,
dan undian `p+2` bisa ditutup di awal periode `p+3`, jadi keeper mengerjakan finalisasi dan rekonsiliasi
yang jatuh tempo lebih dulu, lalu penutupannya.

Tidak ada yang hilang kalau urutannya bergeser, tetapi arah pergeserannya penting. Tutup sebelum
finalisasi dan carry tier itu belum tertunda, jadi `openDraw` melipatnya ke dalam tawaran dan uang itu
masih bisa dimenangkan; ia hanya tidak menaikkan besar hadiah yang dipublikasikan, yang ditetapkan
`closeDraw` dari likuiditas terang saja. Finalisasi, lalu tutup, lalu rekonsiliasi, dan carry-nya
tertunda: `openDraw` meninggalkan carry yang tertunda sepenuhnya di luar undian, jadi uang itu tidak
ditawarkan dan tidak bisa dimenangkan sampai rekonsiliasi membersihkan benderanya. Di Sepolia tiap tier
jatuh tempo di tiap finalisasi, jadi ini kasus yang biasa, dan itulah sebabnya keeper membaca ulang
carry-nya setelah finalisasi lalu merekonsiliasi sebelum menutup. Tidak ada yang hilang dengan cara mana
pun: penutupan pertama setelah sebuah rekonsiliasi melipat semuanya kembali masuk.

## Apa yang terjadi ketika keeper mati

Tidak ada yang hilang. Itu jawaban lengkapnya, dan itu berlaku karena cara langkah yang terlewat
ditangani:

| Langkah yang terlewat | Konsekuensinya |
| --- | --- |
| Penutupan tidak pernah terjadi, atau terjadi setelah `closeDeadline` dan gagal | Undian tetap `None` dan dilewati. Likuiditasnya tidak pernah dipindahkan, jadi ia tetap di tier-tier dan ditawarkan pada undian berikutnya. Panennya dikumpulkan oleh penutupan berikutnya. |
| Penetapan hadiah tidak pernah terjadi di dalam jendela | Penetapan hadiah yang terlambat tetap membukukan panennya, tetap mengembalikan likuiditas yang ditawarkan ke tier-tier, dan menandai undiannya `Skipped`. Tidak ada imbal hasil dan tidak ada likuiditas yang lenyap. |
| Penelusuran tidak mencapai tiap penabung | Penabung yang terlewat penelusuran tidak mendapat apa pun dari undian itu. Porsi mereka atas tawaran dilipat ke dalam carry tier saat finalisasi dan ditawarkan lagi. Ini satu-satunya kasus di mana penabung sungguhan kehilangan sesuatu yang mungkin dimenangkannya, dan itu batasan 2. |
| Finalisasi atau rekonsiliasi terlambat | Tier-tier memegang lebih sedikit likuiditas terang untuk sementara, jadi besar hadiahnya lebih kecil. Carry yang sudah dipublikasikan sebuah finalisasi dan belum dibersihkan rekonsiliasi duduk di luar tiap penutupan sampai rekonsiliasinya mendarat. Tidak ada yang hilang: penutupan pertama setelah sebuah rekonsiliasi melipat semuanya kembali masuk. |

Keeper yang macet membuat pool kehilangan undian, bukan uang. Setoran dan penarikan tetap bekerja
sepanjang waktu itu, karena jalur jeda tidak pernah menyentuhnya dan undian yang macet tidak mengunci
apa pun.

Deployment kami sebelumnya adalah contoh peringatannya: `openDraw` bersifat tanpa izin dan tidak ada
yang memanggilnya, jadi pool yang hidup duduk 26 jam dengan sebuah undian siap dibuka. Tanpa izin tidak
sama dengan otomatis. Itulah sebabnya desain ini punya keeper sungguhan dan jalur redundansi di
bawahnya.

## Bagaimana seorang penabung memajukan sebuah undian sendiri

Setiap langkah di atas bersifat tanpa izin, dan aplikasi mengekspos setiap satu darinya di layar "Run a
draw", di `/app/<slug>/run` untuk pool yang sedang dibuka, yaitu baris bilah samping bertanda "Anyone".
Sebuah kartu di bagian atas menyebut langkah yang sedang ditunggu pool, dan tiap satu dari lima langkah
di bawahnya membawa tombolnya sendiri, mati dengan alasan yang dinyatakan ketika bukan giliran langkah
itu:

- **Close**, lalu **Award.** Close menetapkan besar hadiah dan menarik seed terenkripsi. Award mengambil
  empat bukti dekripsi di browser dan mengirim balik teks terang yang ditandatangani. Panggilan
  relayer-nya sama dengan yang dilakukan keeper, dan SDK melakukannya dari halaman itu.
- **Advance.** Menjalankan `evaluate(p, count)` untuk undian yang sedang terbuka, memajukan penelusuran
  bersama sebanyak satu batch. Panggilan yang sama ada di kartu undian Anda sendiri di "My draws"
  sebagai "Advance the draw". Ini tombol yang ditekan kalau keeper mati dan penelusuran belum mencapai
  Anda. Ia tidak memungkinkan Anda memilih diri sendiri, dan justru itu fiturnya: karena tidak ada yang
  bisa menonjolkan dirinya sendiri, mengirim transaksi ini tidak mengatakan apa pun tentang apakah Anda
  menang.
- **Finalize** dan **Reconcile.** Menjalankan dua langkah penutup untuk undian mana pun yang jendelanya
  sudah berakhir.

Tidak satu pun dari ini butuh izin kami, kunci kami atau server kami menyala.

## Chainlink Automation, hanya untuk langkah penutupan

`HearthPrizePool` mengimplementasikan antarmuka `checkUpkeep` dan `performUpkeep` milik Chainlink untuk
langkah penutupan. Mendaftarkan upkeep berbasis waktu memberi pool cara kedua yang independen untuk
memastikan undian ditutup sesuai jadwal, dan penutupan adalah langkah yang punya tenggat, jadi itulah
yang paling layak diasuransikan.

Ia mencakup penutupan dan tidak lebih, dan alasannya sederhana: penutupan adalah satu-satunya langkah
yang tidak butuh data di luar rantai. Award butuh bukti dekripsi yang diambil dari relayer Zama.
Evaluate perlu diulang sampai sebuah kursor berputar. Reconcile butuh dekripsi lain. Jaringan otomasi
on-chain tidak bisa mengambil satu pun dari itu, jadi berpura-pura ia bisa hanyalah sandiwara.

Upkeep itu opsional. Ia butuh LINK di akun upkeep yang terdaftar, dan ia redundansi alih-alih jalur
utama, dan ia akan berupa satu upkeep per pool, masing-masing pada jadwal pool itu sendiri. Belum ada
yang terdaftar di satu pun dari tujuh pool, jadi keeper sendirian yang menjalankan pool demo.

Kami mendeklarasikan antarmuka dua fungsi itu secara lokal alih-alih menambahkan seluruh paket kontrak
Chainlink beserta dependensinya demi dua selector.

## Anggarannya

Biaya per undian, dari deployment yang hidup.

| Langkah | Transaksi per undian | Gas masing-masing |
| --- | --- | --- |
| Close | 1 | `1,422,474` |
| Award | 1 | `435,578` |
| Evaluate, satu batch penuh berisi 4 | `floor(savers / 4)`, di sini 1 | `3,417,699` |
| Evaluate, batch parsial terakhir | 0 atau 1, di sini 1 yang membawa satu penabung | `1,291,192` untuk satu penabung, ditambah `708,836` untuk tiap tambahan |
| Finalize | 1 | `509,463` |
| Reconcile | 3, satu per tier, karena tiap tier jatuh tempo tiap undian | `459,994` |

Pada 5 penabung itu berarti `8,456,388` gas per undian, atau sekitar `0.0085 ETH` pada 1 gwei, yaitu
base fee Sepolia saat deployment. Pada periode satu jam itu 24 undian sehari dan `0.2030 ETH` per hari;
pada periode harian itu `0.0085 ETH`.

Kalikan itu dengan tujuh pool dan itulah seluruh alasan enam di antaranya mengundi tiap enam jam
alih-alih tiap jam. Per jam untuk ketujuhnya berarti 168 undian sehari, sekitar `1.43 ETH`, yang tidak
bisa diimbangi faucet publik. Satu pool per jam dan enam pool enam jam berarti 48 undian sehari, sekitar
`0.41 ETH`. Tiap akun keeper didanai terpisah, jadi pool yang kehabisan gas hanya menghentikan undiannya
sendiri.

Satu penabung tambahan dalam sebuah batch memakan `708,836` gas di Sepolia, dan batch yang membawa satu
penabung memakan `1,291,192`, karena bagian tetap dari panggilannya dibayar bagaimanapun juga. Dalam
unit komputasi, satu penabung adalah `3,674,128` pada tabel harga koprosesor mock, yang menjadi tempat
angka itu bisa dibaca, karena struk yang hidup tidak melaporkan unit komputasi. Ukuran batch `4`
ditetapkan dari pengukuran itu terhadap batas Sepolia yang diterbitkan Zama, yaitu 20.000.000 unit
komputasi per transaksi dengan 5.000.000 pada kedalaman sekuensial. `evaluate` menerima count berapa
pun, jadi kalau Zama mengubah harga sebuah operasi, keeper bisa turun ke batch yang lebih kecil tanpa
deploy ulang.

**Keeper mengevaluasi seluruh penelusuran.** Tidak ada apa pun di on-chain yang membatasi berapa besar
biaya evaluasi, dan keeper juga tidak berhenti di tengah jalan; yang ditegakkannya adalah batas atas
biaya (`KEEPER_MAX_FEE_GWEI`), di bawah itu ia terus mengirim sampai kursornya mencapai akhir.
Konsekuensi jujurnya dinyatakan di [model ancaman](../security/threat-model.md): pool yang dipadati
alamat tak bernilai memakan lebih banyak gas keeper per undian, bukan memakan hadiah para penabung,
karena alamat tanpa observasi sebelum periode itu dilewati tanpa kerja terenkripsi apa pun. Kalau keeper
mati, siapa pun bisa menekan "Advance", dan karena penelusuran dimulai dari titik berbeda tiap undian,
tidak ada yang duduk permanen di belakang.

## Satu keeper per pool

`packages/keeper/ecosystem.config.cjs` menjalankan ketujuhnya di bawah pm2, satu proses masing-masing.
Sebuah proses diberi tahu pool mana yang digerakkannya oleh `HEARTH_ADDRESSES_FILE`, yaitu berkas alamat
yang ditulis deploy pool itu, yang juga memberinya simbol token, desimal dan indeks akun untuk
menandatangani. `KEEPER_NAME` adalah tag yang dibawa tiap baris log.

| Proses pm2 | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

Proses `usdc` mengarah ke `hearth.json` alih-alih `hearth.usdc.json` karena itulah berkas yang ditulis
deployment pertama, sebelum pool punya slug, dan keeper yang berjalan sudah diarahkan ke sana selama
berhari-hari. Kedua berkas membawa alamat yang sama.

Indeksnya disebar supaya pool baru bisa ditambahkan tanpa penomoran ulang, dan tiap akun butuh ETH
Sepolia-nya sendiri. Indeks 0 adalah deployer dan keeper menolaknya.

## Menjalankannya

Keeper adalah paket `@hearth/keeper`. Ia menandatangani dengan satu akun dari `RECOVERY_PHRASE` yang
sama dengan yang dipakai deploy dan membaca `SEPOLIA_RPC_URL` dari `packages/contracts/.env`;
setelannya sendiri tinggal di `packages/keeper/.env`:

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` dan `once` menggerakkan pool mana pun yang ditunjuk `HEARTH_ADDRESSES_FILE`, jadi memeriksa pool
lain hanyalah satu variabel di depan perintahnya. Kalau `HEARTH_VAULT` dan `HEARTH_POOL` masih duduk di
`packages/keeper/.env` dari penyiapan satu pool, keluarkan keduanya: mereka dibaca sebelum berkas
alamat, jadi ketujuh proses akan menggerakkan satu pool yang sama.

Satu putaran mencatat satu baris per fakta, dan tiap baris ditandai dengan pool yang digerakkan
prosesnya, sehingga tujuh log yang berselang-seling tetap terbaca. Jumlahnya membawa simbol dan desimal
pool itu sendiri, keduanya dibaca dari berkas alamat:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

Proses WETH mencetak baris yang sama di bawah `[weth]`, dalam `cWETH`. Arti tiap jenis baris, baris demi
baris, ada di README milik paket keeper sendiri, `packages/keeper/README.md`.

Keeper tidak menyimpan state di antara tik: ia membaca status undian, kursor evaluasi dan irama
rekonsiliasi dari rantai lalu menghitung apa yang harus dilakukan. Menyalakannya ulang tidak
menghilangkan apa pun. Jalankan tepat satu instansi per pool, dan jangan pernah dua di satu akun: di
on-chain tiap langkah berhasil tepat satu kali per undian dan per tier, dan dua panggilan evaluate
sekadar memajukan kursor yang sama, tetapi dua keeper di satu akun akan berebut nonce transaksi.

## Apa yang tidak dibahas halaman ini

Halaman ini tidak membahas apa yang sebenarnya dilakukan transaksi keeper terhadap uangnya, yang ada di
[cara sebuah undian berjalan](../concepts/how-a-draw-works.md). Halaman ini tidak membahas deployment,
yang ada di [deployment](deploying.md). Dan halaman ini tidak menjanjikan ketersediaan: kami menjalankan
sebuah keeper, kami tidak menjaminnya, dan desainnya dibuat sedemikian rupa sehingga tidak menjaminnya
itu bisa diterima.
