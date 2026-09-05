# Auf Sepolia ausprobieren

Sepolia ist das öffentliche Testnetz von Ethereum. Das Geld darauf ist nicht echt, Sie
können den ganzen Ablauf also kostenlos durchspielen. Der USDC-Pool zieht stündlich, die
anderen sechs alle sechs Stunden. Nehmen Sie also USDC, wenn Sie eine Ziehung für eine
Periode sehen wollen, in der Sie eingezahlt haben. Der Zwei-Minuten-Weg am Ende dieser
Seite wartet nicht darauf.

Die Live-App liegt unter https://hearth-ram.vercel.app. Alles Folgende geht auch direkt
über einen Block-Explorer, wenn Sie den Rohaufrufen lieber zusehen.

## 0. Einen Token wählen

Hearth betreibt sieben Pools, einen je vertraulichem Token, den Zama auf Sepolia
veröffentlicht. Jeder ist ein eigener Satz Verträge mit eigenen Sparern, eigenem Preisgeld
und eigener Uhr. Einen Token zu wählen heißt also, einen Pool zu wählen. Der Tokenname
oben in der Leiste öffnet die Auswahl, und der Pool, in dem Sie sind, steht ganz vorn in
der URL: `/app/usdc`, `/app/weth` und so weiter.

| Token | Kürzel | Ziehung alle | Öffentlicher Token mit offenem `mint` |
| --- | --- | --- | --- |
| Confidential USDC (Mock) | `usdc` | 1 Stunde | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` |
| Confidential USDT (Mock) | `usdt` | 6 Stunden | `0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0` |
| Confidential WETH (Mock) | `weth` | 6 Stunden | `0xff54739b16576FA5402F211D0b938469Ab9A5f3F` |
| Confidential BRON (Mock) | `bron` | 6 Stunden | `0xFf021fB13cA64e5354c62c954b949a88cfDEb25E` |
| Confidential ZAMA (Mock) | `zama` | 6 Stunden | `0x75355a85c6FB9df5f0C80FF54e8747EEe9a0BF57` |
| Confidential tGBP (Mock) | `tgbp` | 6 Stunden | `0x93c931278A2aad1916783F952f94276eA5111442` |
| Confidential XAUt (Mock) | `xaut` | 6 Stunden | `0x24377AE4AA0C45ecEe71225007f17c5D423dd940` |

Die Auswahl führt außerdem Zamas offiziellen **Confidential tGBP** auf, ausgegraut, weil
sein zugrunde liegendes Minting dem Herausgeber gehört und niemand sonst den Token
bekommen kann. Wer ihn wählt, sieht eine Seite, die den Token benennt, beide Verträge
verlinkt und keine Wallet-Aktion anbietet, statt eines Einzahlen-Buttons, der nur
zurückgewiesen würde.

Die App liest sich in sechzehn Sprachen, wählbar über den Button in der oberen Leiste.
Englisch behält die schlichten URLs, jede andere Sprache stellt ihren Code voran, derselbe
Bildschirm auf Japanisch ist also `/ja/app/usdc`.

## Verträge, mit denen Sie zu tun haben

Die Anleitung unten nutzt den USDC-Pool. Jeder andere Pool ist derselbe Satz Verträge
unter anderen Adressen, aufgelistet unter [Pools und Token](../concepts/pools-and-tokens.md).

| Was | Adresse | Wer es ausgerollt hat |
| --- | --- | --- |
| Mock USDC (öffentlicher ERC-20, offenes `mint`) | `0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF` | Zama |
| Confidential USDC (`cUSDCMock`, ERC-7984-Wrapper) | `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639` | Zama |
| HearthVault | `0x0F93e5db6027b4FB1C76566d24aA2D2E417fAF52` | Hearth |
| HearthPrizePool | `0xA0785AacF30B6FE46EDc53CD8A9db1d94FeF5Df2` | Hearth |
| SponsoredYieldSource | `0xCC49DF69eAB6884fD8DD9260902B8A0Abc9D6b91` | Hearth |

Die beiden Zama-Adressen sind die, die Zama in seiner eigenen Adressreferenz für den
Confidential Vault auf Sepolia veröffentlicht. Der Testtoken ist also Zamas, nicht unserer.
Jeder vertrauliche Wrapper auf dieser Liste nutzt 6 Nachkommastellen, das heißt jeder
Betrag auf der Blockchain steht im Wrapper in Millionstel: 1.000 USDC schreibt sich
`1000000000`. Der öffentliche Token darunter kann eine andere Skala haben, und `rate()` des
Wrappers ist die Umrechnung. Mock USDC nutzt ebenfalls 6, die beiden stimmen also überein;
Mock WETH nutzt 18, seine Rate ist also eine Billion.

## 1. Sepolia-ETH besorgen

Sie brauchen etwas Sepolia-ETH für die Gasgebühren. Jedes Sepolia-Faucet tut es. Gebräuchlich
sind das Google Cloud Web3 Faucet, das Sepolia-Faucet von Alchemy und das Chainlink-Faucet,
und jedes zahlt in einer Anfrage genug für diese Anleitung aus. Ein Zehntel ETH ist weit
mehr als genug.

## 2. Den Testtoken minten

Jeder der sieben öffentlichen Mocks hat ein öffentliches `mint(address, uint256)` ohne
Eigentümerprüfung, gedeckelt auf eine Million Token je Aufruf, und die Adressen stehen in
der Tabelle oben. Die App bietet es als einen Button auf dem Einzahlen-Bildschirm des
jeweiligen Pools an, auf dem ersten seiner drei Schritte, beschriftet mit "Test-USDC
holen", solange Ihre Wallet keine hat, und mit "Eine Million mehr holen", sobald sie
welche hat, jeweils mit dem Token dieses Pools in der Beschriftung. Von Hand, für USDC,
lautet er:

```
USDCMock.mint(yourAddress, 1000000000)     // 1,000 USDC
```

Holen Sie mehr, als Sie brauchen. Nichts davon ist etwas wert.

## 3. Abschirmen: USDC in vertrauliches USDC wrappen

Vertrauliches USDC ist Zamas ERC-7984-Wrapper um dieses Mock-USDC. ERC-7984 ist der
Standard für vertrauliche Token: Guthaben liegen auf der Blockchain als verschlüsselte
Werte statt als Zahlen, die jeder lesen kann. Wrappen sind zwei Aufrufe:

```
USDCMock.approve(cUSDC, 1000000000)
cUSDC.wrap(yourAddress, 1000000000)
```

In der App sind diese beiden Aufrufe Schritt 2 des Einzahlens, "Schirmen Sie Ihr USDC ab".
Der Button heißt "Abschirmen", und "Wrapper freigeben", solange die Erlaubnis für den
Wrapper unter dem eingetippten Betrag liegt.

Sie halten jetzt 1.000 vertrauliches USDC. Ab hier ist Ihr Guthaben ein Chiffrat-Handle,
und nur Sie können es lesen.

Das Wrappen ist öffentlich. Der Wrapper wirft ein `Wrap`-Ereignis mit dem Betrag im
Klartext, der zugrunde liegende ERC-20-Transfer trägt ihn erneut, und ein drittes Mal
erscheint er im Trivialverschlüsselungs-Eintrag des Koprozessors. Daran führt kein Weg
vorbei: Einen öffentlichen Token in einen vertraulichen zu verwandeln ist per Definition
eine öffentliche Handlung.

## 4. In den Pool einzahlen

Ein Aufruf, und der Betrag ist von Anfang an verschlüsselt:

```
cUSDC.confidentialTransferAndCall(vault, encryptedAmount, inputProof, "")
```

Die App baut die verschlüsselte Eingabe und ihren Beweis mit dem SDK von Zama für Sie. Der
Empfangs-Hook des Vaults schreibt genau den Betrag gut, den der Token tatsächlich bewegt
hat, nicht den, den Sie verlangt haben. Ein aus welchem Grund auch immer zu kleiner
Transfer kann also keine Scheineinlage erzeugen.

Der Vault lehnt eine Einzahlung ab, deren Betrag oder deren resultierende Einlage Sie über
die Obergrenze je Sparer heben würde, die bei einer Periode von einer Stunde etwa 5
Milliarden Token beträgt und bei sechs Stunden etwa 854 Millionen. Beide Hälften
dieser Prüfung zählen: Verschlüsselte Addition läuft bei 64 Bit stillschweigend über. Auch
den eingehenden Betrag zu begrenzen ist es, was verhindert, dass eine riesige Einzahlung
die Summe zu einer kleinen Zahl umlaufen lässt und durchrutscht. Die Ablehnung ist selbst
verschlüsselt: Der Hook gibt ein verschlüsseltes Falsch zurück und der Token erstattet
Ihnen den Betrag in derselben Transaktion, sodass eine Zurückweisung niemandem verrät, wie
hoch Ihr Guthaben war.

### Warum Wrappen und Einzahlen zwei Schritte sind und nicht einer

Die meisten Apps in diesem Feld bündeln "freigeben, wrappen, einzahlen" hinter einem
einzigen Button. Das ist freundlicher und es verrät Ihre Einzahlung.

Wir haben das an unserem eigenen früheren Deployment gemessen. In den öffentlichen Logs der
Sepolia-Blöcke 11528000 bis 11618500 lagen drei der fünf Einzahlungen zwei bis vier Blöcke
nach einem öffentlichen `Wrap` von genau 100 USDC durch dieselbe Adresse. Jeder, der die
Blockchain liest, konnte diese drei Einzahlungen mit je 100 USDC beziffern, ohne
irgendetwas zu brechen. Zamas eigene Dokumentation benennt dasselbe Problem und nennt es
Shield-Join-Korrelation: "Ein Nutzer, der 50.000 USDC wrappt und Minuten später einem Batch
beitritt, hat faktisch nur die Obergrenze seines Beitrittsbetrags veröffentlicht."

Hearth hält sie deshalb absichtlich auseinander:

- Einmal wrappen, in einer runden Zahl, zu einem Zeitpunkt Ihrer Wahl.
- Ein stehendes vertrauliches Guthaben halten und später einen Teil davon einzahlen.
- Erneut aus demselben Guthaben einzahlen, ohne noch einmal zu wrappen.

Die Korrelation schwächt sich ab mit der Zeit, mit der Wiederverwendung eines stehenden
Guthabens und mit dem Wrapper-Verkehr anderer Leute. Es in einem Klick zu erledigen nimmt
alle drei Verteidigungen weg. Die App zeigt den Hinweis auf dem Abschirmen-Schritt, statt
den Kompromiss zu verstecken.

Es lohnt sich, deutlich zu sagen, was ein festnagelbares Guthaben Sie kostet, denn es ist
mehr als der Einzahlungsbetrag. Schwellenwerte sind absichtlich öffentlich, denn sie sind
es, was die Ziehung nachprüfbar macht. Wer Ihr Guthaben kennt, kann also von da an in jeder
Stufe und in jeder Ziehung berechnen, ob Sie gewonnen haben, ganz ohne Entschlüsselung.
Deshalb sind das zwei Schritte und nicht einer.

## 5. Auf eine Ziehung warten

Eine Periode dauert im USDC-Pool eine Stunde und in den anderen sechs Stunden, aus dem
Gasgrund unter [Pools und Token](../concepts/pools-and-tokens.md). Die Ziehung einer
Periode kann erst abgeschlossen werden, wenn diese Periode vorbei ist, und alles daran muss
innerhalb der beiden folgenden Perioden erledigt sein.
Der Abschluss selbst hat eine engere Frist, die Mitte der zweiten dieser Perioden, damit
der Entschlüsselungs-Rundlauf und die Zuteilung immer Platz haben. Eine Einzahlung, die Sie
jetzt machen, verdient also Chancen für die laufende Periode, und das Ergebnis dieser
Periode liegt innerhalb der nächsten paar Stunden vor.

Das Dashboard zeigt die laufende Periode und die verbleibende Zeit unter "Der Pool gerade
jetzt", und "Meine Ziehungen" in der Seitenleiste zeigt den Stand der letzten paar. Sie
müssen nichts tun. Wenn Sie selbst nachhelfen wollen: Jeder Schritt einer Ziehung ist von
jedem aufrufbar, und "Eine Ziehung durchführen" in der Seitenleiste hat alle fünf, siehe
[die Keeper-Seite](../operations/keeper.md).

Ihre Chancen für eine Periode beruhen auf Ihrem Durchschnittsguthaben über die ganze
Periode, nicht auf Ihrem Guthaben am Ende. Fünf Minuten vor Ende einer einstündigen Periode
einzuzahlen kauft Ihnen ein Zwölftel der Chancen, die derselbe Betrag über die ganze
Periode gehabt hätte. Das ist so gewollt, siehe
[zeitgewichtetes Guthaben](../concepts/time-weighted-balance.md).

## 6. Aufdecken, was Sie halten und was Sie gewonnen haben

Drücken Sie das Auge neben "Einlage" in der Karte "Was Sie halten" auf dem Dashboard und
signieren Sie die Nachricht, die Ihre Wallet Ihnen zeigt. Versiegelte Werte erscheinen bis
dahin als Sternchen, und das Auge ist das Einzige, was sie öffnet.

Diese Signatur ist die EIP-712-Nutzerentschlüsselung: eine typisierte Signatur außerhalb
der Blockchain, die dem Relayer von Zama beweist, dass Sie die Adresse kontrollieren, im
Tausch gegen den Klartext der Werte, auf die der Vertrag Ihnen Zugriff gewährt hat. Es ist
keine Transaktion. Sie kostet kein Gas und schreibt nichts auf die Blockchain.

Sie können vier Dinge über sich selbst aufdecken:

| Wert | Bedeutung |
| --- | --- |
| Einlage | Was Sie gespart haben. |
| Gewinne | Preisgeld, das Ihnen gutgeschrieben und noch nicht abgehoben wurde. |
| Gewicht, je Ziehung | Ihr zeitgewichtetes Guthaben für diese Periode, die Zahl, die der Gewinntest verglichen hat. |
| Gutschrift, je Ziehung | Was diese Ziehung Ihnen gezahlt hat. Null, wenn Sie nicht gewonnen haben. |

Die ersten beiden öffnen sich gemeinsam über das eine Auge in "Was Sie halten" auf dem
Dashboard. Die letzten beiden öffnen sich gemeinsam über das Auge neben "Ihr Preis", unter
"Ihr Ergebnis" auf der Karte dieser Ziehung unter "Meine Ziehungen". Ihr Guthaben und das
Ergebnis einer Ziehung können gleichzeitig offen sein, die Signatur des ersten gilt auch
für das zweite, und ein offenes Auge zu drücken versiegelt nur die Karte, in der es sitzt.

Die letzten beiden sind es, mit denen Sie die Ziehung selbst prüfen: Nehmen Sie Ihr
Gewicht, nehmen Sie den öffentlichen Seed und die öffentliche Größenklasse, rechnen Sie
Ihre Schwellenwerte nach und bestätigen Sie, dass die Gutschrift passt. Der Vault stellt
die Schwellenwert-Rechnung als View bereit, `thresholdOf`, sodass Sie Ihre eigene Rechnung
mit der des Vertrags vergleichen können. Siehe
[Zufall und Nachprüfbarkeit](../security/randomness-and-verification.md).

Niemand sonst kann eines dieser vier lesen. Der Relayer lehnt eine
Entschlüsselungsanfrage von einer Adresse ab, der der Vertrag nichts gewährt hat, und
diese Ablehnung ist die Durchsetzung, keine Richtlinie.

## 7. Einlösen

Es gibt keine Einlöse-Transaktion, nur einen Einlöse-Button.

Ihr Preis liegt schon in Ihrem Gewinnguthaben, sobald der Durchlauf Sie erreicht. Schritt 6
ist, wie Sie davon erfahren. Sobald das Ergebnis dieser Ziehung offen ist, zeigt ihre Karte
unter "Meine Ziehungen" einen Einlöse-Button mit dem Betrag, etwa "1,00 USDC einlösen"; ihn
zu drücken sendet eine gewöhnliche Abhebung über genau diesen Betrag, und Schritt 8 holt
den Rest nach Hause. Auf der Blockchain sind eine Einlösung und eine Abhebung derselbe
Aufruf mit derselben Form, und genau das bewahrt einen Gewinner davor aufzufallen.

Es gibt auch nichts zu drücken, um gutgeschrieben zu werden. Die Auswertung läuft die
Sparerliste ab einem Punkt ab, den der Seed dieser Ziehung bestimmt. Der Button "Die
Ziehung voranbringen" auf der Karte dieser Ziehung und "Voranbringen" auf dem Bildschirm
"Eine Ziehung durchführen" schieben beide diesen gemeinsamen Durchlauf weiter, statt Sie
herauszupicken. Ein Sparer, der eines von beiden drückt, verrät niemandem, dass er
gewonnen hat.

## 8. Abheben

```
vault.withdraw(encryptedAmount, inputProof)      // or vault.withdrawAll()
```

In der App sind das die Buttons "Abheben" und "Alles abheben" auf dem
Abheben-Bildschirm, im Reiter "Aus dem Vault". "Alles davon" neben dem Feld ist kein
dritter Aufruf: Es füllt das Feld mit allem, was Sie halten, sobald Sie Ihr Guthaben
geöffnet haben.

Abhebungen zahlen zuerst aus den Gewinnen, dann aus der Einlage. Der Betrag wird auf den
kleineren Wert von dem, was Sie halten, und dem, was der Vault hält, begrenzt, denn ein
vertraulicher Transfer bewegt den ganzen Betrag oder gar nichts und nie einen Teil davon.
Das vor dem Transfer auszurechnen ist es, was das Kontobuch ohne jede Reparatur hinterher
exakt hält. Ein vertraulicher Transfer, ein Ereignis, ein verschlüsselter Betrag.

Die Einlage ist nie gesperrt. Sie können mitten in einer Ziehung abheben, und das Gewicht,
das die Ziehung für Sie bereits festgelegt hat, ändert sich dadurch nicht.

## 9. Abschirmung aufheben: zurück in öffentliches USDC

Zwei Aufrufe, weil das Entwrappen bewusst asynchron ist. Zuerst `unwrap`, dann
`finalizeUnwrap`. Die App sendet beide über den Button "Abschirmung aufheben" im Reiter
"Zurück zu einfachem USDC" des Abheben-Bildschirms. Falls der zweite je ausbleibt, sitzt
eine Warnkarte über den beiden Reitern, bis Sie darauf "Aufhebung abschließen" drücken. Die
genauen Argumentlisten stehen in Zamas Wrapper, nicht in unserem.

Der erste Aufruf verbrennt den verschlüsselten Betrag und markiert ihn zur öffentlichen
Entschlüsselung. Der zweite gibt die Klartext-Token frei, sobald Zamas Protokoll den
Klartext und seinen Beweis erzeugt hat. Der Betrag, den Sie entwrappen, ist öffentlich,
genau wie der Betrag, den Sie gewrappt haben, und es ist der erste Aufruf, der ihn
veröffentlicht. Ein Entwrappen, das Sie nie abschließen, hat also bereits geleckt.

Daraus folgt eine zweite Sache, die man wissen sollte. Wenn Sie vollständig hinein und
wieder heraus wrappen, ist die Differenz zwischen den beiden öffentlichen Summen eine
Untergrenze für alles, was Sie je gewonnen haben, und sobald Sie leergeräumt haben, ist sie
exakt. Auf eine frische Adresse zu entwrappen hilft nicht, weil der vertrauliche Transfer
an diese Adresse selbst die Verbindung ist. Wenn Ihnen das wichtig ist, entwrappen Sie in
runden Zahlen ohne Bezug zu Ihrer Position, oder lassen Sie ein stehendes vertrauliches
Guthaben zurück.

## In zwei Minuten ausprobieren

Die App ist eine Konsole mit einer Leiste am linken Rand, eine Aufgabe je Bildschirm, der
Weg ist also ein Gang diese Leiste hinunter.

1. Öffnen Sie https://hearth-ram.vercel.app, folgen Sie "Der Pool" in der Kopfzeile nach
   `/app` und verbinden Sie eine Wallet auf Sepolia. Sie landen im USDC-Pool unter
   `/app/usdc`; der Tokenname oben in der Leiste wechselt den Pool. Das Dashboard öffnet
   sich mit einem Block "Als Nächstes", der die eine zu erledigende Sache nennt.
2. "Einzahlen" in der Seitenleiste, das auf demjenigen seiner drei Schritte öffnet, bei dem
   Ihre Wallet steht. Klicken Sie "Test-USDC holen", dann "Abschirmen", dann "Einzahlen".
3. Zurück auf dem Dashboard drücken Sie das Auge neben "Einlage" in "Was Sie halten" und
   signieren: Ihre Einlage und Ihre Gewinne erscheinen, nur im Browser.
4. "Eine Ziehung durchführen" in der Seitenleiste, die Zeile mit "Jeder". Drücken Sie
   "Abschließen", dann "Zuteilen", um die letzte beendete Periode selbst abzuschließen und
   zuzuteilen, oder sehen Sie dem Keeper dabei zu.
5. Drücken Sie "Voranbringen" auf demselben Bildschirm. Öffnen Sie dann "Meine Ziehungen"
   und drücken Sie das Auge unter "Ihr Ergebnis" auf der Karte dieser Ziehung: Ihr Gewicht
   und Ihre Gutschrift für diese Ziehung erscheinen, und das Guthaben aus Schritt 3 bleibt
   mit einer Signatur offen.
6. Öffnen Sie `/verify?pool=usdc`: Der öffentliche Seed und die Größenklasse stehen dort,
   "Schwellenwerte für eine Adresse" rechnet Ihre Schwellenwerte vor Ihren Augen nach, und
   der Vergleich passt. Tauschen Sie den Parameter `pool` gegen ein anderes Kürzel, um
   diesen Pool zu prüfen.
7. "Abheben" in der Seitenleiste, Reiter "Aus dem Vault", "Alles abheben". Einlage und
   etwaige Gewinne kommen in einem Transfer zurück.

Nichts auf diesem Weg braucht uns online. Jeder Schritt der Ziehung ist erlaubnisfrei.
