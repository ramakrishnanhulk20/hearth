# Sepolia'da deneyin

Sepolia, Ethereum'un herkese açık test ağıdır. Üzerindeki para gerçek olmadığı için bütün
döngüyü ücretsiz çalıştırabilirsiniz. USDC havuzu saatte bir, diğer altısı altı saatte bir
çekiliş yapar, yani para yatırdığınız bir döneme ait çekilişi izlemek istiyorsanız USDC'yi
seçin. Sayfanın sonundaki iki dakikalık yol bir çekilişi beklemez.

Canlı uygulama burada: https://hearth-ram.vercel.app. Aşağıdaki her şey, ham çağrıları
izlemeyi tercih ediyorsanız doğrudan bir blok gezgininden de yapılabilir.

Cüzdanla girmenin iki yolu var. Tarayıcıda bir eklenti varsa "Cüzdan bağla" onu kullanır.
Hiç yoksa "Telefonla tarayın", bir mobil cüzdanın okuduğu bir WalletConnect kodu gösterir, ki
hiçbir şey kuramayacağınız bir makinede tek yol budur. Hiç cüzdanı olmayan bir tarayıcıya ise,
yarı yolda başarısız olan bir düğme verilmek yerine, hangisini nereden kuracağı söylenir.

## 0. Bir token seçin

Hearth yedi havuz çalıştırır, Zama'nın Sepolia'da yayımladığı her gizli token için bir tane.
Her biri kendi tasarruf sahipleri, kendi ödül parası ve kendi saati olan ayrı bir sözleşme
setidir, dolayısıyla bir token seçmek bir havuz seçmektir. Yan menünün üstündeki token adı
seçiciyi açar, ve içinde bulunduğunuz havuz URL'nin ilk parçasıdır: `/app/usdc`, `/app/weth`
ve devamı.

| Token | Kısa ad | Çekiliş sıklığı | Açık `mint` fonksiyonu olan açık token |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 saat | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 saat | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 saat | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 saat | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 saat | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 saat | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 saat | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

Seçici, Zama'nın resmi **Confidential tGBP**'sini de soluk halde listeler, çünkü dayanak
tokenin basımı ihraççıya aittir ve başka kimse o tokeni edinemez. Sebep, okuduğunuz dilde,
adının altında durur, ve onu seçtiğinizde, geri dönecek bir yatırma düğmesi yerine, tokenin
adını veren, her iki sözleşmeye bağlantı veren ve hiçbir cüzdan işlemi sunmayan bir sayfa
görürsünüz. İlk çekilişini henüz kapatmamış bir havuz da adının altındaki aynı satırı, o
çekilişin ne zaman olduğunu söylemek için kullanır, çünkü orada verilecek bir ödül değil bir
saat vardır.

Uygulama on altı dilde okunur, dil üst çubuktaki düğmeden ya da konsol çubuğundakinden
seçilir. İngilizce düz URL'leri korur, diğer bütün diller kendi kodunu başa koyar, yani aynı
ekranın Japoncası `/ja/app/usdc` olur. Arapça düzeni aynalar. Arapça dahil her dil Batı
rakamlarını ve yirmi dört saatlik UTC saatini korur, böylece ekrandaki bir rakam blok
gezginindeki rakamla örtüşür, ve her tutar alanı ondalık işareti olarak virgülü de noktayı da
kabul eder, yalnızca ikisini birden taşıyan bir tutarı reddeder. Bu belge sayfaları da aynı
biçimde, sayfa sayfa çevrildi, ve henüz kimsenin çevirmediği bir sayfa, tepesinde bunu söyleyen
bir satırla İngilizcesini gösterir. Her çeviriyi anadili konuşuru değil bir model yazdı: her
rakam ve her sözleşme adı için doğrunun kaynağı İngilizcedir,
[kısıtlar listesinin](../limitations.md) söylediği gibi.

## Dokunacağınız sözleşmeler

Aşağıdaki anlatım USDC havuzunu kullanıyor. Diğer bütün havuzlar aynı sözleşme setinin
farklı adreslerdeki halidir, listesi burada:
[havuzlar ve tokenler](../concepts/pools-and-tokens.md).

