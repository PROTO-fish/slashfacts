# Open-sourcing as SlashFacts

**Status:** Active


**Périmètre : étapes 1 à 5 bis.** L'étape 6 (App Store / Play Store via PROTO/fish) viendra plus tard.

## Contexte

Charles veut publier SLASH × en open source et le distribuer sur F-Droid. Avant ça, il faut :
- renommer l'app en **SlashFacts**, avec le wordmark **« / FACTS »** dans l'app ;
- créer un repo propre, avec un historique neuf ;
- mettre en place un nouveau déploiement web sur un domaine PROTO/fish ;
- produire des builds Android et iOS ;
- vérifier que tout le code et les assets sont compatibles FOSS.

**Décisions prises :**

| Sujet | Choix |
|---|---|
| Licence | GPL-3.0 |
| Historique git | Un seul commit initial, pas d'historique |
| Repo | `cpoisson/slashfacts`, privé pour l'instant |
| Icône | On garde la marque « /× », seul le wordmark change |

**État actuel :**
- Le repo `~/Projects/EduApp/slash-x` pointe sur `github.com/cpoisson/slash-x` (privé).
- Sur `main`, `railway.json` est modifié et `railpack.json` n'est pas suivi : il faut les intégrer au nouveau repo.
- `proto.fish` a son DNS chez **OVH** (A 51.91.236.255).

## 1. Renommage → SlashFacts / « / FACTS »

**Où travailler :** dans le repo actuel, sur une branche `feat/rename-slashfacts` en worktree, comme le demande AGENTS.md. On part de `main`, en y incluant le travail Railway pas encore commité.

**Règle de base :** « slash » reste le nom du **geste** et ne change pas. Ça concerne `useSlash`, `SlashPad`, `onSlash`, `slash/geometry.ts`, les textes du README sur le geste, etc. Seules les occurrences de la **marque** changent. Le scope du package `@slash/core` reste tel quel : c'est un nom interne, cohérent avec le geste, et le renommer toucherait tous les imports pour rien.

**Occurrences de la marque à modifier :**

| Fichier | Changement |
|---|---|
| `packages/core/src/brand.ts` | `name: '/ FACTS'` (wordmark), `fullName: 'SlashFacts'`. La tagline « SEE. REMEMBER. SLASH. » ne change pas. |
| `apps/web/public/manifest.webmanifest` | `name: "SlashFacts"`, `short_name: "/FACTS"` |
| `apps/web/index.html` | `<title>`, `og:title`, et les URL `og:image` / `twitter:image` qui pointent vers `https://slashfacts.proto.fish/logo.png` |
| `apps/web/public/privacy.html` | Le nom, plus l'éditeur « PROTO/fish » et un contact |
| `apps/web/src/storage/idb.ts` | `DB_NAME` devient `'slashfacts'` |
| `apps/mobile/src/storage/native.ts` | `DB_NAME` devient `'slashfacts.db'` |
| `apps/web/public/sw.js` | `CACHE` devient `'slashfacts-v1'` |
| `apps/web/server.js` | Le log de démarrage |
| `apps/mobile/app.json` | `name: "SlashFacts"`, `slug: "slashfacts"`, `ios.bundleIdentifier` et `android.package` = `fish.proto.slashfacts`. On ajoute `android.versionCode: 1`, qu'il faut dans le source pour F-Droid. |
| `package.json` racine | `name: "slashfacts"` |
| `README.md`, `AGENTS.md`, `AGENTS_INDEX.md`, `docs/` | Le titre, `../slashfacts-worktrees/`, et la mention d'un bundle ID placeholder qui disparaît |

**Le renommage des bases de données ne fait rien perdre :**
- Sur le web, le nouveau domaine est une nouvelle origine, donc l'IndexedDB repart de zéro de toute façon.
- Sur mobile, l'app n'a encore aucun utilisateur.

