# Gizli kalanlar

Gizlilik konusunda üç şey önemli: neyin şifreli kaldığı, çekilişin kanıtlanabilir biçimde adil
ve yatırılan paraya göre ağırlıklı olup olmadığı, ve her sızıntının adının konup konmadığı. Bu
sayfa birinciyi ve üçüncüyü cevaplıyor. Bizim duruşumuz şu: her dikişin adını kendimiz koymak,
kimsenin kontrol edemeyeceği bir iddiadan daha değerlidir.

Buradaki her şey tek bir havuz için yazıldı, ve Hearth bunlardan yedi tane çalıştırıyor, gizli
token başına bir tane. Hiçbir şeyi paylaşmıyorlar, dolayısıyla her havuzun anonimlik kümesi
kendi tasarruf sahipleridir, başkasınınkiler değil, ve üç tasarruf sahibi olan bir havuza başka
bir havuzun otuz tane olmasının hiçbir faydası yoktur.

## Tablo

| Değer | Durumu | Kim okuyabilir |
| --- | --- | --- |
| Anaparanız | Şifreli | Yalnızca siz, EIP-712 imzasıyla |
| Talep edilmemiş kazancınız | Şifreli | Yalnızca siz |
| Çekiliş başına zaman ağırlıklı ağırlığınız | Şifreli | Yalnızca siz |
| Çekiliş başına hesabınıza geçen tutar, dolayısıyla kazanıp kazanmadığınız | Şifreli | Yalnızca siz |
| Yatırdığınız tutar | Baştan sona şifreli | Yalnızca siz |
| Çektiğiniz tutar | Baştan sona şifreli | Yalnızca siz |
| **Havuzun bir döneme ait toplam ağırlığı** | **Şifreli, asla yayımlanmaz** | **Hiç kimse** |
| Mutabakatlar arasında her kademenin devri | Şifreli | Hiç kimse |
| Havuzun toplamının düştüğü aralık, bir ikinin kuvveti | Dönem bitince herkese açık | Herkes |
| Dönemde herhangi birinin bakiye tutup tutmadığı | Dönem bitince herkese açık | Herkes |
| Her çekilişin rastgele tohumu | Dönem bitince herkese açık | Herkes |
| Her çekilişte hasat edilen getiri | Dönem bitince herkese açık | Herkes |
| Her kademenin ödül büyüklüğü ve teklif ettiği açık likidite | Kapatmadan itibaren herkese açık | Herkes |
| Sık kademenin kaç ödül ödediği | Bir çekiliş sonra herkese açık | Herkes |
| Orta kademenin kaç ödül ödediği | Bir çekiliş sonra herkese açık | Herkes |
| Büyük ödül kademesinin kaç ödül ödediği | Bir çekiliş sonra herkese açık | Herkes |
| Tasarruf sahibi adreslerinin listesi | Herkese açık | Herkes |
| Ne zaman para yatırdığınız, çektiğiniz ya da değerlendirildiğiniz ve hangi partide olduğunuz | Herkese açık | Herkes |
| Karşılanmayan tutar sayacı | Sonlandırmada herkese açık | Herkes |
| Sponsorluk tutarları ve damlama hızı | Herkese açık | Herkes |
| Gizli tokene sarmaladığınız ya da ondan çözdüğünüz tutar | Herkese açık | Herkes |
| Herhangi bir adresin herhangi bir kademede aşması gereken her eşik | Herkes hesaplayabilir | Herkes |

O tabloyu okumanın iki yolu var. Sırlar sütununda tam olarak kişiye özel bilgiler var, artı
kılık değiştirmiş kişisel bilgi olduğu ortaya çıkan iki havuz geneli toplam. Herkese açık
bilgiler sütununda ise, dışarıdan birinin çekilişin dürüst olduğunu kontrol etmek için ihtiyaç
duyduğu şeyler var. Tasarım bu ayrımdır.

## İzleyen biri neyi çıkarabilir, neyi çıkaramaz

Tam bir arşiv düğümü ve sınırsız sabrı olan biri şunları kurabilir:

- Tasarruf sahiplerinin tam listesi ve her birinin işlem yaptığı tam blok.
- Her çekilişin tohumu, aralığı, hasadı ve ödül büyüklükleri, ve her kademenin ödül sayısı,
  ait olduğu çekilişten bir çekiliş sonra.
- Her adresin aşması gereken her eşik. Merdiveninizi harfiyen hesaplayabilirler.
- Havuzun gizli tokeninden toplam varlığı, şifreli bir handle olarak, ki onu okuyamazlar.

Şunları elde edemezler:

- Herhangi bir bireysel bakiyeyi, herhangi bir anda.
- Herhangi bir bireysel ağırlığı, dolayısıyla hiç kimsenin şansını.
- Herhangi bir çekilişi hangi adreslerin kazandığını ya da kime ne kadar ödendiğini.
- Havuzun tam toplam ağırlığını, yalnızca onun üzerindeki ikinin kuvvetini.

Bu iki listenin arasındaki boşluk Hearth'ün sattığı şeydir. Sayfanın geri kalanı, o boşluğun
nerede daraldığının dürüst dökümüdür.

## Kural 1: aralık ve kaldırdığımız sızıntı

3 Eylül 2026'ya kadar bu tasarım, havuzun tam toplam zaman ağırlıklı bakiyesi `W` değerini her
çekilişte yayımlıyordu, ve gerekçe onu yayımlamanın çekilişi doğrulanabilir kılan şey olduğuydu.
Bir inceleme, bu gerekçenin fazla pahalı olduğunu kanıtladı.

Sızıntı, inceleyicinin diliyle şöyle. Kapanmış herhangi bir `p` dönemi için,
`W_p = B * L + her işlem için D_i * (periodEnd(p) - t_i) toplamı`, burada `B` döneme taşınan
toplam anapara ve `D_i` her işlemin yaptığı işaretli değişimdir. `B`, `L`, `periodEnd(p)` ve
her `t_i` herkese açıktır, çünkü yatırma ve çekme olayları zaman damgalarını taşır. Yani **bir
dönemde para hareketi yapan tek kişi olan bir tasarruf sahibinin tutarı, yayımlanan iki
toplamdan ve kendi işleminin herkese açık zaman damgasından geri elde edilebilir.**
Sınırlanmaz, tam olarak geri elde edilir, kalan sıfır. Daha fazla veriyle iyileşmez, kötüleşir:
kapanan her dönem bir denklem daha, her işlem bir bilinmeyen, zincir sıfırda çapalı, ve olaylar
kimin ne zaman işlem yaptığını söylüyor, dolayısıyla iki sessiz dönem arasındaki iki hareket de
tam olarak geri elde edilir.

O sızıntı gitti, çünkü ihtiyaç duyduğu sayı artık yayımlanmıyor. Kasanın şimdi yayımladığı şey
aralıktır: `W` değerinin üzerindeki ya da ona eşit en küçük ikinin kuvveti, `M` ile yazılır.
Çekiliş başına beş şifreli karşılaştırma, `W` değerinin bir önceki çekilişin aralığına göre
nerede durduğunu izler, ve yalnızca topladıkları küçük sayının şifresi çözülür. Bir ikinin
kuvveti geçilmediği sürece arka arkaya çekilişler aynı sayıyı yayımlar, ve farkları sıfır verir.

Geriye kalan, aynı şeyin çok daha küçük bir sürümü.

- **Tek tasarruf sahibi.** Yayımlanan aralık, o kişinin ağırlığını iki kat hata payıyla verir.
- **İki tasarruf sahibi.** Her biri kendi ağırlığını çıkarıp diğerinin ağırlığını yine iki kat
  hata payıyla sınırlayabilir.
- **Üç ya da daha fazlası.** Aralıkla tutarlı her dağılım mümkündür, ve küme her yeni tasarruf
  sahibiyle büyür.

Havuzda üçten az tasarruf sahibi olduğunda uygulama bunu her ekranın üstünde söyler. Zama'nın
kendi dokümantasyonu kendi toplayıcıları hakkında aynı noktaya aynı sözlerle değiniyor: "tek
bir değerin toplamı, değerin kendisidir." Aralık, o cümlenin daha zayıf bir sürümüdür, ondan
kaçış değil.

