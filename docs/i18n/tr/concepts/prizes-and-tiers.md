# Ödüller ve kademeler

Getiri her dönem tek bir yığın halinde gelir. Kademeler, o yığının küçük ve sık ödüller ile
nadir ve büyük bir ödülün karışımına dönüşme biçimidir. Bu sayfa işin para tarafını anlatıyor:
likiditenin nasıl bölündüğünü, bir ödülün nasıl boyutlandırıldığını, bir kademe planladığından
fazlasını ödediğinde ne olduğunu, ve PoolTogether V5'ten bilinçli olarak ayrıldığımız üç
noktayı.

Ödül büyüklükleri, kademe likiditesi ve ödül sayıları PoolTogether'da her zaman herkese açık
olmuştur, ve üçünün de açık kısmı burada da herkese açıktır. Şifreli kalan şey kimin
kazandığı, ve kademe başına devir denen tek bir yürüyen toplamdır.

## Likidite ve paylar

Her kademe, likiditesi denen bir kasa tutar, herkesin okuyabileceği düz sayılar halinde. İçine
iki şey akar:

- **Hasatlar.** Her ödül adımı, doğrulanmış hasadı kademelere pay ağırlıklarına göre böler. O
  bölmenin tam sayı kalanı, yani eşit bölünmeyen birkaç temel birim, atılmak yerine büyük ödül
  kademesine gider. `p` çekilişinin ödül adımında kayda geçen bir hasat, `p` çekilişinin
  kendisinde değil bir sonraki kapatmada teklif edilir.
- **Mutabakatı yapılmış devir.** Bir kademenin daha önceki bir çekilişte teklif ettiği ve
  kimsenin kazanmadığı ne varsa, o kademe mutabakat yaptığında geri gelir, ki bu Sepolia'da bir
  çekiliş sonradır.

Her kademe ikinci bir kasa daha tutar, **devir**, ve o şifrelidir. Kademenin teklif ettiği ve
kimsenin kazanmadığı her şeyin yürüyen toplamıdır, ve büyüklüğü gizli olmasına rağmen her
kapatmada kademenin teklifine eklenir.

Kapatmada, her kademe için:

```
prize[t]     = liquidity[t] * UTILISATION / count[t]     // plaintext only
offered[t]   = liquidity[t] + carry[t]                   // plaintext plus encrypted
liquidity[t] = 0                                         // until the tier reconciles
```

Buradan iki şey okunmalı. Ödül büyüklükleri yalnızca açık kısımdan gelir, ve onları herkese
açık tutan da budur. Şifreli devir yalnızca kapasite ekler, dolayısıyla bir kademe her zaman
en az açık ödül büyüklüğünün ima ettiği kadar ödeme gücüne sahiptir.

`UTILISATION` yüzde 50'dir. Bu PoolTogether'ın kullanım oranıdır, ve aşırı talebe karşı
savunmadır: bir kademe likiditesinin tamamını teklif eder ama her ödülü yalnızca yarısı varmış
gibi boyutlandırır. Dolayısıyla bir kademe, kuruyana kadar beklediğinin iki katı ödül
ödeyebilir.

**Bütün bunlar kapatmada, o çekilişin rastgele tohumu var olmadan sabitlenir.** Tohum aynı
işlemde daha sonra çekilir. Kimse bir tohumu görüp kazandığını anlayıp sonra kazancı
büyütmek için kademeler arasında para taşıyamaz.

## Sepolia'daki üç kademe

Her havuz kendi kademe setini taşır, çünkü olasılıklar o havuzun kendi döneminin bir
kesridir. Saatlik USDC havuzu:

| Kademe | Çekiliş başına ödül (`count`) | Şans | Paylar | Mutabakat sıklığı | Nasıl hissettiriyor |
| --- | --- | --- | --- | --- | --- |
| Büyük ödül | 1 | 24'te 1 | 40 | 1 çekiliş | Nadir ve büyük |
| Orta | 1 | 6'da 1 | 20 | 1 çekiliş | Günde birkaç kez |
| Sık | 4 | 1'de 1 | 40 | 1 çekiliş | Her çekilişte dört ödül |