**Le wordmark :** vérifier le rendu de « / FACTS » avec le style `.wordmark` (web) et `styles.wordmark` (mobile, `FONTS.blackWider`). Une barre plus un espace dans une Archivo Black très étirée peuvent paraître trop espacés. Si besoin, on règle l'espace dans la chaîne ou le letter-spacing dans le style ; la taille de police ne bouge pas.

**Nettoyage :**
- Supprimer `apps/mobile/LICENSE`. C'est la licence MIT d'Expo, venue avec le template, et elle serait trompeuse.
- Ne pas commiter `apps/mobile/dist`.

**Vérification :**
- `npm run typecheck && npm test`
- `npm run build`
- `npx expo export -p android -p ios` dans `apps/mobile`
- `git grep -i -E "slash ?[x×]|slash-x|slashx"` ne doit plus renvoyer que l'historique volontaire de `docs/plans`.

## 2. Nouveau repo privé `cpoisson/slashfacts` (historique neuf)

1. On ajoute au snapshot les fichiers open source :
   - `LICENSE` : texte complet de la GPL-3.0 ;
   - `COPYING.fonts` ou un renvoi vers `apps/mobile/assets/fonts/OFL.txt`, qui couvre aussi le woff2 Archivo du web (copier `OFL.txt` dans `apps/web/public/fonts/`) ;
   - dans le README : une section Licence et une section Contribuer.
   - **Il faut un DCO dès le départ** (`Signed-off-by`), sinon les contributions externes en GPL compliqueront l'étape 6 (App Store).
2. `git archive feat/rename-slashfacts | tar -x -C ~/Projects/EduApp/slashfacts`, puis `git init` et un seul commit `feat: initial public release of SlashFacts`. Ce commit est signé avec l'email noreply GitHub `cpoisson@users.noreply.github.com`, pas l'email perso.
3. `gh repo create cpoisson/slashfacts --private --source . --push`, avec comme description « Multiplication tables 2–9. Slash the answer. ».
4. Recopier le worktree convention (`../slashfacts-worktrees/`). Mettre à jour la mémoire : le projet a changé de nom et de chemin.
5. **Le repo `cpoisson/slash-x` est archivé seulement après la bascule web (étape 3).** On ne le supprime pas.

## 3. Railway : nouveau service

**Mise en place :**
- Créer un nouveau projet ou service Railway `slashfacts`, relié au repo GitHub `cpoisson/slashfacts` avec déploiement automatique sur `main`.
- `railway.json` et `railpack.json` sont repris tels quels.
- Générer le domaine Railway `slashfacts.up.railway.app`.

**Vérification :** l'app se charge, le service worker s'enregistre, `/privacy.html` répond 200.

**L'ancien service `slash-x` :**
- On le laisse tourner jusqu'à ce que la nouvelle URL soit validée.
- Ensuite, on remplace son contenu par un 301 vers `https://slashfacts.proto.fish` (une petite variable ou branche de `server.js`), ou on le supprime si personne ne l'utilise. **On demande à Charles avant de supprimer quoi que ce soit.**

## 3 bis. Domaine PROTO/fish

**Domaine principal : `slashfacts.proto.fish`**
1. Ajouter le domaine custom dans Railway.
2. Dans la zone DNS OVH de `proto.fish` : un CNAME `slashfacts` vers la cible donnée par Railway, plus le TXT de vérification si Railway le demande. **C'est Charles qui le fait dans le manager OVH**, sauf s'il me donne un accès API.
3. Attendre que le certificat soit émis (`domain_status`).

**`proto.fish/slashfacts` : une simple redirection 301 vers le sous-domaine**
- On ne sert pas l'app sous ce chemin, parce qu'il faudrait :
  - un reverse proxy sur l'hébergement OVH ;
  - un `base` Vite différent ;
  - un scope différent pour le service worker et le manifest.
- Si `proto.fish` est un hébergement mutualisé OVH (Apache), la redirection tient en une ligne dans un `.htaccess` :
  ```
  Redirect 301 /slashfacts https://slashfacts.proto.fish/
  ```
- Charles la dépose, ou me donne un accès FTP.

## 4. Builds Android et iOS avec Expo

