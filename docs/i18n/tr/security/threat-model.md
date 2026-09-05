# Tehdit modeli

Dokuz saldırgan, her birinin ne istediği, onları neyin durdurduğu ve neyin durdurmadığı.
Okumaya değer olan son sütun. Yalnızca savunmaları listeleyen bir tehdit modeli pazarlamadır.

Hearth'ün temel sözleşmeleri bir kez dağıtıldıktan sonra değiştirilemez. Vekil sözleşme yok,
yükseltme yolu yok, dolayısıyla bu sayfadaki hiçbir şey sonradan, yeni bir havuz dağıtmak
dışında değiştirilemez.

**Her havuz yalıtılmıştır.** Sepolia'daki yedi havuz, aynı kodun yedi ayrı dağıtımıdır, gizli
token başına bir tane, ve hiçbir depolama, bakiye ya da kayıt defteri paylaşmazlar. Bir havuz
yalnızca kendi tokenini tutar, yalnızca kendi kasasını fonlar ve kendi keeper hesabı tarafından
sürülür, dolayısıyla bir tokenin sarmalayıcısındaki bir hata, bir kasayı duraklatan bir sahip
ya da duran bir keeper başka bir havuzun tasarruf sahiplerine veya başka bir havuzun ödül
parasına ulaşamaz. Aşağıdakiler tek bir havuzu anlatıyor ve yedisinin her birine ayrı ayrı
uygulanıyor.

## 1. Meraklı bir izleyici

Arşiv düğümü, blok gezgini ve zamanı olan biri. Sermaye yok, ayrıcalıklı erişim yok.

**İstediği:** kimin ne kadar biriktirdiğini, kimin şansının en iyi olduğunu ve her çekilişi
kimin kazandığını bilmek.

**Onu durduran:** kişiye özel her değer bir şifreli veridir. Anapara, kazanç, çekiliş başına
ağırlık ve çekiliş başına hesaba geçen tutar yalnızca sahibi olan tasarruf sahibi tarafından
okunabilir, bunu Zama'nın erişim kontrol listesi uygular ve relayer'ın başka herhangi bir
adresten gelen şifre çözme isteğini reddetmesini sağlar. İzlenecek bir talep işlemi yok, ve
değerlendirme kendinize doğrultulamıyor, dolayısıyla yalnızca bir kazananın göndereceği hiçbir
işlem yok. Kazananlar ve kaybedenler aynı partide birbirinin aynı yazmaları alır, çünkü ödeme
bir dallanma değil şifreli bir seçimdir, dolayısıyla işlemlerin biçimleri ve gas maliyetleri
uyuşur.

**Bu tasarımın kaldırdığı bir sızıntı.** Önceki bir taslak, havuzun tam toplam zaman ağırlıklı
bakiyesini her çekilişte yayımlıyordu. O sayı arka arkaya iki dönem için açıkken, artı bir
tasarruf sahibinin kendi işleminin herkese açık zaman damgasıyla, o dönemde para hareketi yapan
tek kişi olan bir tasarruf sahibinin tutarı sınırlanmakla kalmıyor, tam olarak geri elde
ediliyordu. Kasa artık yalnızca toplamın üzerindeki ikinin kuvveti aralığını yayımlıyor, bunu
çekiliş başına beş şifreli karşılaştırmayla izliyor, ve denklemde çözülecek bir şey kalmıyor.
Tam ifade, [gizli kalanlar](what-stays-private.md) sayfasının 1. kuralıdır.

**Hiçbir şeyin durdurmadıkları:**

- Tasarruf sahipleri listesi, ve her birinin para yatırdığı, çektiği ya da değerlendirildiği
  blok.
- Havuzun toplamının düştüğü aralık, ki üçten az tasarruf sahibi varken bir kişinin ağırlığını
  iki kat hata payıyla sabitler. Bakınız: [gizli kalanlar](what-stays-private.md) sayfasındaki
  anonimlik kümesi kuralı.
- **İzleyicinin sabitleyebildiği bir bakiyenin her çekilişte herkese açık bir sonucu vardır.**
  Eşikler tasarım gereği açıktır, ve kazanan testi tek bir sırrın ve onun dışında herkese açık
  verilerin belirleyici bir fonksiyonudur. 1,000 USDC sarmalayın ve saniyeler sonra 1,000 USDC
  yatırın: o günden sonra her kademedeki, her çekilişteki her kazancınız ve kaybınız herkesin
  yapabileceği bir aritmetiktir.
