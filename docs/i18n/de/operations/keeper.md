# Der Keeper

Ziehungen passieren nicht von selbst. Irgendetwas muss die Transaktionen senden. Diese Seite
beschreibt, was dieses Etwas tut, was passiert, wenn es stehen bleibt, und wie viel es
kostet.

Ein Prozess treibt einen Pool an. Hearth betreibt sieben Pools auf Sepolia, es laufen also
sieben Keeper-Prozesse, jeder signiert aus seinem eigenen Konto derselben Seed-Phrase und
jeder ist auf die Adressdatei eines Pools gerichtet. Der Abschnitt "Ein Keeper je Pool" unten
ist die Tabelle.

Die wichtige Einordnung zuerst: Der Keeper hat keine Privilegien. Jede Funktion, die er
aufruft, ist von jedem aufrufbar, und die zwei Hebel, die ein Keeper hätte missbrauchen
können, die Wahl, wer ausgewertet wird, und die Wahl der Auszahlungsreihenfolge, sind keine
Hebel mehr. Er ist eine Bequemlichkeit, die den Sparern die Mühe abnimmt, keine Rolle, auf
die der Pool für seine Sicherheit angewiesen ist.

## Die Aufgabe, der Reihe nach, für Ziehung `p`

1. **Abschließen.** `closeDraw(p)` aufrufen, sobald Periode `p` vorbei ist und vor
   `closeDeadline(p)`, der Mitte von Periode `p+2`. Früh in Periode `p+1` ist die richtige
   Gewohnheit. Das legt die Preisgröße und die angebotene Liquidität jeder Stufe fest, bewegt
   diese Liquidität in die Ziehung, zieht den verschlüsselten Seed, fragt den Vault nach der
   verschlüsselten Skalenzahl und dem Nichtleer-Kennzeichen, erntet die Renditequelle und
   markiert alle vier Handles als öffentlich entschlüsselbar.
2. **Die Beweise holen.** Zamas Relayer bitten, die vier Handles öffentlich zu entschlüsseln,
   in der Reihenfolge `[seed, scaleCount, nonEmpty, harvested]`. Der Relayer gibt die
   Klartexte mit einer Signatur des Schlüsselverwaltungsdienstes zurück.
3. **Zuteilen.** `awardDraw(p, seed, scaleCount, nonEmpty, harvested, proof)` aufrufen. Der
   Vertrag prüft die Signatur auf der Blockchain, verbucht die Ernte in den Stufen und öffnet
   die Ziehung. In diesem Moment stehen die Gewinner fest.
4. **Auswerten.** `evaluate(p, count)` auf dem Vault aufrufen, wiederholt, bis der Durchlauf
   dorthin zurückläuft, wo er begonnen hat. Jeder Aufruf schiebt einen Cursor je Ziehung durch
   die Sparerliste, ab einem aus dem Seed abgeleiteten Start. Der Keeper wählt `count`, nie
   welche Adressen; `4` sind die meisten Sparer mit verschlüsselter Arbeit, die in eine
   Transaktion passen.
   Sparer ohne Beobachtung bei oder vor Periode `p` überspringt der Vertrag selbst, anhand
   der Klartext-Zeitstempel, ohne verschlüsselten Aufwand.
5. **Finalisieren.** Nachdem das Fenster am Ende von Periode `p+2` geschlossen ist,
   `finalizeDraw(p)` aufrufen. Das faltet den unbezahlten Rest jeder Stufe in deren
   verschlüsselten Übertrag, veröffentlicht den Zähler für Nichtfinanziertes und markiert den
   Übertrag jeder zum Abgleich fälligen Stufe als öffentlich entschlüsselbar, wobei
   `CarryPublished` geworfen wird.
6. **Abgleichen, je fälliger Stufe.** Für jede Stufe, die `finalizeDraw` veröffentlicht hat,
   den Klartext des Übertrags holen und `reconcile(tier, carry, proof)` aufrufen. Der Pool
   prüft den Beweis gegen das vom Vault veröffentlichte Handle, verbucht die geprüfte Zahl in
   die Klartext-Liquidität der Stufe, der Vault zieht sie vom Übertrag ab (der seit der
   Veröffentlichung gewachsen sein kann), und `TierReconciled` wird geworfen.