| Nedir | Adres | Kim dağıttı |
| --- | --- | --- |
| Mock USDC (açık ERC-20, açık `mint`) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, ERC-7984 sarmalayıcı) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

İki Zama adresi, Zama'nın Sepolia için kendi Confidential Vault adres referansında
yayımladığı adreslerdir, yani test tokeni bizim değil Zama'nındır. O listedeki her gizli
sarmalayıcı 6 ondalık kullanır, yani sarmalayıcıdaki her zincir üstü tutar milyonda birler
cinsindendir: 1,000 USDC `1000000000` diye yazılır. Altındaki açık token farklı bir ölçek
kullanabilir, ve sarmalayıcının `rate()` fonksiyonu dönüşümü verir. Mock USDC de 6 kullanır,
yani ikisi uyuşur. Mock WETH 18 kullanır, dolayısıyla oranı bir milyon kere bir milyondur.

## 1. Sepolia ETH edinin

Gas ödemek için az miktarda Sepolia ETH'ye ihtiyacınız var. Herhangi bir Sepolia faucet'i
(test ağı musluğu) iş görür. Yaygın kullanılanlar Google Cloud Web3 faucet'i, Alchemy'nin
Sepolia faucet'i ve Chainlink faucet'idir, ve her biri tek istekte bu anlatım için yeterini
verir. Onda bir ETH fazlasıyla yeter.

## 2. Test tokenini mint edin

Yedi açık taklit tokenin her birinde sahip kontrolü olmayan, çağrı başına bir milyon token
ile sınırlı bir `mint(address, uint256)` vardır, ve adresleri yukarıdaki tablodadır.
Uygulama bunu, içinde bulunduğunuz havuzun Yatır ekranında, üç adımının ilkinde tek bir
düğme olarak sunar. Cüzdanınızda hiç yokken "Test USDC'si al", olduğunda ise "Bir milyon
daha al" yazar, etikette o havuzun kendi tokeni geçer. Elle yapmak isterseniz, USDC için
şöyle:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

İhtiyacınızdan fazlasını isteyin. Buradaki hiçbir şeyin değeri yok.

## 3. Gizleme: USDC'yi gizli USDC'ye sarmalayın

Gizli USDC, Zama'nın o taklit USDC'nin etrafındaki ERC-7984 sarmalayıcısıdır. ERC-7984 gizli
token standardıdır: bakiyeler zincir üzerinde, herkesin okuyabileceği sayılar yerine şifreli
değerler olarak durur. Sarmalama iki çağrıdır:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

Uygulamada bu iki çağrı, Yatır ekranının 2. adımıdır, "USDC'nizi gizleyin". Düğmede "Gizle"
yazar, sarmalayıcının harcama izni yazdığınız tutarın altında kaldığı sürece ise
"Sarmalayıcıya izin ver" yazar. İzin bir kez, geniş bir limit için istenir, dolayısıyla
ilkinden sonraki her gizleme iki işlem yerine tek işlemdir. İzin tam olarak tek bir sözleşmeye,
o tokenin gizli sarmalayıcısına ulaşır ve ona yalnızca açık taklit tokeni cüzdanınızdan çekme
yetkisi verir, başka hiçbir şey değil. Ekran bu ikisini de düğmenin yanında söyler, sizin
bulmanıza bırakmaz.

Artık 1,000 gizli USDC'niz var. Bu noktadan sonra bakiyeniz şifreli bir handle'dır ve onu
yalnızca siz okuyabilirsiniz.

Sarmalama herkese açıktır. Sarmalayıcı, açık tutarı taşıyan bir `Wrap` olayı yayar,
altındaki ERC-20 transferi tutarı bir kez daha taşır, ve tutar üçüncü kez yardımcı
işlemcinin önemsiz şifreleme kaydında görünür. Bunun etrafından dolaşmanın yolu yoktur: açık
bir tokeni gizli bir tokene çevirmek tanımı gereği herkese açık bir eylemdir.

## 4. Havuza para yatırın

Tek çağrı, ve tutar en baştan şifrelidir:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

Uygulama şifreli girdiyi ve kanıtını sizin için Zama'nın SDK'sıyla oluşturur. Kasanın alma
kancası, istediğiniz tutarı değil tokenin gerçekten hareket ettiğini söylediği tutarı tam
olarak hesaba geçirir, dolayısıyla herhangi bir sebeple eksik kalan bir transfer hayali
anapara yaratamaz.