- **Birikmiş kazançlar herkese açık bir alt sınırdır**, sarmalayıp sonra tamamının sarmalamasını
  çözen bir adres için, çünkü her iki hareket de token katmanında herkese açıktır.
- **Durağan bir bakiye yavaşça daraltılır.** Yayımlanan ödül sayıları bakiye dağılımının küçük
  bir ölçümüdür ve bakiyesi hiç değişmeyen bir tasarruf sahibine karşı birikirler. Her kademe
  sayısını bir çekiliş sonra yayımlar, dolayısıyla ölçüm kademe başına ve çekiliş başına bir kez
  çalışır. Bunu yavaşlatacak sıklık, bu dağıtımın bire ayarladığı bir constructor düğmesidir,
  çünkü aynı adım kazanılmayan parayı ortak kasaya döndüren ve büyük ödülü görünür kılan adımdır.
  14. kısıt.
- Davranıştan kalan artık: yalnızca kazandığınız çekilişlerden sonra para çekmek, çok sayıda
  çekiliş boyunca.

## 2. Bir balina

Şansı ucuza satın almak isteyen, çok sermayesi olan biri.

**İstediği:** havuzda para bırakmadan ödülleri toplamak, ya da mekanikleri sağmak.

**Onu durduran:**

- **Zaman ağırlıklandırması.** Şans, dönemin tamamındaki ortalama bakiyeden gelir. Bir saatlik
  dönemin bitimine 6 dakika kala yapılan bir yatırma, aynı tutarın dönem boyunca tutulmasının
  şansının onda birini kazandırır. Önceki tasarımımızda eksik olan savunma buydu, ve izin
  verdiği saldırı fiilen uygulandı: her çekilişin etrafında 9,000 USDC döndüren bir saldırgan 20
  çekilişin 19'unu kazandı ve 5,000 USDC'lik bir rezervi boşalttı.
- **Doğrusallık.** Beklenen ödüller tam olarak ağırlıkla orantılıdır, ve çekilişin üzerinde
  yürüdüğü aralık, havuzun ağırlığının adresler arasında nasıl bölündüğüne bağlı değildir. Bir
  cüzdanı altıya bölmek hiçbir şey kazandırmaz, altıyı birde toplamak da kazandırmaz.
- **Tasarruf sahibi başına üst sınır.** Tutarı ya da ortaya çıkacak anaparası `(2^64 - 1) / L`
  değerinin üzerinde olan yatırmalar reddedilir, ve ret şifrelidir, dolayısıyla hiçbir şey ifşa
  etmez. Toplamın yanı sıra tutarı da sınırlamak, kontroldeki şifreli toplamanın başa sarmasını
  durduran şeydir.

**Durdurulmayanlar:**

- Gerçekten büyük bir bakiyeyi dönemin tamamı boyunca tutan bir balina sık kazanır. Bu bir
  saldırı değil ürünün kendisidir: ödülleri ödeyen getiriyi onun parası kazandı.
- Büyük ödül kademesinin olasılığı tek bir dönem üzerinden ölçülür, dolayısıyla tek bir dönem
  için katılan bir balina, dolması 24 dönem süren bir kasaya tam orantılı bir atış yapar. Bu,
  PoolTogether V5'ten açıkça belirtilmiş bir sapmadır ve 5. kısıttır.

## 3. Sahte tasarruf sahipleri kaydeden bir sabotajcı

Tasarruf sahipleri listesine çok sayıda değersiz adres ekleyen biri.

**İstediği:** çekilişleri takmak, şansı sulandırmak, ya da havuzu işletmeyi pahalı hale
getirmek.

Kayıt, kuruluşu gereği açıktır. Yatırma kancası kendisine verilen şifreli tutarı göremez,
dolayısıyla onu tetikleyen her adres, şifreli bir sıfırla bile olsa tasarruf sahipleri listesine
katılır, ve liste asla budanmaz.

**Onu durduran:**