Auf Sepolia ist jede Stufe jedes Pools bei jeder Ziehung fällig, Schritt 6 läuft nach jedem
Finalisieren also bis zu dreimal. Der Takt ist ein Konstruktor-Argument je Stufe, und der
Keeper liest ihn von der Blockchain, statt ihn anzunehmen, ein Deployment, das den Übertrag
einer Stufe seltener veröffentlicht, braucht also keine Keeper-Änderung. Warum dieses alle
drei bei jeder Ziehung veröffentlicht, steht unter
[Preise und Stufen](../concepts/prizes-and-tiers.md).

## Die Reihenfolgeregel

**Ziehung `p` zu Beginn von Periode `p+3` finalisieren und abgleichen, bevor in derselben
Periode Ziehung `p+2` abgeschlossen wird.**

Der Grund ist Geld, nicht Korrektheit. Ein Abschluss bemisst die Preise jeder Stufe aus deren
Klartext-Liquidität in diesem Moment, und der Abgleich ist es, was den Übertrag einer
früheren Ziehung wieder in Klartext-Liquidität verwandelt. Gleichen Sie zuerst ab, zählt
dieses Geld sofort zur Preisgröße; gleichen Sie danach ab, wartet es eine Ziehung.

Beide Aufgaben werden im selben Augenblick verfügbar. Das Fenster von Ziehung `p` endet am
Ende von Periode `p+2`, und Ziehung `p+2` wird zu Beginn von Periode `p+3` abschließbar, der
Keeper erledigt also zuerst das Finalisieren und alle fälligen Abgleiche, dann den Abschluss.

Nichts geht verloren, wenn die Reihenfolge verrutscht, aber die Richtung zählt. Schließen Sie
vor dem Finalisieren ab, ist der Übertrag der Stufe noch nicht anstehend, `openDraw` faltet
ihn also ins Angebot und dieses Geld ist weiterhin zu gewinnen; es hebt nur die
veröffentlichte Preisgröße nicht, die `closeDraw` allein aus der Klartext-Liquidität
festlegt. Finalisieren, dann abschließen, dann abgleichen, und der Übertrag ist anstehend:
`openDraw` lässt einen anstehenden Übertrag ganz aus der Ziehung heraus, dieses Geld ist also
weder angeboten noch zu gewinnen, bis der Abgleich das Kennzeichen räumt. Auf Sepolia ist
jede Stufe bei jedem Finalisieren fällig, das ist also der Normalfall, und deshalb liest der
Keeper die Überträge nach seinen Finalisierungen erneut und gleicht ab, bevor er abschließt.
So oder so geht nichts verloren: Der erste Abschluss nach einem Abgleich faltet alles wieder
hinein.

## Was passiert, wenn der Keeper ausfällt

Nichts geht verloren. Das ist die ganze Antwort, und sie gilt wegen der Art, wie ein
verpasster Schritt behandelt wird:

| Verpasster Schritt | Folge |
| --- | --- |
| Der Abschluss passiert nie oder passiert nach `closeDeadline` und wird zurückgewiesen | Die Ziehung bleibt `None` und wird übersprungen. Ihre Liquidität wurde nie bewegt, sie bleibt also in den Stufen und wird bei der nächsten Ziehung angeboten. Die Ernte holt der nächste Abschluss ein. |
| Die Zuteilung passiert nicht innerhalb des Fensters | Eine späte Zuteilung verbucht die Ernte trotzdem, gibt die angebotene Liquidität trotzdem an die Stufen zurück und markiert die Ziehung als `Skipped`. Weder Rendite noch Liquidität verschwinden. |
| Der Durchlauf erreicht nicht jeden Sparer | Sparer, die der Durchlauf verpasst hat, bekommen aus dieser Ziehung nichts. Ihr Anteil am Angebot faltet sich beim Finalisieren in den Übertrag der Stufe und wird erneut angeboten. Das ist der eine Fall, in dem ein echter Sparer etwas verliert, das er hätte gewinnen können, und es ist Grenze 2. |
| Finalisieren oder Abgleichen kommt spät | Die Stufen halten eine Weile weniger Klartext-Liquidität, die Preise sind also kleiner. Ein Übertrag, den ein Finalisieren veröffentlicht und den kein Abgleich geräumt hat, bleibt bis zum Abgleich aus jedem Abschluss heraus. Nichts geht verloren: Der erste Abschluss nach einem Abgleich faltet alles wieder hinein. |