Bunun, bir rakam yazmadan önce bilmeye değer bir sonucu var. Gizli bakiyenizden fazlasını
yatırmak istemek zincirin hiçbir yerinde reddedilmez: token cüzdanda ne varsa onu hareket
ettirir, ki bu hiçbir şey de olabilir, ve işlem hiçbir şey başarmamış olarak başarılı olur.
Dolayısıyla bu çizgiyi ekranın kendisi tutar. Gizli bakiyenizi gözle bir kez açtığınızda,
yatırma alanı "Bu, elinizdekinden fazla" der ve düğme kapalı kalır. Gizliliği kaldırma ekranı
daha da ileri gider, çünkü orada açılacak bir şey yoktur: açık token bakiyenizi işlemden önce
ve sonra tekrar okur, ikisi birbirinin aynıysa "Hiçbir şey hareket etmedi" der, her zamanki
sebep olarak fazla büyük tutarı gösterir ve "Hepsi" seçeneğini işaret eder.

Kasa, tutarı ya da ortaya çıkacak anaparası tasarruf sahibi başına üst sınırı aşacak bir
yatırmayı reddeder. Bu sınır bir saatlik dönemde yaklaşık 5 milyar token, altı saatlik
dönemde ise yaklaşık 854 milyondur. Bu kontrolün iki yarısı da önemlidir: şifreli toplama
64 bitte sessizce taşar, dolayısıyla toplamın yanında gelen tutarı da sınırlamak, devasa bir
yatırmanın toplamı küçük bir sayıya döndürüp içeri sızmasını engelleyen şeydir. Reddetmenin
kendisi de şifrelidir: kanca şifreli bir "hayır" döndürür ve token aynı işlemin içinde
paranızı iade eder, dolayısıyla bir ret kimseye bakiyenizin ne olduğunu söylemez.

### Sarmalama ile yatırma neden tek adım değil de iki adım

Bu alandaki çoğu uygulama "izin ver, sarmala, yatır" adımlarını tek bir düğmenin arkasında
toplar. Daha dostane, ve yatırdığınız tutarı sızdırıyor.

Bunu kendi önceki dağıtımımızda ölçtük. Sepolia'nın 11528000 ile 11618500 arasındaki
bloklarının açık kayıtlarını okuduğumuzda, beş yatırmanın üçü aynı adresin tam 100 USDC'lik
herkese açık bir `Wrap` işleminden iki ila dört blok sonra duruyordu. Zinciri okuyan herkes
o üç yatırmayı hiçbir şeyi kırmadan 100'er USDC olarak fiyatlayabilirdi. Zama'nın kendi
dokümantasyonu aynı sorunu adıyla anıyor ve buna gizleme-katılım korelasyonu diyor:
"50,000 USDC sarmalayıp dakikalar sonra bir partiye katılan bir kullanıcı, fiilen katılım
tutarının yalnızca üst sınırını yayımlamıştır."

Bu yüzden Hearth bu ikisini bilerek ayrı tutuyor:

- Bir kez, yuvarlak bir tutarda, kendi seçtiğiniz bir zamanda sarmalayın.
- Duran bir gizli bakiye tutun ve bir kısmını daha sonra yatırın.
- Yeniden sarmalamadan, aynı bakiyeden tekrar yatırın.

Korelasyon zamanla, duran bir bakiyenin tekrar tekrar kullanılmasıyla ve başka insanların
sarmalayıcı trafiğiyle zayıflar. Bunu tek tıkla yapmak üç savunmanın da hepsini ortadan
kaldırır. Uygulama, ödünleşimi gizlemek yerine uyarıyı gizleme adımında gösterir.

Sabitlenmiş bir bakiyenin size neye mal olduğunu açıkça söylemekte fayda var, çünkü bedeli
yatırdığınız tutardan fazlasıdır. Eşikler tasarım gereği açıktır, çünkü çekilişi kontrol
edilebilir kılan şey onlardır. Yani bakiyenizi bilen herkes, o günden sonra hiçbir şeyin
şifresini çözmeden, her kademede ve her çekilişte kazanıp kazanmadığınızı hesaplayabilir.
Bunun tek adım değil iki adım olmasının sebebi budur.

