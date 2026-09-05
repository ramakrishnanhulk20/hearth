# Keeper

Çekilişler kendiliğinden olmaz. İşlemleri birinin göndermesi gerekir. Bu sayfa, o birinin ne
yaptığını, durduğunda ne olduğunu ve maliyetinin ne olduğunu anlatıyor.

Bir süreç bir havuzu sürer. Hearth Sepolia'da yedi havuz çalıştırıyor, dolayısıyla yedi keeper
süreci çalışıyor, her biri aynı tohum ifadesinin kendi hesabından imza atıyor ve her biri tek bir
havuzun adres dosyasına yönlendirilmiş durumda. Aşağıdaki "Havuz başına bir keeper" bölümü
tabloyu veriyor.

Önce önemli çerçeve: keeper'ın hiçbir ayrıcalığı yoktur. Çağırdığı her fonksiyon herkes
tarafından çağrılabilir, ve bir keeper'ın kötüye kullanabileceği iki kaldıraç, yani kimin
değerlendirileceğini seçmek ve ödeme sırasını seçmek, artık kaldıraç değil. Keeper, havuzun
güvenlik için bağlı olduğu bir rol değil, tasarruf sahiplerini zahmetten kurtaran bir kolaylıktır.

## `p` çekilişi için işin sırası

1. **Kapatma.** `p` dönemi bittikten sonra ve `closeDeadline(p)` gelmeden, yani `p+2` döneminin
   ortasından önce `closeDraw(p)` çağrılır. Doğru alışkanlık, bunu `p+1` döneminin başında
   yapmaktır. Bu adım her kademenin ödül büyüklüğünü ve teklif ettiği likiditeyi sabitler, o
   likiditeyi çekilişin içine taşır, şifreli tohumu çeker, kasadan şifreli ölçek sayısını ve boş
   olmama bayrağını ister, getiri kaynağını hasat eder, ve dört handle'ı da genel olarak şifresi
   çözülebilir işaretler.
2. **Kanıtları alma.** Zama'nın relayer'ından dört handle'ın şifresini
   `[seed, scaleCount, nonEmpty, harvested]` sırasıyla genel olarak çözmesi istenir. Relayer açık
   metinleri anahtar yönetim servisinin imzasıyla döndürür.
3. **Ödül adımı.** `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)` çağrılır.
   Sözleşme imzayı zincir üzerinde doğrular, hasadı kademelere kayda geçirir, ve çekilişi açar.
   Kazananlar bu anda belirlenir.
4. **Değerlendirme.** Kasa üzerinde `evaluate(p, count)`, yürüyüş başladığı yere geri dönene
   kadar tekrar tekrar çağrılır. Her çağrı, çekiliş başına bir imleci tasarruf sahipleri
   listesinde, tohumdan türeyen bir başlangıçtan ilerletir. Keeper `count` değerini seçer, hangi
   adresler olacağını asla seçmez. Tek bir işleme sığan, şifreli iş gerektiren en fazla tasarruf
   sahibi sayısı `4`'tür.
   `p` döneminde ya da öncesinde gözlemi olmayan tasarruf sahipleri, açık zaman damgalarından,
   hiçbir şifreli maliyet olmadan sözleşmenin kendisi tarafından atlanır.
5. **Sonlandırma.** Pencere `p+2` döneminin sonunda kapandıktan sonra `finalizeDraw(p)`
   çağrılır. Bu, her kademenin ödenmemiş kalanını o kademenin şifreli devrine katlar,
   karşılanmayan tutar sayacını yayımlar, ve mutabakat sırası gelen her kademe için devri genel
   olarak şifresi çözülebilir işaretleyip `CarryPublished` yayar.
6. **Sırası gelen her kademe için mutabakat.** `finalizeDraw`'ın yayımladığı her kademe için
   devrin açık metni alınır ve `reconcile(tier, carry, proof)` çağrılır. Havuz kanıtı kasanın
   yayımladığı handle'a karşı kontrol eder, doğrulanmış sayıyı kademenin açık likiditesine kayda
   geçirir, kasa onu devirden (ki yayımlandığından beri büyümüş olabilir) düşer, ve
   `TierReconciled` yayılır.

