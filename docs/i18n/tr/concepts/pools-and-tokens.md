# Havuzlar ve tokenler

Hearth tek bir havuz değildir. Yedi havuzdur, Zama'nın Sepolia adres defterindeki her gizli
token için bir tane, ve her biri kendi `HearthVault`'u, kendi `HearthPrizePool`'u ve kendi
`SponsoredYieldSource`'udur, kendi tasarruf sahipleri, kendi ödül parası ve kendi keeper'ı
ile.

Sözleşmeler aynı koddur, farklı constructor argümanlarıyla yedi kez dağıtılmıştır. Zincir
üzerinde hiçbir şey paylaşılmaz: kayıt defteri yok, yönlendirici yok, ortak bakiye yok. WETH
havuzundaki bir tasarruf sahibi USDC havuzunu göremez, ona dokunamaz ve ondan
etkilenmez. Bir tokende duraklatılmış bir kasa ya da takılmış bir keeper, diğer altısını
çalışır halde bırakır.

## Yedi havuz

| Token | Kısa ad | Çekiliş sıklığı | Kasa | Ödül havuzu | Getiri kaynağı |
| --- | --- | --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 saat | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` |
| Confidential USDT (Mock) | `usdt` | 6 saat | `0xe54F44dE64F8A7abc0647eaae547dD59ce0EFfac` | `0x6a83Beb2Dc3f258107Cad5e17BC57657fAd4fbd1` | `0x5bb1Cd5380Cb9f2B15569030fF0dB7a445cF54cA` |
| Confidential WETH (Mock) | `weth` | 6 saat | `0x3D1A182782B68fE270A66294C9adaC7F005c4f14` | `0x1a11e7C689F244fA8Dd5f4abA8F2F3131090cc1C` | `0x40DF298f15c6136294eC651aD7b0c1C6F221DE8F` |
| Confidential BRON (Mock) | `bron` | 6 saat | `0x18086DC8271f8A73c5Ea985fd519527Dbb991279` | `0x2Ed982979CD184494B947a1E38E597494a38ACe4` | `0x0cD1155D752bD81b3a437a6f0B3965CAA2A1C8e9` |
| Confidential ZAMA (Mock) | `zama` | 6 saat | `0xEEC26386F273c6678cA538AcA18e1d9384eA9F09` | `0x873B285404199D46325a294Aa0EC7a79C30A7fF7` | `0xdD352D70311E834ab75307f53d5C276060081d23` |
| Confidential tGBP (Mock) | `tgbp` | 6 saat | `0xCe95dAa01f5354aA8887A5952E403D26d452c323` | `0xC531D54ee2c695e0eBfe8b8258e9Fd80fd507095` | `0xDEa2BD6351072F735B6ea83c357bF157d83c01af` |
| Confidential XAUt (Mock) | `xaut` | 6 saat | `0x77f701101d66FbD522A3bFdC2c00DB09a4F57daE` | `0x9a2888aca42c707A3BC0D561FdF6ff8Abfda5201` | `0x03fDdAA7C4323C53CE511CC49D4c33B26B492af7` |

Yukarıdaki her sözleşme Etherscan üzerinde doğrulanmıştır. Her havuzun tuttuğu token çifti
bizim değil Zama'nındır ve burada listelenmiştir:
[Sepolia'da deneyin](../getting-started/try-it-on-sepolia.md).

USDC havuzu ilk dağıtılan havuzdur, 2 Eylül 2026'da `11622398` numaralı blokta, ve o günden
beri saatlik çekiliş yapıyor. Arkasında bir geçmiş olan havuz da, README'deki kanıt
dökümünün karşısında kaydedildiği havuz da bu yüzden odur. Diğer altısı 5 Eylül 2026'da,
`11641314` ile `11641523` arasındaki bloklarda dağıtıldı.

## Neden altı saat, neden yedisi birden saatlik değil

Gas yüzünden. Beş tasarruf sahibi olan bir havuzda tek bir çekiliş, canlı Sepolia
makbuzlarında ölçüldüğü haliyle `8,456,388` gas: bir kapatma, bir ödül adımı, iki
değerlendirme partisi, bir sonlandırma ve kademe başına bir mutabakat. 1 gwei üzerinden bu
`0.0085 ETH` eder. Yedi havuzun saat başı çekiliş yapması günde 168 çekiliş, yani yaklaşık
`1.43 ETH` demek olurdu, ki bu bir değerlendirme penceresi boyunca herkese açık faucet'lerle
finanse edilemez. On tasarruf sahibi olan bir havuzda çekiliş başına `12,582,923` gas gider,
ve hesap onunla birlikte büyür.

Bu yüzden sonradan dağıtılan altı havuz altı saatte bir çekiliş yapar. Bu her biri için
günde dört çekiliş demek, dolayısıyla yedi havuz birlikte günde `1.43` yerine yaklaşık
`0.41 ETH` tutar, ve günde dört çekiliş bir ziyaretçinin tek bir ziyaret içinde birinin
gerçekleşmesini görmesi için hala yeterince sıktır. USDC havuzu saatlik saatini ve onunla
gelen çekiliş geçmişini korur.

Şans, taşınmak yerine her havuzun kendi dönemine göre ayarlanır, dolayısıyla ürünün hissi
her iki saatte de aynıdır:

| Kademe | Saatlik havuz (`usdc`) | Altı saatlik havuzlar |
| --- | --- | --- |
| Büyük ödül | sayı 1, şans 24'te 1, pay 40 | sayı 1, şans 4'te 1, pay 40 |
| Orta | sayı 1, şans 6'da 1, pay 20 | sayı 1, şans 2'de 1, pay 20 |
| Sık | sayı 4, şans 1'de 1, pay 40 | sayı 4, şans 1'de 1, pay 40 |

Dolayısıyla büyük ödül her havuzda günde bir kez civarında öder. İki saatin ayrıştığı tek
yer orta kademedir: saatlik havuzda günde dört kez civarında, altı saatliklerde günde iki
kez civarında, çünkü şansı yarıya indirmek çekiliş sayısının altıda bire düşmesini tam
karşılamıyor. Her havuzun her kademesi her çekilişte mutabakat yapar, gerekçesi burada:
[ödüller ve kademeler](prizes-and-tiers.md).

## Ondalıklar ve bir tutarın anlamı

Zama'nın Sepolia adres defterindeki her gizli sarmalayıcı, altındaki açık token ne okursa
okusun altı ondalık okur, çünkü sarmalayıcı kendini altıyla sınırlar ve farkı `rate()`
değerine yükler. En net örnek Confidential WETH'tir: dayanağı 18 ondalık tutar, dolayısıyla
sarmalayıcının `rate()` değeri bir milyon kere bir milyondur, ve sarmalayıcının bir temel
birimi açık tokenin bir milyon kere bir milyon temel birimidir.

`packages/contracts/hearth.config.ts` içindeki her tutar sarmalayıcı temel birimi
cinsindendir, ve dağıtım ile görevler açık tokene dokunmadan önce zincirde okudukları oranla
çarpar. Bu bir ayrıntı değil. Kendi denetimimiz, bir havuzun sarmalayıcının bastığı tutar
yerine çağıranın gönderdiği tutarı kayda geçirdiği bir hata buldu, ki bu 18 ondalıklı bir
tokende ödül parasını bir milyon kere bir milyon katına şişiriyordu. Bakınız:
[getiri kaynağı](yield-source.md).

## Her havuz neyle başlatıldı

`hearth:seed --token <slug>` getiri kaynağına sponsorluk sağlar ve 2 ile 6 arasındaki hesap
indekslerinden beş örnek tasarruf sahibi ekler, böylece ilk ziyaretçi dolu bir havuza düşer.
Bakiyeler tokene göre değişir, çünkü bir havuzun tuttuğu varlığa benzemesi gerekir: bir
dolar stablecoin'inin 1,200'ü ile ether'in 0.6'sı aynı büyüklükte tasarruf sahibidir.

| Havuz | Beş örnek bakiye | Sponsorluk | Serbest bırakılan ödül parası |
| --- | --- | --- | --- |
| `usdc` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDC | Saatte 20 USDC, yani çekiliş başına 19.998 |
| `usdt` | 1,200 / 600 / 300 / 150 / 75 | 10,000 USDT | Saatte 20 USDT, yani çekiliş başına 119.98 |
| `weth` | 0.6 / 0.3 / 0.15 / 0.075 / 0.04 | 5 WETH | Saatte 0.01 WETH, aşağı yuvarlanarak çekiliş başına 0.0432 |
| `bron` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 BRON | Saatte 30 BRON, yani çekiliş başına 179.99 |
| `zama` | 2,000 / 1,000 / 500 / 250 / 125 | 15,000 ZAMA | Saatte 30 ZAMA, yani çekiliş başına 179.99 |
| `tgbp` | 1,000 / 500 / 250 / 125 / 60 | 8,000 tGBP | Saatte 16 tGBP, yani çekiliş başına 95.99 |
| `xaut` | 0.4 / 0.2 / 0.1 / 0.05 / 0.025 | 3 XAUt | Saatte 0.006 XAUt, aşağı yuvarlanarak çekiliş başına 0.0216 |

Bir kaynağın hızı saniyede tam temel birim cinsindendir, dolayısıyla en küçük iki hız aşağı
yuvarlanır: saatte 0.01 WETH saniyede 2.77 temel birim eder ve 2 serbest bırakır, saatte
0.006 XAUt ise 1.67 eder ve 1 serbest bırakır. Her sponsorluk seksen çekilişten fazlasına,
yani yirmi güne ya da daha uzağa yetecek büyüklükte ayarlanmıştır, böylece bir değerlendirme
penceresi boyunca kimsenin havuza takviye yapması gerekmez.

## Hearth'ün kabul etmediği token

Zama Sepolia'da taklit olmayan bir **Confidential tGBP** de yayımlıyor,
`0x167DC962808B32CFFFc7e14B5018c0bE06A3A208` adresinde,
`0xf6Ef9ADB61A48E29E36bc873070A46A3D2667ff3` açık tokeni üzerinde. Dayanağının basımı
ihraççıyla sınırlıdır, dolayısıyla ihraççı dışında kimse açık tokeni edinemez, kimse gizli
olana sarmalayamaz, ve üzerine hiçbir havuz açılamaz.

Hearth onu yine de havuz seçicisinde listeler, soluk halde, sebebi yanına yazılmış olarak:
`mint restricted to the issuer`. Onu seçmek, tokenin adını veren, her iki sözleşmeye
Etherscan üzerinden bağlantı veren, kısıtın kime ait olduğunu söyleyen ve hiçbir cüzdan
işlemi sunmayan bir sayfa açar, çünkü geri dönen bir yatırma düğmesi, hiç düğme olmamasından
kötüdür.

Tokeni listeden çıkarmak daha kolay olurdu ve Hearth'ün ona sırası gelmemiş gibi görünürdü.
tGBP arayan bir tasarruf sahibi iki kayıt bulur: çalışan taklit havuz, ve çalışmayan resmi
token, sebebiyle birlikte.

## Uygulama adresleri nereden alıyor

Uygulama elle yazılmış hiçbir adres taşımaz.
`packages/web/src/lib/chain/pools.json` içindeki her açık havuz, dağıtım betiğinin yazdığı
bir dosyadan şununla üretilir:

```
node scripts/sync-pools.mjs        # from packages/web
```

O betik `packages/contracts/deployments/sepolia/hearth.<slug>.json` dosyalarını okur, adresi
eksik olan hiçbir dosyayı kabul etmez, aynı kısa adı iddia eden iki havuzu reddeder, ve
dağıtımı olmayan tek kısıtlı kaydı sona ekler. Her dağıtımdan sonra çalıştırın. Eskiden tek
bir havuzun üç adresini tutan ortam değişkenleri artık yok.

Bir tasarruf sahibinin baktığı havuz, `/app` sonrasındaki ilk parçadır:

| Yol | Ne gösterir |
| --- | --- |
| `/app` | Tasarruf sahibinin en son kullandığı havuza, ilk ziyarette `usdc` havuzuna yönlendirir |
| `/app/<slug>` | O havuzun gösterge paneli |
| `/app/<slug>/deposit` | O token için mint, gizleme ve yatırma |
| `/app/<slug>/withdraw` | O token için çekim ve gizliliği kaldırma |
| `/app/<slug>/draws` | O havuzun çekilişleri ve tasarruf sahibinin her birindeki kendi sonucu |
| `/app/<slug>/run` | O havuz için herkese açık beş çekiliş adımı |
| `/verify?pool=<slug>` | O havuza ait açık tohum, aralık ve eşikler |

İngilizce dışındaki her dilde bunların hepsinin önünde bir dil kodu durur, yani Japonca
okuyan birinin gösterge paneli `/ja/app/weth` olur.

## Havuz başına bir keeper

Yedi havuz, yedi keeper süreci demektir, her biri aynı tohum ifadesinin kendi hesap
indeksinden imza atar, çünkü tek bir hesap üzerindeki iki süreç aynı nonce için kavga eder.
Tablo ve pm2 dosyası burada: [keeper](../operations/keeper.md).