- **Şans etkilenmez.** Bakiyesi olmayan bir tasarruf sahibinin ağırlığı sıfırdır. Sıfır ağırlık
  hiçbir eşiği aşamaz, ve toplama hiçbir katkısı olmaz, dolayısıyla her gerçek tasarruf sahibinin
  şansı sahteler olmasaydı ne olacaksa tam olarak odur. Önceki tasarımımız bunun için bir kayıt
  teminatına ihtiyaç duyuyordu. Bu tasarım duymuyor.
- **Değerlendirme tıkanamaz.** Bir çekiliş için zaten değerlendirilmiş bir tasarruf sahibi,
  tasarruf sahibi olmayan bir adres, ve ilk gözlemi dönemden sonra olan bir tasarruf sahibi geri
  dönmeden atlanır, ve atlama, açık zaman damgalarından hiçbir şifreli maliyet olmadan
  belirlenir. Tek bir kötü kayıt bir partiyi düşüremez.
- **Partiler sınırlıdır**, çağrı başına şifreli iş gerektiren `4` tasarruf sahibiyle, dolayısıyla
  tek bir işlem Zama'nın hesaplama sınırının ötesine itilemez.

**Durdurulmayan:** keeper'ın çekiliş başına maliyeti, yalnızca büyüyen tasarruf sahipleri
listesiyle birlikte artar. Bir sabotajcı kimsenin şansını değiştiremez, ama herkesi
değerlendirmeyi pahalı hale getirebilir. Keeper'ın cevabı bir bütçe değil bir ücret tavanıdır.
`KEEPER_MAX_FEE_GWEI`, ağ ücreti tavanın üzerindeyken keeper'ın bütün bir turu boş geçmesini
sağlar (`packages/keeper/src/keeper.ts` içindeki `gasIsAffordable`), ve tavanın altında imleç
yürüyüşün sonuna ulaşana kadar işlem göndermeye devam eder. Dönemden önce gözlemi olmayan
tasarruf sahipleri açık zaman damgalarından hiçbir şifreli maliyet olmadan atlanır, dolayısıyla
listeyi şişirmek tasarruf sahiplerine ödüllerine değil, keeper'a gas'a mal olur. Zincir üzerinde
hiçbir şey değerlendirmeyi sınırlamaz, dolayısıyla dürüst sonuç şudur: ağır sabotaja uğramış bir
havuzda gas tavanın üzerinde kalırsa, yürüyüş pencere içinde her gerçek tasarruf sahibine
ulaşamayabilir.
İki şey bunu yumuşatıyor. Yürüyüş her çekilişte, o çekilişin tohumundan türeyen farklı bir
noktadan başlar, dolayısıyla kimse sistematik olarak sonda kalmaz. Ve yürüyüşü uygulamadan herkes
daha ileri taşıyabilir, ki bunun maliyeti gas'tır ve kimin istediği hakkında hiçbir şey ele
vermez. Bakınız: [keeper sayfası](../operations/keeper.md).

## 4. Tembel ya da düşmanca bir keeper

Normalde çekilişleri ileri iten adres. Bizimki ya da başkasınınki.

**İstediği:** kazanmadığı bir çekilişi atlamak, tasarruf sahiplerinin ödenme sırasını seçmek, ya
da sadece çalışmayı bırakmak.

**Onu durduran:**

- **Her adım herkese açıktır.** Kapatma, ödül adımı, değerlendirme, sonlandırma ve mutabakat
  herkes tarafından çağrılabilir, uygulamadan herhangi bir tasarruf sahibi de dahil. Bir
  çekilişin ödül adımını çalıştırmayı reddeden bir keeper onu ortadan kaldıramaz, başka biri
  çalıştırır.
- **Keeper kimin değerlendirileceğini seçemez.** `evaluate(drawId, count)` bir liste değil bir
  sayı alır. Yürüyüş sırası çekilişin tohumuyla sabitlenir, dolayısıyla keeper aşırı talep gören
  bir kademede kendini ya da bir arkadaşını başa koyamaz, ve belirli bir tasarruf sahibini dışarıda
  bırakamaz.
- **Geç bir kapatma hoş görülmez, reddedilir.** Kapatmanın `closeDeadline(p)` gelmeden, yani
  pencerenin ikinci döneminin ortasından önce gerçekleşmesi gerekir. Pencerenin son bloğunda
  yapılan bir kapatma, şifre çözme gidiş dönüşüne yer bırakmaz ve çekilişi kalıcı olarak mahsur
  bırakırdı. Artık o işlem basitçe geri döner. Kapatması hiç gerçekleşmeyen bir çekiliş sonsuza
  kadar kapatılmamış kalır: likiditesi hiç içine taşınmamıştır, dolayısıyla iade edilecek bir şey
  ve sonlandırılacak bir şey yoktur.
