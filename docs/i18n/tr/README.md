# Hearth dokümantasyonu

Hearth, Zama Protocol üzerinde çalışan gizli ve kayıpsız bir ödüllü tasarruf ürünüdür. Bir
gizli token yatırırsınız, bakiyeniz zincir üzerinde şifreli kalır, havuzun kazandığı getiri
düzenli aralıklarla yapılan bir çekilişte ödül olarak dağıtılır ve anaparanızı istediğiniz
an geri çekebilirsiniz. Ne kadar biriktirdiğinizi ve ne kazandığınızı biz dahil kimse
okuyamaz.

Sepolia üzerinde yedi havuz çalışıyor: Zama'nın orada yayımladığı her gizli token için bir
tane, her biri kendi sözleşmeleri ve kendi keeper'ı ile. Aşağıdaki sayfaların çoğu
örneklerinde USDC kullanıyor, çünkü geçmişi en uzun havuz o. Yine de her sayfa yedi havuzun
tamamını anlatıyor.

Bu sayfalar, sistemin nasıl çalıştığının ve neyi gizlemediğinin eksiksiz yazılı kaydıdır.
Depo kökündeki `ARCHITECTURE.md` uygulama şartnamesidir. Buradaki sayfalar ise aynı
tasarımın, onu kullanan ve denetleyen insanlar için anlatılmış halidir.

## Sayfalar

| Sayfa | Neyi anlatıyor |
| --- | --- |
| [Hearth nedir](getting-started/what-is-hearth.md) | Ürün tek sayfada: bir tasarruf sahibinin yaptığı dört hareket ve her birinin tam olarak neyi gizlediği. |
| [Sepolia'da deneyin](getting-started/try-it-on-sepolia.md) | Yedi tokenden birini seçmek, faucet, gizleme, yatırma, bir çekiliş, açığa çıkarma, talep, çekim ve gizliliği kaldırma. |
| [Havuzlar ve tokenler](concepts/pools-and-tokens.md) | Yedi havuz ve adresleri, altısının neden altı saatte bir çekiliş yaptığı, token başına başlangıç bakiyeleri, Hearth'ün kabul etmediği token ve havuz başına yollar. |
| [Bir çekiliş nasıl işler](concepts/how-a-draw-works.md) | Dönemler, iki dönemlik pencere ve kapatma son tarihi, bir çekilişin beş adımı ve kasanın havuzun toplamı yerine ne yayımladığı. |
| [Zaman ağırlıklı bakiye](concepts/time-weighted-balance.md) | Şansın neden dönem boyunca ortalama bakiyenize dayandığı, geç yatırılan paranın ne değerde olduğu ve neden üç gözlem kaydının yettiği. |
| [Kazananın belirlenmesi](concepts/winner-selection.md) | Kazanan testi, PoolTogether'ın ödül başına kuralı, yayımlanan aralığa karşı iç içe eşikler ve üç tasarruf sahibiyle işlenmiş bir örnek. |
| [Ödüller ve kademeler](concepts/prizes-and-tiers.md) | Getirinin ödül likiditesine nasıl dönüştüğü, şifreli devir ve mutabakat sıklığı, Sepolia'daki üç kademe, aşırı talep ve PoolTogether V5'ten ayrıldığımız noktalar. |
| [Getiri kaynağı](concepts/yield-source.md) | Sepolia'daki sponsorlu kaynak, hasadın neden rapor edilmek yerine doğrulandığı ve ana ağda Zama'nın Confidential Vault'unun nasıl devreye girdiği. |
| [Neden Zama](concepts/why-zama.md) | Silme testi: tam homomorfik şifrelemeyi çıkarın, ortada ürün kalmaz. Kullandığımız her Zama parçası tek tek adıyla. |
| [Gizli kalanlar](security/what-stays-private.md) | Yedi kural: aralık ve yerine geçtiği sızıntı, sabitlenmiş bir bakiyenin bedeli, sarmalama dikişinin iki yönü, ödül sayılarının neyi ölçtüğü, token katmanı, değerlendirmenin neden ipucu vermediği ve davranıştan kalan artık iz. |
| [Tehdit modeli](security/threat-model.md) | Dokuz saldırgan, her birinin ne istediği, onları neyin durdurduğu ve neyin durdurmadığı. Ayrıca önceki tasarımımızın fiilen kırılan noktaları. |
| [Rastgelelik ve doğrulama](security/randomness-and-verification.md) | Tohumun nereden geldiği, neden kimsenin onu yeniden atamayacağı ya da kazandırdığı tutarı değiştiremeyeceği ve herkesin bir eşiği sonradan nasıl yeniden hesaplayabileceği. |
| [Statik analiz](security/static-analysis.md) | slither ve solhint çalıştırmaları, beş bulgu ailesinin her birinin arkasındaki tek sebep, ve hâlâ bildirdiği iki axios bulgusuyla bağımlılık denetimi. |
| [Keeper](operations/keeper.md) | Keeper'ın işi adım adım, sıralama kuralı, havuz başına tek süreç, canlıdaki yedisinin nerede barındırıldığı, çalışmadığında ne olduğu ve gas bütçesi. |
| [Dağıtım](operations/deploying.md) | Token başına tek havuz dağıtmak, constructor imzaları ve parametreleri, doğrulama ve iki Sepolia parametre setinin ana ağdakiyle karşılaştırması. |
| [Kısıtlar](limitations.md) | Belgelenmiş bütün kısıtlar, on dört maddelik tek bir numaralı listede. |
| [SSS](faq.md) | On iki kısa cevap: yedi tokenden hangisinde birikim yapabileceğinizle başlıyor, talep düğmesinin nereye gittiği de içinde. |
