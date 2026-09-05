# Mengapa ini butuh Zama

Uji yang berlaku untuk proyek mana pun yang mengaku butuh teknologi tertentu: hapus teknologi itu
dan lihat apakah produknya bertahan. Kalau masih berfungsi, teknologi itu cuma hiasan.

## Hapus enkripsinya dan produknya tidak ada

Enkripsi homomorfik penuh, biasanya disingkat FHE, berarti aritmetika yang dilakukan langsung di
atas angka terenkripsi, menghasilkan jawaban terenkripsi, tanpa pernah mendekripsi masukannya.
Protocol milik Zama membawa itu ke Ethereum: sebuah kontrak Solidity bisa menambah, membandingkan
dan memilih di antara nilai-nilai yang tidak bisa dibacanya.

Keluarkan itu dari Hearth dan inilah yang tersisa.

| Bagian Hearth | Tanpa FHE |
| --- | --- |
| Saldo Anda | Angka publik. Siapa pun bisa menghargai tabungan dan peluang Anda. |
| Uji pemenang | Perbandingan publik. Hasilnya terlihat semua orang begitu ia berjalan. |
| Siapa yang menang sebuah undian | Publik, karena kredit yang mendarat di saldo seseorang adalah angka yang terlihat. |
| Seed acak | Entah angka publik yang bisa dilihat orang sebelumnya, atau angka di luar rantai yang bisa dipilih orang. |
| Kredit hadiah | Transfer publik ke pemenang yang teridentifikasi. |

Yang Anda dapat adalah PoolTogether. PoolTogether sudah ada, ia berfungsi, dan sudah berjalan
bertahun-tahun. Tidak ada alasan membangunnya ulang.

Produk yang sebenarnya dijual Hearth adalah hal yang tidak bisa ditawarkan PoolTogether: tabungan
berhadiah di mana saldo, peluang dan kemenangan Anda hanya milik Anda, sementara undiannya tetap
bisa diperiksa orang asing. Kedua sifat itu saling bertegangan di rantai yang transparan.
Komputasi terenkripsi adalah satu-satunya yang menyelesaikannya, dan Protocol milik Zama adalah
satu-satunya tempat di Ethereum yang melakukannya hari ini.

Tidak ada versi separuhnya. Setiap satu dari lima baris di atas adalah janji inti. Hapus
enkripsinya dari salah satunya dan produk gagal di baris itu.

## Bagian-bagian persis yang kami pakai

Bukan sekadar "dibangun di atas Zama". Ini daftarnya, dengan apa yang dikerjakan masing-masing
untuk kami.

### Bilangan bulat terenkripsi

`euint64` untuk uang dan bobot, `euint128` untuk akumulator total pool, `ebool` untuk hasil sebuah
perbandingan. Dana pokok, kemenangan, bobot dan kredit tiap penabung adalah salah satu dari itu,
begitu juga carry tiap tier. Aritmetika yang kami lakukan di atasnya adalah `FHE.add`, `FHE.sub`,
`FHE.mul` dengan angka publik, `FHE.min`, `FHE.gt`, `FHE.le`, `FHE.and` dan `FHE.select`.

Perbandingan mengerjakan lebih banyak di sini daripada sekadar uji pemenang. Lima perbandingan
terenkripsi per undian menempatkan bobot total pool terhadap pangkat-pangkat dua di sekitar
bracket terakhirnya yang diketahui, dan satu-satunya yang meninggalkan dunia terenkripsi adalah
hitungan kecil berapa banyak dari lima itu yang dilewatinya. Begitulah undian mendapat skala
publik untuk dijadikan pembanding tanpa totalnya sendiri pernah menjadi angka.

`FHE.select` layak dicatat, karena itulah yang membuat seluruh desain ini mungkin. Ia adalah
pernyataan if yang kondisinya terenkripsi: ia mengembalikan salah satu dari dua nilai terenkripsi
dan rantai tidak bisa tahu yang mana. Begitulah pemenang dan pihak yang kalah menghasilkan
transaksi yang identik. Tidak ada apa pun yang bercabang atas rahasia di mana pun di Hearth.

