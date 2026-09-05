# Bunun neden Zama'ya ihtiyacı var

Belirli bir teknolojiye ihtiyaç duyduğunu iddia eden her projeye uygulanacak test şudur: o
teknolojiyi silin ve ürünün hayatta kalıp kalmadığına bakın. Hala çalışıyorsa, teknoloji
süstü.

## Şifrelemeyi silin, ortada ürün kalmaz

Genelde FHE diye kısaltılan tam homomorfik şifreleme, girdilerin şifresi hiç çözülmeden,
doğrudan şifreli sayılar üzerinde yapılan ve şifreli bir cevap üreten aritmetik demektir.
Zama Protocol bunu Ethereum'a getiriyor: bir Solidity sözleşmesi, okuyamadığı değerleri
toplayabilir, karşılaştırabilir ve aralarından seçim yapabilir.

Bunu Hearth'ten çıkarın, geriye kalan şudur.

| Hearth'ün parçası | FHE olmadan |
| --- | --- |
| Bakiyeniz | Açık bir sayı. Herkes birikiminizi ve şansınızı fiyatlayabilir. |
| Kazanan testi | Açık bir karşılaştırma. Sonuç, çalıştığı anda herkese görünür. |
| Bir çekilişi kimin kazandığı | Herkese açık, çünkü birinin bakiyesine geçen tutar görünür bir sayıdır. |
| Rastgele tohum | Ya birinin geldiğini görebileceği açık bir sayı, ya da birinin seçebileceği zincir dışı bir sayı. |
| Ödül alacakları | Kimliği belli kazananlara yapılan açık transferler. |

Elde ettiğiniz şey PoolTogether'dır. PoolTogether zaten var, çalışıyor, ve yıllardır ayakta.
Onu yeniden inşa etmek için bir sebep yok.

Hearth'ün gerçekten sattığı ürün, PoolTogether'ın sunamadığı şeydir: bakiyenizin, şansınızın
ve kazançlarınızın yalnızca size ait olduğu, ama çekilişin yabancılar tarafından kontrol
edilebilir kaldığı ödüllü tasarruf. Bu iki özellik şeffaf bir zincirde birbiriyle gerilim
halindedir. Onları çözen tek şey şifreli hesaplamadır, ve Zama Protocol bunu bugün Ethereum'da
yapan tek yerdir.

Kısmi bir sürümü yok. Yukarıdaki beş satırın her biri temel bir sözdür. Herhangi birinden
şifrelemeyi çıkarın, ürün o satırda çöker.

## Kullandığımız parçaların tam listesi

"Zama üzerine kurulu" değil. İşte liste, her birinin bizim için ne yaptığıyla.

### Şifreli tam sayılar

Para ve ağırlıklar için `euint64`, havuzun toplam biriktiricisi için `euint128`, bir
karşılaştırmanın sonucu için `ebool`. Her tasarruf sahibinin anaparası, kazancı, ağırlığı ve
hesabına geçen tutarı bunlardan biridir, her kademenin devri de öyle. Bunlar üzerinde
yaptığımız aritmetik şudur: `FHE.add`, `FHE.sub`, açık bir sayıyla `FHE.mul`, `FHE.min`,
`FHE.gt`, `FHE.le`, `FHE.and` ve `FHE.select`.

Karşılaştırma burada yalnızca kazanan testinden fazlasını yapıyor. Çekiliş başına beş şifreli
karşılaştırma, havuzun toplam ağırlığını bilinen son aralığının etrafındaki ikinin
kuvvetleriyle karşılaştırır, ve şifreli dünyadan çıkan tek şey beşinden kaçını aştığını
söyleyen küçük bir sayıdır. Çekiliş, toplamın kendisi hiç sayıya dönüşmeden üzerinde
yürüyeceği açık bir ölçeği böyle alır.

`FHE.select` bir not hak ediyor, çünkü bütün tasarımı mümkün kılan şey odur. Koşulu şifreli
olan bir if ifadesidir: iki şifreli değerden birini döndürür ve zincir hangisi olduğunu
söyleyemez. Bir kazanan ile bir kaybedenin birbirinin aynı işlemler üretmesi böyle olur.
Hearth'te hiçbir yerde hiçbir şey bir sır üzerinde dallanmaz.