- **Atlanan bir çekilişin maliyeti yoktur.** Hiç teklif edilmemiş likidite kendi kademesinde kalır
  ve yeniden teklif edilir. Geç bir ödül adımı hasadı yine kayda geçirir, teklif edilen likiditeyi
  yine kademelere döndürür, ve çekilişi `Skipped` işaretler. O dönem hiçbir ödül ödemez, ve hiçbir
  para kaybolmaz ya da mahsur kalmaz.
- **Keeper bir sonucu değiştiremez.** Kazananın belirlenmesi, tohum ve aralık doğrulandığı anda
  sabitlenir. Değerlendirme var olan bir sonucu yazıya döker.

**Kazara test edildi, 3 Eylül 2026.** pm2 arka plan süreci, onu başlatan terminal süreciyle
birlikte 03:45 UTC'de öldü, ve 04:52'ye kadar kimse fark etmedi, dolayısıyla keeper 67 dakika
kapalı kaldı. Yeniden başladığında 4. çekilişi hemen sonlandırdı ve 6. çekilişi 04:53'te kapattı.
6. dönem 04:00'te bitmişti, dolayısıyla o kapatma, izleyen ikinci dönemin ortası olan 05:30 son
tarihine karşı 53 dakika gecikmişti. Hiçbir çekiliş kaybolmadı, hiçbir likidite mahsur kalmadı,
ve süreci yeniden başlatmanın ötesinde kimsenin müdahale etmesi gerekmedi. Bu, [SSS](../faq.md)
sayfasındaki ve yukarıdaki maddelerdeki "duran bir keeper çekilişlere mal olur, paraya asla"
iddiasının tartışılmak yerine gerçekten yaşanmış halidir.

**Durdurulmayanlar:**

- Tohum ve aralık herkese açık hale geldikten sonra, `awardDraw` çağırmak üzere olan kişi önce
  kendi sonucunu hesaplayıp zahmete değip değmeyeceğine karar verebilir. Ödül adımı herkese
  açıktır ve uygulama bunu herkese sunar, dolayısıyla bu sansürden çok bir sıkıntıdır, ama
  gerçektir ve burada yazılıdır.
- İki dönemlik pencere içinde hiç kimse hiçbir şey yapmazsa, o çekiliş hiçbir şey ödemez.

## 5. Havuzun sahibi

Biz. Sözleşmeleri dağıtan adres.

**İstediği:** bir tasarruf sahibinin tahmin etmek zorunda kalmaması için burada sayılıyor.

**Yetkileri, tamamıyla:**

| Yetki | Sınırı |
| --- | --- |
| Duraklatma | Para yatırmayı ve çekiliş kapatmayı durdurur. Çekimleri, değerlendirmeyi, ödül adımını, sonlandırmayı veya mutabakatı asla durdurmaz. |
| Getiri kaynağını ayarlama | `YieldSourceSet` yayar. Mevcut hiçbir bakiyeyi etkileyemez. |
| Yabancı tokenleri kurtarma | Tasarruf sahiplerinin anaparasına ya da kazancına dokunamaz. |
| Sahipliği devretme | İki adımlı. Sahiplikten vazgeçmek kapalıdır, dolayısıyla sahiplik boşluğa düşürülemez. |

**Yapamadıkları:** hiçbir tasarruf sahibinin anaparasını, kazancını, ağırlığını ya da hesabına
geçen tutarı okuyamaz, çünkü sözleşmeler sahibe bunlara asla erişim vermez. Bir çekilişin
sonucunu değiştiremez. Kimsenin parasını taşıyamaz. Sözleşmeleri yükseltemez, çünkü yükseltme
yolu yoktur.

**Durdurulmayan:** düşmanca bir sahip para yatırmayı süresiz duraklatabilir, ve havuzu hiçbir şey
ödemeyen bir getiri kaynağına yönlendirebilir. Bu, ürünün ödül tarafını aç bırakır. Artık saati
durdurmuyor: geri dönen bir kaynak yakalanır, o çekilişin hasadı sıfır olarak kayda geçer,
`HarvestFailed` yayılır ve kapatma yine de başarılı olur. Bu yetkilerin hiçbiri kimsenin
anaparasından tek bir birim almaz, ve çekimler boyunca çalışmaya devam eder.

