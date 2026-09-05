# Statische Analyse

Jeder Vertrag läuft vor einem Deployment durch slither 0.11.6 und solhint, und jeder Befund
wird entweder behoben oder hier erklärt. Die sieben Pools sind sieben Deployments derselben
drei Verträge, ein Lauf deckt also alle ab. Diese Seite ist die Erklärung. Der rohe Lauf ist
wiederholbar:

```bash
npm run lint -w @hearth/contracts
```

für solhint, das mit null Warnungen auf dem abgestimmten Regelsatz in `.solhint.json`
durchläuft, und für slither ein einfacher Kompilierlauf derselben Quellen ohne das
FHEVM-Hardhat-Plugin, weil das Plugin `ZamaConfig.sol` beim Kompilieren umschreibt und
slither Quellpositionen dann nicht mehr auf die Datei auf der Festplatte abbilden kann. Der
einfache Kompilierlauf nutzt identische Compiler-Einstellungen (0.8.27, Optimizer auf 800
Läufe, cancun), der Bytecode, den slither liest, ist also der Bytecode, der ausgeliefert
wird.

## Der Lauf

slither analysierte 46 Verträge mit 102 Detektoren und meldete 88 Ergebnisse, 85 davon in
Hearths eigenen Verträgen. Keines ist ein Fehler. Sie fallen in fünf Familien, und jede
Familie hat einen Grund.

| Familie | Anzahl | Schweregrad laut slither | Warum es kein Befund ist |
| --- | --- | --- | --- |
| `unused-return` | 38 | Mittel | 36 davon sind `FHE.allow`, `FHE.allowThis`, `FHE.allowTransient` und `FHE.makePubliclyDecryptable`, die das übergebene Handle zurückgeben, damit sich Aufrufe verketten lassen. Diesen Rückgabewert zu ignorieren ist die dokumentierte Nutzung in jedem Zama-Beispiel. Die anderen beiden stehen unten. |
| `reentrancy-no-eth`, `reentrancy-benign`, `reentrancy-events` | 20 | Mittel und niedrig | slither behandelt jede `FHE.*`-Operation als externen Aufruf, denn jede ist ein Aufruf in den Koprozessor-Vertrag. Diese Aufrufe tragen Chiffrat-Handles, keine Kontrolle, und kein Nutzervertrag läuft in ihnen. Die echt externen Aufrufe sind der Token und der Vault, beide beim Bau festgelegt, und jede Funktion, die Wert bewegt, ist `nonReentrant` und schreibt ihren Zustand vor dem Transfer. |
| `timestamp` und `incorrect-equality` | 18 | Niedrig und mittel | Perioden sind absichtlich über `block.timestamp` definiert, und die strikten Gleichheiten vergleichen Periodennummern und Nullkennzeichen, nie Guthaben. Ein Validator kann einen Zeitstempel um Sekunden verschieben, gegen Perioden von einer oder sechs Stunden, was das Gewicht eines Sparers um so viele Sekunden von 3.600 oder 21.600 verschiebt. |
| `uninitialized-local` | 8 | Mittel | Akkumulatoren und Zähler, die absichtlich bei Soliditys Standardwert null beginnen: `offered`, `assigned`, `totalShares`, `processed`, `heavy`, `marked`, `cleared`. `harvestHandle` wird auf jedem Pfad des try/catch zugewiesen, das auf seine Deklaration folgt. |
| `calls-loop` | 1 | Niedrig | `finalizeDraw` fragt den Pool nach dem Abgleichtakt jeder der drei Stufen. Die Schleife ist bei drei begrenzt und der Pool ist der eigene des Vaults, einmal vom Eigentümer gesetzt. |

Die zwei `unused-return`-Ergebnisse, die keine Zugriffssteuerungs-Aufrufe sind:

- `HearthVault._withdraw` ignoriert das Handle, das `confidentialTransfer` zurückgibt. Ein
  ERC-7984-Transfer bewegt den ganzen Betrag oder nichts, und der Vault hat den Betrag in
  derselben Transaktion bereits auf den kleineren Wert von dem, was der Sparer hält, und dem,
  was der Vault hält, begrenzt, der transferierte Betrag ist also von Bauart her der
  verlangte Betrag. Das Kontobuch wurde vor dem Aufruf aktualisiert.
- `SponsoredYieldSource.sponsor` ignoriert, was `wrap` zurückgibt. Der Sponsor ist hier per
  Definition die vertraute Partei, und was der Pool bei einem Abschluss verbucht, ist nie die
  eigene Zahl des Sponsors, sondern der KMS-geprüfte Betrag, den die Quelle bei der Ernte
  tatsächlich transferiert hat.

## Was slither nicht sehen kann

slither denkt über Klartext-Kontrollfluss nach. Es kann nicht erkennen, ob ein
verschlüsselter Vergleich der richtige Vergleich ist, ob eine Gewährung auf der Zugriffsliste
fehlt, oder ob ein Wert veröffentlicht wird, der es nicht sollte. Diese Eigenschaften decken
die Unit-Tests, die Fairness- und Invariantentests und die ausgeführten Angriffsskripte im
[Bedrohungsmodell](threat-model.md) ab.

## Abhängigkeits-Audit

`npm audit --omit=dev` im Wurzelverzeichnis des Repositorys meldet am 6. September 2026 zwei
Befunde, beide in `axios` und beide in Code, den die App nie ausführt:

- `axios@0.21.4` unter `hardhat-deploy@0.11.45`, im Vertragspaket. Es ist Deployment-Werkzeug,
  das auf der Maschine des Betreibers läuft und nie in einem Bundle ausgeliefert wird.
  `hardhat-deploy` 0.11 legt die 0.21-Linie fest, die einzige Behebung ist also ein
  Major-Upgrade des Deploy-Werkzeugs, und das würde die Deployment-Aufzeichnungen ändern, auf
  die sich dieses Repository stützt.
- `axios` unter `@coinbase/cdp-sdk`, das `@wagmi/connectors` mit dem WalletConnect-Connector
  hereinzieht. Hearth importiert axios nie und ruft Coinbases SDK nie auf; die Meldungen
  betreffen serverseitige Proxy-Behandlung und Request Forgery in Node, nicht ein
  Browser-Bundle. `npm audit fix` verschiebt die verschachtelte Kopie auf eine andere
  verwundbare Version statt aus dem Bereich heraus, sie bleibt also so, wie der Lockfile sie
  festhält.

Das web-Paket für sich, mit entferntem Connector, läuft sauber durch das Audit, und so kam die
Zahl von null Befunden vom 3. September zustande.
