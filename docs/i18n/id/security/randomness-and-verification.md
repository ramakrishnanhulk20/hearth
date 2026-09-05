# Keacakan dan verifikasi

Sebuah undian baru bernilai kalau orang asing bisa memeriksanya. Halaman ini caranya.

## Dari mana seed berasal

Satu panggilan, di dalam transaksi yang menutup sebuah undian:

```solidity
euint64 seed = FHE.randEuint64();
```

Itu berjalan di dalam koprosesor Zama. Angkanya dihasilkan generator yang aman secara kriptografis di
bawah kunci FHE jaringan, dan yang kembali ke kontrak adalah handle ciphertext, bukan sebuah angka.
Tidak ada yang pernah melihat nilainya pada saat itu: tidak pemanggilnya, tidak kami, tidak
penambangnya.

Dua sifat generator Zama penting di sini, dan keduanya dinyatakan dalam dokumentasi Zama sendiri:

- **Ia harus berjalan di dalam sebuah transaksi.** Menghasilkan nilai acak mengubah keadaan generator
  di on-chain, jadi ia tidak bisa dilakukan lewat `eth_call`, yaitu cara baca-saja untuk mensimulasi
  sebuah panggilan. Tidak ada yang bisa mengintip sebuah undian di luar rantai untuk melihat apakah
  dia akan menang.
- **Ia aman secara kriptografis dan tetap terenkripsi** sampai sesuatu secara eksplisit membuatnya
  bisa didekripsi.

## Mengapa tidak ada yang bisa mengulang undiannya, atau mengubah besar hadiah yang dimenangkannya

Empat hal, bersama-sama.

1. **Penutupan berhasil sekali.** Mesin status undian mengizinkan `closeDraw(p)` tepat satu kali per
   undian. Tidak ada percobaan kedua untuk membeli angka yang lebih baik.
2. **Nilainya tidak diketahui saat ditarik.** Karena seed berupa ciphertext saat dibuat, siapa pun
   yang mengirim transaksi penutupan tidak belajar apa pun dari mengirimnya. Tidak ada gunanya
   berebut menjadi pemanggilnya.
3. **Langkah publikasinya satu arah.** Setelah penutupan, seed ditandai bisa didekripsi publik.
   Bendera itu permanen dan tidak bisa dicabut di daftar kontrol akses Zama, jadi angka yang dilihat
   dunia adalah angka yang sudah dikomitmenkan kontrak, bukan angka yang dipilih setelahnya.
4. **Hadiah ditetapkan sebelum seed ada.** Besar hadiah tiap tier dan likuiditas yang ditawarkannya
   dihitung di awal transaksi penutupan yang sama, sebelum `randEuint64` dipanggil. Di draf lebih
   awal, keduanya disetel belakangan, pada penetapan hadiah, yang meninggalkan jendela di mana
   seseorang bisa membaca seed, menghitung bahwa dia menang, lalu memindahkan likuiditas antar tier
   supaya kemenangan itu bernilai lebih besar. Jendela itu sudah tidak ada.

Bandingkan itu dengan desain alternatif. Undian yang disuapi hash blok bisa diulang oleh validator
yang tidak menyukai hasilnya. Undian yang disuapi angka di luar rantai bisa dipilih begitu saja.
Keduanya tidak mungkin di sini, dan itulah seluruh alasan keacakannya dihasilkan di on-chain di bawah
enkripsi dan tidak pernah oleh generator di luar rantai.

## Apa yang menjadi publik, dan kapan