Sepolia'da her havuzun her kademesinin sırası her çekilişte gelir, dolayısıyla 6. adım her
sonlandırmadan sonra üç kereye kadar çalışır. Sıklık, kademe başına bir constructor argümanıdır
ve keeper onu varsaymak yerine zincirden okur, dolayısıyla bir kademenin devrini daha seyrek
yayımlayan bir dağıtımın keeper'da hiçbir değişikliğe ihtiyacı olmaz. Bu dağıtımın neden üçünü de
her çekilişte yayımladığı şurada:
[ödüller ve kademeler](../concepts/prizes-and-tiers.md).

## Sıralama kuralı

**`p` çekilişini `p+3` döneminin başında, aynı dönemde `p+2` çekilişini kapatmadan önce
sonlandırın ve mutabakatını yapın.**

Sebebi doğruluk değil, para. Bir kapatma, her kademenin ödüllerini o andaki açık likiditesinden
boyutlandırır, ve mutabakat, önceki bir çekilişin devrini yeniden açık likiditeye çeviren şeydir.
Önce mutabakat yaparsanız o para hemen ödül büyüklüğüne sayılır. Sonra yaparsanız bir çekiliş
bekler.

Her iki iş de aynı anda uygun hale gelir. `p` çekilişinin penceresi `p+2` döneminin sonunda
biter, ve `p+2` çekilişi `p+3` döneminin başında kapatılabilir hale gelir, dolayısıyla keeper
önce sonlandırmayı ve sırası gelen mutabakatları yapar, sonra kapatır.

Sıra kayarsa hiçbir şey kaybolmaz, ama hangi yöne kaydığı önemlidir. Sonlandırmadan önce
kapatırsanız kademenin devri henüz beklemede değildir, dolayısıyla `openDraw` onu teklife katlar
ve o para hala kazanılabilir. Sadece yayımlanan ödül büyüklüğünü yükseltmez, çünkü `closeDraw`
onu yalnızca açık likiditeden sabitler. Önce sonlandırır, sonra kapatır, sonra mutabakat
yaparsanız devir beklemededir: `openDraw` bekleyen bir devri çekilişin tamamen dışında bırakır,
dolayısıyla o para, mutabakat bayrağı temizleyene kadar ne teklif edilir ne kazanılabilir.
Sepolia'da her kademenin sırası her sonlandırmada gelir, dolayısıyla olağan durum budur, ve
keeper'ın sonlandırmalarından sonra devirleri yeniden okuyup kapatmadan önce mutabakat yapmasının
sebebi de budur. Her iki durumda da hiçbir şey kaybolmaz: bir mutabakattan sonraki ilk kapatma
hepsini geri katlar.

## Keeper çalışmadığında ne olur

Hiçbir şey kaybolmaz. Bütün cevap bu, ve kaçırılan bir adımın nasıl ele alındığı sayesinde
geçerli:

| Kaçırılan adım | Sonucu |
| --- | --- |
| Kapatma hiç olmaz, ya da `closeDeadline` sonrasında olur ve geri döner | Çekiliş `None` kalır ve atlanır. Likiditesi hiç taşınmamıştır, dolayısıyla kademelerde kalır ve bir sonraki çekilişte teklif edilir. Hasat bir sonraki kapatmada toplanır. |
| Ödül adımı pencere içinde hiç olmaz | Geç bir ödül adımı hasadı yine kayda geçirir, teklif edilen likiditeyi yine kademelere döndürür, ve çekilişi `Skipped` işaretler. Ne getiri ne likidite kaybolur. |
| Yürüyüş her tasarruf sahibine ulaşmaz | Yürüyüşün atladığı tasarruf sahipleri o çekilişten hiçbir şey almaz. Tekliften paylarına düşen kısım sonlandırmada kademenin devrine katlanır ve yeniden teklif edilir. Gerçek bir tasarruf sahibinin kazanabileceği bir şeyi kaybettiği tek durum budur, ve 2. kısıttır. |
| Sonlandırma ya da mutabakat gecikir | Kademeler bir süre daha az açık likidite tutar, dolayısıyla ödül büyüklükleri küçülür. Bir sonlandırmanın yayımladığı ve hiçbir mutabakatın temizlemediği bir devir, mutabakat gerçekleşene kadar her kapatmanın dışında kalır. Hiçbir şey kaybolmaz: bir mutabakattan sonraki ilk kapatma hepsini geri katlar. |