Altı saatte bir çekiliş yapan altı havuz aynı sayıları, payları ve sıklığı korur ve yalnızca
olasılıkları değiştirir: büyük ödül 4'te 1, orta 2'de 1, sık 1'de 1. Altı saatlik bir çekiliş
altı kat daha nadirdir, dolayısıyla 4'te 1, büyük ödülü günde bir kez civarında düşürür, yani
saatlik setin verdiği ritmin aynısını. Tek fark orta kademededir: altı saatlik havuzlarda
günde iki kez civarında, saatlik havuzda ise günde dört kez civarında. Neden altı saat:
[havuzlar ve
tokenler](pools-and-tokens.md).

Her iki sette de toplam pay 100'dür, dolayısıyla büyük ödül kademesi her hasadın yüzde 40'ını,
orta kademe yüzde 20'sini ve sık kademe yüzde 40'ını alır. Her havuzun her kademesi her
çekilişte mutabakat yapar, ki bu iki tarafı da bedelli bir tercihtir. Aşağıda kendi bölümü
var.

### Bu ayarlar neyi üretiyor

Bir dönemde toplanan hasada `H` diyelim. Bir kademenin çekiliş başına nominal beklenen ödül
sayısı `count * odds`'tur. Bunu boyutlandırma formülüne geri verin, her kademe bir denge
noktasına oturur:

| Kademe | Dengedeki likidite | Ödül büyüklüğü | Çekiliş başına beklenen ödeme | Ne sıklıkla ateşleniyor |
| --- | --- | --- | --- | --- |
| Büyük ödül | 19.2 H | 9.6 H | 0.4 H | Günde bir kez civarında |
| Orta | 2.4 H | 1.2 H | 0.2 H | Altı saatte bir civarında |
| Sık | 0.8 H | 0.1 H | 0.4 H (dört ödül) | Her çekilişte |

Üç beklenen ödeme tam olarak `H` eder. Getirinin tamamı ödül olarak dışarı çıkar ve hiçbiri
sonsuza kadar birikmez.

O tablo saatlik havuza aittir. Altı saatlik bir havuz bir dönemde altı katı toplar ve
çekilişlerini altı kat daha seyrek yapar, ve daha kısa olasılıkları bu geliri aynı sayıda ödüle
yayar: büyük ödül kademesi 3.2 H likidite ve 1.6 H'lik bir ödülde, orta kademe 0.8 H ve 0.4
H'de oturur, sık kademe ise ödül başına 0.1 H ile değişmez. `H` cinsinden değil de gerçek para
cinsinden ölçüldüğünde, altı saatlik bir havuzun büyük ödülü, aynı hızda kazanan saatlik bir
havuzun büyük ödülüyle aynı büyüklüktedir, çünkü daha nadir bir çekiliş altı katı hasat taşır.

Bunlar nominal rakamlardır. Çekiliş, tam toplam `W` yerine `M` aralığı üzerinden yürür, ve `M`
değeri `W` ile `2W` arasında oturur, dolayısıyla bir kademe her çekilişte nominal ödül
sayısının yarısı ile tamamı arasında bir kısmını öder. Bakınız:
[kazananın belirlenmesi](winner-selection.md). Ödemediği şey devre gider ve yeniden teklif
edilir, dolayısıyla hiçbir şey kaybolmaz. Bunun yerine olan şey, ödül büyüklüklerinin
havuzun toplamının aralığın neresinde durduğuna bağlı olarak yukarıdaki rakamlar ile onların
iki katı arasında bir yere oturmasıdır. Bir aralığın üst ucuna yakın bir havuz tabloya yakın
öder. Bir ikinin kuvvetini yeni geçmiş bir havuz, bir süre daha az ama daha büyük ödüller
öder.

Tablonun ideal bir durumu değil canlı dağıtımı anlatmasının bir sebebi var: her kademe her
çekilişte mutabakat yapıyor. Bir kademenin teklif edip kimsenin kazanmadığı tutar o çekilişin
sonlandırmasında yayımlanır ve doğrudan açık likiditesine geri işlenir, dolayısıyla bir
kademenin dengedeki likiditesi gerçekten de tablonun dediği yere oturur, ve uygulamanın
gösterdiği kasa kademenin taşıdığı kasadır. Daha yavaş bir sıklıkta aynı para yine teklif
edilir ve yine kazanılabilir olurdu, ama mutabakatlar arasında şifreli devirde otururdu, ve
ödülü boyutlandıran açık likidite yalnızca o kademenin son mutabakatından beri kayda geçen
hasat olurdu. Bir sonraki bölüm tam olarak bu ödünleşimi anlatıyor.

