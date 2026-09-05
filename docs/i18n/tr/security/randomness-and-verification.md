# Rastgelelik ve doğrulama

Bir çekiliş, ancak bir yabancı onu kontrol edebiliyorsa bir değer taşır. Bu sayfa bunun
nasıl yapıldığını anlatıyor.

## Tohum nereden geliyor

Bir çekilişi kapatan işlemin içinde, tek bir çağrı:

```solidity
euint64 seed = FHE.randEuint64();
```

Bu, Zama'nın yardımcı işlemcisi içinde çalışır. Sayı, ağın FHE anahtarı altında kriptografik
olarak güvenli bir üreteç tarafından üretilir, ve sözleşmeye geri gelen şey bir sayı değil,
şifreli bir handle'dır. O anda değeri kimse görmemiştir: çağıran da, biz de, madenci de.

Zama'nın üretecinin iki özelliği burada önemli, ve ikisi de Zama'nın kendi dokümantasyonunda
belirtiliyor:

- **Bir işlemin içinde çalışmak zorundadır.** Rastgele bir değer üretmek zincir üstü üreteç
  durumunu değiştirir, dolayısıyla bir çağrıyı simüle etmenin salt okunur yolu olan `eth_call`
  ile yapılamaz. Kimse kazanıp kazanmayacağını görmek için bir çekilişi zincir dışında
  önizleyemez.
- **Kriptografik olarak güvenlidir ve şifreli kalır**, ta ki bir şey onu açıkça çözülebilir
  kılana kadar.

## Neden kimse onu yeniden atamaz ya da kazandırdığı tutarı değiştiremez

Dört şey, birlikte.

1. **Kapatma bir kez başarılı olur.** Çekilişin durum makinesi `closeDraw(p)` çağrısına çekiliş
   başına tam olarak bir kez izin verir. Daha iyi bir sayı satın almak için ikinci bir deneme
   yoktur.
2. **Çekildiğinde değeri bilinmez.** Tohum oluşturulduğu anda şifreli veri olduğu için,
   kapatma işlemini kim gönderirse göndersin, göndermiş olmaktan hiçbir şey öğrenmez. Çağıran
   olmak için yarışmanın anlamı yoktur.
3. **Yayımlama adımı tek yönlüdür.** Kapatmadan sonra tohum, genel olarak şifresi çözülebilir
   işaretlenir. O bayrak, Zama'nın erişim kontrol listesinde kalıcı ve geri alınamazdır,
   dolayısıyla dünyanın gördüğü sayı, sözleşmenin taahhüt ettiği sayıdır, sonradan seçilmiş bir
   sayı değil.
4. **Ödüller tohum var olmadan sabitlenir.** Her kademenin ödül büyüklüğü ve teklif ettiği
   likidite, aynı kapatma işleminin en başında, `randEuint64` çağrılmadan önce hesaplanır.
   Önceki bir taslakta bunlar daha sonra, ödül adımında belirleniyordu, ki bu birinin tohumu
   okuyup kazandığını anlayıp sonra o kazancı daha değerli kılmak için kademeler arasında
   likidite taşıyabileceği bir pencere bırakıyordu. O pencere kapandı.

Bunu alternatif tasarımlarla karşılaştırın. Blok hash'iyle beslenen bir çekiliş, sonucu
beğenmeyen bir doğrulayıcı tarafından yeniden atılabilir. Zincir dışı bir sayıyla beslenen bir
çekiliş ise doğrudan seçilebilir. Burada ikisi de mümkün değil, ve rastgeleliğin zincir dışı bir
üreteçle değil, zincir üzerinde ve şifre altında üretilmesinin bütün sebebi budur.

## Ne zaman ne herkese açık hale geliyor