## 6. Sponsor

Sepolia getiri kaynağını kim fonluyorsa.

**İstediği:** dürüst durumda, gösterime ödül parası vermek. Düşmanca durumda, ödülleri
zamanlamak ya da esirgemek.

**Onu durduran:** sponsorun kimin kazanacağı üzerinde hiçbir etkisi yoktur. Bir bakiyeyi fonlar.
Tohum, ağırlıklar ve eşiklerin onunla hiçbir ilgisi yoktur. Sponsorluk tutarları, damlama hızı ve
her hasat herkese açıktır, dolayısıyla ne kadar ödül parası olduğunu ve ne hızla geldiğini herkes
tam olarak görebilir. Sponsorluk bir bağıştır: bir kez yapıldıktan sonra geri çekilemez, ve
damlama hızını yalnızca kaynağın sahibi değiştirebilir.

**Durdurulmayan:** sponsorluğu bırakan bir sponsor, bakiye damlayıp bittiğinde ödülleri de
bitirir. Ödüller getiridir, ve getiri yoksa ödül de yoktur. Anapara boyunca el değmeden kalır, ki
kayıpsız bir tasarımın bütün amacı budur.

## 7. Token operatörü

Zama, gizli token sarmalayıcılarının sahibi olarak. Her havuzun varlığı bizim değil onların
sözleşmesidir, ve her havuz bunlardan farklı birinin arkasında oturur.

**İstediği:** iddia değil, sayım.

**Yetkileri, 2 Eylül 2026'da doğrulanmış Sepolia kaynağından okundu:**

- `addObserver(address)`, bir adrese tokenin hak sahibi olduğu her handle üzerinde joker
  karakterli şifre çözme yetkisi verir, **geriye dönük olarak**. Gelecekte herhangi bir tarihte
  atanan bir gözlemci zincirde zaten bulunan tutarların şifresini çözebilir, dolayısıyla atamayı
  izleyip çıkmak bir savunma değildir. Kapsamı her yatırma tutarı, her çekim ödemesi, havuzun
  kendi token bakiyesi, ve değerlendirme partisi başına bir ödül finansman transferidir. Okunacak
  kazanan başına bir ödeme yoktur, çünkü Hearth'te tasarruf sahibi başına ödül transferi yoktur.
  Tek bir tasarruf sahibi içeren bir parti, o partinin toplamını o kişinin tam ödülü haline
  getirir, ve parti büyüklüğü 4 olan canlı beş kişilik havuz her çekilişte böyle bir parti üretir.
  `evaluate` parti büyüklüğünü çağırandan alır ve herkese açıktır, dolayısıyla asgari bir parti
  dayatılamaz. [7. kısıt](../limitations.md) bunu kabul edilmiş bir artık olarak kayda geçiyor ve
  sözleşme tarafındaki çözümün adını veriyor. O günkü canlı durum: `observerCount()` 0 ve
  `observers()` boştu.
- Bir engel listesi. Engellenen bir adres para yatıramaz, çekemez ya da sarmalamayı çözemez,
  çünkü her biri o adresin bir tarafında olduğu bir token transferidir.
- Bir duraklatıcı rolü, canlıda sıfır adresine ayarlı, dolayısıyla duraklatma şu an devre dışı.
- Uygulama, bir vekil sözleşmenin arkasında sahibi tarafından yükseltilebilir.

**Onu durduran:** bizim kontrolümüzdeki hiçbir şey. Bu bir savunma değil, bir güven varsayımıdır.

**Ulaşamadığı yer:** Hearth'ün kendi defteri. Anapara, kazanç, ağırlıklar ve hesaba geçen
tutarlar kasada yaşar, ve token bunlar üzerinde hiçbir erişim hakkı tutmaz, düşmanca bir token
yükseltmesi altında bile. Bunu önceki dağıtımda doğruladık: token adresi, bir yatırıcının anapara
ve kazanç handle'ları üzerindeki izin sorgusuna yanlış döndürürken, yatırıcı ile havuz doğru
döndürüyor.

## 8. Zama'nın KMS kurulu

Ağın şifre çözme anahtarını tutan taraflar.

