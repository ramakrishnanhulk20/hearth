# Analisis statis

Setiap kontrak dijalankan melalui slither 0.11.6 dan solhint sebelum sebuah deployment, dan tiap
temuan entah diperbaiki atau dijelaskan di sini. Tujuh pool itu adalah tujuh deployment dari tiga
kontrak yang sama, jadi satu kali jalan mencakup semuanya. Halaman ini adalah penjelasannya. Jalan
mentahnya bisa diulang:

```bash
npm run lint -w @hearth/contracts
```

untuk solhint, yang lulus dengan nol peringatan pada set aturan yang disetel di `.solhint.json`, dan
untuk slither sebuah kompilasi polos dari sumber yang sama tanpa plugin Hardhat FHEVM, karena plugin
itu menulis ulang `ZamaConfig.sol` pada waktu kompilasi dan slither lalu tidak bisa lagi memetakan
offset sumber kembali ke berkas di disk. Kompilasi polos itu memakai setelan kompiler yang identik
(0.8.27, optimizer pada 800 runs, cancun), jadi bytecode yang dibaca slither adalah bytecode yang
dikirimkan.

## Hasil jalannya

slither menganalisis 46 kontrak dengan 102 detektor dan melaporkan 88 hasil, 85 di antaranya di
kontrak Hearth sendiri. Tidak satu pun berupa bug. Semuanya jatuh ke lima keluarga, dan tiap keluarga
punya satu alasan.

| Keluarga | Jumlah | Tingkat keparahan menurut slither | Mengapa ini bukan temuan |
| --- | --- | --- | --- |
| `unused-return` | 38 | Medium | 36 di antaranya adalah `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` dan `FHE.makePubliclyDecryptable`, yang mengembalikan handle yang diberikan kepadanya supaya panggilan bisa dirantai. Mengabaikan nilai kembalian itu adalah pemakaian yang didokumentasikan di tiap contoh Zama. Dua sisanya ada di bawah. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Medium dan Low | slither memperlakukan tiap operasi `FHE.*` sebagai panggilan eksternal, karena masing-masing adalah panggilan ke kontrak koprosesor. Panggilan itu membawa handle ciphertext, bukan kendali, dan tidak ada kontrak pengguna yang berjalan di dalamnya. Panggilan yang benar-benar eksternal adalah token dan vault, keduanya ditetapkan saat konstruksi, dan tiap fungsi yang memindahkan nilai bersifat `nonReentrant` dan menulis state-nya sebelum transfer. |
| `timestamp` dan `incorrect-equality` | 18 | Low dan Medium | Periode didefinisikan oleh `block.timestamp` dengan sengaja, dan kesamaan ketatnya membandingkan nomor periode dan bendera nol, tidak pernah saldo. Sebuah validator bisa menggeser stempel waktu beberapa detik terhadap periode satu atau enam jam, yang menggeser bobot seorang penabung sebanyak detik itu dari 3.600 atau 21.600. |
| `uninitialized-local` | 8 | Medium | Akumulator dan penghitung yang memang dimulai dari nilai bawaan nol milik Solidity: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` diberi nilai di tiap jalur try/catch yang mengikuti deklarasinya. |
| `calls-loop` | 1 | Low | `finalizeDraw` menanyakan irama rekonsiliasi ketiga tier ke pool. Perulangannya dibatasi pada tiga dan pool itu milik vault sendiri, disetel sekali oleh pemiliknya. |

Dua hasil `unused-return` yang bukan panggilan kontrol akses:

- `HearthVault._withdraw` mengabaikan handle yang dikembalikan `confidentialTransfer`. Transfer
  ERC-7984 memindahkan seluruh jumlah atau tidak sama sekali, dan vault sudah membatasi jumlahnya ke
  yang lebih kecil antara yang dipegang penabung dan yang dipegang vault di transaksi yang sama, jadi
  jumlah yang ditransfer sudah pasti sama dengan jumlah yang diminta. Buku besarnya diperbarui sebelum
  panggilan itu.
- `SponsoredYieldSource.sponsor` mengabaikan apa yang dikembalikan `wrap`. Sponsor adalah pihak
  tepercaya di sini menurut definisinya, dan yang dibukukan pool pada sebuah penutupan tidak pernah
  angka sponsor sendiri melainkan jumlah terverifikasi KMS yang benar-benar ditransfer sumber itu saat
  panen.

## Apa yang tidak bisa dilihat slither

slither bernalar tentang alur kendali teks terang. Ia tidak bisa tahu apakah sebuah perbandingan
terenkripsi adalah perbandingan yang benar, apakah ada pemberian izin di daftar kontrol akses yang
hilang, atau apakah ada nilai yang dipublikasikan padahal seharusnya tidak. Sifat-sifat itu dicakup
oleh pengujian unit, pengujian keadilan dan invarian, serta skrip serangan yang dieksekusi di
[model ancaman](threat-model.md).

## Audit dependensi

`npm audit --omit=dev` di akar repositori melaporkan dua temuan pada 6 September 2026, keduanya di
`axios`, dan keduanya di kode yang tidak pernah dijalankan aplikasinya:

- `axios@0.21.4` di bawah `hardhat-deploy@0.11.45`, di paket kontrak. Itu perkakas deployment yang
  jalan di mesin operator dan tidak pernah ikut terkirim dalam sebuah bundle. `hardhat-deploy` 0.11
  mengunci jalur 0.21, jadi satu-satunya perbaikan adalah peningkatan versi mayor perkakas deploy
  itu, yang akan mengubah catatan deployment yang menjadi sandaran repositori ini.
- `axios` di bawah `@coinbase/cdp-sdk`, yang ditarik `@wagmi/connectors` bersama konektor
  WalletConnect. Hearth tidak pernah mengimpor axios dan tidak pernah memanggil SDK Coinbase;
  peringatan-peringatan itu soal penanganan proxy di sisi server dan pemalsuan permintaan di Node,
  bukan soal bundle peramban. `npm audit fix` memindahkan salinan bersarang itu ke rilis rentan
  yang lain alih-alih keluar dari rentangnya, jadi ia dibiarkan seperti yang dicatat lockfile.

Paket web sendirian, dengan konektornya dilepas, auditnya bersih, dan begitulah angka nol temuan
pada 3 September itu dihasilkan.
