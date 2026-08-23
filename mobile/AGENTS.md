# Expo HAS CHANGED

O projeto foi rebaixado pra Expo SDK 54 em 21/08/2026 — não é preferência, é a única
versão que a Expo garante hoje nas duas lojas. Confirmado no changelog oficial:
https://expo.dev/changelog/expo-go-and-app-store-may-2026 diz que só o SDK 54 continua
disponível tanto na App Store quanto na Play Store; o changelog do SDK 56
(https://expo.dev/changelog/sdk-56) confirma que "Expo Go for SDK 56 is not available on
the Apple App Store or Google Play Store", sem previsão de data. SDK 57 (lançado em
30/06/2026) está na mesma situação. Antes fixamos em 56 achando que era o problema (57
incompatível), mas o Expo Go real da loja nem chegava a 56 — por isso o login não
carregava no celular.

Antes de subir o SDK de novo, confira a política atual do Expo Go nas lojas (não confie
no que está escrito aqui — a situação muda com frequência):
https://expo.dev/changelog — procure por posts com "Expo Go" no título.

## Downgrade de SDK 56 → 54: como terminar

Já editei `expo` pra `~54.0.0` no `package.json`, mas as outras deps (react, react-native,
expo-router etc.) ainda estão nas versões do SDK 56/57 — o `expo install --fix` corrige
isso lendo o `bundledNativeModules.json` da versão instalada do pacote `expo`. Rode no
PowerShell (não CMD — `rmdir` de CMD já causou erro aqui antes):

```powershell
cd mobile
Remove-Item -Recurse -Force node_modules, package-lock.json, .expo
npm install expo@54
npx expo install --fix
npm install
npx expo start -c
```

Se o `npm install expo@54` ou o `npx expo install --fix` reclamar de peer deps mesmo com
`legacy-peer-deps=true` no `.npmrc`, rode com `--force` só nesse passo específico.

Depois do `expo start -c` abrir o QR code, escaneie com o Expo Go instalado via loja
(não precisa reinstalar o app, só abrir o projeto de novo).

Leia a documentação exata da versão em uso antes de escrever código:
https://docs.expo.dev/versions/v54.0.0/