**İstediği:** burada sayılıyor, çünkü bu herhangi bir FHEVM uygulamasındaki en derin varsayım.

**Yapabilecekleri:** sözleşme, bir açık metnin kuruldan geçerli bir imza taşıdığını doğrular. O
açık metnin handle'ın gerçek karşılığı olduğunu doğrulayamaz. Dolayısıyla dürüst olmayan bir
kurul, seçtiği bir tohum değerini imzalayabilir ve sözleşme onu kabul ederdi, ki bu kazananları
seçmesine imkan verirdi.

**Onu durduran:** Hearth'te hiçbir şey. Bu protokoldeki her uygulama bunu devralır, ve Zama'nın
kendi dokümantasyonu sınırı açıkça belirtiyor: protokolün şifreli veriler üzerinde doğru
hesaplayacağına ve yalnızca genel olarak şifresi çözülebilir işaretlenmiş olanı çözeceğine
güvenilir.

**Bilmeye değer:** kurul, genel olarak şifresi çözülebilir işaretlenmemiş hiçbir şeyi hala
okuyamaz, ve Hearth'te bu yalnızca tohum, ölçek sayısı, boş olmama bayrağı, hasat, sırası
geldiğinde her kademenin devri, ve karşılanmayan tutar sayacıdır. Hiçbir tasarruf sahibinin
bireysel değeri o kümede yoktur, havuzun tam toplam ağırlığı da yoktur.

## 9. Relayer

Şifre çözme isteklerini tarayıcılar ile protokol arasında yönlendiren servis.

**İstediği:** burada sayılıyor.

**Yapabildikleri:** hizmet vermeyi reddedebilir ya da geciktirebilir, ki bu bir çekilişi
geciktirir. Ayrıca hangi adresin hangi handle'ı çözmek istediğini görür, dolayısıyla kendi
sayılarınıza baktığınızı öğrenir, ne söylediklerini değil.

**Yapamadıkları:** hiçbir şeyin şifresini kendisi çözemez, çünkü anahtarı tutmuyor. Bir KMS
imzasını taklit edemez, ki zincir üstü doğrulama tam da bunun içindir. Kendine bir handle üzerinde
erişim veremez, çünkü bu erişim kontrol listesinin işidir ve o zincir üzerinde yaşar.

**Onu durduran:** iki dönemlik pencere yavaş bir relayer'ı emer, ve kapatma son tarihi, gidiş
dönüş başladığında bu pencerenin en az yarım döneminin hala önde olmasını garanti eder. Bunun
ötesinde çekiliş atlanır, hasat yine kayda geçer ve likidite yerinde durur. Bir relayer kesintisi
bir çekilişe mal olur, paraya asla.

## Eski tasarım neyi yanlış yaptı ve bu tasarım onu nasıl kapatıyor

Bu yeniden yapımdan önce Hearth, tasarruf sahiplerini çekiliş anındaki bakiyeleriyle
ağırlıklandıran ve yatırıcıları öbekler halinde tarayan, `LanternPool` adlı tek bir sözleşmeydi.
2 Eylül 2026'da onu kendimize karşı denetledik ve saldırıları akıl yürüterek değil fiilen
çalıştırarak yaptık. Aşağıdaki sekiz bulgunun altısı çalışan kodda yeniden üretildi.