## Kural 2: izleyen birinin sabitleyebildiği bir bakiyenin hiç çekiliş gizliliği yoktur

Sayfadaki en keskin tek cümle bu, o yüzden kendi kuralını hak ediyor.

Kazanan testi, tek bir sırrın, yani ağırlığınızın, ve onun dışında tamamen herkese açık
verilerin belirleyici bir fonksiyonudur. Eşikler tasarım gereği açıktır, çünkü çekilişi kontrol
edilebilir kılan şey onlardır. Yani **bakiyenizi sabitleyebilen herkes, hiç şifre çözmeden, her
çekilişin her kademesinde kazandığınızı ya da kaybettiğinizi hesaplar**, ve bundan sonraki her
çekiliş için de aynısını yapar, çünkü kazançlar şansa hiç girmeyen ayrı bir bakiyede durur.

Bir bakiyenin sabitlenmesinin olağan yolu 3. kuraldaki sarmalama dikişidir: açık bir tokeni
gizli haline sarmalamak herkese açık bir hareket olduğu için, sarmalayıp saniyeler sonra aynı
tutarı yatıran bir tasarruf sahibi yatırdığı tutarı yayımlamış olur. O noktadan sonra çekiliş
sonuçları herkesin yapabileceği bir aritmetiktir.

Gevşek bir sınır bile ısırır. Bakiyeniz üzerinde yalnızca bir üst sınırı olan biri, eşiği o
sınırın üzerinde olan her kademede kesin bir kaybınızı kanıtlar.

Uygulamanın bu konuda yaptığı şey: gizleme ile yatırmayı Yatır ekranının ayrı adımları olarak
tutar, ve gizleme adımında size tek bir paragrafta şunu söyler: yuvarlak bir sayı kullanın ki
bir gizleme kesin bir yatırma değil bir kova olsun, gizlemeyi kendi seçtiğiniz bir zamanda
yapın, ve bir kısmını daha sonra yatırın, böylece bir yatırma bileşimi bilinmeyen bir
birikimden çekilmiş olsun. Hiçbir sözleşme değişikliğinin yapamayacağı şey, bir eşiği gizli
kılmaktır, çünkü gizli bir eşik kontrol edilemeyen bir çekiliş demektir.

## Kural 3: sarmalama dikişi, her iki yönde

Açık bir tokeni gizli haline çevirmek herkese açık bir ERC-20 hareketidir. Tutar,
sarmalayıcının `Wrap` olayında, dayanak tokenin `Transfer` olayında, ve yardımcı işlemcinin o
açık metni şifreleme kaydında bir kez daha görünür. Açık bir tokeni gizli biçimde dönüştürmenin
yolu yoktur.

Korelasyonu kendi önceki dağıtımımızda ölçtük. Sepolia'nın 11528000 ile 11618500 arasındaki
bloklarını taradığımızda, beş yatırmanın üçü aynı adresin tam 100 USDC'lik herkese açık bir
sarmalamasından iki ila dört blok sonra duruyordu. Herkese açık kayıtları okuyan herkes o üç
yatırmayı tek bir kriptografik garantiyi bile kırmadan 100 USDC olarak fiyatlayabilirdi. Zama
aynı etkiyi kendi toplayıcıları için belgeliyor ve buna gizleme-katılım korelasyonu diyor.

Sarmalamayı çözmek de bir tutar yayımlar, ve bunu yapan iki çözme çağrısından ilkidir,
dolayısıyla hiç sonlandırılmayan bir çözme bile sızdırır. Bu, ikinci bir adlandırılmış ifşa
verir: **sarmalayıp sonra tamamının sarmalamasını çözen her adres için, birikmiş kazançlar
herkese açık bir alt sınır haline gelir.** O gizli tokendeki tek karşı tarafı Hearth olan bir
adres için, herkese açık çözülmüş toplam eksi herkese açık sarmalanmış toplam, tam olarak ömür
boyu çekilen kazançtır, o adresin hala tuttuğu anapara ve gizli bakiye düşülerek. İkisi de
gizlidir ve negatif olamaz, dolayısıyla fark her zaman bir alt sınırdır, ve adres tamamen
boşaldığında tam sayıya döner.