Buna bir sayı vermek gerekirse, Sepolia USDC kaynağının dönem başına 10 USDC damlattığını
varsayın. O zaman büyük ödül 96 USDC civarında oturur ve günde bir kez civarında düşer, orta
ödül 12 USDC civarında altı saatte bir düşer, ve her çekilişte yaklaşık 1 USDC'lik dört ödül
düşer, bu rakamların her biri aralığa bağlı olarak iki katına kadar çıkabilir. O havuzdaki
canlı damlama hızı
`5,555 base units a second, which is 19.998 USDC a period`, her havuzun hızı burada
listeleniyor: [havuzlar ve tokenler](pools-and-tokens.md), ve canlı ödül büyüklükleri o
havuzun `/app/<slug>` adresindeki gösterge panelinde "Havuzun şu anki durumu" kartındadır,
zincirden okunur.

Bunlar constructor argümanlarıdır, PoolTogether V5'in olasılık formülüyle seçilmiş ve havuz
başına `packages/contracts/hearth.config.ts` içine yazılmıştır. Günlük dönemi olan bir ana ağ
dağıtımı yine farklılarını kullanırdı. Bakınız: [dağıtım](../operations/deploying.md).

## Mutabakat sıklığı ve onu yükseltmenin bedeli

Bir kademenin mutabakatı devrini yayımlar, ve devir tam olarak o kademenin teklif ettiği ve
kimsenin kazanmadığı paradır. Onu teklif edilenden çıkarın, ödül büyüklüğüne bölün, ve o
kademenin kaç ödül ödediğini bilirsiniz. O sayı gerçek bir ifşadır: şifreli bakiyelerin bir
ölçümüdür, "bu tasarruf sahiplerinden kaçının ağırlığı kendi yayımlanmış eşiğinin üzerindeydi"
biçiminde.

`reconcileEvery[t]` o ifşanın ayar düğmesidir, ve kademe başına bir constructor argümanıdır.
Onu yükseltmek sayıyı o kadar çekiliş boyunca gizler, sonra bütün o aralık için tek bir sayı
yayımlar. Büyük ödül kademesini 24'e ayarlayın: sayısı günlük bir rakama döner, ve söz konusu
olabilecek kişiler, tek bir çekilişte uygun olan havuzun kabaca yüzde dördü yerine, o gün
içinde herhangi bir anda uygun olan herkes olur. 24'te 1 olan bir kademede bu fark makyaj
değildir: çekiliş başına bir sayı, küçük bir kümenin içinden büyük ödül kazananını adıyla
gösterir.

Onu yükseltmenin bedeli büyük ödülün kendisidir. Bir kapatma, bir kademenin bütün açık
likiditesini çekilişe taşır ve kademeyi sıfırda bırakır, ve o para ancak bir mutabakatta geri
gelir. Yani 24'lük bir sıklıkta, her 24 çekilişin 23'ünde büyük ödül kademesinin açık
likiditesi yalnızca son mutabakattan beri kayda geçen hasattır, yayımlanan ödül o tek çekilişin
payına göre boyutlandırılır, ve biriken kasa yalnızca mutabakat çekilişinde açığa çıkar. Para
bu arada boş durmaz, çünkü şifreli devir her kapatmada kademenin teklifine eklenir ve boyunca
kazanılabilir. Yine de görünmezdir, ve kimsenin büyümesini izleyemediği bir büyük ödül aslında
büyük ödül değildir.

Gizli bir ödül sayısı ile görünür, biriken bir büyük ödül aynı anda olamaz. **Bu dağıtım
görünür büyük ödülü seçti.** Üç kademe de `reconcileEvery = 1` ile çalışır, dolayısıyla her
kademenin devri, geldiği çekilişin sonlandırmasında yayımlanır, kasanın yayımladığı handle'a
karşı zincir üzerinde doğrulanır, ve `reconcile` ile açık likiditeye geri işlenir. Kasa
PoolTogether'ınki gibi açıkta birikir, ve her kademenin kaç ödül ödediği yine PoolTogether'ınki
gibi bir çekiliş sonra herkese açık hale gelir. Her iki durumda da kimin kazandığı asla.