Duran bir keeper havuza çekilişlere mal olur, paraya değil. Para yatırma ve çekme boyunca
çalışmaya devam eder, çünkü duraklatma yolu onlara hiç dokunmaz ve takılmış bir çekiliş hiçbir
şeyi kilitlemez.

Önceki dağıtımımız uyarıcı örnektir: `openDraw` herkese açıktı ve kimse çağırmadı, dolayısıyla
canlı havuz açılmaya hazır bir çekilişle 26 saat bekledi. Herkese açık olmak, otomatik olmakla
aynı şey değildir. Bu tasarımın gerçek bir keeper'ı ve onun altında bir yedeklilik yolu
olmasının sebebi budur.

## Bir tasarruf sahibi bir çekilişi kendisi nasıl ilerletir

Yukarıdaki her adım herkese açıktır, ve uygulama hepsini "Çekiliş yürüt" ekranında, bulundukları
havuz için `/app/<slug>/run` adresinde sunar, ki bu yan menüde "Herkes" işaretli satırdır.
Üstteki bir kart, havuzun beklediği adımın adını verir, ve altındaki beş adımın her biri kendi
düğmesini taşır, sırası o adımda değilse gerekçesi yazılı olarak kapalı halde:

- **Kapat**, sonra **Ödülleri belirle.** Kapat, ödül büyüklüklerini sabitler ve şifreli tohumu
  çeker. Ödülleri belirle, dört şifre çözme kanıtını tarayıcıda alır ve imzalı açık metinleri geri
  gönderir. Relayer çağrısı keeper'ın yaptığı çağrının aynısıdır, ve SDK bunu sayfadan yapar.
- **İlerlet.** O anda açık olan çekiliş için `evaluate(p, count)` çalıştırır ve ortak yürüyüşü bir
  parti kadar ilerletir. Aynı çağrı, "Çekilişlerim" ekranında kendi çekiliş kartınızda "Çekilişi
  ilerlet" olarak durur. Keeper çalışmıyorsa ve yürüyüş henüz size ulaşmadıysa basılacak düğme
  budur. Kendinizi seçmenize izin vermez, ve asıl özellik budur: kimse kendini ayırt
  edemediği için, bu işlemi göndermek kazanıp kazanmadığınız hakkında hiçbir şey söylemez.
- **Sonlandır** ve **Mutabakat.** Penceresi bitmiş herhangi bir çekiliş için iki kapanış adımını
  çalıştırır.

Bunların hiçbiri bizim iznimize, anahtarlarımıza ya da sunucularımızın ayakta olmasına ihtiyaç
duymaz.

## Chainlink Automation, yalnızca kapatma adımı için

`HearthPrizePool`, kapatma adımı için Chainlink'in `checkUpkeep` ve `performUpkeep` arayüzünü
uygular. Zamana dayalı bir upkeep kaydetmek, havuza çekilişlerin zamanında kapatılması için
ikinci ve bağımsız bir yol verir, ve son tarihi olan adım kapatma olduğu için sigortalanmaya
değen adım da odur.

Yalnızca kapatmayı kapsar, başka hiçbir şeyi değil, ve sebebi basit: kapatma, zincir dışı veriye
ihtiyaç duymayan tek adımdır. Ödül adımının Zama'nın relayer'ından alınan bir şifre çözme
kanıtına ihtiyacı var. Değerlendirmenin bir imleç başa dönene kadar tekrarlanması gerekiyor.
Mutabakatın başka bir şifre çözmeye ihtiyacı var. Zincir üstü bir otomasyon ağı bunların hiçbirini
getiremez, dolayısıyla getirebilirmiş gibi yapmak tiyatro olurdu.