Sarmalamayı yeni bir adrese çözmek işe yaramaz, çünkü o adrese yapılan gizli transferin kendisi
bağlantıyı kurar.

Hearth'ün yaptığı: ayrı adımlar, Yatır ekranının gizleme adımında bir uyarı, o adımda ve Çek
ekranının "Düz USDC'ye dönüş" sekmesinde tekrar, yuvarlak bir sayı hareket ettirmenizi söyleyen
bir satır, ve geride duran bir gizli bakiye bırakma önerisi. Tutarı her halükarda siz
yazarsınız, uygulama size hazır kupürler sunmaz. Hearth'ün yapamayacağı şey: bunların hiçbirini
ortadan kaldırmak.

## Kural 4: yayımlanan ödül sayıları yavaş bir ölçümdür

Her mutabakat, bir kademenin kaç ödül ödediğini yayımlar. Her tasarruf sahibinin eşiği herkese
açık olduğu için, o sayı "bu tasarruf sahiplerinden kaçının ağırlığı kendi yayımlanmış eşiğinin
üzerindeydi" biçiminde sert bir kısıttır. Yalnızca birkaç bit taşır, ama gerçek bir ölçümdür ve
birikir.

**Çok sayıda çekiliş boyunca hiç değişmeyen bir bakiye, o sayılarla giderek daraltılır.** Para
yatıran ya da çeken bir tasarruf sahibi kendi bilinmeyenini sıfırlar ve daralmayı baştan
başlatır.

İki şey hızı sınırlar. Sayılar kabadır: tam sayıdan daha ince hiçbir şey ifşa edilmez. Ve
eşikleri bir saldırgan seçemez, çünkü tohum yardımcı işlemcinin içinde çekilir ve ancak dönemi
kapandıktan sonra açığa çıkar, dolayısıyla kimse şüphelendiği bir bakiyeye sorgu
doğrultamaz.

Üçüncü bir frenleme imkanı vardı, ve bu dağıtım ondan bilerek vazgeçti. `reconcileEvery[t]`,
bir kademenin devrinin yayımlanmaları arasında kaç çekiliş geçeceğini belirler. Onu yükseltmek,
çekiliş başına bir sayı yerine aralık başına tek bir sayı yayımlar, dolayısıyla bir büyük ödül,
o aralıkta uygun olan herkese atfedilir. Bedeli büyük ödülün kendisidir: bir kapatma, bir
kademenin bütün açık likiditesini çekilişe taşır, ve o para ancak bir mutabakatta geri gelir,
dolayısıyla 24'lük bir sıklıkta büyük ödül kademesinin açık likiditesi 24 çekilişin 23'ünde tek
bir çekilişin hasat payıdır, yayımlanan ödül ona göre boyutlandırılır, ve biriken kasa yalnızca
mutabakat çekilişinde açığa çıkar. Para bu süre boyunca şifreli devrin içinde teklif edilir ve
kazanılabilir. Kimse onu göremez.

Bu yüzden üç kademe de `reconcileEvery = 1` ile çalışıyor. Kasa herkesin gözü önünde birikiyor,
her kademenin sayısı bir çekiliş sonra herkese açık hale geliyor, ve yukarıdaki ölçüm kademe
başına ve çekiliş başına bir sayı olan tam hızında çalışıyor. Büyük ödül kademesinde bu, bir
ödemenin bir günlük tasarruf sahipleri yerine yalnızca o çekilişte uygun olan tasarruf
sahiplerini, yani havuzun kabaca yüzde dördünü işaret etmesi demek. Bu, hafifletilmiş değil ifşa
edilmiş bir artıktır, ve 14. kısıttır. Sıklık hala bir constructor argümanıdır, dolayısıyla
görünür kasa yerine daha yavaş ölçümü isteyen bir dağıtım onu alabilir.

## Kural 5: token katmanı bizim değil Zama'nın