`FHE.fromExternal` mengambil nilai terenkripsi yang dibangun pengguna di browser mereka, beserta
buktinya, dan mengubahnya menjadi nilai yang bisa dipakai kontrak. Begitulah jumlah setoran tiba
dalam keadaan terenkripsi dari ujung ke ujung.

### ERC-7984, standar token rahasia

Aset tiap pool adalah salah satu token rahasia milik Zama, sebuah wrapper ERC-7984 di atas ERC-20
biasa: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP atau cXAUt. Saldo di dalamnya adalah nilai
terenkripsi, bukan angka publik.

Setoran tiba melalui `confidentialTransferAndCall`, yang mentransfer jumlah terenkripsi dan
memanggil hook penerima di transaksi yang sama. Hook milik vault diberi jumlah yang benar-benar
dipindahkan token, dan itulah cara vault mengkreditkan kenyataan alih-alih permintaan. Pembayaran
berjalan ke arah sebaliknya lewat `confidentialTransfer`.

Memakai token standar, alih-alih menulis sendiri, itu penting. Beberapa proyek di bidang ini
membuat token "bergaya ERC-7984" sendiri. Setiap token kami adalah token yang di-deploy Zama, jadi
saldo rahasia seorang penabung bisa dipakai di luar Hearth dan perilaku token itu bukan sesuatu
yang boleh kami definisikan demi keuntungan kami. Itu juga berarti Hearth bisa membuka pool di
atas token rahasia baru pada hari Zama menerbitkannya, yang menjadi cara enam dari tujuh pool
ditambahkan, dan bahwa ia bisa tidak membuka pool sama sekali di atas token yang mint-nya ditahan
penerbitnya.

### Keacakan terenkripsi

`FHE.randEuint64()` menghasilkan angka acak di dalam koprosesor Zama, di bawah kunci FHE jaringan,
dari sebuah seed yang publik tetapi tidak berguna tanpa kunci itu. Angkanya keluar sebagai
ciphertext. Tidak ada yang melihatnya pada saat ia dibuat, termasuk kami dan termasuk siapa pun
yang mengirim transaksinya.

Ia harus dihasilkan di dalam sebuah transaksi, karena ia mengubah keadaan generator di on-chain.
Itu menutup trik mengintip sebuah undian di luar rantai dengan `eth_call` untuk melihat apakah
Anda akan menang, dan itulah sebabnya menutup sebuah undian adalah transaksi sungguhan yang
berhasil tepat satu kali. Tidak ada yang bisa mengulang undian seed yang tidak disukainya.

### Daftar kontrol akses

ACL on-chain milik Zama menentukan siapa yang boleh mendekripsi ciphertext yang mana. Ia adalah
penegakan, bukan kebijakan: relayer menolak permintaan atas handle yang tidak diizinkan bagi
pemanggilnya.

Hearth memakai empat panggilan padanya. `FHE.allowThis` menjaga sebuah nilai tetap bisa dipakai
kontrak di transaksi berikutnya. `FHE.allow` memberi penabung akses baca permanen atas dana pokok,
kemenangan, bobot per undian dan kredit per undian mereka sendiri. `FHE.allowTransient` memberi
akses selama satu transaksi, yang menjadi cara vault memberi pool izin sekali pakai atas total
sebuah batch evaluasi tanpa pernah memberinya akses tetap. `FHE.makePubliclyDecryptable` membuka
sebuah nilai untuk semua orang, dan kami memakainya pada persis enam jenis nilai: seed, hitungan
skala yang memberi bracket, bendera tidak-kosong, panen, carry sebuah tier ketika tier itu jatuh
tempo direkonsiliasi, dan penghitung dana yang tidak terpenuhi. Bobot total persis pool sengaja
tidak ada di daftar itu.