Bu, yukarıdaki sayıyı hafifletilmiş değil ifşa edilmiş bir artık haline getirir. Gerekçe
değişmedi ve hala doğru: 24'te 1 olan bir kademede çekiliş başına bir sayı, o çekilişte uygun
olan küçük tasarruf sahibi kümesi üzerinde bir ölçümdür, ve hiç kıpırdamayan bir bakiyeye karşı
birikir. Büyük ödül kademesi 4'te 1 olan altı saatlik havuzlarda bu daha zayıf bir ölçümdür,
çünkü her sayı havuzun yirmi dörtte biri yerine kabaca dörtte birini kapsar, ve günde yirmi
dört değil dört tane olur. Şurada yazılı: [gizli kalanlar](../security/what-stays-private.md),
ve şurada taşınıyor: [kısıtlar listesi](../limitations.md). İki şey onu hala sınırlıyor.
Sayılar kabadır, çünkü tam sayıdan daha ince hiçbir şey yayımlanmaz. Ve eşikler şüphelenilen bir
bakiyeye doğrultulamaz, çünkü tohum yardımcı işlemcinin içinde çekilir ve ancak dönemi
bittikten sonra açığa çıkar.

Görünür kasa yerine daha yavaş ölçümü tercih eden bir dağıtım, ayar düğmesini yükseltir ve
ödünleşimi öbür yönde alır. Bu tek bir yeniden dağıtımdır.

## Aşırı talep: bir kademe planladığından fazla ödediğinde

Ödüller bağımsızdır, dolayısıyla dört ödül bekleyen bir kademe bazen altı, bazen dokuz dağıtır.
Her ödül sık kademenin likiditesinin sekizde biridir, dolayısıyla sekiz tane ödeyebilir. Onun
ötesinde kademe boştur.

Hearth bunu kademe başına ve çekiliş başına şifreli bir sayaçla ele alır. Her ödeme, tasarruf
sahibinin kazandığı ile kademede kalanın küçüğüne kırpılır, ve sayaç kırpılmış tutar kadar
düşer. Hiçbir işlem geri dönmez, ve kimsenin aritmetiği taşmaz.

### Geç kalan bir kazanan ne yaşar

Değerlendirme, tasarruf sahipleri listesinde o çekilişin tohumundan türeyen bir başlangıç
noktasından yürür. Kademe yürüyüşün ortasında boşalırsa:

- O anda değerlendirilen tasarruf sahibi kalanı alır, ki bu eşiklerinin kazandığını söylediği
  ödüllerden az olabilir.
- Yürüyüşte daha sonra gelen tasarruf sahipleri o çekilişte o kademeden hiçbir şey almaz. Diğer
  kademeler etkilenmez: her kademenin kendi sayacı vardır.

O kuyrukta kimse daha iyi bir yer satın alamaz. Yürüyüş sırası tohumla sabitlenir, `evaluate`
çağıran kaç tasarruf sahibinin ilerletileceğini seçer, hangilerinin olacağını asla seçmez, ve
başlangıç noktası her çekilişte değişir, dolayısıyla hiçbir adres sistematik olarak sonda
kalmaz.

Bu, etkilenen tasarruf sahibi için sessiz değil görünürdür. O çekilişe ait saklanan ağırlığı ve
saklanan tutarı kendisi şifresini çözebilir, dolayısıyla eşiklerini açık tohumdan yeniden
hesaplayabilir ve hesabına geçenin eksik olduğunu görebilir.

### Ne sıklıkla oluyor

Sık kademede, çok sayıda küçük tasarruf sahibiyle, dağıtılan ödül sayısı ortalaması 4 olan bir
Poisson dağılımına yakındır, ve kademe 8 ödeyebilir. Dokuzuncuya ihtiyaç duyma ihtimali
çekiliş başına yaklaşık yüzde 2'dir. Çekiliş tam toplam yerine aralık üzerinden yürüdüğü için
gerçek beklenen sayı 2 ile 4 arasındadır, dolayısıyla yüzde 2 tipik durum değil tavandır.
`count = 1` olan iki kademede beklenen ödül sayısı birin epey altındayken kapasite hala ikidir,
dolayısıyla kırpma orada kat kat daha nadirdir.

O yaklaşım, çok sayıda küçük tasarruf sahibinden oluşan bir havuz varsayar. Büyüklükleri çok
farklı üç tasarruf sahibinin olduğu bir havuzda dağılım farklıdır, ve Sepolia'daki küçük örnek
havuzda kırpma yapan bir çekiliş kurmak kolaydır. Bu, örneğin büyüklüğünden gelen bir özellik,
bir hata değil.

