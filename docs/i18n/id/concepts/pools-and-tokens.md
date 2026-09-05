# Pool dan token

Hearth bukan satu pool. Ia tujuh pool, satu untuk tiap token rahasia di buku alamat Sepolia
milik Zama, dan masing-masing punya `HearthVault` sendiri, `HearthPrizePool` sendiri dan
`SponsoredYieldSource` sendiri, dengan penabungnya sendiri, uang hadiahnya sendiri dan
keeper-nya sendiri.

Kontraknya adalah kode yang sama, di-deploy tujuh kali dengan argumen konstruktor berbeda.
Tidak ada yang dibagi di on-chain: tidak ada registry, tidak ada router, tidak ada saldo
bersama. Penabung di pool WETH tidak bisa melihat, menyentuh atau disentuh oleh pool USDC,
dan sebuah vault yang dijeda atau keeper yang macet di satu token meninggalkan enam lainnya
tetap berjalan.

## Tujuh pool itu

| Token | Slug | Mengundi tiap | Vault | Prize pool | Sumber imbal hasil |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 jam | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 jam | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 jam | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 jam | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 jam | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 jam | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 jam | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Setiap kontrak di atas terverifikasi di Etherscan. Pasangan token yang dipegang tiap pool
adalah milik Zama, bukan milik kami, dan terdaftar di
[coba di Sepolia](../getting-started/try-it-on-sepolia.md).

Pool USDC di-deploy pertama, pada 2 September 2026 di blok `11622398`, dan sejak itu menjalankan
undian tiap jam, yang membuatnya menjadi pool dengan riwayat di belakangnya dan pool tempat
transkrip prove-it di README direkam. Enam lainnya di-deploy pada 5 September 2026, di blok
`11641314` sampai `11641523`.

## Mengapa enam jam, dan bukan satu jam untuk ketujuhnya

Gas. Satu undian di pool berisi lima penabung memakan `8,456,388` gas, diukur dari struk
Sepolia yang nyata: satu close, satu award, dua batch evaluasi, satu finalize dan satu
reconcile per tier. Pada 1 gwei itu setara `0.0085 ETH`. Tujuh pool yang mengundi tiap jam
berarti 168 undian sehari, sekitar `1.43 ETH`, yang tidak mungkin dijaga tetap terdanai dari
faucet publik sepanjang jendela penjurian. Pool berisi sepuluh penabung memakan `12,582,923`
gas per undian dan tagihannya tumbuh mengikutinya.

Jadi enam pool yang di-deploy belakangan mengundi tiap enam jam. Itu empat undian sehari per
pool, sehingga ketujuh pool bersama-sama menghabiskan sekitar `0.41 ETH` sehari alih-alih
`1.43`, dan empat undian sehari tetap cukup sering sehingga pengunjung menyaksikan satu undian
mendarat dalam satu kunjungan. Pool USDC mempertahankan jam per jamnya dan riwayat undian yang
menyertainya.

Peluangnya ditetapkan terhadap periode tiap pool sendiri alih-alih dibawa apa adanya, jadi
rasa produknya sama pada kedua jam:

| Tier | Pool per jam (`usdc`) | Pool enam jam |
| --- | --- | --- |
| Utama | count 1, peluang 1 dari 24, shares 40 | count 1, peluang 1 dari 4, shares 40 |
| Menengah | count 1, peluang 1 dari 6, shares 20 | count 1, peluang 1 dari 2, shares 20 |
| Sering | count 4, peluang 1 dari 1, shares 40 | count 4, peluang 1 dari 1, shares 40 |

Hadiah utama karenanya cair kira-kira sekali sehari di tiap pool. Tier menengah adalah satu
tempat di mana kedua jam itu berbeda: sekitar empat kali sehari di pool per jam dan sekitar
dua kali sehari di pool enam jam, karena memotong peluang menjadi setengah tidak cukup
menutupi undian yang jumlahnya seperenam. Setiap tier di setiap pool direkonsiliasi tiap
undian, dengan alasan yang ada di [hadiah dan tier](prizes-and-tiers.md).

