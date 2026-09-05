# Pemilihan pemenang

Inilah jantung produk ini: menentukan siapa yang menang, di atas angka yang tak bisa dibaca
siapa pun, dengan cara yang tetap bisa diperiksa orang asing.

**Kalimat yang penting: pemilihan pemenang ditetapkan pada saat undian, dan evaluasi hanya
menuliskannya.** Begitu pool memverifikasi seed acak dan bracket tempat total pool jatuh, hasil
tiap penabung di tiap tier sudah ditentukan. Ambang batasnya adalah angka publik yang bisa
dihitung ulang siapa pun, dan bobot terenkripsi yang dibandingkan dengannya tidak bisa berubah
lagi. Evaluasi adalah pembukuan. Ia tidak bisa disetir, didahului, atau dilewati dengan cara
yang mengubah siapa yang menang.

## Apa yang ditetapkan ketika sebuah undian ditetapkan hadiahnya

| Simbol | Apa itu | Publik? |
| --- | --- | --- |
| `R` | Seed acak untuk undian ini | Ya, setelah periodenya berakhir |
| `M` | Bracket tempat total bobot pool jatuh, sebuah pangkat dua | Ya, setelah periodenya berakhir |
| `prize[t]` | Berapa yang dibayar satu hadiah di tier `t` | Ya, ditetapkan saat close |
| `offered[t]` | Likuiditas yang disediakan tier `t` untuk undian ini | Ya, ditetapkan saat close |
| `count[t]` | Berapa hadiah yang ditawarkan tier `t` per undian | Ya, ditetapkan saat deployment |
| `odds[t]` | Seberapa sering tier `t` cair, sebagai pecahan | Ya, ditetapkan saat deployment |
| `W` | Total saldo tertimbang waktu pool untuk periode itu | **Tidak. Tidak pernah dipublikasikan** |
| `twab` | Saldo tertimbang waktu seorang penabung untuk periode itu | Tidak, terenkripsi, bisa dibaca penabung itu |

Dua baris terakhir adalah rahasianya. `twab` bersifat per orang. `W` adalah jumlah dari setiap
`twab`, dan ia ditahan karena mempublikasikannya secara persis memberi pengamat cara memulihkan
jumlah setoran seorang pemindah tunggal lewat pengurangan. Yang dipakai undian sebagai gantinya
adalah `M`: pangkat dua terkecil pada atau di atas `W`. Jadi `M` berada di antara `W` dan `2W`,
dan satu-satunya yang dipelajari pengamat dari satu undian ke undian berikutnya adalah apakah
pool melewati sebuah pangkat dua.

## Aturan PoolTogether, dan aturan kami

PoolTogether V5 memberi tiap penabung `count[t]` kesempatan independen di tier `t`. Tiap
kesempatan dimenangkan dengan peluang `min(1, twab * odds[t] / W)`. Jadi jumlah hadiah yang
diharapkan seorang penabung di sebuah tier adalah porsi mereka atas pool, dikalikan peluang
tier itu, dikalikan jumlah hadiahnya.

Melakukan itu secara harfiah di atas angka terenkripsi berarti menarik angka acak baru per
penabung per hadiah, dan itu butuh `W` yang persis. Hearth mereproduksi bentuk yang sama dengan
satu angka acak seragam per penabung per tier, sebuah tangga ambang batas bertingkat, dan `M`
sebagai ganti `W`.

Tulis `z = twab * odds[t] * count[t] / M`. Itu adalah jumlah hadiah yang diharapkan dimenangkan
penabung ini di tier ini. Hearth membayar mereka `floor(z)` atau `ceil(z)` hadiah, dibatasi
sampai `count[t]`, dan rata-rata sepanjang banyak undian persis sama dengan `z`.

Karena penyebutnya adalah `M` alih-alih `W`, ekspektasi tiap penabung diskalakan dengan
`W / M`, sebuah angka antara setengah dan satu. Jumlahkan para penabung dan sebuah tier membayar
antara setengah dan seluruh hadiah nominal `count * odds` miliknya per undian. Tidak ada yang
hilang karenanya. Apa yang tidak dibayarkan sebuah tier tetap di carry terenkripsinya dan
ditawarkan lagi pada penutupan berikutnya, jadi seiring waktu seluruh imbal hasil tetap keluar;
besar hadiahnya sekadar mengendap lebih tinggi. Lihat [hadiah dan tier](prizes-and-tiers.md).

## Ujinya, langkah demi langkah

Untuk penabung `u` di tier `t` pada undian `p`:

1. Turunkan angka acak mereka untuk tier ini. `prn = keccak256(R, p, u, t)`. Karena alamat
   penabung dan indeks tier masuk ke dalam hash, tiap penabung mendapat angkanya sendiri dan
   tiap tier mendapat angka yang berbeda, semuanya dari satu seed `R`.