| # | Ne yanlış gitti | Kanıt | Bu tasarım onu nasıl kapatıyor |
| --- | --- | --- | --- |
| 1 | **Flaş yatırma.** Zaman ağırlıklandırması yoktu, dolayısıyla çekilişten bir blok önce yapılan bir yatırma tam olarak sayılıyordu. | Taklit ortamda çalıştırıldı: 20 döngü, saldırgan 20'nin 19'unu kazandı ve 5,000 USDC'lik bir rezervi boşalttı. Bütün döngü ayrıca tek bir işleme sığdı, 2,189,992 gas. | Şans, dönemin tamamındaki zaman ağırlıklı ortalamadan gelir. Son dakika yatırması, dönemin kendi kesrini kazanır ve fazlasını değil. |
| 2 | **Talep işlemi kazananı ele veriyordu.** Kazananın ve kaybedenin talebi birbirinin aynıydı, ama yalnızca bir kazananın gönderme sebebi vardı. | Çalıştırıldı: taklit ortamda kazanan ve kaybeden talebi birbirinin aynı kayıtlarla 391,944'er gas tuttu. Sepolia'da bir talep, bir hesaplaşmadan 48 saniye sonra gerçekleşti. | Talep fonksiyonu yok. Ödüller değerlendirme sırasında şifreli bir kazanç bakiyesine iner, tek çıkış `withdraw`'dır, ve değerlendirme kendinize doğrultulamaz. |
| 3 | **Her çekilişte herkese açık bir bit.** Bir ev biletinin kazanç handle'ı her çekilişte yeniden genel olarak şifresi çözülebilir yayımlanıyordu, ki bu evin kazanıp kazanmadığını sızdırıyordu, ve tek bir gerçek tasarruf sahibi varken kazananın adını veriyordu. | Taklit ortamda 16 çekiliş boyunca çalıştırıldı, ve Sepolia'da hesaplaşmış üç çekilişte doğrulandı. | Ev bileti yok. Genel olarak şifresi çözülebilir tek değerler tohum, ölçek sayısı, boş olmama bayrağı, hasat, kademe devirleri ve karşılanmayan tutar sayacıdır. Hiçbiri tasarruf sahibi başına değildir. |
| 4 | **Herkes tarafından doğrulanabilir değildi.** Havuzun toplamı hiç yayımlanmıyordu, dolayısıyla dışarıdan biri çekilişi hiç kontrol edemiyordu. | Dağıtılmış kaynaktan okundu ve canlıda doğrulandı. | Tohum ve aralık, zincir üzerinde doğrulanan bir KMS kanıtıyla yayımlanır, ve her eşik bu iki sayıdan herkes tarafından yeniden hesaplanabilir. |
| 5 | **Getiri bir bildirimden kayda geçiyordu.** Rezerv takviyeleri gönderilen tutardan kayda geçiyordu, oysa sarmalayıcı `amount / rate()` kadar basar. Sepolia'da yalnızca oran tesadüfen 1 olduğu için gizli kalmıştı. | Oranın bir milyon kere bir milyon olduğu 18 ondalıklı bir test tokenine karşı çalıştırıldı. | Havuz yalnızca kaynağın gerçekten transfer ettiği, KMS tarafından doğrulanmış tutarı kayda geçirir. |
| 6 | **Bedava kayıt sabotajı.** Tokeni hiç tutmamış bir cüzdan kendini kaydettirebiliyordu, ve bir operatör tek bir tekrar kullanılan şifreli sıfırla başka cüzdanları kaydedebiliyordu. | Çalıştırıldı. | Kayıt hala açık, kuruluşu gereği. Sahte tasarruf sahipleri sıfır ağırlık taşır, kimsenin şansını değiştirmez ve açık halde atlanır. Tek maliyet keeper gas'ıdır, ve keeper'ın sınırladığı şey yapacağı iş değil, ödeyeceği gas fiyatıdır. |
| 7 | **Sarmalama dikişi, hafifletilmemiş.** Uygulama sarmalama ile yatırmayı tek akışta yapıyordu. | Canlıda ölçüldü: beş yatırmanın üçü herkese açık 100 USDC'lik bir sarmalamadan iki ila dört blok sonra duruyordu. | Sarmalama ve yatırma ayrı adımlar, ve uygulama sebebini açıklıyor. Dikiş azaltıldı, kaldırılmadı, ve 10. kısıttır. |
| 8 | **Keeper yoktu.** Çekilişler herkese açıktı ama kimse çalıştırmıyordu: canlı havuz, açılabilir bir çekilişle 26 saat bekledi. | Zincirden canlı olarak okundu. | Bir keeper betiği her adımı çalıştırır ve herhangi bir tasarruf sahibi bir çekilişi uygulamadan ilerletebilir. Havuz, ek yedeklilik olarak kapatma adımı için Chainlink'in otomasyon arayüzünü uygular, ancak henüz kayıtlı bir upkeep yok. |

3 Eylül incelemesinden iki tasarım değişikliği daha çıktı ve o tabloda yer almıyorlar, çünkü eski
tasarım onlara sahip olacak kadar ilerlememişti: tam toplamı yayımlamanın yerini aralık aldı
(yukarıdaki 1. saldırgan), ve ödül büyüklükleri ödül adımından kapatmaya taşındı, böylece hiçbir
ödül, tohumu var olduktan sonra yeniden boyutlandırılamaz.