## Desimal, dan apa arti sebuah jumlah

Setiap wrapper rahasia di buku alamat Sepolia milik Zama membaca enam desimal, berapa pun yang
dibaca token publik di bawahnya, karena wrapper membatasi dirinya pada enam dan membebankan
selisihnya ke `rate()`. Confidential WETH adalah kasus paling jelas: token dasarnya memegang 18
desimal, jadi `rate()` wrapper-nya sejuta juta, dan satu unit dasar wrapper adalah sejuta juta
unit dasar token publik.

Setiap jumlah di `packages/contracts/hearth.config.ts` dinyatakan dalam unit dasar wrapper, dan
skrip deploy serta task-task mengalikannya dengan rate yang mereka baca di rantai sebelum
menyentuh token publik. Ini bukan detail sepele. Audit kami sendiri menemukan bug di mana
sebuah pool membukukan jumlah yang dioper pemanggil alih-alih jumlah yang dicetak wrapper, yang
pada token 18 desimal menggelembungkan uang hadiah sebesar faktor sejuta juta. Lihat
[sumber imbal hasil](yield-source.md).

## Apa yang diisikan ke tiap pool di awal

`hearth:seed --token <slug>` mensponsori sumber imbal hasil dan memasukkan lima penabung demo,
dari indeks akun 2 sampai 6, sehingga pengunjung pertama mendarat di pool yang sudah berisi.
Nilai taruhannya berbeda per token karena sebuah pool harus terlihat seperti aset yang
dipegangnya: 1.200 dari stablecoin dolar dan 0,6 ether adalah penabung dengan ukuran yang sama.

| Pool | Lima taruhan demo | Sponsorship | Uang hadiah yang dilepas |
| --- | --- | --- | --- |
| `usdc` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDC | 20 USDC per jam, jadi 19,998 per undian |
| `usdt` | 1.200 / 600 / 300 / 150 / 75 | 10.000 USDT | 20 USDT per jam, jadi 119,98 per undian |
| `weth` | 0,6 / 0,3 / 0,15 / 0,075 / 0,04 | 5 WETH | 0,01 WETH per jam, dibulatkan ke bawah jadi 0,0432 per undian |
| `bron` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 BRON | 30 BRON per jam, jadi 179,99 per undian |
| `zama` | 2.000 / 1.000 / 500 / 250 / 125 | 15.000 ZAMA | 30 ZAMA per jam, jadi 179,99 per undian |
| `tgbp` | 1.000 / 500 / 250 / 125 / 60 | 8.000 tGBP | 16 tGBP per jam, jadi 95,99 per undian |
| `xaut` | 0,4 / 0,2 / 0,1 / 0,05 / 0,025 | 3 XAUt | 0,006 XAUt per jam, dibulatkan ke bawah jadi 0,0216 per undian |

Rate sebuah sumber dinyatakan dalam unit dasar bulat per detik, jadi dua rate terkecil
dibulatkan ke bawah: 0,01 WETH per jam adalah 2,77 unit dasar per detik dan melepas 2, dan
0,006 XAUt per jam adalah 1,67 dan melepas 1. Setiap sponsorship diukur agar bertahan lebih
dari delapan puluh undian, yaitu dua puluh hari atau lebih, sehingga tidak ada yang perlu
mengisi ulang pool selama jendela penjurian.

## Token yang ditolak Hearth

Zama juga menerbitkan **Confidential tGBP** non-mock di Sepolia, di
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` di atas token publik
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3`. Mint token dasarnya dibatasi untuk penerbit,
jadi tidak ada selain penerbit yang bisa memperoleh token publiknya, tidak ada yang bisa
membungkusnya menjadi yang rahasia, dan tidak ada pool yang bisa dibuka di atasnya sama sekali.

Hearth tetap mencantumkannya di pemilih pool, dalam keadaan abu-abu, dengan alasannya tertulis
di bawah namanya. Berkas deployment menyatakan alasan itu satu kali, dalam bahasa Inggris, sebagai
`mint restricted to the issuer`, dan aplikasinya mencetaknya dalam bahasa yang sedang dibaca
pembacanya. Memilihnya membuka halaman yang menyebut nama
token, menautkan kedua kontraknya di Etherscan, menyebutkan pembatasan itu milik siapa, dan
tidak menawarkan aksi dompet apa pun, karena tombol setor yang gagal lebih buruk daripada tanpa
tombol.

