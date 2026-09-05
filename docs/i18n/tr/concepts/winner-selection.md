# Kazananın belirlenmesi

Ürünün kalbi burasıdır: kimsenin okuyamadığı sayılar üzerinden, bir yabancının yine de
kontrol edebileceği şekilde kimin kazandığına karar vermek.

**Önemli olan cümle şu: kazanan, çekiliş anında belirlenir, ve değerlendirme onu yalnızca
yazıya döker.** Havuz rastgele tohumu ve havuzun toplamının düştüğü aralığı doğruladığı anda,
her tasarruf sahibinin her kademedeki sonucu çoktan bellidir. Eşikler herkesin yeniden
hesaplayabileceği açık sayılardır, ve karşılaştırıldıkları şifreli ağırlık artık değişemez.
Değerlendirme kayıt tutmaktır. Yönlendirilemez, önden işlemle geçilemez, ya da kimin
kazandığını değiştirecek şekilde atlanamaz.

## Bir çekilişin ödül adımında ne sabitlenir

| Sembol | Nedir | Herkese açık mı? |
| --- | --- | --- |
| `R` | Bu çekilişin rastgele tohumu | Evet, dönem bittikten sonra |
| `M` | Havuzun toplam ağırlığının düştüğü aralık, bir ikinin kuvveti | Evet, dönem bittikten sonra |
| `prize[t]` | `t` kademesindeki bir ödülün ödediği tutar | Evet, kapatmada sabitlenir |
| `offered[t]` | `t` kademesinin bu çekiliş için ortaya koyduğu likidite | Evet, kapatmada sabitlenir |
| `count[t]` | `t` kademesinin çekiliş başına kaç ödül teklif ettiği | Evet, dağıtımda sabitlenir |
| `odds[t]` | `t` kademesinin ne sıklıkla ateşlendiği, kesir olarak | Evet, dağıtımda sabitlenir |
| `W` | Havuzun döneme ait toplam zaman ağırlıklı bakiyesi | **Hayır. Asla yayımlanmaz** |
| `twab` | Bir tasarruf sahibinin döneme ait zaman ağırlıklı bakiyesi | Hayır, şifreli, yalnızca o kişi okuyabilir |

Son iki satır sırlardır. `twab` kişiye özeldir. `W` bütün `twab` değerlerinin toplamıdır, ve
saklı tutulur çünkü onu tam olarak yayımlamak, izleyen birine tek başına hareket eden birinin
yatırdığı tutarı çıkarma yoluyla geri elde etme imkanı verir. Çekilişin bunun yerine üzerinde
yürüdüğü şey `M`'dir: `W` değerinin üzerindeki ya da ona eşit en küçük ikinin kuvveti. Yani
`M`, `W` ile `2W` arasında bir yerdedir, ve izleyen birinin bir çekilişten diğerine
öğrendiği tek şey, havuzun bir ikinin kuvvetini geçip geçmediğidir.

## PoolTogether'ın kuralı ve bizimki

PoolTogether V5, her tasarruf sahibine `t` kademesinde `count[t]` bağımsız şans verir. Her
şans, `min(1, twab * odds[t] / W)` olasılığıyla kazanılır. Yani bir tasarruf sahibinin bir
kademedeki beklenen ödül sayısı, havuzdaki payının kademenin olasılığıyla ve ödül sayısıyla
çarpımıdır.

Bunu şifreli sayılar üzerinde harfiyen yapmak, tasarruf sahibi başına ve ödül başına yeni bir
rastgele sayı çekmek anlamına gelirdi, ve tam `W` değerine ihtiyaç duyardı. Hearth aynı
şekli, tasarruf sahibi başına ve kademe başına tek bir düzgün dağılımlı rastgele sayı, iç içe
eşiklerden oluşan bir merdiven, ve `W` yerine `M` ile yeniden üretir.