| Değer | Ne zaman yayımlanır | Neden herkese açık olmak zorunda |
| --- | --- | --- |
| Tohum `R` | Kapatmada, relayer şifresini çözdükten sonra okunabilir | O olmadan kimse bir eşiği yeniden hesaplayamaz |
| Ölçek sayısı, ondan da `M` aralığı çıkar | Kapatmada | Eşikler havuzun büyüklüğüne görecelidir |
| Dönemin boş olup olmadığı | Kapatmada | Boş bir çekilişi gerçek bir çekilişten ayırır |
| Çekilişin hasadı | Kapatmada | Sonraki ödülleri finanse eden paradır |
| Her kademenin ödül büyüklüğü ve teklif ettiği açık likidite | Kapatmada | Bir kazancın ne ödediğini kontrol etmek için gerekir |
| Her kademenin devri | Her çekilişin sonlandırmasında, çünkü her kademe her çekilişte mutabakat yapar | Kademenin kaç ödül ödediğini kontrol etmek için gerekir |
| Karşılanmayan tutar sayacı | Sonlandırmada | Havuzun, kasanın yazdığı her tutarı fonladığını kanıtlar |

İki şey bilerek o listede **yok**. Havuzun tam toplam zaman ağırlıklı bakiyesi asla yayımlanmaz,
çünkü bunu yapmak izleyen birinin tek başına hareket eden birinin yatırdığı tutarı tam olarak
geri elde etmesine imkan veriyordu. Onun yerine üzerindeki aralık yayımlanır. Ve tasarruf sahibi
başına hiçbir değer asla genel olarak şifresi çözülebilir işaretlenmez.

Listedeki her şey, karar verdiği dönem çoktan bittikten sonra gelir. `R` değerini yayımlamak
kimsenin bir ağırlığı değiştirmesine yardım edemez, çünkü `p` dönemine ait ağırlıklar `p` dönemi
biter bitmez donar, ki bu çekilişin kapatılabilmesinden bile öncedir.

Bu sayıların her biri sözleşmeye Zama'nın anahtar yönetim servisinin imzasıyla ulaşır, ve zincir
üzerinde `FHE.checkSignatures` ile doğrulanır. Kanıt, handle'lara sabit bir sırada bağlıdır:
ödül adımında `[seed, scaleCount, nonEmpty, harvested]`, ve mutabakat başına bir devir handle'ı.
Hiçbir şey yuvalar arasında karıştırılamaz ya da başka bir çekilişe tekrar oynatılamaz.
Çekilişin durum makinesi, tekrar oynatmaya karşı koruyucudur: her adım çekiliş başına bir kez,
mutabakat ise kademe başına bir kez başarılı olur.

## Aralık ve kasa onu nasıl takip ediyor

Havuzun bir döneme ait toplam zaman ağırlıklı bakiyesi `W` şifreli kalır. Çekilişin üzerinde
yürüdüğü sayı `M = 2^m`'dir, yani `W` değerinin üzerindeki ya da ona eşit en küçük ikinin
kuvveti.

Kasa `m` değerini sıfırdan hesaplamak yerine çekilişten çekilişe takip eder. Her kapatmada `W`
değerini şifre altında bir önceki çekilişin `m` değerinin etrafındaki beş ikinin kuvvetiyle
karşılaştırır, beş sonucu tek bir küçük şifreli sayıda toplar, ve o sayıyı genel olarak şifresi
çözülebilir işaretler. Havuz doğrulanmış sayıyı okur ve yeni `m` değerini bulur, ki bu çekiliş
başına en fazla üç basamak hareket edebilir. 1'e karşı ayrı bir şifreli karşılaştırma da boş
olmama bayrağını verir.

Dolayısıyla çekiliş başına herkese açık kayıt tek bir küçük tam sayıdır, ve yalnızca havuz bir
ikinin kuvvetini geçtiğinde değişir. Havuz üzerindeki `scaleBits()` güncel `m` değerini okur.
Dağıtım onu `initialScaleBits` ile, yani ilk dönemin toplamının beklenen bit uzunluğuyla
başlatır, ve takipçi her hatayı çekiliş başına en fazla üç bit olarak düzeltir.

## Bir eşiği herkes nasıl yeniden hesaplar

Aşağıdakilerin tamamı yalnızca herkese açık veri kullanır. Cüzdan yok, imza yok, izin yok.

`p` çekilişi, `u` tasarruf sahibi adresi, `count[t]` ödülü ve `oddsNum[t] / oddsDen[t]` olasılığı
olan `t` kademesi için:

```
prn         = keccak256(abi.encode(R, p, u, t))
r           = prn mod M                                        // 0 <= r < M
threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))
```

`0` ile `count[t] - 1` arasındaki her `k` için. O tasarruf sahibi `k` ödülünü, ancak ve ancak `p`
dönemine ait zaman ağırlıklı ağırlığı `threshold_k` değerinden kesin olarak büyükse kazanmıştır.

