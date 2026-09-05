# Kısıtlar

Bildiğimiz bütün kısıtlar, numaralanmış halde, tek bir yerde. Diğer sayfalar bu numaralara
atıf yapıyor.

Bu sayfanın var olma sebebi basit. Bir gizlilik iddiası, ancak yazarının adını koymayı göze
aldığı dikişler kadar değerlidir. Aşağıdakilerin dışında sizi sonradan şaşırtan bir şey varsa,
bu bir keşif değil, bizim başarısızlığımızdır.

## 1. Değerlendirme parti halinde yapılır ve partilerin bir üst sınırı vardır

Kazanan testi şifreli sayılar üzerinde çalışır, ve Zama Sepolia'da tek bir işlemi 20,000,000
hesaplama birimi ve 5,000,000 ardışık derinlikle sınırlıyor. Bir tasarruf sahibinin
değerlendirilmesi bunun
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)`
kadarını harcıyor, dolayısıyla bir çağrıya şifreli iş gerektiren en fazla `4` tasarruf sahibi
sığıyor.

**Ne anlama geliyor:** çok sayıda tasarruf sahibi olan bir havuz, çekiliş başına çok sayıda
işleme ihtiyaç duyar. Maliyet tasarruf sahibi sayısıyla doğrusal büyür, ve gas olarak
değerlendirmeyi yapan kim ise onun tarafından ödenir.

**Ne anlama gelmiyor:** havuzun destekleyebileceği tasarruf sahibi sayısında bir üst sınır yok.
Bu alandaki birkaç proje katılımı 32 adresle sınırlıyor. Hearth katılımı hiç sınırlamıyor,
yalnızca tek bir işleme kaçının sığdığını sınırlıyor. `evaluate` her sayıyı kabul eder,
dolayısıyla daha küçük bir parti için yeniden dağıtım gerekmez.

## 2. İki dönemlik pencere ve süresi dolan ödüller

Bir çekilişin, onu izleyen iki dönem içinde kapatılması, ödül adımının çalıştırılması ve
değerlendirilmesi gerekir. Bu, USDC havuzunda iki saat, altı saatlik havuzlarda ise yarım gün
eder. Kapatmanın daha da sıkı bir son tarihi vardır: bu iki dönemden ikincisinin ortası, böylece
şifre çözme gidiş dönüşü ile ödül adımına her zaman en az yarım dönem kalır. Pencere kapandıktan
sonra çekiliş bitmiştir.

**Ne anlama geliyor:** değerlendirme yürüyüşünün pencere içinde ulaşamadığı bir tasarruf sahibi,
eşikleri kazandığını söylese bile o çekilişi kaybeder. Kademenin likiditesinden payına düşen
kısım kademenin devrine katlanır ve daha sonraki bir çekilişi finanse eder. Bu, PoolTogether
V5'te talep edilmemiş bir ödülün süresinin dolmasıyla aynı davranıştır, ve sistemde gerçek bir
tasarruf sahibinin sahip olabileceği bir şeyi kaybettiği tek durumdur.

**Pencere neden var:** kasanın bakiyeleri ne kadar geriye dönük hatırlaması gerektiğini sınırlar,
ki tasarruf sahibi başına saklanan üç gözlemi yeterli kılan şey budur. Tek dönemlik bir pencere
denendi ve yavaş bir relayer'a karşı fazla kırılgandı.

**Neyin azalttığı:** keeper listenin tamamını yürür, yürüyüşü uygulamadan herkes daha ileri
taşıyabilir, ve yürüyüş her çekilişte farklı bir noktadan başlar, dolayısıyla kimse kalıcı olarak
kuyruğun arkasında oturmaz.

## 3. Bir tasarruf sahibinin tutabileceği tutarın bir üst sınırı var

Tutarı ya da ortaya çıkacak anaparası
`maxPrincipal = (2^64 - 1) / periodLength` değerinin üzerinde olan yatırmalar reddedilir. Bir
saatlik dönemde bu yaklaşık 5 milyar token, diğer havuzların çalıştığı altı saatlik dönemde
yaklaşık 854 milyon, günlük bir dönemde ise yaklaşık 213 milyon olurdu.

**Ne anlama geliyor:** üst sınır gerçektir, ve ana ağda günlük bir dönemde büyük bir kurumun
ulaşabileceği bir sayıdır.

**Neden var:** buradaki şifreli değerler 64 bittir, ve bir tasarruf sahibinin biriken bakiye
saniyelerinin bunun içinde kalması gerekir. Şifreli bir taşma geri dönmez ve olduğunu kimse
görmez, dolayısıyla üst sınır kapıda uygulanır. Kontrol, ortaya çıkacak toplamın yanı sıra gelen
tutarı da sınırlar, çünkü aksi halde toplamı `2^64` sınırının ötesine sardıracak kadar büyük bir
yatırma, kontrolü geçen küçük bir sayı üretirdi.

**Ret nasıl davranır:** şifreli bir "hayır" olarak döner ve token yatırılan tutarı aynı işlemde
iade eder, dolayısıyla sınıra dayanmak bakiyenizi açık etmez.

## 4. Rezerv kademesi yok

PoolTogether V5, aşırı talep gören bir kademeyi takviye eden bir rezerv payı tutar. Hearth'te
rezerv yok. Yüzde 50 kullanım oranı tek yastıktır.

**Ne anlama geliyor:** bir kademe fonlayabileceğinden fazla ödül dağıttığında, ki bu sık kademe
için en fazla çekilişlerin kabaca yüzde 2'sinde olur, yürüyüşün en son ulaştığı tasarruf
sahipleri takviye edilmek yerine daha az alır ya da hiçbir şey almaz.

**Neden:** bir rezervin işe yaraması için sahip kontrolünde bir çekim yoluna ihtiyacı var, ve
gizli bir havuzdaki her sahip yetkisi, bir tasarruf sahibinin güvenmek zorunda kaldığı bir şey.

## 5. Büyük ödül kademesinin olasılığı tek bir dönem üzerinden ölçülür

V5, büyük ödül kademesinin olasılığını kademenin bütün birikim penceresi üzerinden ölçer. Hearth
onu, diğer her kademe gibi tek bir dönem üzerinden ölçer.

**Ne anlama geliyor:** tek bir dönem için katılan büyük bir tutucu, dolması 24 dönem süren bir
kasaya tam orantılı bir atış yapar. 24 dönemin tamamı boyunca birikim yapmış birinin o kasa
üzerinde ek bir hakkı olmaz.

**Bilinen çözüm, ertelendi:** son büyük ödül ödemesinden beri biriken bakiye saniyelerini
toplamak ve büyük ödül kademesini onunla ağırlıklandırmak. Kendi taşma analizi olan ikinci bir
biriktirici ekliyor, dolayısıyla bu, birinci sürüme kanıtlanmamış bir ekleme değil, ikinci
sürümlük bir değişikliktir.

## 6. Gizlilik üç ya da daha fazla tasarruf sahibi ister

Havuzun tam toplam zaman ağırlıklı bakiyesi asla yayımlanmaz. Her çekilişte yayımlanan şey onun
üzerindeki en küçük ikinin kuvvetidir, çünkü çekilişin üzerinde yürüyeceği herkese açık bir
ölçeğe ihtiyacı vardır.

**Yerine geçtiği sızıntı:** tam toplamı yayımlamak, tek başına hareket eden birinin yatırdığı
tutarın herkes tarafından tam olarak geri elde edilmesine imkan veriyordu. Arka arkaya iki
toplam, yatırma ve çekme olaylarının herkese açık zaman damgaları, ve aritmetik kalansız tek bir
bölme. 3 Eylül 2026'ya kadar tasarım buydu ve bir inceleme onu kırdı.

**Şimdi ne anlama geliyor:** tek bir tasarruf sahibiyle, yayımlanan aralık o kişinin ağırlığını
iki kat hata payıyla verir. İki kişiyle, her biri diğerini aynı şekilde sınırlayabilir. Üçün
altında anlamlı bir anonimlik kümesi yoktur. Arka arkaya aralıkların farkı hala alınabilir, ama
havuz bir ikinin kuvvetini geçmediyse eşittirler, dolayısıyla fark bir sayı değil bir bant verir.

**Uygulamanın yaptığı:** havuzda üçten az tasarruf sahibi olduğunda bunu söyler, o büyüklükte
doğru olmayan bir gizlilik iddiası göstermek yerine.

## 7. Token katmanı Zama'nın ve onun yetkileri geçerli

Hearth'ün varlığı bizim değil, Zama'nın gizli USDC sarmalayıcısıdır.

**Ne anlama geliyor:** sahibi, tokenden geçen her tutarın şifresini çözebilen gözlemciler
atayabilir, ve bunu **geriye dönük olarak** yapabilir, dolayısıyla zincirde zaten bulunan
tutarlar sonradan atanmış bir gözlemciye açık hale gelir. Atamayı izleyip çıkmak bir savunma
değildir. Kapsamı yatırma tutarları, çekim ödemeleri, havuzun kendi bakiyesi, ve değerlendirme
partisi başına bir ödül finansman transferidir. Sahip ayrıca bir adresi engelleyebilir, ve
sözleşme yükseltilebilirdir. 2 Eylül 2026 itibarıyla hiç gözlemci yoktu ve duraklatıcı ayarlı
değildi.

**Ulaşamadığı yer:** Hearth'ün kendi defteri. Anapara, kazanç, çekiliş başına ağırlıklar ve
çekiliş başına hesaba geçen tutarlar kasada yaşar, ve tokenin bunlar üzerinde hiçbir erişim hakkı
yoktur.

**Ürün açısından tek sonucu, ve her canlı havuz her çekilişte buna denk geliyor:** bir partinin
finansman transferi o partideki herkese geçen toplamı taşır, dolayısıyla tek kişilik bir parti,
gözlemci varsayımı altında bir tasarruf sahibinin tam ödülünü taşır. Tasarruf sahibi sayısı parti
büyüklüğünün katı olmadığında yürüyüşün son partisi tek bir kişi tutar. Yedi havuzun her biri
parti büyüklüğü 4 iken beş tasarruf sahibiyle başlatıldı (`KEEPER_BATCH`,
`packages/keeper/src/config.ts`), dolayısıyla her çekiliş tek kişilik bir partiyle biter, ve aynı
işlemdeki `Evaluated` olayı o partinin ait olduğu tasarruf sahibinin adını verir.

Yedi havuz, yedi ayrı sahibin yetkileriyle yedi ayrı sarmalayıcıdır, dolayısıyla bu hepsi için
bir kez değil, havuz havuz geçerlidir.

Hiçbir asgari parti bunu düzeltemez, çünkü `evaluate(uint32,uint256)`
(`packages/contracts/contracts/HearthVault.sol`) herkese açıktır ve parti büyüklüğünü çağırandan
alır, dolayısıyla keeper ne yaparsa yapsın herhangi bir gözlemci tek kişilik bir partiyi
zorlayabilir. Bunu kabul edilmiş bir artık olarak kayda geçiyoruz: yalnızca gözlemci varsayımı
altında ısırıyor, ve canlı `observerCount()` 0. Sözleşme tarafındaki çözüm ertelendi: çekiliş
başına tutarları biriktirip sonlandırmada tek bir finansman transferi göndermek, ya da her parti
toplamını doldurmak.

**Reddettiğimiz alternatif:** kendi gizli tokenimizi yazmak. Bu, bilinen, denetlenmiş ve Zama
tarafından işletilen bir sözleşmeyi, notunu kendimizin vereceği bir sözleşmeyle takas eder.

## 8. Çekilişler birinin işlem göndermesine bağlı

Zincir üzerinde hiçbir şey kendiliğinden ateşlenmez.

**Ne anlama geliyor:** hiçbir keeper çalışmaz ve hiçbir tasarruf sahibi işlem yapmazsa, bir
çekiliş atlanır ve o dönem hiçbir ödül ödemez. Son tarihini kaçıran bir kapatma, çekilişi mahsur
bırakmak yerine doğrudan reddedilir, ve pencereden sonra gerçekleşen bir ödül adımı hasadı yine
kayda geçirir, teklif edilen likiditeyi döndürür ve çekilişi `Skipped` işaretler.

**Ne anlama gelmiyor:** paranın risk altında olması. Atlanan bir çekiliş likiditesini kademelerde
tutar, hasat geç bir ödül adımıyla kayda geçer, ve para yatırma ile çekme boyunca etkilenmez.

**Neyin azalttığı:** her adım herkese açık ve uygulama hepsini sunuyor, dolayısıyla herhangi bir
tasarruf sahibi bir çekilişi ileri itebilir. Havuz ayrıca kapatma adımı için Chainlink'in
otomasyon arayüzünü uyguluyor, ki bu zincir dışı veriye ihtiyaç duymayan tek adım ve son tarihi
olan tek adım, ama yedi havuzun hiçbirinde kayıtlı bir upkeep yok, dolayısıyla bugün her şey
keeper'lar ve uygulamadan ibaret. Her havuzun kendi hesabında kendi keeper süreci var,
dolayısıyla duran bir keeper ya da Sepolia ETH'si biten bir hesap, o havuza çekilişlerine mal
olur ve diğer altısını çalışır halde bırakır.

## 9. Sepolia'daki getiri kazanılmış değil, sponsorlu

Her havuzun ödül parası, sabit bir hızda damlayan kendi sponsor destekli bakiyesinden gelir.

**Ne anlama geliyor:** bu gerçek getiri değil. Kimse onu borç vermekten ya da bir kasadan
kazanmıyor. Sponsorlu bakiye bittiğinde ödüller durur. Bir sponsorluk yapıldıktan sonra geri
alınamaz, ve hızı yalnızca kaynağın sahibi değiştirebilir.

**Neden:** Sepolia'da Zama'nın taklit tokenlerine getiri ödeyen bir yer yok. Aave o yatırmaları
reddediyor, Compound Circle'ın kendi USDC'sini istiyor, ve Zama'nın Sepolia kasası getiri
adaptörü olmayan, yalnızca atıl bir kasa, ki bu Zama'nın kendi tanımı.

**Bunun gerçek olan yanı:** her birim ödül parası gerçekten sarmalandı, havuza gerçekten şifreli
bir transfer olarak gönderildi, ve hesaba geçmeden önce KMS imzalı bir şifre çözmeyle gerçekten
doğrulandı. Geri dönen bir kaynak artık bir çekilişi de durdurmuyor: hasat sıfır olarak kayda
geçer, `HarvestFailed` yayılır ve kapatma başarılı olur. Paranın kaynağı bir taklit. Tesisatı
değil.

## 10. Sarmalama dikişi ve sabitlenmiş bir bakiyenin bedeli

Açık USDC'yi gizli USDC'ye çevirmek herkese açık bir transferdir, dolayısıyla tutar görünür.

**Ne anlama geliyor:** sarmalayıp hemen aynı tutarı yatıran bir tasarruf sahibi, yatırdığı tutarı
yayımlamış olur. Bunu kendi önceki dağıtımımızda ölçtük: canlı beş yatırmanın üçü, tam 100
USDC'lik herkese açık bir sarmalamadan iki ila dört blok sonra duruyordu.

**Tutarın ötesinde bedeli ne:** eşikler herkese açıktır, çünkü çekilişi kontrol edilebilir kılan
şey onlardır. Dolayısıyla izleyen birinin sabitleyebildiği bir bakiyenin, hiç şifre çözülmeden
hesaplanan, her çekilişte ve her kademede herkese açık bir sonucu vardır, ve bundan sonraki her
çekilişte de aynısı geçerlidir, çünkü kazançlar şansa hiç girmez. Gevşek bir üst sınır bile,
eşiği onun üzerinde olan her kademede kesin bir kaybı kanıtlar.

**Hearth'ün yaptığı:** sarmalama ile yatırmayı ayrı adımlar olarak tutar, sarmalama adımında size
yuvarlak bir sayı kullanmanızı söyler ki sarmalama kesin bir rakam değil bir kova olsun, yatırma
adımında uyarır, ve bir tasarruf sahibinin duran bir gizli bakiye tutmasına izin verir, böylece
bir yatırma bileşimi bilinmeyen bir birikimden çıkar.

**Hearth'ün yapamadığı:** onu kaldırmak. Açık bir tokeni gizli biçimde dönüştürmenin yolu yoktur,
ve çekilişi kontrol edilemez kılmadan bir eşiği gizli kılmanın da yolu yoktur.

## 11. Aşırı talep gören bir kademede kimin eksik alacağını yürüyüş sırası belirler

Bir kademe çekilişin ortasında tükendiğinde, yürüyüşün o anda ulaştığı tasarruf sahibi kalanı
alır ve sonrakiler o kademeden hiçbir şey almaz.

**Ne anlama geliyor:** nadir görülen aşırı talepli bir çekilişte, birinin seçmediği bir konum
yüzünden eksik ödeme alması.

**Artık ne değil:** bir kaldıraç. Önceki bir sürüm, `evaluate` çağıranın bir adres listesi
vermesine izin veriyordu, ki bu sırayı keeper'ın insafına bırakıyor ve bir tasarruf sahibinin
kuyruğun önünü satın almasına imkan veriyordu. Artık çağıran bir sayı gönderiyor, yürüyüş
çekilişin tohumundan türeyen bir noktadan başlıyor, ve başlangıç her çekilişte değişiyor.

**Neyin azalttığı:** etkilenen tasarruf sahibi bunu görebilir, çünkü o çekilişe ait ağırlığını ve
hesabına geçen tutarı kendisi çözebilir, dolayısıyla eksik bir ödeme gizemli değil,
kanıtlanabilirdir.

## 12. Çekiliş bir aralık üzerinden yürür, dolayısıyla bir kademe ödüllerinin yarısı ile tamamı arasında bir kısmını öder

Kazanan testi, toplamın kendisi yerine havuzun toplam ağırlığının üzerindeki en küçük ikinin
kuvveti olan `M` değerini kullanır. Dolayısıyla `M`, `W` ile `2W` arasında oturur.

**Ne anlama geliyor:** her tasarruf sahibinin beklenen ödül sayısı, yarım ile bir arasında bir
sayı olan `W / M` ile ölçeklenir, dolayısıyla bir kademe her çekilişte nominal `count * odds`
ödülünün yarısı ile tamamı arasında bir kısmını öder. Bir ikinin kuvvetini yeni geçmiş bir havuz,
aralığına büyüyene kadar bu aralığın alt ucundan öder.

**Ne anlama gelmiyor:** kaybolan para ya da bozulan şans. Bir kademedeki her tasarruf sahibi aynı
katsayıyla ölçeklenir, dolayısıyla kimsenin payı bir başkasına göre değişmez. Bir kademenin
ödemediği tutar şifreli devrine gider ve yeniden teklif edilir, dolayısıyla ödül büyüklükleri
nominal rakamlar ile onların iki katı arasında bir yere oturur, ve getirinin tamamı yine dışarı
çıkar.

**Neden bunu seçtik:** alternatifi tam toplamı yayımlamaktı, ki o da 6. kısıttır.

## 13. Sarmalayıcıdan gidiş dönüş yaparsanız birikmiş kazancınız herkese açık hale gelir

Sarmalamak ve sarmalamayı çözmek, token katmanında herkese açık hareketlerdir, ve tutarı
yayımlayan, iki çözme çağrısından ilkidir, dolayısıyla hiç sonlandırmadığınız bir çözme onu çoktan
sızdırmıştır.

**Ne anlama geliyor:** gizli USDC'de tek karşı tarafı Hearth olan bir adres için, herkese açık
çözülmüş toplam eksi herkese açık sarmalanmış toplam, ömür boyu çekilen kazanç için bir alt
sınırdır, ve o adres tamamen boşaldığında tam sayıya döner. Sarmalamayı yeni bir adrese çözmek
işe yaramaz, çünkü o adrese yapılan gizli transferin kendisi bağlantıyı kurar.

**Neyin azalttığı:** pozisyonunuzla ilgisi olmayan yuvarlak kupürlerde çözün, ya da geride duran
bir gizli bakiye bırakın ve asla tam bir gidiş dönüş yapmayın.

## 14. Hiç değişmeyen bir bakiye, yayımlanan ödül sayılarıyla daraltılır

Her mutabakat, bir kademenin kaç ödül ödediğini yayımlar. Her eşik herkese açık olduğu için, o
sayı "bu tasarruf sahiplerinden kaçının ağırlığı kendi yayımlanmış eşiğinin üzerindeydi"
biçiminde bir kısıttır, ve kısıtlar birikir.

**Ne anlama geliyor:** çok sayıda çekiliş boyunca bakiyesi hiç değişmeyen bir tasarruf sahibi, o
sayılarla giderek daraltılır. Para yatıran ya da çeken bir tasarruf sahibi kendi bilinmeyenini
sıfırlar.

**Hızı ne sınırlıyor:** tam sayıdan daha ince hiçbir şey ifşa edilmez, ve eşikleri bir saldırgan
seçemez, çünkü tohum yardımcı işlemcinin içinde çekilir ve ancak dönemi kapandıktan sonra açığa
çıkar.

**Bu konuda ne yaptık: hiçbir şey, ve sebebi şu.** Sözleşmede tam bunun için bir ayar düğmesi
var. `reconcileEvery[t]`, bir kademenin devrinin yayımlanmaları arasında kaç çekiliş geçtiğidir,
ve onu büyük ödül kademesinde yükseltmek, saatte bir sayı yerine günde bir sayı yayımlardı,
dolayısıyla bir büyük ödül, tek bir çekilişte uygun olan bir avuç kişiye değil gün boyunca uygun
olan herkese atfedilirdi. Adalet çalıştırması bunun bedelini gösterdi. Bir kapatma, bir kademenin
bütün açık likiditesini çekilişe taşır ve o para ancak bir mutabakatta geri gelir, dolayısıyla
24'lük bir sıklıkta büyük ödül kademesinin açık likiditesi 24 çekilişin 23'ünde tek bir çekilişin
hasat payıdır, ve ödül büyüklüğü ona göre alınır, biriken kasa ise yalnızca mutabakat çekilişinde
açığa çıkar. Para boyunca şifreli devirde oturarak teklif edilir ve kazanılabilir, ama kimse
büyük ödülün büyümesini izleyemez.

Gizli bir sayı ile görünür, biriken bir büyük ödül aynı anda olamaz, ve bu dağıtım görünür büyük
ödülü seçti. Üç kademe de `reconcileEvery = 1` ile çalışıyor, dolayısıyla yukarıdaki ölçüm kademe
başına ve çekiliş başına bir sayı hızında çalışıyor. Ayar düğmesi bir constructor argümanıdır ve
görünür kasa yerine daha yavaş ölçüme değer veren bir dağıtım onu yükseltir.

## Kısıt değil, ama açıkça söylemeye değer

- **Yedi havuzun altısı altı saatte bir çekiliş yapıyor, ve bu bir gas kararı.** Beş tasarruf
  sahibinde bir çekiliş `8,456,388` gas tutuyor, dolayısıyla saatlik yedi havuz Sepolia'da günde
  yaklaşık `1.43 ETH` harcardı, ki herkese açık faucet'ler buna yetişemez. Yalnızca ilk dağıtılan
  USDC havuzu hala saatlik çekiliş yapıyor. Her havuzun kademe olasılıkları kendi dönemine göre
  ayarlandığı için ödül ritmi her iki saatte de aynı.
- **On altı dil makine çevirisidir.** Arayüz metinleri ve çevrilmiş dokümantasyon sayfaları ana
  dili konuşanlar tarafından değil bir model tarafından yazıldı, ve profesyonel olarak
  incelenmedi. Bu sitedeki her sayı, sözleşme adı ve iddia için doğrunun kaynağı İngilizcedir, ve
  çevrilmemiş bir sayfa bir tahmine değil İngilizceye düşer.
- **Büyük bir tasarruf sahibi sık kazanır.** Şans zaman ağırlıklı bakiyeyle orantılıdır,
  dolayısıyla uzun süre çok tutan biri çok kazanır. Bu bir kusur değil, tasarımın kendisidir.
- **Ödül büyüklükleri ve ödül sayıları herkese açıktır.** PoolTogether'da da her zaman öyleydi.
  Burada gizli olan kimin kazandığıdır, havuzun ne kadar kazandığı değil.
- **Hearth üçüncü bir tarafça denetlenmedi.** Çalıştırılmış saldırılar ve özellik testleriyle
  kendi kendini denetlemiştir, ve [tehdit modeli](security/threat-model.md) onun yerine geçen bir
  şey değil, dürüst ikamesidir.