Ein stehen gebliebener Keeper kostet den Pool Ziehungen, kein Geld. Ein- und Auszahlungen
funktionieren durchgehend, denn der Pausenpfad berührt sie nie und eine stehende Ziehung
sperrt nichts.

Unser früheres Deployment ist das mahnende Beispiel: `openDraw` war erlaubnisfrei und niemand
rief es auf, der Live-Pool saß also 26 Stunden mit einer öffnungsbereiten Ziehung da.
Erlaubnisfrei ist nicht dasselbe wie automatisiert. Deshalb hat dieser Entwurf einen echten
Keeper und darunter einen Redundanzpfad.

## Wie ein Sparer eine Ziehung selbst voranbringt

Jeder Schritt oben ist erlaubnisfrei, und die App bietet jeden davon auf ihrem Bildschirm
"Eine Ziehung durchführen" an, unter `/app/<slug>/run` für den Pool, in dem der Sparer ist,
also in der Zeile der Seitenleiste mit "Jeder". Eine Karte oben
nennt den Schritt, auf den der Pool wartet, und jeder der fünf darunter trägt seinen eigenen
Button, ausgeschaltet mit angegebenem Grund, wenn dieser Schritt nicht an der Reihe ist:

- **Abschließen**, dann **Zuteilen.** Der Abschluss legt die Preisgrößen fest und zieht den
  verschlüsselten Seed. Die Zuteilung holt die vier Entschlüsselungsbeweise im Browser und
  sendet die signierten Klartexte zurück. Der Relayer-Aufruf ist derselbe, den auch der Keeper
  macht, und das SDK erledigt ihn von der Seite aus.
- **Voranbringen.** Führt `evaluate(p, count)` für die gerade offene Ziehung aus und schiebt
  den gemeinsamen Durchlauf um einen Batch weiter. Derselbe Aufruf sitzt auf Ihrer eigenen
  Ziehungskarte unter "Meine Ziehungen" als "Die Ziehung voranbringen". Das ist der Button,
  den Sie drücken, wenn der Keeper ausgefallen ist und der Durchlauf Sie noch nicht erreicht
  hat. Er lässt Sie nicht sich selbst auswählen, und das ist das Merkmal: Weil sich niemand
  selbst herausgreifen kann, sagt das Senden dieser Transaktion nichts darüber, ob Sie
  gewonnen haben.
- **Finalisieren** und **Abgleichen.** Führt die zwei Abschlussschritte für jede Ziehung aus,
  deren Fenster vorbei ist.

Nichts davon braucht unsere Erlaubnis, unsere Schlüssel oder unsere Server.

## Chainlink Automation, nur für den Abschlussschritt

`HearthPrizePool` implementiert Chainlinks Schnittstelle `checkUpkeep` und `performUpkeep`
für den Abschlussschritt. Ein zeitbasiertes Upkeep zu registrieren gibt dem Pool einen
zweiten, unabhängigen Weg, Ziehungen planmäßig abzuschließen, und der Abschluss ist der
Schritt mit einer Frist, also der eine, den zu versichern sich lohnt.

Es deckt den Abschluss ab und sonst nichts, und der Grund ist einfach: Der Abschluss ist der
einzige Schritt, der keine Daten von außerhalb der Blockchain braucht. Die Zuteilung braucht
einen Entschlüsselungsbeweis vom Relayer von Zama. Die Auswertung muss wiederholt werden, bis
ein Cursor umläuft. Der Abgleich braucht eine weitere Entschlüsselung. Ein
Automatisierungsnetz auf der Blockchain kann nichts davon holen, so zu tun, als könnte es das,
wäre Theater.