Bunu yeniden yazmanız gerekmiyor. Kasa `thresholdOf(drawId, saver, tier, k)` fonksiyonunu,
değerlendirmenin kullandığı aritmetiğin aynısı üzerinde saf bir view olarak sunar, dolayısıyla
uygulamanın doğrulama paneli, test paketi ve blok gezgini olan herkes aynı uygulamayı okur.
Sözleşmeyi kendi kodunuza karşı kontrol etmeyi tercih ederseniz, onu zincir dışında yeniden
yazmak dört satırlık büyük tam sayı aritmetiğidir.

Küçük sayılarla işlenmiş bir örnek burada:
[kazananın belirlenmesi](../concepts/winner-selection.md). Gerçek bir Sepolia çekilişinden
doldurulmuş bir örnek de burada, ödül havuzu `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` olan
`usdc` havuzundan alındı. Her havuz kendi çekilişleri için aynı alanları yayımlar:

| Alan | Değer |
| --- | --- |
| Çekiliş | `2, the period from 23:00 to 00:00 UTC on 2 September 2026` |
| Tohum `R` | `5625525180683981523` |
| Aralık `M` | `2^43, which is 8,796,093,022,208 balance-seconds` |
| Hasat | `19.531380 USDC` |
| Kademe ödül büyüklükleri | `3.559644 / 1.779822 / 0.889911 USDC, grand / mid / frequent` |
| Kademe başına ödenen ödüller | `0 / 0 / 5, against a funded capacity of 2 / 2 / 8` |

Zincirden okundu: tohum ve aralık havuzun `DrawAwarded` olayından, ödül büyüklükleri ve teklif
edilen likidite `drawParams(2)` çağrısından, ödenen ödüller ise o çekilişe ait üç
`TierReconciled` olayından geliyor, çünkü bir kademenin teklif edip ödemediği tutar, tam olarak
yayımladığı devirdir. Bu çekilişte büyük ödül ve orta kademeler hiçbir şey ödemedi ve bütün
tekliflerini geri verdi, ki 24'te 1 ve 6'da 1 olan kademelerin çoğu zaman yaptığı budur.

Uygulamanın doğrulama paneli bu aritmetiği, yazdığınız her adres için tarayıcıda yapar,
istediğiniz havuz için `/verify?pool=<slug>` adresinde. Ayrıcalıklı hiçbir erişimi yoktur: aynı
herkese açık girdiler ve aynı formüldür.

## Kalan neden sapmasız

Büyük bir rastgele sayıyı düz bir kalanla bir aralığa indirgemek genelde sapmalıdır. `2^256`,
aralığın tam katı değilse, düşük kalanlar biraz daha sık çıkar, ve o sapma tasarruf sahiplerine
eşitsiz düşer. PoolTogether V5 bunu reddetme örneklemesiyle çözer, ve Hearth'ün önceki bir
taslağı da öyle yapıyordu.

Hearth'ün artık buna ihtiyacı yok. `M` kuruluşu gereği bir ikinin kuvvetidir, ve `2^256`,
`2^256` değerine kadar her ikinin kuvvetinin tam katıdır. Dolayısıyla `prn mod M` yalnızca 256
bitlik bir hash'in düşük `m` bitidir, ve `0` ile `M - 1` arasındaki her değer tam olarak aynı
sayıda girdiden gelir. **Sapma küçük değil, sıfırdır**, döngü yok, reddetme yok, ve bir
doğrulayıcının dikkatle yeniden üretmesi gereken bir şey yok.

Bu, tam toplam yerine aralığı yayımlamanın bir yan faydasıdır, ve söylemeye değer, çünkü
çekilişi kontrol eden herkesin başka türlü birebir eşleştirmek zorunda kalacağı bir kod parçasını
ortadan kaldırıyor.

## Adres üretip deneme işe yaramaz

`R` herkese açık hale geldikten sonra, biri düşük eşikli bir adres bulana kadar adres
üretebilir. Bu işe yaramaz. Eşikler `p` dönemine ait bir ağırlıkla karşılaştırılır, ve yepyeni
bir adresin `p` döneminde ya da öncesinde hiç gözlemi yoktur, dolayısıyla ağırlığı sıfırdır.
Sıfır hiçbir eşiği aşamaz. `p` döneminde ağırlığınız olması için `p` dönemi boyunca bakiye
tutmuş olmanız gerekirdi, ki o dönem `R` var olmadan önce bitmişti.