2. Kecilkan ke dalam bracket. `r = prn mod M`, sebuah bilangan bulat dari `0` sampai `M - 1`.
   `M` adalah pangkat dua, jadi ini sekadar sisa bagi dari hash 256 bit oleh sebuah pangkat dua,
   yang persis seragam tanpa bias untuk dikoreksi. Ini aritmetika publik atas nilai publik.
3. Bangun tangganya. Untuk tiap hadiah `k` dari `0` sampai `count[t] - 1`:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Ini angka-angka publik. Siapa pun bisa menghitungnya untuk alamat mana pun, dan kontrak
   mengekspos aritmetika yang sama sebagai view, `thresholdOf(drawId, saver, tier, k)`, sehingga
   panel verifikasi aplikasi, pengujian, dan pemeriksa luar mana pun semuanya memakai satu
   implementasi.
4. Bandingkan. Hadiah `k` dimenangkan ketika bobot terenkripsi penabung lebih besar daripada
   `threshold_k`. Ini satu-satunya langkah yang menyentuh rahasia, dan ia adalah perbandingan
   terenkripsi yang hasilnya berupa benar atau salah terenkripsi yang tak bisa dibaca siapa pun.
5. Bayar. Tiap hadiah yang dimenangkan menambahkan `prize[t]` ke pembayaran terenkripsi penabung
   untuk tier ini, lewat sebuah select terenkripsi alih-alih pernyataan if, jadi transaksinya
   terlihat identik entah mereka tidak menang apa pun atau menang semuanya.
6. Batasi. Pembayaran tier itu kepada penabung ini adalah yang lebih kecil antara yang mereka
   menangkan dan yang tersisa di tier itu. Pengurangan tersebut memperbarui sisa likuiditas
   terenkripsi tier itu.
7. Kreditkan. Jumlah yang sudah dibatasi ditambahkan ke kemenangan terenkripsi penabung.

Ambang batasnya naik seiring `k`, jadi seorang penabung memenangkan hadiah `0` sampai `j-1`
untuk suatu `j` lalu berhenti. Syarat untuk hadiah `k` persisnya adalah
`twab * odds * count > r + k * M`.

### Satu percabangan atas teks terang

Kalau sebuah ambang batas lebih besar daripada `2^64 - 1`, tidak ada bobot 64 bit yang mungkin
melewatinya, jadi jawabannya salah dan perbandingannya dilewati sepenuhnya. Ini terjadi pada
tier berpeluang rendah ketika `M` sangat besar. Karena ambang batas hanya naik seiring `k`,
perulangan tier itu berhenti pada ambang batas semacam itu yang pertama alih-alih memeriksa
sisanya. Percabangannya atas angka publik. Tidak ada apa pun di Hearth yang pernah bercabang
atas rahasia.

## Contoh perhitungan: tiga penabung, satu tier

Sebuah pool mungil, supaya angkanya tetap terbaca. Satu tier: tier sering, `count = 4`,
`odds = 1` (yaitu, `oddsNum = 1`, `oddsDen = 1`). Bobot dinyatakan dalam saldo-detik dari token
apa pun yang dipegang pool itu; contoh ini membacanya sebagai USDC.