Her havuzun varlığı Zama'nın gizli tokenlerinden biridir. Bu bilinçlidir, ve tokenin kendi
yetkilerinin Hearth üzerinden geçen paraya, havuz havuz uygulandığı anlamına gelir: yedi
sarmalayıcı, her birinde aynı yetkiler. Adlarıyla:

Sepolia sözleşmesi, yükseltilebilir bir vekil sözleşmenin arkasındaki bir
`ConfidentialWrapper`'dır, Zama'ya aittir, iki adımlı sahiplik vardır ve sahiplikten vazgeçmek
kapalıdır. 2 Eylül 2026'da doğrulanmış kaynağını okumak, gizlilik açısından önemli üç gerçek
veriyor:

1. **Gözlemciler, geriye dönük olarak.** Sahip, `addObserver(address)` çağırabilir, ki bu o
   adrese tokenin sözleşmesinin hak sahibi olduğu her handle üzerinde joker karakterli kullanıcı
   şifre çözme yetkisi verir. Bu, her yatırma tutarını, her çekim ödemesini, ve havuzun kasaya
   gönderdiği her parti başına ödül finansman tutarını kapsar. Önemli olan kelime geriye
   dönüklüktür: gelecekte herhangi bir zamanda atanan bir gözlemci, zincirde zaten bulunan
   tutarların şifresini çözebilir, dolayısıyla "`ObserverAdded` olayını izle ve çık" bir savunma
   değildir. 2 Eylül 2026'daki canlı durum: `observerCount()` 0 ve `observers()` boş.
2. **Engel listesi ve duraklatma.** Sahip bir adresi engelleyebilir, ki bu onun para
   yatırmasını, çekmesini ya da sarmalamayı çözmesini durdurur, çünkü bunların her biri o adresin
   bir tarafında olduğu bir token güncellemesidir. Bir duraklatıcı rolü var; canlıda sıfır
   adresine ayarlı, dolayısıyla duraklatma şu an devre dışı.
3. **Yükseltilebilirlik.** Uygulama sahibi tarafından değiştirilebilir, dolayısıyla tokenin
   davranışı, hak sahibi olduğu handle'ları nasıl ele aldığı da dahil, biz farkında olmadan
   değişebilir.

1. maddenin kapsamına dikkat edin. Hearth'te tasarruf sahibi başına ödül transferi yoktur,
dolayısıyla bir gözlemcinin okuyacağı kazanan başına bir ödeme de yoktur. Token katmanında
hareket eden şey, değerlendirme partisi başına havuzdan kasaya giden ve o partideki herkese
geçen toplamı taşıyan tek bir finansman transferidir. Tek kişilik bir parti, o toplamı bir
tasarruf sahibinin tam ödülü haline getirir, ve parti büyüklüğü 4 olan canlı beş kişilik havuz
her yürüyüşü tek kişilik bir partiyle bitirir. `evaluate` herkese açıktır ve parti büyüklüğünü
çağırandan alır, dolayısıyla asgari bir parti dayatılamaz. [7. kısıt](../limitations.md) bunu
kabul edilmiş bir artık olarak kayda geçiyor ve sözleşme tarafındaki çözümün adını veriyor.

Token katmanındaki bir gözlemcinin elde edemeyeceği şey Hearth'ün kendi defteridir. Anaparanız,
kazancınız, ağırlığınız ve hesabınıza geçen tutar kasanın deposunda yaşar, ve tokenin bunların
hiçbiri üzerinde erişim kontrol hakkı yoktur. Bunu önceki dağıtımda doğruladık: token adresi,
bir yatırıcının kazanç ve anapara handle'ları üzerindeki izin sorgusuna yanlış döndürürken,
yatırıcı ile havuz doğru döndürüyor.

Dolayısıyla dürüst ifade şu: Hearth'ü kullanırsanız, Zama'nın sarmalayıcısına, tıpkı her
ERC-7984 uygulamasında olduğu gibi, üzerinden geçen tutarlar için güvenirsiniz. Pozisyonunuz
için ona güvenmezsiniz.

