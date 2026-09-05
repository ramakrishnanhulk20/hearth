# Zaman ağırlıklı bakiye

Bir çekilişteki şansınız, çekiliş yapıldığı anda elinizde olana dayanmaz. Dönemin
tamamındaki ortalama bakiyenize dayanır. Bu sayfa bunun nedenini, geç para yatıran birine
neye mal olduğunu ve kasanın tasarruf sahibi başına neden yalnızca üç anı hatırlamasının
yettiğini anlatıyor.

## Neden ortalama, neden son bakiye değil

Önce basit tasarımı ele alalım: herkesi çekilişin yapıldığı andaki bakiyesiyle ağırlıklandır.
Kurması kolay, ve bozuk.

Bir saldırgan büyük bir tutar yatırır, çekilişi bekler, kazanır ve parasını çeker. Parası
havuzda bir blok boyunca kaldı. Kimseye getiri kazandırmadı, hiç risk taşımadı, ve sabırlı
tasarruf sahiplerinin finanse ettiği ödülü aldı. Sonra bir sonraki çekilişte aynısını yapar.

Bunu 2 Eylül 2026'da kendi önceki tasarımımıza karşı fiilen uyguladık. Dürüst bir tasarruf
sahibinin 100 USDC tuttuğu bir havuzda, her çekilişin etrafında 9,000 USDC'yi içeri dışarı
döndüren bir saldırgan 20 çekilişin 19'unu kazandı ve 5,000 USDC'lik ödül rezervini boşalttı.
Saldırganın sermayesi hiç risk altında değildi, çünkü kayıpsız bir havuz onu tanımı gereği
geri verir. Bütün döngü tek bir işleme bile sığdı: yatır, çekilişi aç, tara, çek, gas
2,189,992.

Çözüm, PoolTogether'ın kullandığı çözümdür. Kendi dokümantasyonları şöyle diyor: zamanda
geriye bakabilmek önemlidir, "böylece kullanıcılar bir ödül havuzuna serbestçe para yatırıp
çekebilirken likidite katkıları kusursuz biçimde ölçülür." Anlık görüntüyü değil, katkıyı
ölçün.

## Geç yatırılan para ne değerde

Dönem, USDC havuzunda 3,600 saniye, diğer altısında 21,600 saniyedir. Ağırlık, bakiyenin
tutulduğu saniye sayısıyla çarpımıdır, dolayısıyla o havuzun kendi tokeni cinsinden bakiye
saniyesi ile ölçülür. Aşağıdaki örnek saatlik USDC havuzudur.

| Tasarruf sahibi | Ne yaptı | Döneme ait ağırlığı |
| --- | --- | --- |
| Ada | 3,600 saniyenin tamamı boyunca 100 USDC tuttu | 100 x 3600 = 360,000 |
| Ben | 360 saniye kala 1,000 USDC yatırdı | 1,000 x 360 = 360,000 |
| Cy | Dönemin tamamı boyunca 1,000 USDC tuttu | 1,000 x 3600 = 3,600,000 |

Ben, Ada'nın parasının on katını koydu ve tam olarak aynı şansı satın aldı, çünkü sürenin
onda biri kadar oradaydı. Ürünün asıl amacına uygun davranan Cy ise ikisinin de on katı
şansa sahip.

Aynanın öbür tarafı da işler. Bir çekiliş kapanır kapanmaz paranızı çekerseniz, biten dönem
için zaten kazandığınız ağırlığı korursunuz, ve bir sonrakine neredeyse hiçbir şey
taşımazsınız. Şansı kiralayamazsınız.

Bunların hiçbiri, gerçekten büyük bir bakiyeyi tam bir dönem boyunca tutan birinin sık sık
kazanmasını engellemez. Bu bir saldırı değildir. Bu, ürünün çalışmasıdır: parası bütün süre
boyunca havuzdaydı ve herkesin ödülünü ödeyen getiriyi kazanıyordu.

## Kasa nasıl hatırlıyor