| Nilai | Dipublikasikan kapan | Mengapa ia harus publik |
| --- | --- | --- |
| Seed `R` | Pada penutupan, bisa dibaca setelah relayer mendekripsinya | Tanpa itu tidak ada yang bisa menghitung ulang sebuah ambang batas |
| Hitungan skala, yang darinya bracket `M` mengikuti | Pada penutupan | Ambang batas bersifat relatif terhadap ukuran pool |
| Apakah periodenya tidak kosong | Pada penutupan | Membedakan undian kosong dari undian sungguhan |
| Panen untuk undian itu | Pada penutupan | Itulah uang yang mendanai hadiah berikutnya |
| Besar hadiah tiap tier dan likuiditas terang yang ditawarkannya | Pada penutupan | Dibutuhkan untuk memeriksa berapa yang dibayar sebuah kemenangan |
| Carry tiap tier | Pada finalisasi tiap undian, karena tiap tier direkonsiliasi tiap undian | Dibutuhkan untuk memeriksa berapa hadiah yang dibayarkan tier itu |
| Penghitung dana yang tidak terpenuhi | Pada finalisasi | Membuktikan pool mendanai tiap kredit yang ditulis vault |

Dua hal sengaja **tidak** ada di daftar itu. Total saldo tertimbang waktu pool yang persis tidak
pernah dipublikasikan, karena melakukannya membuat pengamat bisa memulihkan jumlah setoran seorang
pemindah tunggal secara persis; bracket di atasnya dipublikasikan sebagai gantinya. Dan tidak ada
nilai per penabung yang pernah ditandai bisa didekripsi publik.

Semua yang ada di daftar itu tiba setelah periode yang ditentukannya sudah berakhir. Mempublikasikan
`R` tidak bisa membantu siapa pun mengubah sebuah bobot, karena bobot untuk periode `p` dibekukan
begitu periode `p` berakhir, yang terjadi sebelum undiannya bahkan bisa ditutup.

Tiap angka itu sampai ke kontrak dengan tanda tangan dari layanan pengelolaan kunci milik Zama,
diverifikasi di on-chain oleh `FHE.checkSignatures`. Buktinya terikat pada handle-handle itu dalam
urutan tetap: `[seed, scaleCount, nonEmpty, harvested]` pada penetapan hadiah, dan satu handle carry
per rekonsiliasi. Tidak ada yang bisa diacak antar slot atau diputar ulang terhadap undian lain.
Mesin status undian adalah penjaga terhadap pemutaran ulang: tiap langkah berhasil sekali per undian,
dan rekonsiliasi sekali per tier.

## Bracket, dan bagaimana vault melacaknya

Total saldo tertimbang waktu pool untuk sebuah periode, `W`, tetap terenkripsi. Angka yang dijadikan
pembanding undian adalah `M = 2^m`, pangkat dua terkecil pada atau di atas `W`.

Vault melacak `m` dari undian ke undian alih-alih menghitungnya dari nol. Pada tiap penutupan ia
membandingkan `W` di bawah enkripsi terhadap lima pangkat dua di sekitar `m` undian sebelumnya,
menjumlahkan lima hasilnya menjadi satu hitungan kecil terenkripsi, dan menandai hitungan itu bisa
didekripsi publik. Pool membaca hitungan yang terverifikasi dan menghitung `m` yang baru, yang bisa
bergerak paling banyak tiga langkah per undian. Perbandingan terenkripsi terpisah terhadap 1
menghasilkan bendera tidak-kosong.

Jadi catatan publik per undian adalah satu bilangan bulat kecil, dan ia hanya berubah ketika pool
melewati sebuah pangkat dua. `scaleBits()` pada pool membaca `m` saat ini; deployment mengisinya
dengan `initialScaleBits`, yaitu perkiraan panjang bit total periode pertama, dan pelacaknya
mengoreksi kesalahan apa pun sampai tiga bit per undian.

## Bagaimana siapa pun menghitung ulang sebuah ambang batas

Semua di bawah ini hanya memakai data publik. Tanpa dompet, tanpa tanda tangan, tanpa izin.

Untuk undian `p`, alamat penabung `u`, tier `t` dengan `count[t]` hadiah dan peluang
`oddsNum[t] / oddsDen[t]`:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