Das Upkeep ist optional. Es braucht LINK in einem registrierten Upkeep-Konto, es ist
Redundanz und nicht der Hauptweg, und es wäre ein Upkeep je Pool, jedes auf dem eigenen
Zeitplan dieses Pools. Auf keinem der sieben ist eines registriert, die Keeper allein
betreiben also die Demo-Pools.

Wir deklarieren die Zwei-Funktionen-Schnittstelle lokal, statt für zwei Selektoren das ganze
Chainlink-Vertragspaket samt Abhängigkeiten aufzunehmen.

## Das Budget

Kosten je Ziehung, aus dem Live-Deployment.

| Schritt | Transaktionen je Ziehung | Gas je Stück |
| --- | --- | --- |
| Abschließen | 1 | `1,422,474` |
| Zuteilen | 1 | `435,578` |
| Auswerten, ein voller Batch von 4 | `floor(savers / 4)`, hier 1 | `3,417,699` |
| Auswerten, der letzte Teil-Batch | 0 oder 1, hier 1 mit einem Sparer | `1,291,192` für einen Sparer, plus `708,836` je weiterem |
| Finalisieren | 1 | `509,463` |
| Abgleichen | 3, eine je Stufe, da jede Stufe bei jeder Ziehung fällig ist | `459,994` |

Bei 5 Sparern sind das `8,456,388` Gas je Ziehung, oder etwa
`0.0085 ETH` bei 1 Gwei, der Sepolia-Basisgebühr beim Deployment. Bei einer einstündigen
Periode sind das 24 Ziehungen am Tag und `0.2030 ETH` pro Tag; bei einer Tagesperiode sind es
`0.0085 ETH`.

Multiplizieren Sie das mit sieben Pools, und das ist der ganze Grund, warum sechs davon alle
sechs Stunden ziehen statt jede Stunde. Stündlich über alle sieben sind 168 Ziehungen am Tag,
etwa `1.43 ETH`, womit öffentliche Faucets nicht mithalten können. Ein stündlicher Pool und
sechs Sechs-Stunden-Pools sind 48 Ziehungen am Tag, etwa `0.41 ETH`. Jedes Keeper-Konto wird
getrennt finanziert, ein Pool, dem das Gas ausgeht, stoppt also nur seine eigenen Ziehungen.

Ein weiterer Sparer in einem Batch kostet auf Sepolia `708,836` Gas, und ein Batch mit einem
einzigen Sparer kostet `1,291,192`, denn der feste Teil des Aufrufs fällt so oder so an. In
Recheneinheiten ist ein Sparer `3,674,128` auf der Preistabelle des Mock-Koprozessors, wo
diese Zahl ablesbar ist, denn ein Live-Beleg meldet keine Recheneinheiten. Die
Batch-Größe `4` ist aus dieser Messung gegen Zamas veröffentlichte Sepolia-Grenzen von
20.000.000 Recheneinheiten je Transaktion mit 5.000.000 in sequenzieller Tiefe gesetzt.
`evaluate` nimmt jede Anzahl, wenn Zama also eine Operation neu bepreist, kann der Keeper
ohne Redeployment auf einen kleineren Batch heruntergehen.

**Der Keeper wertet den ganzen Durchlauf aus.** Auf der Blockchain begrenzt nichts, was die
Auswertung kostet, und der Keeper hört auch nicht auf halbem Weg auf; was er durchsetzt, ist
eine Gebührenobergrenze (`KEEPER_MAX_FEE_GWEI`), unterhalb derer er weitersendet, bis der
Cursor das Ende erreicht. Die ehrliche Folge steht im
[Bedrohungsmodell](../security/threat-model.md): Ein mit wertlosen Adressen aufgeblähter Pool
kostet den Keeper mehr Gas je Ziehung, nicht die Sparer ihre Preise, denn Adressen ohne
Beobachtung vor der Periode werden ohne jede verschlüsselte Arbeit übersprungen. Ist der
Keeper ausgefallen, kann jeder "Voranbringen" drücken, und weil der Durchlauf bei jeder
Ziehung an einem anderen Punkt startet, sitzt niemand dauerhaft am Ende.

## Ein Keeper je Pool