`FHE.fromExternal`, bir kullanıcının tarayıcısında oluşturduğu şifreli bir değeri kanıtıyla
birlikte alır ve sözleşmenin kullanabileceği bir değere çevirir. Bir yatırma tutarının baştan
sona şifreli gelmesi böyle olur.

### ERC-7984, gizli token standardı

Her havuzun varlığı Zama'nın gizli tokenlerinden biridir, sıradan bir ERC-20'nin etrafındaki
bir ERC-7984 sarmalayıcısı: cUSDC, cUSDT, cWETH, cBRON, cZAMA, ctGBP ya da cXAUt. İçlerindeki
bakiyeler açık sayılar değil şifreli değerlerdir.

Yatırmalar `confidentialTransferAndCall` üzerinden gelir, ki bu şifreli bir tutarı transfer
eder ve aynı işlemde alıcının kancasını çağırır. Kasanın kancasına, tokenin gerçekten taşıdığı
tutar verilir, ve kasanın bir talebi değil gerçeği hesaba geçirmesi böyle olur. Ödemeler ters
yönde `confidentialTransfer` ile gider.

Kendimizinkini yazmak yerine standart tokeni kullanmak önemli. Bu alandaki birkaç proje
"ERC-7984 tarzı" bir token elle yazdı. Bizimkilerin her biri Zama'nın dağıttığı bir token,
dolayısıyla bir tasarruf sahibinin gizli bakiyesi Hearth'ün dışında da kullanılabilir ve
tokenin kendi davranışı bizim kendi lehimize tanımladığımız bir şey değil. Ayrıca bu, Hearth'ün
Zama yeni bir gizli token yayımladığı gün onun üzerinde bir havuz açabilmesi demek, ki yedinin
altısı böyle eklendi, ve basımını ihraççının kendine sakladığı bir token üzerinde hiç havuz
açmayabilmesi demek.

### Şifreli rastgelelik

`FHE.randEuint64()`, Zama'nın yardımcı işlemcisi içinde, ağın FHE anahtarı altında, herkese
açık ama o anahtar olmadan işe yaramaz bir tohumdan rastgele bir sayı üretir. Sayı şifreli veri
olarak çıkar. Biz de dahil, işlemi kim gönderiyorsa o da dahil, kimse onu oluşturulduğu anda
görmez.

Bir işlemin içinde üretilmek zorundadır, çünkü zincir üstü üreteç durumunu değiştirir. Bu,
kazanıp kazanmayacağınızı görmek için bir çekilişi `eth_call` ile zincir dışında önizleme
numarasını devre dışı bırakır, ve bir çekilişi kapatmanın tam olarak bir kez başarılı olan
gerçek bir işlem olmasının sebebi budur. Kimse beğenmediği bir tohumu yeniden atamaz.

### Erişim kontrol listesi

Zama'nın zincir üstü ACL'i, hangi şifreli veriyi kimin çözebileceğine karar verir. Bu bir
politika değil, uygulamadır: relayer, çağıranın yetkili olmadığı bir handle için gelen isteği
reddeder.

Hearth onun üzerinde dört çağrı kullanır. `FHE.allowThis`, bir değeri sözleşmenin sonraki
işlemlerde de kullanabilmesini sağlar. `FHE.allow`, bir tasarruf sahibine kendi anaparası,
kazancı, çekiliş başına ağırlığı ve çekiliş başına hesabına geçen tutarı üzerinde kalıcı okuma
erişimi verir. `FHE.allowTransient` erişimi tek bir işlem boyunca verir, ve kasanın havuza bir
değerlendirme partisinin toplamı üzerinde, kalıcı erişim vermeden tek seferlik bir izin
tanıması böyle olur. `FHE.makePubliclyDecryptable` bir değeri herkese açar, ve biz onu tam
olarak altı çeşit değerde kullanırız: tohum, aralığı veren ölçek sayısı, boş olmama bayrağı,
hasat, sırası gelen bir kademenin devri, ve karşılanmayan tutar sayacı. Havuzun tam toplam
ağırlığı bilerek o listede değildir.