untuk tiap `k` dari `0` sampai `count[t] - 1`. Penabung itu memenangkan hadiah `k` jika dan hanya jika
bobot tertimbang waktunya untuk periode `p` benar-benar lebih besar daripada `threshold_k`.

Anda tidak harus mengimplementasikannya ulang. Vault mengekspos
`thresholdOf(drawId, saver, tier, k)` sebagai view murni atas aritmetika yang sama dengan yang dipakai
evaluasi, jadi panel verifikasi aplikasi, suite pengujian dan siapa pun dengan block explorer semuanya
membaca implementasi yang sama. Mengimplementasikannya ulang di luar rantai adalah empat baris
aritmetika bilangan besar kalau Anda lebih suka memeriksa kontrak terhadap kode Anda sendiri.

Contoh perhitungan dengan angka kecil ada di
[pemilihan pemenang](../concepts/winner-selection.md). Contoh terisi dari sebuah undian Sepolia
sungguhan ada di sini, diambil dari pool `usdc`, yang prize pool-nya adalah
`0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2`. Tiap pool mempublikasikan bidang yang sama untuk
undiannya sendiri:

| Bidang | Nilai |
| --- | --- |
| Undian | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Seed `R` | `5625525180683981523` |
| Bracket `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Panen | `19.531380 USDC` |
| Besar hadiah per tier | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Hadiah yang dibayar per tier | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Dibaca dari rantai: seed dan bracket berasal dari event `DrawAwarded` milik pool, besar hadiah dan
likuiditas yang ditawarkan dari `drawParams(2)`, dan hadiah yang dibayar dari tiga event
`TierReconciled` untuk undian itu, karena apa yang ditawarkan sebuah tier dan tidak dibayarkannya
persis sama dengan carry yang dipublikasikannya. Tier utama dan menengah tidak membayar apa pun di
undian ini dan mengembalikan seluruh tawarannya, yang memang biasa dilakukan tier 1 dari 24 dan 1 dari
6 hampir sepanjang waktu.

Panel verifikasi aplikasi melakukan aritmetika ini di browser untuk alamat mana pun yang Anda ketik,
di `/verify?pool=<slug>` untuk pool yang Anda mau. Ia tidak punya akses istimewa; ia memakai masukan
publik yang sama dan rumus yang sama.

## Mengapa sisa baginya tidak bias

Mengecilkan angka acak besar ke sebuah rentang dengan sisa bagi biasa umumnya bias. Kalau `2^256`
bukan kelipatan persis dari rentangnya, residu rendah muncul sedikit lebih sering, dan bias itu jatuh
tidak merata pada para penabung. PoolTogether V5 menyelesaikannya dengan rejection sampling, dan draf
Hearth yang lebih awal juga.

Hearth tidak lagi membutuhkannya. `M` adalah pangkat dua menurut konstruksinya, dan `2^256` adalah
kelipatan persis dari tiap pangkat dua sampai `2^256`. Jadi `prn mod M` sekadar `m` bit terendah dari
hash 256 bit, dan tiap nilai dari `0` sampai `M - 1` berasal dari jumlah masukan yang persis sama.
**Bias-nya nol, bukan kecil**, tanpa perulangan, tanpa penolakan dan tanpa apa pun yang harus
direproduksi seorang pemverifikasi dengan hati-hati.

Itu manfaat sampingan dari mempublikasikan bracket alih-alih total persisnya, dan layak dinyatakan
karena ia menghapus sepotong kode yang kalau tidak harus dicocokkan persis oleh siapa pun yang
memeriksa undian.

## Menggiling alamat tidak berhasil

Begitu `R` publik, seseorang bisa membangkitkan alamat sampai menemukan satu dengan ambang batas
rendah. Itu akan sia-sia. Ambang batas dibandingkan terhadap bobot untuk periode `p`, dan alamat yang
baru dibuat tidak punya observasi pada atau sebelum periode `p`, jadi bobotnya nol. Nol tidak melewati
ambang batas mana pun. Untuk punya bobot di periode `p`, Anda harus memegang saldo selama periode `p`,
yang sudah berakhir sebelum `R` ada.

Menggiling untuk undian mendatang gagal karena alasan lain: seed undian itu belum dibangkitkan, dan ia
tidak bisa diprediksi.

## Apa yang dibuktikan verifikasi, dan apa yang tidak

Bersikap tepat soal ini adalah inti halaman ini.

**Ia membuktikan:**

- Seed dibangkitkan di on-chain, di dalam sebuah transaksi, di bawah kunci jaringan, dan
  dipublikasikan tepat satu kali.
- Besar hadiah dan likuiditas yang ditawarkan ditetapkan sebelum seed itu ada.
- Aturan yang diterapkan ke tiap penabung bersifat publik, seragam dan bisa dihitung ulang siapa pun.
- Besar hadiah mengikuti dari likuiditas tier dan parameter tier lewat aritmetika publik.
- Jumlah hadiah yang dibayarkan tiap tier cocok dengan apa yang ditawarkan tier itu dikurangi apa yang
  kembali di carry-nya.
- Pool mendanai tiap kredit yang ditulis vault, karena penghitung dana yang tidak terpenuhi
  dipublikasikan dan bernilai nol.

**Ia tidak membuktikan:**

- Bahwa generator koprosesor bersifat seragam. Itu mesin milik Zama, dan ia dipercaya, bukan
  diverifikasi di sini.
- Bahwa layanan pengelolaan kunci menandatangani teks terang yang sebenarnya dari handle seed. Kontrak
  memeriksa tanda tangannya, bukan maknanya. Kuorum yang tidak jujur bisa menandatangani nilai
  pilihannya. Tiap aplikasi di protokol ini berbagi asumsi itu; ia adalah penyerang 8 di
  [model ancaman](threat-model.md).
- Bahwa bracket yang dipublikasikan benar-benar merupakan bracket dari jumlah bobot tiap penabung.
  Orang luar tidak bisa menjumlahkan bobot terenkripsi, dan sekarang juga tidak bisa melihat jumlahnya.
  Yang mereka punya sebagai gantinya adalah bahwa kode publik yang sama dan tidak bisa diubah menghitung
  perbandingan-perbandingan itu dan bobot tiap penabung dari observasi yang sama, dan bahwa invarian
  konservasinya berlaku: yang dibayarkan sama dengan yang dikreditkan, dan tidak ada yang menarik lebih
  dari dana pokok ditambah kemenangan.
- Apa pun tentang siapa yang menang. Itu justru intinya, dan itulah sebabnya mempublikasikan lebih
  banyak akan membuat verifikasi lebih kuat dan produknya lebih buruk. Mempublikasikan total persisnya
  adalah contoh konkretnya: itu membuat ukuran pool bisa dicek, dan juga membuat setoran seorang
  pemindah tunggal bisa dipulihkan sampai unit dasarnya.

## Apa yang bisa diperiksa seorang penabung yang tidak bisa diperiksa orang lain

Seorang penabung bisa melangkah satu tahap lebih jauh daripada orang luar, karena mereka bisa
mendekripsi bobotnya sendiri dan kreditnya sendiri untuk sebuah undian.

1. Buka bobot Anda untuk undian `p`.
2. Hitung ulang ambang batas Anda sendiri dari `R` dan `M` yang publik, atau baca dari `thresholdOf`.
3. Hitung berapa yang Anda lewati, kalikan dengan besar hadiah tier itu.
4. Buka kredit Anda untuk undian `p` dan periksa apakah cocok.

Kalau tidak cocok, entah sebuah tier kehabisan sebelum penelusuran mencapai Anda, yang merupakan
pembatasan yang terdokumentasi, atau ada yang salah dan Anda punya angka untuk membuktikannya. Aplikasi
melakukan keempat langkah itu untuk Anda dan menampilkan aritmetikanya.