## 5. Bir çekiliş bekleyin

Dönem, USDC havuzunda bir saat, diğer altısında altı saattir, gerekçesi gas ile ilgilidir ve
burada anlatılıyor: [havuzlar ve tokenler](../concepts/pools-and-tokens.md). Bir döneme ait
çekiliş ancak o dönem bittikten sonra kapatılabilir, ve onunla ilgili her şeyin izleyen iki
dönem içinde bitmesi gerekir.
Kapatmanın kendisinin daha sıkı bir son tarihi vardır, bu iki dönemden ikincisinin ortası,
ki şifre çözme gidiş dönüşü ile ödül adımına her zaman yer kalsın. Yani şimdi yaptığınız bir
yatırma içinde bulunulan döneme şans kazandırır, ve o dönemin sonucu izleyen birkaç saat
içinde belli olur.

Gösterge paneli, içinde bulunulan dönemi ve kalan süreyi "Havuzun şu anki durumu" bloğunda
gösterir, yan menüdeki "Çekilişlerim" ise son birkaçının durumunu gösterir. Sizin bir şey
yapmanız gerekmez. Kendiniz ileri itmek isterseniz, bir çekilişin her adımı herkes tarafından
çağrılabilir, ve yan menüdeki "Çekiliş yürüt" ekranında beşinin hepsi vardır. Bakınız:
[keeper sayfası](../operations/keeper.md).

Bir dönemdeki şansınız, dönemin sonundaki bakiyenize değil, o dönemin tamamındaki ortalama
bakiyenize dayanır. Bir saatlik dönemin kapanmasına beş dakika kala para yatırmak, aynı
tutarı dönem boyunca tutmuş olmanın şansının on ikide birini satın alır. Bu bilinçlidir,
bakınız:
[zaman ağırlıklı bakiye](../concepts/time-weighted-balance.md).

## 6. Elinizdekini ve kazandığınızı açığa çıkarın

Gösterge panelindeki "Elinizdekiler" kartında "Anapara" yanındaki göze basın ve cüzdanınızın
gösterdiği mesajı imzalayın. Mühürlü değerler siz bunu yapana kadar yıldız olarak görünür,
ve onları açan tek şey o gözdür.

O imza EIP-712 kullanıcı şifre çözümüdür: adresi kontrol ettiğinizi Zama'nın relayer'ına
kanıtlayan tipli, zincir dışı bir imza, karşılığında sözleşmenin size erişim verdiği
değerlerin açık halini alırsınız. Bir işlem değildir. Gas maliyeti yoktur ve zincire hiçbir
şey yazmaz.

Kendinizle ilgili dört şeyi açığa çıkarabilirsiniz:

| Değer | Anlamı |
| --- | --- |
| Anapara | Biriktirdiğiniz tutar. |
| Kazanç | Hesabınıza geçmiş ve henüz çekilmemiş ödül parası. |
| Ağırlık, çekiliş başına | O döneme ait zaman ağırlıklı bakiyeniz, yani kazanan testinin karşılaştırdığı sayı. |
| Hesaba geçen tutar, çekiliş başına | O çekilişin size ödediği tutar. Kazanmadıysanız sıfır. |

İlk ikisi, gösterge panelindeki "Elinizdekiler" kartındaki tek gözden birlikte açılır. Son
ikisi, "Çekilişlerim" ekranında o çekilişin kartındaki "Sonucunuz" altında yer alan
"Ödülünüz" yanındaki gözden birlikte açılır. Bakiyeniz ile bir çekilişin sonucu aynı anda
açık olabilir, ilkinin imzası ikincisine de yeter, ve açık bir göze basmak yalnızca içinde
bulunduğu kartı mühürler.

Son ikisi, çekilişi kendiniz kontrol etmenizi sağlayan şeydir: ağırlığınızı alın, açık tohum
ile açık aralığı alın, eşiklerinizi yeniden hesaplayın ve hesabınıza geçen tutarın
uyuştuğunu doğrulayın. Kasa eşik aritmetiğini `thresholdOf` adlı bir view olarak sunar,
böylece kendi hesabınızı sözleşmeninkiyle karşılaştırabilirsiniz. Bakınız:
[rastgelelik ve doğrulama](../security/randomness-and-verification.md).