Einem Prozess wird über `HEARTH_ADDRESSES_FILE` gesagt, welchen Pool er antreibt, also über die
Adressdatei, die das Deployment dieses Pools geschrieben hat, die ihm auch das Tokenkürzel,
die Nachkommastellen und den Konto-Index zum Signieren gibt. `KEEPER_NAME` ist die Marke, die
jede Logzeile trägt. `packages/keeper/ecosystem.config.cjs` startet alle sieben unter pm2 auf
einer Maschine, je einen Prozess.

| pm2-Prozess | `HEARTH_ADDRESSES_FILE` | `KEEPER_ACCOUNT_INDEX` |
| --- | --- | --- |
| `hearth-keeper-usdc` | `hearth.json` | 1 |
| `hearth-keeper-usdt` | `hearth.usdt.json` | 10 |
| `hearth-keeper-weth` | `hearth.weth.json` | 11 |
| `hearth-keeper-bron` | `hearth.bron.json` | 12 |
| `hearth-keeper-zama` | `hearth.zama.json` | 13 |
| `hearth-keeper-tgbp` | `hearth.tgbp.json` | 14 |
| `hearth-keeper-xaut` | `hearth.xaut.json` | 15 |

Der `usdc`-Prozess zeigt auf `hearth.json` statt auf `hearth.usdc.json`, weil das die Datei
ist, die das erste Deployment geschrieben hat, bevor Pools Kürzel hatten, und weil der
laufende Keeper seit Tagen darauf gerichtet ist. Beide Dateien tragen dieselben Adressen.

Die Indizes liegen weit auseinander, damit ein späterer Pool ohne Neunummerierung dazukommen
kann, und jedes Konto braucht sein eigenes Sepolia-ETH. Index 0 ist der Deployer, und der
Keeper lehnt ihn ab.

## Wo die sieben Live-Keeper laufen

pm2 auf einem Laptop ist ein Weg, alle sieben zu betreiben, und er funktioniert weiterhin. Live
ist er nicht. Alle sieben Sepolia-Keeper laufen auf Railway, ein Service je Pool, ein
zugeklappter Laptop hält also keine Ziehung auf.

Ein Keeper ist ein dauerhaft laufender Prozess und keine geplante Funktion: ein Durchlauf kann
zwei Minuten damit verbringen, auf den Schlüsselverwaltungsdienst (KMS) zu warten, und das ist
länger, als die meisten Serverless-Plattformen zulassen. Jeder Host, der einen Node-Prozess am
Leben hält, genügt, und das Repository trägt die Konfiguration für diesen einen:

- `railway.json` im Wurzelverzeichnis des Repositorys treibt den `usdc`-Pool an.
- `railway/hearth-keeper-<slug>.json` treibt jeden der übrigen sechs an. Jeder Startbefehl setzt
  `KEEPER_NAME`, `KEEPER_ACCOUNT_INDEX` und `HEARTH_ADDRESSES_FILE` dieses Pools direkt darin,
  ein daraus gebauter Service braucht also nur `RECOVERY_PHRASE` und `SEPOLIA_RPC_URL`.

Der Build ist `npm run build -w @hearth/keeper` und der Start
`node packages/keeper/dist/src/index.js`, auf jedem Host. Die Vertrags-ABIs, die der Keeper
braucht, liegen eingecheckt unter `packages/keeper/abi`, ein Host, der die Verträge nie
kompiliert, führt ihn also trotzdem aus, und die Startprüfung vergleicht die geladene ABI mit
den Funktionen, die der Keeper aufruft, sodass eine Abweichung beim Start gemeldet wird und
nicht erst bei der ersten Transaktion. Die Adressdateien müssen aus demselben Grund eingecheckt
sein, und das sind sie, unter `packages/contracts/deployments/sepolia/`.

Betreiben Sie genau einen Prozess je Pool, wo immer er läuft. Zwei Keeper, die aus einem Konto
signieren, rennen um dieselbe Nonce, stoppen Sie also eine lokale Kopie, bevor Sie eine
gehostete für denselben Pool starten. Die Einrichtung Schritt für Schritt, Service für Service,
steht in der eigenen README des Keeper-Pakets, `packages/keeper/README.md`.