Kasa, tasarruf sahibi başına gözlem denen üç anlık görüntü saklar. Her biri üç şey tutar:
yürüyen bir bakiye saniyesi toplamı, o değişiklikten hemen sonraki bakiye ve zaman damgası.
Üç yuvanın adı `current`, `previous` ve `older`.

Yürüyen toplam her dönemin başında sıfırlanır. Sayıyı küçük tutan şey o sıfırlamadır: bir
dönem içinde asla bakiye ile dönem uzunluğunun çarpımını aşamaz.

Bakiyeniz değiştiğinde üç şeyden biri olur:

- **İlk kez bir değişiklik yapıyorsanız.** `current` yuvası, yürüyen toplamı sıfır ve yeni
  bakiyeniz ile oluşturulur.
- **`current` ile aynı dönemde bir değişiklik.** Kasa son değişiklikten beri kazandığınız
  bakiye saniyelerini ekler, sonra `current` yuvasının üzerine yerinde yazar. Yeni yuva
  kullanılmaz.
- **`current` döneminden sonraki bir dönemde bir değişiklik.** Üç yuva aşağı kayar: `older`
  eski `previous`'ı alır, `previous` eski `current`'ı alır, ve bu dönemin başından şu ana
  kadar kazandığınız bakiye saniyelerini taşıyan yeni bir `current` yazılır.

`p` dönemine ait ağırlığınız okunurken, o dönemdeki ya da ondan önceki en yeni gözlem
kullanılır:

- Gözlem `p` döneminin içindeyse, ağırlığınız taşıdığı yürüyen toplam artı bakiyenizin o
  andan dönemin sonuna kadar geçen saniyelerle çarpımıdır.
- Gözlem `p` döneminden önceyse, dönem boyunca bakiyenize hiç dokunmamışsınız demektir,
  dolayısıyla ağırlığınız sadece o bakiyenin tam dönem uzunluğuyla çarpımıdır.
- `p` döneminde ya da öncesinde hiç gözleminiz yoksa, henüz tasarruf sahibi değildiniz ve
  ağırlığınız sıfırdır. Bu durum, hiç şifreli aritmetik olmadan, açık zaman damgalarından
  belirlenir.

Buradaki her şifreli adım, açık bir sayıyla bir çarpma ve bir toplamadır. Değerlendirmeyi
parti halinde yapılabilecek kadar ucuz tutan şey budur.

Aşağıdaki sayma argümanı için önemli bir ayrıntı var. Her çıkış bir gözlem yazar, anapara
hareket etmiş olsun ya da olmasın, çünkü kasa çekimin iki bakiyenizden hangisinden çıktığını
göremez. Bu zararsızdır: bir yuva ancak yeni bir dönem başladığında kayar, dolayısıyla
yalnızca kazanç çekmek, döneminizin zaten kullanacağı yuvanın ötesinde bir yuva harcamaz.

## Neden üç gözlem yeterli

Bir inceleyicinin soracağı soru budur, ve cevap bir sayma argümanıdır.

Yeni bir yuva ancak bir bakiye değişikliği, `current`'ın bulunduğu dönemden sonraki bir
döneme düştüğünde eklenir. Dönem başına en fazla bir ekleme olur, o dönemin içinde kaç kez
para yatırırsanız ya da çekerseniz çekin.

`p` çekilişi yalnızca `p+1` ve `p+2` dönemleri sırasında kapatılabilir, ödül adımı yapılabilir
ve değerlendirilebilir. Yani biri `p` dönemine ait ağırlığınızı okuduğunda, `p`'den sonra en
fazla iki dönem başlamıştır, ve dolayısıyla `p` döneminde ya da öncesinde en yeni olan neyse
onun üzerine en fazla iki yeni gözlem eklenmiştir. Üç yuva bunu karşılar: ihtiyacımız olan
gözlem, artı ondan sonra düşen en fazla iki tanesi.

