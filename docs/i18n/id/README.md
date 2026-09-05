# Dokumentasi Hearth

Hearth adalah tabungan berhadiah yang rahasia dan tanpa kehilangan modal, berjalan di Zama
Protocol. Anda menyetor sebuah token rahasia, saldo Anda tetap terenkripsi di on-chain,
imbal hasil yang diperoleh pool dibagikan sebagai hadiah dalam undian berkala, dan dana
pokok Anda bisa ditarik kapan saja. Tidak ada yang bisa membaca berapa yang Anda tabung
atau berapa yang Anda menangkan, termasuk kami.

Tujuh pool berjalan di Sepolia, satu untuk setiap token rahasia yang Zama terbitkan di
sana, masing-masing dengan kontraknya sendiri dan keeper-nya sendiri. Sebagian besar
halaman di bawah memakai USDC dalam contoh perhitungannya, karena itulah pool dengan
riwayat terpanjang; tetapi semuanya menjelaskan ketujuh pool.

Halaman-halaman ini adalah catatan tertulis lengkap tentang cara kerja Hearth dan tentang
apa yang tidak disembunyikannya. `ARCHITECTURE.md` di akar repositori adalah spesifikasi
implementasinya; pohon dokumen ini adalah desain yang sama, dijelaskan untuk orang yang
memakainya dan orang yang mengauditnya.

## Halaman

| Halaman | Isinya |
| --- | --- |
| [Apa itu Hearth](getting-started/what-is-hearth.md) | Produk ini dalam satu halaman: empat langkah yang dilakukan seorang penabung, dan apa persisnya yang disembunyikan masing-masing. |
| [Coba di Sepolia](getting-started/try-it-on-sepolia.md) | Memilih satu dari tujuh token, faucet-nya, shield, setor, sebuah undian, membuka nilai, klaim, tarik, unshield. |
| [Pool dan token](concepts/pools-and-tokens.md) | Tujuh pool dan alamatnya, mengapa enam di antaranya mengundi tiap enam jam, taruhan awal per token, token yang ditolak Hearth, dan rute per pool. |
| [Cara sebuah undian berjalan](concepts/how-a-draw-works.md) | Periode, jendela dua periode dan tenggat penutupan, lima langkah sebuah undian, dan apa yang dipublikasikan vault sebagai ganti total pool. |
| [Saldo tertimbang waktu](concepts/time-weighted-balance.md) | Mengapa peluang memakai saldo rata-rata Anda sepanjang periode, berapa nilai setoran yang terlambat, dan mengapa tiga observasi tersimpan sudah cukup. |
| [Pemilihan pemenang](concepts/winner-selection.md) | Uji pemenang, aturan per hadiah milik PoolTogether, ambang batas bertingkat terhadap bracket yang dipublikasikan, dan contoh perhitungan dengan tiga penabung. |
| [Hadiah dan tier](concepts/prizes-and-tiers.md) | Bagaimana imbal hasil menjadi likuiditas hadiah, carry terenkripsi dan irama rekonsiliasi, tiga tier di Sepolia, kelebihan pemenang, dan di mana kami menyimpang dari PoolTogether V5. |
| [Sumber imbal hasil](concepts/yield-source.md) | Sumber bersponsor di Sepolia, mengapa panen diverifikasi bukan dilaporkan, dan bagaimana Confidential Vault milik Zama tersambung di mainnet. |
| [Mengapa harus Zama](concepts/why-zama.md) | Uji hapus: keluarkan enkripsi homomorfik penuh dan produknya tidak ada. Setiap bagian Zama yang kami pakai, disebut satu per satu. |
| [Apa yang tetap privat](security/what-stays-private.md) | Tujuh aturan: bracket dan kebocoran yang digantikannya, harga dari saldo yang bisa dipatok, celah pembungkusan di dua arah, apa yang diukur oleh jumlah hadiah, lapisan token, mengapa evaluasi bukan petunjuk, dan sisa risiko perilaku. |
| [Model ancaman](security/threat-model.md) | Sembilan penyerang, apa yang diincar masing-masing, apa yang menghentikannya, dan apa yang tidak. Ditambah kegagalan desain kami sebelumnya yang benar-benar dieksekusi. |
| [Keacakan dan verifikasi](security/randomness-and-verification.md) | Dari mana seed berasal, mengapa tidak ada yang bisa mengulang undiannya atau mengubah besar hadiahnya, dan bagaimana siapa pun menghitung ulang sebuah ambang batas setelahnya. |
| [Analisis statis](security/static-analysis.md) | Hasil jalannya slither dan solhint, dan satu alasan di balik masing-masing dari lima keluarga temuan. |
| [Keeper](operations/keeper.md) | Tugas keeper langkah demi langkah, aturan urutan, satu proses per pool, apa yang terjadi ketika ia mati, dan anggaran gas-nya. |
| [Deployment](operations/deploying.md) | Men-deploy satu pool per token, tanda tangan dan parameter konstruktor, verifikasi, dan dua set parameter Sepolia dibandingkan satu set mainnet. |
| [Batasan](limitations.md) | Semua batasan yang terdokumentasi dalam satu daftar bernomor berisi empat belas butir. |
| [FAQ](faq.md) | Dua belas jawaban singkat, dimulai dari token mana saja dari tujuh itu yang bisa Anda tabung, termasuk ke mana perginya tombol klaim. |