`z = twab * odds[t] * count[t] / M` diye yazın. Bu, tasarruf sahibinin bu kademede
kazanmayı beklediği ödül sayısıdır. Hearth ona `count[t]` ile sınırlı olmak üzere `floor(z)`
ya da `ceil(z)` ödül öder, ve çok sayıda çekilişteki ortalama tam olarak `z` olur.

Payda `W` değil `M` olduğu için, her tasarruf sahibinin beklentisi yarım ile bir arasında bir
sayı olan `W / M` ile ölçeklenir. Tasarruf sahiplerini toplayın: bir kademe çekiliş başına
nominal `count * odds` ödülünün yarısı ile tamamı arasında bir kısmını öder. Bununla hiçbir
şey kaybolmaz. Bir kademenin ödemediği şey şifreli devrinde kalır ve bir sonraki kapatmada
yeniden teklif edilir, dolayısıyla zaman içinde getirinin tamamı yine dışarı çıkar. Ödül
büyüklükleri sadece daha yüksekte oturur. Bakınız:
[ödüller ve kademeler](prizes-and-tiers.md).

## Test, adım adım

`p` çekilişinin `t` kademesindeki bir `u` tasarruf sahibi için:

1. Bu kademe için rastgele sayısını türetin. `prn = keccak256(R, p, u, t)`. Tasarruf
   sahibinin adresi ve kademe indeksi hash'e girdiği için, her tasarruf sahibi kendi sayısını
   alır ve her kademe farklı bir sayı alır, hepsi tek bir `R` tohumundan.
2. Onu aralığa indirgeyin. `r = prn mod M`, `0` ile `M - 1` arasında bir tam sayı. `M` bir
   ikinin kuvvetidir, dolayısıyla bu, 256 bitlik bir hash'in ikinin kuvvetine bölümünden
   kalandır, ki bu tam olarak düzgün dağılımlıdır ve düzeltilecek bir sapma bırakmaz. Bu,
   açık değerler üzerinde açık bir aritmetiktir.
3. Merdiveni kurun. `0` ile `count[t] - 1` arasındaki her `k` ödülü için:
   `threshold_k = floor((r + k * M) * oddsDen[t] / (oddsNum[t] * count[t]))`.
   Bunlar açık sayılardır. Herkes bunları herhangi bir adres için hesaplayabilir, ve sözleşme
   aynı aritmetiği `thresholdOf(drawId, saver, tier, k)` adlı bir view olarak sunar, böylece
   uygulamanın doğrulama paneli, testler ve dışarıdaki her kontrolcü tek bir uygulamayı
   kullanır.
4. Karşılaştırın. `k` ödülü, tasarruf sahibinin şifreli ağırlığı `threshold_k` değerinden
   büyük olduğunda kazanılır. Bir sırra dokunan tek adım budur, ve bu, sonucu kimsenin
   okuyamadığı şifreli bir doğru ya da yanlış olan şifreli bir karşılaştırmadır.
5. Ödeyin. Kazanılan her ödül, tasarruf sahibinin bu kademeye ait şifreli ödemesine
   `prize[t]` ekler, bunu bir if ifadesiyle değil şifreli bir seçimle yapar, dolayısıyla
   işlem, kişi hiçbir şey kazanmamış da olsa her şeyi kazanmış da olsa aynı görünür.
6. Kırpın. Kademenin bu tasarruf sahibine ödemesi, kazandığı tutar ile kademede kalanın
   küçüğüdür. Bu çıkarma, kademenin şifreli kalan likiditesini günceller.
7. Hesaba geçirin. Kırpılmış tutar, tasarruf sahibinin şifreli kazancına eklenir.

Eşikler `k` ile birlikte yükselir, dolayısıyla bir tasarruf sahibi bir `j` değeri için `0`
ile `j-1` arasındaki ödülleri kazanır ve sonra durur. `k` ödülünün koşulu tam olarak şudur:
`twab * odds * count > r + k * M`.

### Tek açık dallanma