Panggilan terakhir itu bersifat satu arah dan permanen. Ia adalah hal paling berkonsekuensi yang
bisa dilakukan sebuah kontrak di protokol ini, jadi tiap pemakaiannya di Hearth terdaftar di
[apa yang tetap privat](../security/what-stays-private.md).

### Dekripsi pengguna EIP-712

Inilah cara seorang penabung membaca angkanya sendiri. Mereka menandatangani pesan terstruktur
bertipe, yaitu standar tanda tangan yang menunjukkan kepada penanda tangan persis apa yang mereka
setujui, dan relayer Zama mengembalikan teks terang dari nilai-nilai yang diizinkan bagi penabung
itu.

Ini permintaan di luar rantai. Tanpa transaksi, tanpa gas, tanpa jejak. Itulah sebabnya Hearth
bisa sama sekali tidak punya fungsi klaim: mengetahui bahwa Anda menang tidak berbiaya dan tidak
meninggalkan apa pun. Paruh lain dari janji itu adalah evaluasi juga tidak bisa diarahkan ke diri
sendiri, jadi tidak ada transaksi jenis apa pun yang hanya akan dikirim seorang pemenang.

Baik saldo maupun kemenangan bisa didekripsi pemiliknya. Hearth juga memberikan bobot per undian
dan kredit per undian, sehingga seorang penabung bisa memverifikasi aritmetika undiannya terhadap
masukannya sendiri alih-alih diminta memercayainya.

### Dekripsi publik yang ditandatangani KMS

Arah sebaliknya. Sebuah kontrak menandai nilai sebagai bisa didekripsi publik, siapa pun meminta
teks terangnya ke relayer, dan relayer mengembalikannya bersama tanda tangan dari layanan
pengelolaan kunci, yaitu kelompok yang memegang kunci dekripsi jaringan. Kontrak lalu
memverifikasi tanda tangan itu di on-chain dengan `FHE.checkSignatures` sebelum bertindak atas
angkanya.

Inilah yang mengubah "kami bilang seed-nya 12345" menjadi angka yang kontraknya sendiri menolak
menerimanya tanpa bukti. Hearth memakainya sekali per undian untuk seed, hitungan skala, bendera
tidak-kosong dan panen bersama-sama pada waktu penetapan hadiah, dan sekali lagi untuk carry
sebuah tier setiap kali tier itu jatuh tempo direkonsiliasi, yang di Sepolia berarti tiap tier di
tiap undian. Tiap bukti terikat pada handle-nya dalam urutan tetap, jadi tidak ada yang bisa
diacak atau diputar ulang ke undian lain atau tier lain.

## Apa yang sebenarnya dipercaya seorang penabung

Menyebut ini adalah inti halaman ini.

- **Zama Protocol** untuk menghitung dengan benar di atas ciphertext dan mendekripsi hanya apa
  yang ditandai bisa didekripsi. Tiap dekripsi yang ditindaklanjuti kontrak membawa bukti yang
  diverifikasi di on-chain. Ini batas kepercayaan yang sama dengan yang didokumentasikan
  Confidential Vault milik Zama sendiri.
- **Wrapper token rahasia**, yang merupakan kontrak Zama dan bukan kontrak kami, dan yang bisa
  ditingkatkan pemiliknya. Lihat bagian lapisan token di
  [apa yang tetap privat](../security/what-stays-private.md).
- **Kontrak Hearth sendiri**, yang tidak bisa diubah begitu di-deploy, tanpa proxy dan tanpa jalur
  peningkatan. Kuasa pemilik yang tersisa bersifat sempit dan terdaftar di
  [model ancaman](../security/threat-model.md): sebuah jeda yang menghentikan setoran dan
  penutupan undian tetapi tidak pernah penarikan atau evaluasi, sebuah penyetel sumber imbal
  hasil, jalur penyelamatan untuk token asing yang tidak bisa menyentuh saldo penabung, dan
  pengalihan kepemilikan dua langkah dengan pelepasan yang dinonaktifkan.

Tidak ada satu pun di daftar itu yang berupa orang yang kami minta Anda percayai.