## PoolTogether V5'ten bilinçli üç fark

Üçü de gömülmek yerine burada açıkça yazılıyor, çünkü V5'i bilen bir inceleyici bunları
arayacaktır.

### 1. Çekiliş tam toplam üzerinden değil, bir aralık üzerinden yürür

V5 kazanan testini çekilişe ait tam toplam arz üzerinden yürütür, ki bunu yapabilir çünkü o
sayı şeffaf bir zincirde herkese açıktır. Burada tam toplamı yayımlamak tek tek yatırılan
tutarları sızdırırdı, dolayısıyla Hearth yalnızca onun üzerindeki ikinin kuvveti aralığını
yayımlar.

Sonucu yukarıda anlatılandır: bir kademe her çekilişte nominal ödül sayısının yarısı ile tamamı
arasında bir kısmını öder, ve ödül büyüklükleri buna göre daha yüksekte oturur. Hiçbir para
kaybolmaz ve hiçbir tasarruf sahibinin şansı bir başkasına göre bozulmaz, çünkü bir kademedeki
her tasarruf sahibi aynı `W / M` ile ölçeklenir. Bu 12. kısıttır.

### 2. Rezerv kademesi yok

V5 her katkıdan bir payı rezerve alır. Rezerv, çekilişin ödül adımını çalıştırma teşvikini
finanse eder, ve aşırı talep gören bir kademeyi takviye ederek yastıklar.

Hearth'te rezerv yok. Yüzde 50 kullanım oranı tek yastıktır, ki bu, V5'in kendi
dokümantasyonunun bu amaçla `tierLiquidityUtilizationRate` kullanan dağıtımlar için adını
verdiği alternatiftir. Sonucu yukarıda anlatılan kırpmadır: nadir görülen aşırı talepli bir
çekilişte, yürüyüş sırasındaki son kazananlar takviye edilmek yerine eksik alır.

Bunu şu yüzden seçtik: bir rezervin işe yaraması için sahip kontrolünde bir çekim yoluna
ihtiyacı var, ve gizli bir havuzdaki her sahip yetkisi bir tasarruf sahibinin güvenmek zorunda
kaldığı bir şeydir. Ödünleşim [kısıtlar listesinde](../limitations.md) 4. kısıt olarak yazılı.

### 3. Büyük ödül olasılığı tek bir dönem üzerinden ölçülür

V5, büyük ödül kademesinin olasılığını kademenin bütün birikim penceresi üzerinden ölçer,
dolayısıyla bir yıldır büyüyen bir kasayı alma şansı bir yıllık katılımı yansıtır.

Hearth büyük ödül olasılığını, diğer her kademe gibi tek bir dönem üzerinden ölçer. Bu, tek bir
dönem için ortaya çıkan büyük bir tutucunun, başkalarının 24 dönem boyunca doldurduğu bir
kasaya tam orantılı bir atış yapması demektir. Bu gerçek bir asimetridir ve 5. kısıt olarak
yazılıdır.

Ucuz çözüm biliniyor ve sonraki bir sürüm için not edildi: son büyük ödül ödemesinden beri
biriken bakiye saniyelerini takip etmek, ve büyük ödül kademesini tek dönemin ağırlığı yerine
onunla ağırlıklandırmak. Birinci sürümün dışında bırakıldı, çünkü kendi taşma analizi olan
ikinci bir biriktirici ekliyor, ve tamamen kanıtlanmış basit olanı göndermek, kanıtlanmamış daha
iyi olanı göndermeye ağır bastı.

## Bu sayfanın kapsamadıkları

Hasadın nereden geldiğini ya da nasıl doğrulandığını kapsamaz, o şurada:
[getiri kaynağı](yield-source.md). Kimin kazandığına karar veren tasarruf sahibi başına testi
de kapsamaz, o şurada: [kazananın belirlenmesi](winner-selection.md). Ve ödül büyüklükleri
hakkında hiçbir gizlilik iddiasında bulunmaz: onlar burada tasarım gereği herkese açıktır, ve
yayımlanan ödül sayılarının neyi ifşa ettiği şurada anlatılıyor:
[gizli kalanlar](../security/what-stays-private.md).