Bir eşik `2^64 - 1` değerinden büyükse, hiçbir 64 bitlik ağırlık onu aşamaz, dolayısıyla
cevap yanlıştır ve karşılaştırma tamamen atlanır. Bu, `M` çok büyük olduğunda düşük olasılıklı
bir kademede olur. Eşikler yalnızca `k` ile yükseldiğine göre, kademenin döngüsü geri kalanı
kontrol etmek yerine böyle bir ilk eşikte durur. Dallanma açık bir sayı üzerindedir. Hearth'te
hiçbir şey asla bir sır üzerinde dallanmaz.

## İşlenmiş örnek: üç tasarruf sahibi, bir kademe

Sayılar okunabilir kalsın diye minik bir havuz. Tek kademe: sık kademe, `count = 4`,
`odds = 1` (yani `oddsNum = 1`, `oddsDen = 1`). Ağırlıklar, o havuzun tuttuğu token her ne ise
onun bakiye saniyeleri cinsindendir. Örnek bunları USDC olarak okuyor.

| Tasarruf sahibi | Ağırlık | `W` içindeki payı | `z = ağırlık * 4 / M` |
| --- | --- | --- | --- |
| Ada | 600 | %60 | 2.34 |
| Ben | 300 | %30 | 1.17 |
| Cy | 100 | %10 | 0.39 |
| **Toplam `W`** | **1,000** | %100 | **3.91** |

`W` 1,000'dir, dolayısıyla aralık `M = 1,024` olur, yani onun üzerindeki ya da ona eşit en
küçük ikinin kuvveti. Havuzun dışındaki kimse 1,000'i görmez. 1,024'ü görür.

Toplam sütununa dikkat edin. Kademenin nominal ödemesi çekiliş başına `count * odds = 4`
ödüldür. Gerçekte ödemeyi beklediği ise `4 * W / M = 4 * 1000 / 1024 = 3.91` ödüldür. `W / M`
ölçeklemesi budur, ve burada yüzde 2.3'lük bir kesintidir, çünkü 1,000 kendi aralığının üst
ucuna yakın oturuyor. 520'lik bir havuz aynı aralığın alt ucuna yakın otururdu ve kademe
bunun yerine yaklaşık 2.03 ödül beklerdi.

Şimdi çekiliş oluyor. Her tasarruf sahibinin `r` değeri, tohumun kendi adresiyle
hash'lenmesinden gelir, dolayısıyla her biri için farklı bir sayıdır, ve 0 ile 1,023 arasına
düşer.

**Ada, `r = 271`.** Eşikler `floor((271 + k * 1024) / 4)`:

| k | Eşik | Ada'nın 600 ağırlığı bunu aşıyor mu? |
| --- | --- | --- |
| 0 | 67 | Evet |
| 1 | 323 | Evet |
| 2 | 579 | Evet |
| 3 | 835 | Hayır |

Ada 3 ödül kazanır. Beklentisi 2.34'tü, dolayısıyla 3, `floor` ya da `ceil` seçeneğinin
yüksek tarafı.

**Ben, `r = 812`.** Eşikler `floor((812 + k * 1024) / 4)`:

| k | Eşik | Ben'in 300 ağırlığı bunu aşıyor mu? |
| --- | --- | --- |
| 0 | 203 | Evet |
| 1 | 459 | Hayır |

Ben 1.17 beklentiye karşılık 1 ödül kazanır.

**Cy, `r = 155`.** Eşikler `floor((155 + k * 1024) / 4)`:

| k | Eşik | Cy'nin 100 ağırlığı bunu aşıyor mu? |
| --- | --- | --- |
| 0 | 38 | Evet |
| 1 | 294 | Hayır |

Cy 1 ödül kazanır. Beklentisi 0.39'du, dolayısıyla bu onun şanslı günü. Çok sayıda çekiliş
boyunca zamanın yaklaşık yüzde 39'unda bir ödül kazanır, geri kalanında hiçbir şey.

3.91 beklenirken beş ödül dağıtıldı. Bu sorun değil: her ödül kademenin likiditesinin sekizde
biridir, dolayısıyla kademe kuruyana kadar sekiz ödül ödeyebilir. Bakınız:
[aşırı talep](prizes-and-tiers.md).