## Betrieb

Der Keeper ist das Paket `@hearth/keeper`. Er signiert mit einem Konto derselben
`RECOVERY_PHRASE`, die das Deployment nutzt, und liest `SEPOLIA_RPC_URL` aus
`packages/contracts/.env`; seine eigenen Einstellungen liegen in `packages/keeper/.env`:

```
HEARTH_ADDRESSES_FILE=../contracts/deployments/sepolia/hearth.weth.json
KEEPER_ACCOUNT_INDEX=11            # defaults to the index in the address file
KEEPER_NAME=weth                   # defaults to the slug in the address file
KEEPER_BATCH=4                     # savers of encrypted work per evaluate call
KEEPER_POLL_SECONDS=30
KEEPER_MAX_FEE_GWEI=20             # refuse to send above this
```

```
npm run compile -w @hearth/contracts    # the keeper reads the compiled ABI
npm run build -w @hearth/keeper
npm run plan -w @hearth/keeper          # one pass, simulates every call, sends nothing
npm run once -w @hearth/keeper          # one live pass
pm2 start packages/keeper/ecosystem.config.cjs   # all seven
pm2 logs hearth-keeper-weth                      # one pool
```

`plan` und `once` treiben den Pool an, auf den `HEARTH_ADDRESSES_FILE` zeigt, einen anderen
Pool zu prüfen ist also eine Variable vor dem Befehl. Wenn `HEARTH_VAULT` und `HEARTH_POOL`
aus einer Einzelpool-Einrichtung noch in `packages/keeper/.env` stehen, nehmen Sie sie
heraus: Sie werden vor der Adressdatei gelesen, alle sieben Prozesse würden also einen Pool
antreiben.

Ein Durchlauf loggt eine Zeile je Tatsache, und jede Zeile ist mit dem Pool markiert, den der
Prozess antreibt, sieben ineinander verschachtelte Logs bleiben also lesbar. Beträge tragen
das Kürzel und die Nachkommastellen dieses Pools, beides aus der Adressdatei gelesen:

```
09:14:37 [usdc] closed draw 41 (gas 1,422,474)
09:14:39 [usdc] draw 41: asking the relayer for the seed, the scale, the empty flag and the harvest
09:14:53 [usdc] awarded draw 41: 3 tiers, prizes 12.40 / 2.10 / 0.40 cUSDC, harvest 3.60 cUSDC (gas 435,578)
09:15:07 [usdc] evaluated draw 41: 4 of 9 savers done (gas 3,417,699)
09:15:38 [usdc] nothing to do: period 43, draw 41 has 8 of 9 savers evaluated
```

Der WETH-Prozess druckt dieselben Zeilen unter `[weth]`, in `cWETH`. Was jede Art von Zeile
bedeutet, Zeile für Zeile, steht im eigenen README des Keeper-Pakets,
`packages/keeper/README.md`.

Der Keeper ist zwischen den Takten zustandslos: Er liest den Ziehungszustand, den
Auswertungs-Cursor und den Abgleichtakt von der Blockchain und leitet daraus ab, was zu tun
ist. Ein Neustart verliert nichts. Betreiben Sie genau eine Instanz je Pool und nie zwei auf
einem Konto: Auf der Blockchain gelingt jeder Schritt genau einmal je Ziehung und je Stufe,
und zwei evaluate-Aufrufe schieben schlicht denselben Cursor weiter, aber zwei Keeper auf
einem Konto liefern sich ein Rennen um die Transaktions-Nonce.

## Was diese Seite nicht abdeckt

Sie deckt nicht ab, was die Transaktionen des Keepers mit dem Geld machen, das ist
[wie eine Ziehung abläuft](../concepts/how-a-draw-works.md). Sie deckt nicht das Ausrollen
ab, das ist [Deployment](deploying.md). Und sie gibt kein Verfügbarkeitsversprechen: Wir
betreiben einen Keeper, wir garantieren ihn nicht, und der Entwurf ist so gebaut, dass es
vertretbar ist, ihn nicht zu garantieren.