Gelecekteki bir çekiliş için üretmek başka bir sebeple başarısız olur: o çekilişin tohumu henüz
üretilmemiştir ve tahmin edilemez.

## Doğrulama neyi kanıtlar, neyi kanıtlamaz

Bu konuda kesin olmak sayfanın asıl amacı.

**Kanıtladıkları:**

- Tohumun zincir üzerinde, bir işlemin içinde, ağ anahtarı altında üretildiği ve tam olarak bir
  kez yayımlandığı.
- Ödül büyüklüklerinin ve teklif edilen likiditenin o tohum var olmadan sabitlendiği.
- Her tasarruf sahibine uygulanan kuralın herkese açık, tek biçimli ve herkes tarafından yeniden
  hesaplanabilir olduğu.
- Ödül büyüklüklerinin kademe likiditesinden ve kademe parametrelerinden herkese açık bir
  aritmetikle çıktığı.
- Her kademenin ödediği ödül sayısının, kademenin teklif ettiği tutar eksi devrinde geri gelen
  tutarla uyuştuğu.
- Havuzun, kasanın yazdığı her tutarı fonladığı, çünkü karşılanmayan tutar sayacı yayımlanıyor
  ve sıfır.

**Kanıtlamadıkları:**

- Yardımcı işlemcinin üretecinin düzgün dağılımlı olduğu. O Zama'nın motoru, ve burada
  doğrulanmıyor, ona güveniliyor.
- Anahtar yönetim servisinin, tohum handle'ının gerçek karşılığını imzaladığı. Sözleşme imzayı
  kontrol eder, anlamı değil. Dürüst olmayan bir kurul seçtiği bir değeri imzalayabilirdi. Bu
  protokoldeki her uygulama bu varsayımı paylaşır. Bu, [tehdit modelindeki](threat-model.md) 8.
  saldırgandır.
- Yayımlanan aralığın gerçekten her tasarruf sahibinin ağırlığının toplamının aralığı olduğu.
  Dışarıdan biri şifreli ağırlıkları toplayamaz, ve artık toplamı da göremez. Bunun yerine
  ellerinde olan şey şu: aynı herkese açık ve değiştirilemez kod, karşılaştırmaları ve her
  tasarruf sahibinin ağırlığını aynı gözlemlerden hesapladı, ve korunum değişmezleri geçerli:
  ödenen, hesaba geçenle eşit, ve kimse anapara artı kazançtan fazlasını çekmiyor.
- Kimin kazandığına dair hiçbir şey. Bütün mesele bu, ve daha fazlasını yayımlamanın doğrulamayı
  güçlendirip ürünü kötüleştirmesinin sebebi de bu. Somut örnek tam toplamı yayımlamaktır:
  havuzun büyüklüğünü kontrol edilebilir kıldı, ve aynı zamanda tek başına hareket eden birinin
  yatırdığı tutarı temel birimine kadar geri elde edilebilir hale getirdi.

## Bir tasarruf sahibinin, başkasının kontrol edemediği neyi kontrol edebileceği

Bir tasarruf sahibi dışarıdan birinden bir adım öteye gidebilir, çünkü bir çekiliş için kendi
ağırlığının ve hesabına geçen tutarın şifresini çözebilir.

1. `p` çekilişine ait ağırlığınızı açığa çıkarın.
2. Kendi eşiklerinizi herkese açık `R` ve `M` değerlerinden yeniden hesaplayın, ya da
   `thresholdOf` fonksiyonundan okuyun.
3. Kaçını aştığınızı sayın, kademenin ödül büyüklüğüyle çarpın.
4. `p` çekilişinde hesabınıza geçen tutarı açığa çıkarın ve uyuştuğunu kontrol edin.

Uyuşmuyorsa, ya yürüyüş size ulaşmadan bir kademe tükenmiştir, ki bu belgelenmiş kırpmadır, ya
da bir şeyler yanlıştır ve bunu kanıtlayacak sayılar elinizdedir. Uygulama dört adımı da sizin
için yapar ve aritmetiği gösterir.
