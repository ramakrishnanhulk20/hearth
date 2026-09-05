# SSS

## 1. Hangi tokende birikim yapabilirim?

Yedi tanesinde: USDC, USDT, WETH, BRON, ZAMA, tGBP ve XAUt. Hepsi Zama'nın Sepolia
üzerindeki kendi gizli tokenleri. Her biri kendi sözleşmeleri, kendi tasarruf sahipleri ve
kendi ödül parası olan ayrı bir havuz. Hangi havuzda olduğunuz, URL'de `/app` sonrasındaki
ilk parçadır. Seçici ayrıca Zama'nın resmi Confidential tGBP'sini de soluk halde gösterir:
onun açık tokenini yalnızca ihraççı basabildiği için kimse sarmalayamaz, dolayısıyla üzerine
havuz kurulamaz. Bu sayfadaki diğer her şey, havuzların her biri için ayrı ayrı geçerlidir.
Ayrıntılar: [havuzlar ve tokenler](concepts/pools-and-tokens.md).

## 2. Talep düğmesi nerede?

Uygulamada "Çekilişlerim" ekranında, o çekilişin kartında, göz simgesiyle açtıktan sonra
"Sonucunuz" başlığının altında. Yalnızca o çekiliş hesabınıza bir şey geçirdiyse ve kasa bu
cüzdana hâlâ para borçluysa görünür: aynı göz, o çekilişin alacağını ve kasanın henüz talep
edilmemiş kazançlarının güncel toplamını birlikte açar, düğme de ikisinin küçüğünü sunar. Onu
dürüst kılan işte bu ikinci sayı. Bir çekilişin alacağı bir kez yazıldıktan sonra hiç değişmez,
dolayısıyla yalnızca alacağa bakan bir düğme sayfa yenilendikten sonra aynı ödülü tekrar sunardı
ve zincir de bunu sizin kendi anaparanızdan öderdi.
Perde arkasında bunun ayrı bir işlem olmaması bilinçli bir tercih: ödüller değerlendirme
sırasında şifreli kazanç bakiyenize eklenir, tutarı üzerinde yazan talep düğmesi de bunun
için sıradan bir çekim gönderir, ki bu zincirde tıpkı başka herhangi bir çekim gibi görünür.
Çoğu ödül protokolünde talep işlemi göndermek için yalnızca kazananların bir sebebi vardır,
dolayısıyla işlem listesi sessizce kazananların adını verir. Burada izlenecek böyle bir işlem
yok. Aynı para, Çek ekranındaki "Kasadan çıkış" sekmesinden de gelir, çünkü talep aslında
başka bir adla çekimdir.

## 3. Anaparamı kaybedebilir miyim?

Hayır. Ödüller getiriden ödenir, asla kimsenin yatırdığı paradan değil, ve `withdraw` her
zaman açıktır, çekiliş sürerken bile. Kaybedebileceğiniz tek şey, kazanabilecekken
kazanamadığınız bir ödüldür: değerlendirme yürüyüşü iki dönemlik pencere içinde size
ulaşmazsa o çekiliş size hiçbir şey ödemez ve para kademeye geri döner. Bakınız: kısıt 2.

## 4. Bakiyemi ya da kazancımı görebiliyor musunuz?

Hayır. Anaparanız, kazancınız, her çekiliş için ağırlığınız ve her çekilişten hesabınıza
geçen tutar, yalnızca sizin adresinize erişim verilmiş şifreli değerlerdir. Bunu Zama'nın
erişim kontrol listesi zincir üzerinde uygular, bizim söz verdiğimiz bir politika olarak
değil. Biz de bir yabancının gördüğünü görürüz: para yatırdığınızı, ne zaman yatırdığınızı
ve tutar hakkında hiçbir şeyi.

## 5. Kazanma şansım nasıl hesaplanıyor?

Çekiliş anındaki bakiyenize göre değil, dönem boyunca ortalama bakiyenize göre. Dönem, USDC
havuzunda bir saat, diğer altısında altı saattir.
100 USDC'yi bir saatlik bir dönem boyunca tutarsanız ağırlığınız 360,000 bakiye saniyesi
olur. Bir kademedeki beklenen ödülünüz, bu ağırlığın yayımlanan aralığa bölünüp kademenin
olasılığı ve ödül sayısıyla çarpılmasıdır. Paranızı birden fazla cüzdana bölmek hiçbir şeyi
değiştirmez, çünkü beklenti tam olarak ağırlıkla orantılıdır.

## 6. Çekilişten beş dakika önce para yatırdım ve hiçbir şey kazanmadım. Neden?

Çünkü bir saatlik dönemin beş dakikası, dönemin tamamını tutmuş olmanın şansının on ikide
biridir, altı saatlik dönemde ise yetmiş ikide biri. Birinin her çekilişten hemen önce büyük
bir bakiye gösterip kazanmasını ve sonra parasını çekmesini durduran şey budur. Bu saldırıyı
kendi önceki tasarımımıza karşı fiilen uyguladık ve 20 çekilişin 19'unu aldı. Parayı yatırıp
bırakın, bir sonraki tam dönemden itibaren payınızın tamamını alırsınız.

## 7. Kazancım da şans kazandırıyor mu?

Kendi başına hayır. Kazanç, ağırlığınıza dahil olmayan ayrı bir şifreli bakiyede durur,
dolayısıyla bileşik getiri otomatik değildir: çalışmasını istiyorsanız çekip yeniden
yatırın. Bir ödül çekiminin bir birikim çekiminden ayırt edilememesini sağlayan da bu
ayrımdır.