## Ne kontrol ediliyor ve nasıl

Yukarıdaki her iddianın bir testi var. Çalıştırılan çıktılar `docs/security/attacks` altına
düşüyor ve sayılar README'ye yapıştırılıyor.

| İddia | Kontrolü |
| --- | --- |
| Bir yabancı, bir tasarruf sahibinin değerlerini okuyamaz | Relayer'dan başka bir adresin anaparasını, kazancını, ağırlığını ve hesabına geçen tutarı çözmesini isteyin. Dördünde de ret bekleyin. |
| Havuzun tam toplamı elde edilemez | Relayer'dan toplam ağırlık handle'ını isteyin. Ret bekleyin. Sonra tek bir tasarruf sahibinin hareket ettiği bir havuzda arka arkaya çekilişlerin yayımlanmış aralıklarının farkını alın, ve cevabın bir sayı değil iki kat genişliğinde bir bant olduğunu gösterin. |
| Flaş bir yatırma neredeyse hiçbir şey kazanmaz | Bir dönemin sonuna yakın para yatırın, değerlendirin, ve saklanan ağırlığı dönemin tamamını tutan biriyle karşılaştırın. |
| Sahte tasarruf sahipleri bir çekilişi taktıramaz | Çok sayıda boş adres kaydedin, sonra tam bir çekiliş çalıştırın. |
| Kimin değerlendirileceğini kimse seçemez | `evaluate`'i bir tasarruf sahibinin kendi adresinden çağırın ve yürüyüşün o kişiden değil, tohumdan türeyen imleçten ilerlediğini gösterin. |
| Geç bir kapatma reddedilir | `closeDeadline` sonrasında `closeDraw` çağırın ve geri dönüş bekleyin, sonra çekilişin atlanabilir olduğunu ve likiditesine dokunulmadığını doğrulayın. |
| Kaçırılan bir ödül adımı hiçbir şey kaybettirmez | Pencerenin geçmesine izin verin, ödül adımını geç çalıştırın, ve hasadın kayda geçtiğini, teklif edilen likiditenin kademelere döndüğünü ve çekilişin `Skipped` okuduğunu kontrol edin. |
| Geri dönen bir getiri kaynağı saati durdurmaz | Geri dönen bir kaynak bağlayın, bir çekiliş kapatın, ve başarı ile birlikte `HarvestFailed` bekleyin. |
| Aşırı talep gören bir kademe fazla ödemek yerine kırpar | Kademenin fonlayabileceğinden fazla kazanan oluşturun ve ödenenin teklif edileni asla aşmadığını kontrol edin. |
| Bir kanıt tekrar oynatılamaz | Bir ödül adımı kanıtını farklı bir çekilişe karşı yeniden gönderin. Geri dönüş bekleyin. |
| Kimse sahip olduğundan fazlasını çekemez | Özellik testi: her hesap için, çekimler anapara artı kazancı asla aşmaz. |
| Para korunur | Özellik testi: kasanın token bakiyesi toplam anapara artı toplam talep edilmemiş kazanca eşittir, ve havuzun token bakiyesi açık likidite artı her şifreli devir artı teklif edilmiş ve henüz sonlandırılmamış likidite artı kapatmada alınmış ve henüz bir ödül adımıyla kayda geçmemiş hasatlara eşittir. Bu son terim, hasadı alan kapatma ile onu kademelere bölen ödül adımı arasındaki hasattır, yani hiçbir kademeye ve hiçbir çekilişe ait olmadığı andaki hali. |

## Bu tehdit modelinin kapsamadıkları

- Zincirin dışındaki her şey: cihazınız, cüzdanınızın anahtar yönetimi, kullandığınız RPC ucu, ve
  ağ düzeyindeki üst veriler.
- Getiri yerinin kendisine yapılan ekonomik saldırılar. Ana ağda, kasa riski Zama'nın
  toplayıcısının arkasındaki ERC-4626 kasasından tamamıyla devralınır.
- Biçimsel doğrulama. Hearth, çalıştırılmış saldırılar ve özellik testleriyle kendi kendini
  denetlemiştir. Üçüncü bir tarafça denetlenmedi, ve bu sayfa onun yerine geçen bir şey değil,
  dürüst ikamesidir.