**Prérequis côté Charles :** `npx eas-cli login` sur son compte Expo. Ensuite, `eas init` crée le projet EAS `slashfacts` et écrit `extra.eas.projectId` dans `app.json`.

**Changement dans `eas.json` :** passer `appVersionSource` à `"local"`. La version et le versionCode vivent alors dans `app.json`, ce qui permet à F-Droid de les lire depuis les tags git. Le profil `production` garde `autoIncrement` désactivé ; on incrémente à la main au moment du tag.

**Android :**

| Build | Commande | Usage |
|---|---|---|
| APK de test | `eas build -p android --profile preview` | APK installable directement sur le téléphone |
| Build local | `npx expo prebuild -p android --clean && cd android && ./gradlew assembleRelease` | **Répète exactement ce que fera F-Droid.** Nécessite Android Studio / le SDK en local. |

- `android/` et `ios/` restent dans `.gitignore`, car ils sont générés par `expo prebuild` (CNG).

**iOS :**
- Sans compte Apple Developer, on ne peut pas construire pour un vrai iPhone.
- D'ici là, deux options :
  - un **build simulateur** : profil `ios-simulator` avec `"ios": { "simulator": true }`, puis `eas build -p ios --profile ios-simulator` ;
  - **Expo Go** sur l'iPhone, qui reste la boucle de test actuelle.
- Le build pour appareil / TestFlight relève de l'étape 6.

**Vérification :** l'APK s'installe et tourne sur un téléphone Android. On contrôle :
- les gestes ;
- les haptiques ;
- la persistance après avoir tué l'app ;
- le nom « SlashFacts » sous l'icône ;
- le wordmark « / FACTS ».

## 5. Audit des licences pour F-Droid (auteur : PROTO/fish)

**Dépendances JS :**
- Lancer `npx license-checker-rseidelsohn --production --summary` pour chaque workspace.
- Il faut uniquement des licences compatibles GPL-3 : MIT, BSD, Apache-2.0, ISC, OFL pour les polices.
- Signaler tout résultat UNKNOWN ou non libre.
- Les dépendances actuelles ne montrent aucun SDK propriétaire : expo, expo-sqlite, expo-haptics, expo-font, expo-splash-screen, RNGH, reanimated, react-native-svg, safe-area-context.

**Dépendances Android natives :**
- Après le prebuild, lancer `./gradlew :app:dependencies --configuration releaseRuntimeClasspath`.
- Chercher `com.google.android.gms`, `firebase`, `com.google.android.play`, `installreferrer` et tout artefact hors Maven Central / Google Maven.
- Lancer ensuite **`fdroid scanner`** (fdroidserver, via Docker) sur le code source après prebuild. Il détecte les blobs binaires et les dépôts non libres.

**Points précis à vérifier :**

| Point | Ce qu'il faut confirmer |
|---|---|
| `expo-modules-core` et l'autolinking | Aucune dépendance Play Services n'est tirée |
| Hermes / React Native | Artefacts prébuilds venant de Maven Central : accepté par F-Droid, à confirmer avec le scanner |
| Télémétrie | Rien d'embarqué ; `EXPO_NO_TELEMETRY=1` pendant le build |
| Polices | Archivo est sous OFL : le texte `OFL.txt` doit accompagner les deux copies |
| Icônes | Créées par Charles, donc sous GPL avec le reste (ou CC-BY-SA, à préciser dans le README) |

**Anti-features attendues :** aucune. Pas de réseau, pas de pistage, pas de non-free.

**Livrable :** `docs/licensing-audit.md`, avec pour chaque dépendance sa licence et son statut, les résultats du scanner et les anti-features.

## 5 bis. Publication F-Droid (dépôt officiel)

**Préparer le repo `slashfacts` :**
- Ajouter `fastlane/metadata/android/{en-US,fr-FR}/` :
  - `title.txt`
  - `short_description.txt`
  - `full_description.txt`
  - `images/icon.png`
  - `images/phoneScreenshots/*.png`
  - `changelogs/1.txt`