| Penabung | Bobot | Porsi atas `W` | `z = bobot * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | 60% | 2,34 |
| Ben | 300 | 30% | 1,17 |
| Cy | 100 | 10% | 0,39 |
| **Total `W`** | **1.000** | 100% | **3,91** |

`W` adalah 1.000, jadi bracket-nya `M = 1.024`, pangkat dua terkecil pada atau di atasnya.
Tidak ada orang di luar pool yang melihat angka 1.000 itu. Mereka melihat 1.024.

Perhatikan kolom totalnya. Pembayaran nominal tier itu adalah `count * odds = 4` hadiah per
undian. Yang sebenarnya diperkirakan dibayarkannya adalah `4 * W / M = 4 * 1000 / 1024 = 3,91`.
Itulah penskalaan `W / M`, dan di sini potongannya 2,3 persen karena 1.000 duduk dekat puncak
bracket-nya. Sebuah pool bernilai 520 akan duduk dekat dasar bracket yang sama dan tier itu akan
memperkirakan sekitar 2,03 hadiah.

Sekarang undiannya terjadi. `r` tiap penabung datang dari meng-hash seed dengan alamat mereka
sendiri, jadi angkanya berbeda untuk masing-masing, dan ia mendarat antara 0 dan 1.023.

**Ada, `r = 271`.** Ambang batasnya `floor((271 + k * 1024) / 4)`:

| k | Ambang batas | Bobot Ada 600 melewatinya? |
| --- | --- | --- |
| 0 | 67 | Ya |
| 1 | 323 | Ya |
| 2 | 579 | Ya |
| 3 | 835 | Tidak |

Ada memenangkan 3 hadiah. Ekspektasinya 2,34, jadi 3 adalah sisi atas dari `floor` atau `ceil`.

**Ben, `r = 812`.** Ambang batasnya `floor((812 + k * 1024) / 4)`:

| k | Ambang batas | Bobot Ben 300 melewatinya? |
| --- | --- | --- |
| 0 | 203 | Ya |
| 1 | 459 | Tidak |

Ben memenangkan 1 hadiah, terhadap ekspektasi 1,17.

**Cy, `r = 155`.** Ambang batasnya `floor((155 + k * 1024) / 4)`:

| k | Ambang batas | Bobot Cy 100 melewatinya? |
| --- | --- | --- |
| 0 | 38 | Ya |
| 1 | 294 | Tidak |

Cy memenangkan 1 hadiah. Ekspektasinya 0,39, jadi ini hari baiknya. Sepanjang banyak undian dia
memenangkan satu hadiah sekitar 39 persen dari waktunya dan tidak apa-apa sisanya.

Lima hadiah dibagikan di mana 3,91 diperkirakan. Itu tidak masalah: tiap hadiah adalah
seperdelapan likuiditas tier itu, jadi tier itu bisa membayar delapan sebelum kering. Lihat
[kelebihan pemenang](prizes-and-tiers.md).

Sekarang perhatikan apa yang dilihat pengamat di akhir semua itu. Mereka bisa menghitung sendiri
ketiga tabel di atas, karena `R`, `M`, ambang batas dan alamat-alamatnya publik. Yang tidak bisa
mereka lakukan adalah mengisi kolom paling kanan, karena bobotnya terenkripsi, dan mereka juga
tidak bisa memulihkan angka 1.000 itu, karena hanya 1.024 yang dipublikasikan. Setelah tier itu
direkonsiliasi, satu undian kemudian, mereka tahu berapa hadiah yang dibayarkannya. Mereka tidak
pernah tahu kepada siapa.

## Mengapa memecah dompet Anda tidak menguntungkan

Ini properti yang hilang pada versi yang dibangun asal-asalan.

Hadiah yang diharapkan seorang penabung di sebuah tier adalah `z = twab * odds * count / M`,
yang linear terhadap bobot mereka, dan `M` tidak bergantung pada bagaimana bobot pool dibagi di
antara alamat-alamat. Pecah bobot 600 menjadi dua dompet berisi 300 dan masing-masing mendapat
`z = 1,17`, totalnya 2,34. Persis sama. Pecah menjadi enam dompet berisi 100 dan masing-masing
mendapat 0,39, totalnya 2,34. Persis sama lagi. Tidak ada ambang untuk diakali dan tidak ada
pembulatan untuk dipanen, hanya lebih banyak gas untuk dibayar.

Versi lebih awal desain ini melipat jumlah hadiah ke dalam satu zona kemenangan yang lebih lebar
sehingga tiap penabung paling banyak bisa memenangkan satu hadiah per tier. Itu membatasi
pemegang besar di bawah porsi adilnya dan membayar orang untuk memecah dompet. Sebuah tinjauan
desain menangkapnya dan tangga bertingkat menggantikannya.

## Berapa biayanya

Per penabung per undian, kerja terenkripsinya adalah: satu perkalian dan satu penjumlahan untuk
menghitung bobot, lalu untuk tiap tier satu perbandingan dan satu select per hadiah, ditambah
satu pembatasan. Dengan tiga tier Sepolia itu berarti 6 perbandingan, 6 select dan sekitar
selusin penjumlahan, pengurangan dan minimum.

Zama menerbitkan anggaran per transaksi di Sepolia sebesar 20.000.000 unit komputasi total
dengan 5.000.000 pada kedalaman sekuensial, dan memberi harga satu penjumlahan 64 bit sebesar
162.000, satu perbandingan sekitar 118.000, satu select 55.000 dan satu perkalian dengan angka
publik 365.000. Angka-angka itu menempatkan satu penabung di kisaran beberapa juta unit
komputasi, yang menjadi alasan evaluasi di-batch pada `4` penabung per transaksi. Angka
terukurnya adalah
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)` per penabung dan gas terukurnya adalah `708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Apa yang tidak dibahas halaman ini

Halaman ini tidak membahas dari mana `R` berasal atau bagaimana memverifikasinya, yang ada di
[keacakan dan verifikasi](../security/randomness-and-verification.md). Halaman ini tidak
membahas bagaimana `prize[t]` ditentukan besarnya atau apa yang terjadi ketika sebuah tier
kehabisan di tengah undian, yang ada di [hadiah dan tier](prizes-and-tiers.md). Dan halaman ini
tidak mengklaim apa pun soal menyembunyikan siapa yang ikut serta: daftar penabung, batch
evaluasi dan hitungan hadiah per tier semuanya publik. Lihat
[apa yang tetap privat](../security/what-stays-private.md).