Şimdi bütün bunların sonunda izleyen birinin ne gördüğüne dikkat edin. Üç tabloyu da kendisi
hesaplayabilir, çünkü `R`, `M`, eşikler ve adresler herkese açıktır. Yapamadığı şey sağdaki
sütunu doldurmaktır, çünkü ağırlıklar şifrelidir, ve 1,000'i de geri elde edemez, çünkü
yalnızca 1,024 yayımlandı. Kademe bir çekiliş sonra mutabakat yaptığında kaç ödül ödediğini
öğrenir. Kime ödediğini asla öğrenmez.

## Cüzdanınızı bölmek neden hiçbir şey kazandırmaz

Kötü kurulmuş bir sürümün kaybettiği özellik budur.

Bir tasarruf sahibinin bir kademedeki beklenen ödülü `z = twab * odds * count / M`'dir, ki bu
ağırlığında doğrusaldır, ve `M`, havuzun ağırlığının adresler arasında nasıl bölündüğüne
bağlı değildir. 600'lük bir ağırlığı 300'lük iki cüzdana bölün, her biri `z = 1.17` alır,
toplam 2.34. Tam olarak aynı. 100'lük altı cüzdana bölün, her biri 0.39 alır, toplam yine
2.34. Yine tam olarak aynı. Oynanacak bir eşik ve toplanacak bir yuvarlama yok, yalnızca daha
fazla gas ödemesi var.

Bu tasarımın önceki bir sürümü, ödül sayısını tek bir daha geniş kazanma bölgesine katlıyordu,
böylece her tasarruf sahibi kademe başına en fazla bir ödül kazanabiliyordu. Bu, büyük
tutanları hak ettikleri payın altında sınırlıyor ve insanlara bölünmenin karşılığını
ödüyordu. Bir tasarım incelemesi bunu yakaladı ve yerine iç içe merdiven geldi.

## Maliyeti ne

Tasarruf sahibi başına ve çekiliş başına şifreli iş şudur: ağırlığı hesaplamak için bir çarpma
ve bir toplama, sonra her kademede ödül başına bir karşılaştırma ve bir seçim, artı bir kırpma.
Sepolia'daki üç kademeyle bu, 6 karşılaştırma, 6 seçim ve bir düzine kadar toplama, çıkarma ve
minimum demektir.

Zama, Sepolia'da işlem başına bütçeyi toplam 20,000,000 hesaplama birimi ve 5,000,000 ardışık
derinlik olarak yayımlıyor, ve 64 bitlik bir toplamayı 162,000, bir karşılaştırmayı yaklaşık
118,000, bir seçimi 55,000 ve açık bir sayıyla çarpmayı 365,000 olarak fiyatlıyor. Bu sayılar
tek bir tasarruf sahibini birkaç milyon hesaplama birimine oturtuyor, ve değerlendirmenin
işlem başına `4` tasarruf sahibi olarak parti halinde yapılmasının sebebi bu. Ölçülen rakam
tasarruf sahibi başına
`3,674,128 on the mock coprocessor's price table (the live coprocessor does not report compute units in a receipt)`
ve ölçülen gas
`708,836 (the marginal cost of one more saver in a batch; a batch of one costs 1,291,192)`.

## Bu sayfanın kapsamadıkları

`R` değerinin nereden geldiğini ya da nasıl doğrulanacağını kapsamaz, o şurada:
[rastgelelik ve doğrulama](../security/randomness-and-verification.md). `prize[t]` değerinin
nasıl boyutlandırıldığını ya da bir kademenin çekilişin ortasında tükenmesi durumunda ne
olduğunu da kapsamaz, o şurada: [ödüller ve kademeler](prizes-and-tiers.md). Ve kimin
katıldığını gizlediğine dair hiçbir iddiada bulunmaz: tasarruf sahipleri listesi,
değerlendirme partileri ve kademe başına ödül sayıları herkese açıktır. Bakınız:
[gizli kalanlar](../security/what-stays-private.md).