Pencerenin iki dönem olmasının ve daha uzun olmamasının sebebi budur. Pencereyi genişletirseniz
dördüncü bir yuva gerekir. Tek döneme indirirseniz, relayer'dan gecikmiş tek bir cevap bir
çekilişi kaybettirebilir, ki kısa bir dönem bunu acı verecek kadar olası kılmıştı. Kapatmanın
kendine ait bir son tarihi vardır, pencerenin bitiminden yarım dönem önce, böylece aynı üç
yuva bir kapatmanın ardından gelen gidiş dönüşü her zaman karşılar.

Kasa aynı üç gözlemi havuzun toplam bakiyesi için de tutar, dolayısıyla bir dönemin toplam
ağırlığı aynı kuralla hesaplanır ve aynı pencere boyunca geçerlidir. O toplam asla
yayımlanmaz. Kasanın yayımladığı şey onun üzerindeki ikinin kuvveti aralığıdır, ve o aralığı
aynı birikmiş sayıyı şifre altında beş sabit ikinin kuvvetiyle karşılaştırarak bulur.
Bakınız: [gizli kalanlar](../security/what-stays-private.md).

## İki büyüklük sınırı

Buradaki şifreli değerler 64 bit işaretsiz tam sayılardır, dolayısıyla aritmetiğin o
aralığın içinde kalması gerekir. Şifreli bir sayının taşması, düz bir sayının taşmasından
daha kötüdür, çünkü hiçbir şey geri dönmez ve olduğunu kimse görmez.

**Tasarruf sahibi başına.** Kasa, tutarı ya da ortaya çıkacak anaparası
`maxPrincipal = (2^64 - 1) / L` üzerinde olacak hiçbir yatırmayı kabul etmez. Bir saatlik
dönemde bu yaklaşık 5 milyar token, altı saatlik dönemde yaklaşık 854 milyon, günlük dönemde
ise yaklaşık 213 milyondur. Yürüyen toplamınız bakiyenizin dönem uzunluğuyla çarpımını
aşamayacağına ve bakiyeniz de o üst sınırı aşamayacağına göre, yürüyen toplamınız 64 biti
aşamaz. Ret, şifreli bir "hayır" olarak döner ve token aynı işlemde paranızı iade eder,
dolayısıyla sınıra dayanmak bakiyenizi açık etmez.

Kontrol, sonucun yanı sıra gelen tutarı da sınırlar, ve o ikinci sınır süs değildir. Şifreli
toplama 64 bitte geri dönmeden başa sarar, dolayısıyla `2^64` eksi anaparanız kadar bir
yatırma toplamı sıfır yapardı, ve yalnızca toplama bakan bir kontrol onu geçirirdi. Hem tutar
hem mevcut anapara üst sınırın altında tutulduğunda, toplam constructor'ın izin verdiği
hiçbir dönem uzunluğunda `2^64` değerine ulaşamaz, dolayısıyla başa sarma yalnızca ihtimal
dışı değil, erişilemez olur.

**Havuz toplamı için.** Toplamın yürüyen biriktiricisi 64 değil 128 bittir, dolayısıyla
sarmalayıcının basabileceği hiçbir arzda toplam taşamaz.

Bu tasarımın önceki bir sürümü, 64 bitlik bir biriktiricinin taşamayacağını iddia ediyordu.
Bu yanlıştı, bir tasarım incelemesi bunu yakaladı, ve üst sınır ile 128 bitlik toplam bunun
düzeltmesidir.

## Bu sayfanın kapsamadıkları

Ağırlığınız bilindikten sonra ne olduğunu kapsamaz. O şurada:
[kazanan testi](winner-selection.md). Ayrıca zaman ağırlıklandırmasının bir gizlilik özelliği
olduğunu da iddia etmez: ağırlığınız şifrelidir, ama havuzun toplamının düştüğü aralık her
çekilişte yayımlanır, ve çok az tasarruf sahibi varken o aralık bir ağırlığı iki kat hata
payıyla sabitler. Bakınız: [gizli kalanlar](../security/what-stays-private.md).