O son çağrı tek yönlü ve kalıcıdır. Bu protokoldeki bir sözleşmenin yapabileceği en sonuç
doğurucu şeydir, dolayısıyla Hearth'teki her kullanımı şurada listeleniyor:
[gizli kalanlar](../security/what-stays-private.md).

### EIP-712 kullanıcı şifre çözümü

Bir tasarruf sahibinin kendi sayılarını böyle okur. Tipli ve yapılandırılmış bir mesaj imzalar,
ki bu imzalayana neyi onayladığını tam olarak gösteren bir imza standardıdır, ve Zama'nın
relayer'ı o kişinin yetkili olduğu değerlerin açık halini döndürür.

Bu zincir dışı bir istektir. İşlem yok, gas yok, iz yok. Hearth'ün hiç talep fonksiyonu
olmamasının sebebi budur: kazandığınızı öğrenmek hiçbir şeye mal olmaz ve geride hiçbir şey
bırakmaz. Bu sözün diğer yarısı, değerlendirmenin de kendinize doğrultulamamasıdır, dolayısıyla
yalnızca bir kazananın göndereceği hiçbir işlem türü yoktur.

Hem bakiye hem kazanç, sahibi tarafından çözülebilir. Hearth ayrıca çekiliş başına ağırlığı ve
çekiliş başına hesaba geçen tutarı da verir, böylece bir tasarruf sahibi çekilişin aritmetiğini
güvenmesi istenmek yerine kendi girdilerine karşı doğrulayabilir.

### KMS imzalı genel şifre çözme

Diğer yön. Bir sözleşme bir değeri genel olarak şifresi çözülebilir işaretler, açık metni
relayer'dan herkes isteyebilir, ve relayer onu ağın şifre çözme anahtarını tutan grup olan
anahtar yönetim servisinin imzasıyla döndürür. Sözleşme sonra o imzayı sayıya göre hareket
etmeden önce zincir üzerinde `FHE.checkSignatures` ile doğrular.

"Tohumun 12345 olduğunu söylüyoruz" ifadesini, sözleşmenin kanıt olmadan kabul etmeyi
reddettiği bir sayıya çeviren şey budur. Hearth bunu çekiliş başına bir kez, ödül adımında
tohum, ölçek sayısı, boş olmama bayrağı ve hasat için birlikte kullanır, ve bir kademenin sırası
geldiğinde onun devri için tekrar kullanır, ki Sepolia'da bu her çekilişte her kademe demektir.
Her kanıt kendi handle'larına sabit bir sırada bağlıdır, dolayısıyla hiçbir şey karıştırılamaz
ya da başka bir çekilişe veya başka bir kademeye tekrar oynatılamaz.

## Bir tasarruf sahibi gerçekte neye güveniyor

Bunu adlandırmak sayfanın asıl amacı.

- **Zama Protocol'e**, şifreli veriler üzerinde doğru hesaplayacağına ve yalnızca şifresi
  çözülebilir işaretlenmiş olanı çözeceğine. Sözleşmelerin dayandığı her şifre çözme, zincir
  üzerinde doğrulanan bir kanıt taşır. Bu, Zama'nın kendi Confidential Vault'unun belgelediği
  güven sınırının aynısıdır.
- **Gizli token sarmalayıcılarına**, ki bunlar bizim değil Zama'nın sözleşmeleridir ve
  sahipleri tarafından yükseltilebilir. Bakınız:
  [gizli kalanlar](../security/what-stays-private.md) sayfasındaki token katmanı bölümü.
- **Hearth'ün kendi sözleşmelerine**, ki bunlar bir kez dağıtıldıktan sonra değiştirilemezdir,
  vekil sözleşme yok, yükseltme yolu yok. Sahibin geriye kalan yetkileri dardır ve
  [tehdit modelinde](../security/threat-model.md) listelenmiştir: para yatırmayı ve çekiliş
  kapatmayı durduran ama çekimleri veya değerlendirmeyi asla durdurmayan bir duraklatma, bir
  getiri kaynağı ayarlayıcısı, tasarruf sahiplerinin bakiyelerine dokunamayan, yabancı tokenler
  için bir kurtarma yolu, ve sahiplikten vazgeçmenin kapalı olduğu iki adımlı sahiplik devri.

O listedeki hiçbir şey, size inanmanızı söylediğimiz bir kişi değil.