- Tag `v1.0.0` avec `version 1.0.0` / `versionCode 1` dans `app.json`.

**Brouillon de recette `metadata/fish.proto.slashfacts.yml` (fdroiddata) :**
```yaml
Categories: [Science & Education]
License: GPL-3.0-only
AuthorName: PROTO/fish
SourceCode: https://github.com/cpoisson/slashfacts
IssueTracker: https://github.com/cpoisson/slashfacts/issues
AutoName: SlashFacts
RepoType: git
Repo: https://github.com/cpoisson/slashfacts.git
Builds:
  - versionName: 1.0.0
    versionCode: 1
    commit: v1.0.0
    subdir: apps/mobile/android/app
    sudo: [apt-get update, apt-get install -y nodejs npm]   # version Node alignée sur Expo 57
    init: cd ../../../.. && npm ci
    prebuild: cd ../.. && EXPO_NO_TELEMETRY=1 npx expo prebuild -p android --no-install --clean
    gradle: [yes]
AutoUpdateMode: Version
UpdateCheckMode: Tags
CurrentVersion: 1.0.0
CurrentVersionCode: 1
```

**Tester la recette en local :** image Docker `fdroidserver`, puis :
1. `fdroid readmeta`
2. `fdroid lint fish.proto.slashfacts`
3. `fdroid build -v -l fish.proto.slashfacts`

On itère jusqu'à obtenir un build vert.

**Prérequis bloquant : le repo doit être public.** F-Droid construit depuis le code source et refuse les repos privés.
- Le passer public (`gh repo edit --visibility public`) seulement une fois l'audit de l'étape 5 vert.
- **Je demande à Charles avant de le faire**, car c'est irréversible.

**Soumission :**
- Faire un fork de `gitlab.com/fdroid/fdroiddata`, puis ouvrir une MR avec la recette.
- Il faut un compte GitLab au nom de Charles : **c'est lui qui ouvre la MR**, je prépare tout.
- Compter plusieurs semaines de revue.

**Plan B, si la revue traîne :** un dépôt F-Droid auto-hébergé PROTO/fish, par exemple `fdroid.proto.fish`, via `fdroid init` / `fdroid update` sur Railway ou OVH. Il est utilisable tout de suite en ajoutant le dépôt dans le client F-Droid.

## Actions que seul Charles peut faire

| Étape | Action |
|---|---|
| 3 bis | CNAME dans la zone DNS OVH, et `.htaccess` sur `proto.fish` |
| 4 | `eas login`, puis installer l'APK sur un appareil pour valider |
| 5 bis | Décider de passer le repo en public, créer le compte GitLab et ouvrir la MR fdroiddata |

## Progress log

- **2026-09-24 — Steps 1–2 done.** Renamed to SlashFacts (`/ FACTS` wordmark, bundle id
  `fish.proto.slashfacts`), relicensed GPL-3.0, fresh-history repo `cpoisson/slashfacts`
  (private). Railway project `slashfacts` created: `slashfacts.up.railway.app`, custom
  domain `slashfacts.proto.fish` awaiting OVH DNS records.
- **2026-09-24 — Steps 3–5 bis prepared.** Web live on `slashfacts.up.railway.app`
  (railpack install step fixed to copy sources first). EAS project `@cpoisson/slashfacts`
  linked; iOS simulator build finished, Android preview APK queued. Local
  `expo prebuild` + `gradlew assembleRelease` succeeds; release APK asks for `VIBRATE` only,
  `fdroid scanner` clean — see `docs/licensing-audit.md`. F-Droid recipe draft in
  `docs/fdroid/` uses a custom `build:`/`output:` (the `android/` dir only exists after
  prebuild, and fdroidserver requires `subdir` to exist at checkout) and strips debug
  signing from release. fastlane metadata (en-US, fr-FR) added; screenshots still missing.
  Remaining: OVH DNS records, Railway GitHub access for auto-deploy, device test of the
  APK, screenshots, `v1.0.0` tag, repo public, fdroiddata MR.