## 8. Çekilişleri kim tetikliyor ve durursa ne olur?

Havuz başına bir keeper süreci çalıştırıyoruz, her biri kendi hesabında. Böylece duran bir
keeper yalnızca kendi havuzunun çekilişlerine mal olur, diğer altısı çalışmaya devam eder.
Havuz ayrıca Chainlink'in otomasyon arayüzünü de uyguluyor, yani zamana dayalı bir upkeep
kapatma adımını üstlenebilir. Şu an hiçbir havuzda kayıtlı bir upkeep yok. Her durumda bir
çekilişin her adımı herkes tarafından çağrılabilir, uygulamadan sizin tarafınızdan da.
Kapatmanın kendine ait bir son tarihi vardır, pencerenin bitiminden yarım dönem önce, ki
kapatma hiçbir zaman ödül adımının ardından gelemeyeceği kadar geç kalmasın. Hiçbir şey
çalışmazsa o çekiliş atlanır: likiditesi bir sonraki çekiliş için kademelerde kalır, getiri
geç bir ödül adımı geldiğinde kayda geçer, para yatırma ve çekme çalışmaya devam eder.
Duran bir keeper çekilişlere mal olur, paraya asla.

## 9. Rastgele sayıyı ya da ödülün büyüklüğünü ayarlayabilir misiniz?

İkisini de yapamayız. Tohum, Zama'nın yardımcı işlemcisi içinde şifreli veri olarak
üretilir, yani çekildiği anda kimse onu görmez, ve bir çekilişin kapatılması tam olarak bir
kez başarılı olur, yani ikinci bir atış yoktur. Ödül büyüklükleri aynı işlemde daha önce,
tohum var olmadan sabitlenir, dolayısıyla kimse tohumu okuyup kazandığını anlayıp sonra
kazancı büyütemez. Dönem bittikten sonra tohum, sözleşmenin zincir üzerinde doğruladığı bir
Zama anahtar yönetim servisi imzasıyla birlikte yayımlanır, ve bundan yola çıkarak herkes
herhangi bir adresin aşması gereken eşiği tam olarak yeniden hesaplayabilir.

## 10. Havuz neden tam toplamı yerine yalnızca kabaca bir büyüklük yayımlıyor?

Çünkü tam toplam, tek tek yatırılan tutarları ele verir. Arka arkaya iki toplam, artı kendi
para yatırma işleminizin herkese açık zaman damgası, o dönemde para hareketi yapan tek kişi
sizseniz herkesin tam tutarınızı çözmesine yeter. Tahmin olarak değil, tam sayı olarak. Bu
yüzden kasa yalnızca toplamın üzerindeki en küçük ikinin kuvvetini yayımlar ve çekiliş de
onun üzerinden yürür. Bunun bedeli şudur: bir kademe her çekilişte nominal ödül sayısının
yarısı ile tamamı arasında bir kısmını öder, kalanı devreder ve yeniden teklif eder,
dolayısıyla ödül büyüklükleri biraz daha yüksekte oturur. Kimsenin şansı bir başkasına göre
bozulmaz.

## 11. Ödül parası nereden geliyor?

Sepolia'da, sabit bir hızda damlayan sponsor destekli bir bakiyeden, havuz başına bir tane.
Çünkü Sepolia'da Zama'nın taklit tokenlerine getiri ödeyen bir yer yok. Ana ağda aynı arayüz
Zama'nın Confidential Vault'una bağlanır, o da gizli USDC'yi bir toplayıcı üzerinden gerçek
bir ERC-4626 getiri kasasına koyar. Her iki durumda da havuz yalnızca KMS tarafından
doğrulanmış bir şifre çözmenin gerçekten geldiğini söylediği tutarı kayda geçer, kaynağın
kendisi hakkında bildirdiği bir sayıyı asla.

## 12. Zinciri izleyen biri benim hakkımda ne öğrenebilir?

Tasarruf sahibi olduğunuzu, hangi blokta para yatırdığınızı veya çektiğinizi ve hangi
değerlendirme partisinde olduğunuzu. Bakiyenizi değil, şansınızı değil, kazanıp
kazanmadığınızı değil. Bilmeye değer dört dikiş var. Üçten az tasarruf sahibi olduğunda
yayımlanan aralık kişisel bilgiye yaklaşır. Biri bakiyenizi sabitleyebilirse, ki bu genelde
herkese açık bir sarmalamanın hemen ardından aynı büyüklükte bir yatırma gelmesini izleyerek
olur, o andan sonra her çekilişteki sonucunuz herkesin yapabileceği bir aritmetiğe döner,
çünkü eşikler tasarım gereği açıktır. Parayı sarmalayıp sonra tamamını çözmek, o güne kadar
kazandığınız her şey için bir alt sınır yayımlar. Ve her kademe kaç ödül ödediğini bir
çekiliş sonra yayımlar, ki bu şifreli bakiyelerin kaba bir ölçümüdür ve hiç kıpırdamayan bir
bakiyeyi yavaş yavaş daraltır. Bu sayıyı her çekilişte yayımlıyoruz, çünkü kazanılmayan
parayı ortak kasaya geri döndüren adımın ta kendisi bu, ve büyük ikramiyenin gözünüzün
önünde birikmesini sağlayan da bu. Dördünün tamamı burada ele alınıyor:
[gizli kalanlar](security/what-stays-private.md).