Upkeep isteğe bağlıdır. Kayıtlı bir upkeep hesabında LINK gerektirir, birincil yol değil
yedekliliktir, ve havuz başına bir upkeep olurdu, her biri o havuzun kendi takviminde. Yedisinin
hiçbirinde henüz kayıtlı değil, dolayısıyla gösteri havuzlarını yalnızca keeper'lar yürütüyor.

İki seçici için bütün Chainlink sözleşme paketini ve bağımlılıklarını eklemek yerine, iki
fonksiyonluk arayüzü yerelde tanımlıyoruz.

## Bütçe

Canlı dağıtımdan, çekiliş başına maliyetler.

| Adım | Çekiliş başına işlem | Her birinin gas'ı |
| --- | --- | --- |
| Kapatma | 1 | `1,422,474` |
| Ödül adımı | 1 | `435,578` |
| Değerlendirme, 4 kişilik tam parti | `floor(savers / 4)`, burada 1 | `3,417,699` |
| Değerlendirme, son kısmi parti | 0 ya da 1, burada tek tasarruf sahibi taşıyan 1 | Tek tasarruf sahibi için `1,291,192`, artı her ek kişi için `708,836` |
| Sonlandırma | 1 | `509,463` |
| Mutabakat | 3, kademe başına bir tane, çünkü her kademenin sırası her çekilişte gelir | `459,994` |

5 tasarruf sahibinde bu, çekiliş başına `8,456,388` gas eder, ya da dağıtım anındaki Sepolia
taban ücreti olan 1 gwei üzerinden yaklaşık `0.0085 ETH`. Bir saatlik dönemde bu günde 24 çekiliş
ve günde `0.2030 ETH` demektir. Günlük dönemde ise `0.0085 ETH` eder.

Bunu yedi havuzla çarpın: altısının neden saatte bir değil altı saatte bir çekiliş yaptığının
bütün sebebi budur. Yedisinin de saatlik olması günde 168 çekiliş, yaklaşık `1.43 ETH` eder, ki
herkese açık faucet'ler buna yetişemez. Bir saatlik havuz ve altı adet altı saatlik havuz ise
günde 48 çekiliş, yaklaşık `0.41 ETH` eder. Her keeper hesabı ayrı fonlanır, dolayısıyla gas'ı
biten bir havuz yalnızca kendi çekilişlerini durdurur.

Bir partide bir tasarruf sahibi daha Sepolia'da `708,836` gas tutar, ve tek bir tasarruf sahibi
taşıyan bir parti `1,291,192` tutar, çünkü çağrının sabit kısmı her halükarda ödenir. Hesaplama
birimi cinsinden bir tasarruf sahibi, taklit yardımcı işlemcinin fiyat tablosunda `3,674,128`
eder, ki o rakam ancak orada okunabilir, çünkü canlı bir makbuz hesaplama birimlerini bildirmez.
`4` parti büyüklüğü, o ölçüme göre, Zama'nın yayımladığı Sepolia sınırlarına karşı ayarlandı: işlem
başına 20,000,000 hesaplama birimi ve 5,000,000 ardışık derinlik. `evaluate` her sayıyı kabul
eder, dolayısıyla Zama bir işlemi yeniden fiyatlarsa keeper yeniden dağıtım yapmadan daha küçük
bir partiye inebilir.

**Keeper yürüyüşün tamamını değerlendirir.** Zincir üzerinde hiçbir şey değerlendirmenin
maliyetini sınırlamaz, ve keeper da yarı yolda durmaz. Dayattığı şey bir ücret tavanıdır
(`KEEPER_MAX_FEE_GWEI`), ve onun altında imleç sona ulaşana kadar işlem göndermeye devam eder.
Dürüst sonuç [tehdit modelinde](../security/threat-model.md) yazılı: değersiz adreslerle
şişirilmiş bir havuz, tasarruf sahiplerine ödüllerine değil, keeper'a çekiliş başına daha fazla
gas'a mal olur, çünkü dönemden önce gözlemi olmayan adresler hiçbir şifreli iş yapılmadan
atlanır. Keeper çalışmıyorsa "İlerlet" düğmesine herkes basabilir, ve yürüyüş her çekilişte farklı
bir noktadan başladığı için kimse kalıcı olarak arkada oturmaz.