Meninggalkan token itu dari daftar akan lebih mudah dan akan tampak seolah Hearth sekadar belum
sempat mengurusnya. Penabung yang mencari tGBP menemukan dua entri: pool mock yang berfungsi,
dan token resmi yang tidak, beserta alasannya.

## Apa yang ditunjukkan deretan pool itu

Halaman depan ditutup dengan deretan berisi setiap pool, tiap selnya membawa hadiah utama pool itu
saat ini, dibaca di server dalam satu multicall dan dikirim di dalam halamannya sehingga deretan itu
sudah terisi ketika ceritanya berhenti bergulir. Pemilih pool di dalam konsol menampilkan angka yang
sama dengan aturan yang sama.

Dua dari aturan itu ada karena sebuah angka bisa menyesatkan:

- Pool yang pembacaannya tidak kembali menulis `unread`, tidak pernah `0.00`. Sebuah node yang tidak
  menjawab dan sebuah jackpot kosong terlihat sama begitu angka nol dituliskan.
- Pool yang belum menutup undian pertamanya menulis **First draw HH:MM UTC** alih-alih sebuah angka,
  di deretan itu maupun di bawah namanya pada pemilih pool. Uang hadiah baru sampai ke tier-tier
  ketika undian pertama di-award, jadi sebelum penutupan itu jawaban yang jujur adalah sebuah waktu,
  bukan `0.00`. Yang mana dari keduanya yang ditampilkan sebuah sel ditentukan oleh `lastClosedDraw`
  yang masih terbaca nol, dan waktunya sendiri adalah `firstPeriodAt` ditambah `periodLength`, yaitu
  akhir periode pertama dan saat paling awal undian 1 bisa ditutup. Jamnya adalah 24 jam UTC dalam
  setiap bahasa.

## Dari mana aplikasi mendapat alamatnya

Aplikasi tidak pernah membawa alamat yang diketik tangan. Setiap pool terbuka di
`packages/web/src/lib/chain/pools.json` dihasilkan dari berkas yang ditulis skrip deploy,
dengan:

```
node scripts/sync-pools.mjs        # from packages/web
```

Skrip itu membaca `packages/contracts/deployments/sepolia/hearth.<slug>.json`, menolak berkas
mana pun yang kehilangan alamat, menolak dua pool yang mengklaim slug yang sama, dan
menambahkan satu entri terbatas yang tidak punya deployment. Jalankan setelah tiap deploy.
Variabel lingkungan yang dulu menyimpan tiga alamat satu pool sudah tidak ada.

Pool yang sedang dilihat seorang penabung adalah segmen pertama setelah `/app`:

| Rute | Apa yang ditampilkan |
| --- | --- |
| `/app` | Mengalihkan ke pool yang terakhir dipakai penabung, atau `usdc` pada kunjungan pertama |
| `/app/<slug>` | Dasbor pool itu |
| `/app/<slug>/deposit` | Mint, shield dan setor untuk token itu |
| `/app/<slug>/withdraw` | Tarik dan unshield untuk token itu |
| `/app/<slug>/draws` | Undian pool itu, dan hasil penabung sendiri di tiap undian |
| `/app/<slug>/run` | Lima langkah undian tanpa izin untuk pool itu |
| `/verify?pool=<slug>` | Seed, bracket dan ambang batas publik untuk pool itu |

Kode bahasa duduk di depan semuanya untuk tiap bahasa selain Inggris, jadi dasbor pembaca
Jepang adalah `/ja/app/weth`.

## Satu keeper per pool

Tujuh pool berarti tujuh proses keeper, masing-masing menandatangani dari indeks akunnya
sendiri pada frasa benih yang sama, karena dua proses di satu akun akan berebut nonce yang
sama. Tabel dan berkas pm2-nya ada di [keeper](../operations/keeper.md).
