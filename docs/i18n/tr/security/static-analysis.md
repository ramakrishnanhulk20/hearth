# Statik analiz

Her sözleşme, bir dağıtımdan önce slither 0.11.6 ve solhint ile taranır, ve her bulgu ya
düzeltilir ya da burada açıklanır. Yedi havuz, bu aynı üç sözleşmenin yedi dağıtımıdır,
dolayısıyla tek bir çalıştırma hepsini kapsar. Bu sayfa açıklamadır. Ham çalıştırma
tekrarlanabilir:

```bash
npm run lint -w @hearth/contracts
```

Bu komut solhint içindir, ve `.solhint.json` içindeki ayarlanmış kural setiyle sıfır uyarıyla
geçer. slither için ise aynı kaynakların FHEVM Hardhat eklentisi olmadan düz derlenmesi
kullanılır, çünkü eklenti derleme sırasında `ZamaConfig.sol` dosyasını yeniden yazıyor ve
slither o zaman kaynak konumlarını diskteki dosyaya geri eşleyemiyor. Düz derleme, aynı
derleyici ayarlarını kullanır (0.8.27, optimizer 800 çalıştırma, cancun), dolayısıyla slither'ın
okuduğu bayt kodu, dağıtılan bayt kodudur.

## Çalıştırma

slither 46 sözleşmeyi 102 dedektörle analiz etti ve 88 sonuç bildirdi, bunların 85'i Hearth'ün
kendi sözleşmelerinde. Hiçbiri bir hata değil. Beş aileye ayrılıyorlar, ve her ailenin tek bir
sebebi var.

| Aile | Sayı | slither'ın verdiği önem derecesi | Neden bir bulgu değil |
| --- | --- | --- | --- |
| `unused-return` | 38 | Orta | Bunların 36'sı `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` ve `FHE.makePubliclyDecryptable`, ki bunlar çağrılar zincirlenebilsin diye kendilerine verilen handle'ı döndürür. O dönüşü yok saymak, her Zama örneğinde belgelenmiş kullanımdır. Diğer ikisi aşağıda. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Orta ve düşük | slither her `FHE.*` işlemini harici bir çağrı sayar, çünkü her biri yardımcı işlemci sözleşmesine yapılan bir çağrıdır. O çağrılar kontrolü değil şifreli veri handle'larını taşır, ve içlerinde hiçbir kullanıcı sözleşmesi çalışmaz. Gerçekten harici olan çağrılar token ve kasadır, ikisi de kuruluşta sabitlenir, ve değer taşıyan her fonksiyon `nonReentrant`'tır ve durumunu transferden önce yazar. |
| `timestamp` ve `incorrect-equality` | 18 | Düşük ve orta | Dönemler bilerek `block.timestamp` ile tanımlanır, ve kesin eşitlikler dönem numaralarını ve sıfır bayraklarını karşılaştırır, asla bakiyeleri değil. Bir doğrulayıcı, bir ya da altı saatlik dönemlere karşı zaman damgasını saniyeler kaydırabilir, ki bu bir tasarruf sahibinin ağırlığını 3,600 ya da 21,600 saniyenin o kadar saniyesi kadar oynatır. |
| `uninitialized-local` | 8 | Orta | Solidity'nin sıfır varsayılanıyla bilerek başlayan biriktiriciler ve sayaçlar: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` ise, bildiriminin ardından gelen try/catch bloğunun her yolunda atanır. |
| `calls-loop` | 1 | Düşük | `finalizeDraw`, havuza üç kademenin her birinin mutabakat sıklığını sorar. Döngü üçle sınırlıdır ve havuz, kasanın kendi havuzudur, sahibi tarafından bir kez ayarlanır. |

Erişim kontrol çağrısı olmayan iki `unused-return` sonucu:

- `HearthVault._withdraw`, `confidentialTransfer` fonksiyonunun döndürdüğü handle'ı yok sayar.
  Bir ERC-7984 transferi tutarın ya tamamını taşır ya da hiçbirini, ve kasa aynı işlemde tutarı
  zaten tasarruf sahibinin elindekinin ve kasada olanın küçüğüne kırpmıştır, dolayısıyla transfer
  edilen tutar kuruluşu gereği istenen tutardır. Defter, çağrıdan önce güncellenmiştir.
- `SponsoredYieldSource.sponsor`, `wrap` fonksiyonunun döndürdüğünü yok sayar. Burada sponsor
  tanımı gereği güvenilen taraftır, ve havuzun bir kapatmada kayda geçirdiği şey asla sponsorun
  kendi rakamı değil, kaynağın hasatta gerçekten transfer ettiği, KMS tarafından doğrulanmış
  tutardır.

## slither'ın göremedikleri

slither açık kontrol akışı üzerinde akıl yürütür. Şifreli bir karşılaştırmanın doğru
karşılaştırma olup olmadığını, bir erişim kontrol listesi izninin eksik olup olmadığını, ya da
yayımlanmaması gereken bir değerin yayımlanıp yayımlanmadığını söyleyemez. Bu özellikler birim
testleriyle, adalet ve değişmezlik testleriyle, ve [tehdit modelindeki](threat-model.md)
çalıştırılmış saldırı betikleriyle kapsanıyor.