Bu dördünü başka kimse okuyamaz. Relayer, sözleşmenin erişim vermediği bir adresten gelen
şifre çözme isteğini reddeder, ve uygulamayı sağlayan şey bir politika değil o reddir.

## 7. Talep

Talep işlemi yok, yalnızca bir talep düğmesi var.

Ödülünüz, yürüyüş size ulaştığı anda zaten kazanç bakiyenizdedir. 6. adım, bunu nasıl
öğrendiğinizdir. O çekilişin sonucu açıldıktan sonra, "Çekilişlerim" ekranındaki kartında
tutarı üzerinde yazan bir talep düğmesi belirir, örneğin "1.00 USDC talep et". Ona basmak
tam olarak o tutar için sıradan bir çekim gönderir, 8. adım da kalanı eve götürür. Zincirde
bir talep ile bir çekim, aynı biçimdeki aynı çağrıdır, ve bir kazananın göze batmasını
engelleyen de budur.

O karttaki tek göz, üç rakamı birden açar: o çekilişteki ağırlığınız, o çekilişin alacağı, ve
`confidentialWinningsOf`, yani kasanın bütün çekilişler boyunca bu cüzdana hâlâ borçlu olduğu
her şey. Düğme hem alacağa hem de o güncel toplama bağlıdır, ve ikisinin küçüğünü sunar. Bir
çekilişin alacağı bir kez yazıldıktan sonra hiç değişmez, dolayısıyla yalnızca alacağa bağlı
bir kart, sayfa yenilendikten sonra aynı ödülü tekrar sunardı ve zincir de bunu sizin kendi
anaparanızdan karşılardı. Güncel toplam, bir talep gerçekleştiği anda düşer, düğmeyi kaldıran
da budur, ve kart ödülün çoktan çekilmiş olduğunu söyler, rakam ise o çekilişin kaydı olarak
durur.

Hesabınıza geçmesi için basılacak bir şey de yoktur. Değerlendirme, tasarruf sahipleri
listesinde o çekilişin tohumunun belirlediği bir noktadan yürür. O çekilişin kartındaki
"Çekilişi ilerlet" düğmesi ile "Çekiliş yürüt" ekranındaki "İlerlet", ikisi de sizi listeden
seçip çıkarmak yerine o ortak yürüyüşü öne taşır. İkisinden birine basan bir tasarruf sahibi,
kimseye kazandığını söylemiş olmaz.

## 8. Çekim

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

Uygulamada bunlar, Çek ekranının "Kasadan çıkış" sekmesindeki "Çek" ve "Hepsini çek"
düğmeleridir. Alanın yanındaki "Tamamı" üçüncü bir çağrı değildir: bakiyenizi açtıysanız,
alanı elinizdeki her şeyle doldurur.

Çekimler önce kazançtan, sonra anaparadan öder. Tutar, elinizde olan ile kasada olanın
küçüğüne kırpılır, çünkü gizli bir transfer tutarın ya tamamını taşır ya da hiçbirini, asla
bir kısmını değil. Bunu transferden önce hesaplamak, defteri sonradan hiçbir onarıma gerek
kalmadan tam tutan şeydir. Tek gizli transfer, tek olay, şifreli bir tutar.

Anapara asla kilitlenmez. Bir çekilişin ortasında çekim yapabilirsiniz, ve çekilişin sizin
için zaten sabitlediği ağırlık değişmez.

## 9. Gizliliği kaldırma: açık USDC'ye geri sarmalamayı çözün

İki çağrı, çünkü sarmalamayı çözmek tasarım gereği asenkrondur. Önce `unwrap`, sonra
`finalizeUnwrap`. Uygulama ikisini de Çek ekranının "Düz USDC'ye dönüş" sekmesindeki
"Gizliliği kaldır" düğmesinden gönderir. İkincisi bir şekilde yapılmadan kalırsa, siz
üzerindeki "Gizliliği kaldırmayı tamamla" düğmesine basana kadar iki sekmenin üstünde bir
uyarı kartı durur. Tam argüman listeleri bizim değil Zama'nın sarmalayıcısındadır.