Alternatif, kendi gizli tokenimizi yazmaktı, ki bu alandaki birkaç proje bunu yaptı. Bu, bilinen,
denetlenmiş ve Zama tarafından işletilen bir sözleşmeyi, notunu kendimizin vereceği bir
sözleşmeyle takas etmek demek. Gerçek güven sınırını belgelemeyi, daha küçük bir tane imal
etmeye tercih ederiz.

## Kural 6: değerlendirme ele vermez, ve sırayı kimse seçmez

`evaluate(drawId, count)` bir adres listesi değil, bir sayı alır. Kasa, tasarruf sahipleri
listesinde o çekilişin tohumundan türeyen bir başlangıç noktasından, liste sırasında yürür, ve
çağıran yalnızca ne kadar ilerleteceğine karar verir. Kendi sonucunu isteyen bir tasarruf
sahibi, keeper'ın ilerlettiği yürüyüşün aynısını ilerletir.

Bu aynı anda iki şeyi kapatır.

Kendi kendini değerlendirme işaretini kapatır. Önceki bir sürümde değerlendirme bir adres
listesi alıyordu, dolayısıyla bir tasarruf sahibi kendi sonucunu herkese açık girdilerden
hesaplayıp yalnızca kazandığında değerlendirilmek için para ödeyebilirdi. O işlemi göndermek,
bir talep fonksiyonu kadar yüksek sesli bir kazanan işareti olurdu. Artık yalnızca bir kazananın
göndereceği bir işlem yok.

Sıralama kaldıracını kapatır. Bir kademe aşırı talep görüp tükendiğinde, yürüyüşün en son
ulaştığı kişi eksik alır. O sıra tohumla sabitlenir, dolayısıyla kimse gas ödeyerek daha iyi bir
yer satın alamaz, ve başlangıç noktası her çekilişte değişir, dolayısıyla hiçbir adres
sistematik olarak sonda kalmaz. Adalet açısından sonucu şurada anlatılıyor:
[ödüller ve kademeler](../concepts/prizes-and-tiers.md), ve 11. kısıttır.

Bir çekilişte değerlendirilen her tasarruf sahibi, kazansın ya da kazanmasın aynı yazmaları aynı
biçimde alır, çünkü ödeme bir dallanmadan değil şifreli bir seçimden geçer. Bir tasarruf
sahibinin düştüğü parti ve o partideki yeri herkese açıktır, ve sonucu hakkında hiçbir şey
söylemez.

## Kural 7: davranıştan kalan artık

Hearth'te talep işlemi yoktur, dolayısıyla izlenecek kazanan şeklinde bir eylem de yoktur.
Kazandığınızı öğrenmek hiçbir şeye dokunmayan zincir dışı bir imzadır, ve uygulamanın tutarı
üzerinde yazan talep düğmesi, diğer her çekim gibi görünen sıradan bir çekim gönderir.

Artık olan şey, sonrasında ne yaptığınızdır. Kazandığı her çekilişten hemen sonra parasını
çeken ve başka hiçbir zaman çekmeyen bir tasarruf sahibi, zamanla izleyen birine istatistiksel
bir ipucu verir. Bu zayıftır, oluşması çok sayıda çekiliş alır, ve tamamen tasarruf sahibinin
kontrolündedir. Çözümü kriptografik değil davranışsaldır: kendi takviminize göre çekin ya da
kazançların birikmesine izin verin.

Bunu söylüyoruz çünkü alternatifi, yani zincir üstü davranışın hiçbir şey ele vermediğini iddia
etmek, bu türden her tasarımda yanlıştır. Bu alanda talep fonksiyonunu kaldıran projeler aynı
sonuca vardı ve bunu yazdı. Biz de yazıyoruz.

## Bu sayfanın kapsamadıkları

Saldırganları ve amaçlarını kapsamaz, o şurada: [tehdit modeli](threat-model.md). Bir çekilişi
kendiniz nasıl kontrol edeceğinizi de kapsamaz, o şurada:
[rastgelelik ve doğrulama](randomness-and-verification.md). Ve ağ düzeyinde gizlilik hakkında
hiçbir iddiada bulunmaz: bağlandığınız IP adresi, kullandığınız RPC sağlayıcısı ve gönderdiğiniz
relayer isteği zincirin dışındadır ve bu analizin dışındadır.