## Havuz başına bir keeper

`packages/keeper/ecosystem.config.cjs`, yedisini de pm2 altında başlatır, her biri bir süreç.
Bir sürece hangi havuzu sürdüğünü `HEARTH_ADDRESSES_FILE` söyler, yani o havuzun dağıtımının
yazdığı adres dosyası, ki bu ona token sembolünü, ondalıkları ve imza atacağı hesap indeksini de
verir. `KEEPER_NAME` ise her kayıt satırının taşıdığı etikettir.

| pm2 süreci | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

`usdc` süreci `hearth.usdc.json` yerine `hearth.json` dosyasına bakar, çünkü havuzların henüz
kısa adı yokken ilk dağıtımın yazdığı dosya odur, ve çalışan keeper günlerdir ona
yönlendirilmiştir. İki dosya da aynı adresleri taşır.

İndeksler, sonradan bir havuz eklendiğinde yeniden numaralandırma gerekmesin diye aralıklı
seçildi, ve her hesabın kendi Sepolia ETH'sine ihtiyacı var. 0 indeksi dağıtıcıdır ve keeper onu
kabul etmez.

## Çalıştırmak

Keeper, `@hearth/keeper` paketidir. Dağıtımın kullandığı `RECOVERY_PHRASE` ifadesinin bir
hesabıyla imza atar ve `SEPOLIA_RPC_URL` değerini `packages/contracts/.env` dosyasından okur.
Kendi ayarları `packages/keeper/.env` içinde yaşar:

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

`plan` ve `once`, `HEARTH_ADDRESSES_FILE` hangi havuzu gösteriyorsa onu sürer, dolayısıyla başka
bir havuzu kontrol etmek komutun başına konan tek bir değişkendir. `HEARTH_VAULT` ve
`HEARTH_POOL` tek havuzlu bir kurulumdan kalma olarak hala `packages/keeper/.env` içinde
duruyorsa, onları çıkarın: adres dosyasından önce okunuyorlar, dolayısıyla yedi sürecin hepsi tek
bir havuzu sürerdi.

Bir tur, her olgu için tek bir satır yazar, ve her satır sürecin sürdüğü havuzun etiketini taşır,
böylece iç içe geçen yedi kayıt okunabilir kalır. Tutarlar o havuzun kendi sembolünü ve kendi
ondalıklarını taşır, ikisi de adres dosyasından okunur:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

WETH süreci aynı satırları `[weth]` altında, `cWETH` cinsinden yazar. Her satır türünün ne
anlama geldiği, satır satır, keeper paketinin kendi README dosyasında:
`packages/keeper/README.md`.

Keeper turlar arasında durum tutmaz: çekiliş durumunu, değerlendirme imlecini ve mutabakat
sıklığını zincirden okur ve ne yapacağını bulur. Yeniden başlatmak hiçbir şey kaybettirmez. Havuz
başına tam olarak bir örnek çalıştırın, ve asla tek bir hesapta iki tane: zincir üzerinde her
adım çekiliş başına ve kademe başına tam olarak bir kez başarılı olur ve iki `evaluate` çağrısı
sadece aynı imleci ilerletir, ama tek bir hesaptaki iki keeper işlem nonce'u için birbiriyle
yarışır.

## Bu sayfanın kapsamadıkları

Keeper'ın işlemlerinin paraya gerçekte ne yaptığını kapsamaz, o şurada:
[bir çekiliş nasıl işler](../concepts/how-a-draw-works.md). Dağıtımı da kapsamaz, o şurada:
[dağıtım](deploying.md). Ve hiçbir erişilebilirlik sözü vermez: bir keeper çalıştırıyoruz, ama
garanti etmiyoruz, ve tasarım garanti etmemenin kabul edilebilir olacağı şekilde kurulmuştur.