İlk çağrı şifreli tutarı yakar ve onu genel şifre çözme için işaretler. İkincisi, Zama'nın
protokolü açık metni ve kanıtını ürettikten sonra açık tokenleri serbest bırakır. Uygulama,
açık token bakiyenizi ilk çağrıdan önce ve ikinci çağrıdan sonra tekrar okur ve farkı bildirir,
dolayısıyla "Gizlilik kaldırıldı, 250.00 USDC" yazdığınız rakam değil, ölçülmüş bir olgudur. Bu
fark sıfır olduğunda, başarı ilan etmek yerine "Hiçbir şey hareket etmedi" der: her iki işlem de
gerçekten gerçekleşti, ve tutar gizli bakiyenizin üzerindeyse sarmalayıcı reddetmek yerine
hiçbir şey serbest bırakmaz.
Sarmalamasını çözdüğünüz tutar, tıpkı sarmaladığınız tutar gibi herkese açıktır, ve onu
yayımlayan ilk çağrıdır, dolayısıyla hiç sonlandırmadığınız bir çözme bile çoktan sızdırmış
olur.

Bu da bilmeye değer ikinci bir şeyi getiriyor. Parayı sarmalayıp sonra tamamının
sarmalamasını çözerseniz, iki açık toplam arasındaki fark o güne kadar kazandığınız her şey
için bir alt sınırdır, ve tamamen boşalttığınızda tam sayıya döner. Sarmalamayı yeni bir
adrese çözmek işe yaramaz, çünkü o adrese yapılan gizli transferin kendisi bağlantıyı kurar.
Bu sizin için önemliyse, pozisyonunuzla ilgisi olmayan yuvarlak tutarlarda çözün ya da geride
duran bir gizli bakiye bırakın.

## İki dakikada deneyin

Uygulama, solunda bir menü şeridi olan bir konsoldur, ekran başına tek iş, dolayısıyla yol o
şeridin aşağı doğru yürünmesidir.

1. https://hearth-ram.vercel.app adresini açın, başlıktaki "Havuz" bağlantısıyla `/app`
   ekranına gidin ve Sepolia'da, tarayıcı eklentisiyle ya da kodu bir telefon cüzdanıyla
   tarayarak bir cüzdan bağlayın. `/app/usdc` adresinde USDC havuzuna düşersiniz, menünün
   üstündeki token adı havuzları değiştirir. Gösterge paneli, yapılacak tek şeyi söyleyen
   "Sıradaki" işaretli bir blokla açılır.
2. Yan menüde "Yatır", cüzdanınızın geldiği adıma göre üç adımından hangisine denk geliyorsa
   orada açılır. Sırayla "Test USDC'si al", "Gizle", sonra "Yatır"a tıklayın. İlk gizleme
   sarmalayıcı için bir izin ister, ondan sonraki hiçbir gizleme bir daha sormaz.
3. Gösterge paneline dönün, "Elinizdekiler" kartında "Anapara" yanındaki göze basın ve
   imzalayın: anaparanız ve kazancınız birlikte belirir, yalnızca tarayıcıda.
4. Yan menüde "Çekiliş yürüt", "Herkes" işaretli satır. Son biten dönemi kendiniz kapatıp
   ödüllerini belirlemek için önce "Kapat", sonra "Ödülleri belirle"ye basın, ya da keeper'ın
   yapmasını izleyin.
5. Aynı ekranda "İlerlet"e basın. Sonra "Çekilişlerim" ekranını açıp o çekilişin kartında
   "Sonucunuz" altındaki göze basın: o çekilişe ait ağırlığınız ve hesabınıza geçen tutar
   belirir, ve 3. adımdaki bakiye tek imzayla açık kalır.
6. `/verify?pool=usdc` adresini açın: açık tohum ve aralık oradadır, "Bir adres için eşikler"
   eşiklerinizi gözünüzün önünde yeniden hesaplar, ve karşılaştırma uyar. Başka bir havuzu
   kontrol etmek için `pool` parametresini o havuzun kısa adıyla değiştirin.
7. Yan menüde "Çek", "Kasadan çıkış" sekmesi, "Hepsini çek". Anapara ve varsa kazanç tek bir
   transferle geri gelir.

Bu yolun hiçbir adımı bizim çevrimiçi olmamızı gerektirmez. Çekilişin her adımı herkese
açıktır.
