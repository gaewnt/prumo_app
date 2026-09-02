const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Precisa bater exatamente com o pacote + nome de classe de
// `modules/copiloto-accessibility/android/.../CopilotoAccessibilityService.kt`.
const SERVICE_CLASS_NAME = "expo.modules.copilotoaccessibility.CopilotoAccessibilityService";

const OVERLAY_PERMISSION = "android.permission.SYSTEM_ALERT_WINDOW";

// Mesma lista de `SUPPORTED_APPS` em `lib/copiloto.ts` — o Copiloto só deve
// poder ler a tela desses 5 apps, nunca "todos os apps instalados".
//
// Pacote da MT Entregas confirmado via link da ficha na
// Play Store (play.google.com/store/apps/details?id=br.com.mtentregas.taxi.taximachine).
const TARGET_PACKAGES = [
  "com.ubercab.driver",
  "com.app99.driver",
  "sinet.startup.inDriver",
  "br.com.brainweb.ifood",
  "br.com.mtentregas.taxi.taximachine",
];

/**
 * Config plugin do Copiloto.
 *
 * `app.json` usa a config gerenciada do Expo — a pasta `android/` nativa é
 * recriada do zero a cada `expo prebuild` (dev build, EAS build, etc.). Um
 * `AccessibilityService` só existe de verdade pro Android se 3 coisas
 * estiverem no `AndroidManifest.xml` final, então é isso que este plugin
 * garante, toda vez que o prebuild roda:
 *
 * 1. A permissão SYSTEM_ALERT_WINDOW (overlay/"Exibir sobre outros apps") —
 *    ela só habilita a pessoa a IR na tela do sistema e conceder o overlay
 *    manualmente; não concede nada sozinha.
 * 2. O `<service>` do `CopilotoAccessibilityService`, com
 *    `android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"`
 *    (exigência do Android pra qualquer AccessibilityService), o
 *    intent-filter que o identifica como tal, e o `<meta-data>` que aponta
 *    pro XML de configuração do serviço.
 * 3. Esse XML em si (`res/xml/accessibility_service_config.xml`), que diz
 *    pro Android quais eventos o serviço quer receber e de quais apps —
 *    só os 5 suportados pelo Copiloto (ver `TARGET_PACKAGES`; um deles, MT
 *    Entregas, ainda com pacote não confirmado — ver comentário lá), nunca
 *    leitura geral da tela.
 *
 * Ativar/desligar o serviço em si continua sendo manual, feito pela pessoa
 * em Configurações > Acessibilidade — nada aqui liga isso sozinho. Ver
 * `CopilotoAccessibilityModule.kt` (funções `isAccessibilityServiceEnabled`
 * / `openAccessibilitySettings` / `hasOverlayPermission` /
 * `requestOverlayPermission`) pro fluxo que leva a pessoa até lá.
 */
const withCopilotoAccessibility = (config) => {
  config = AndroidConfig.Permissions.withPermissions(config, [OVERLAY_PERMISSION]);
  config = withCopilotoAccessibilityServiceManifest(config);
  config = withAccessibilityServiceConfigXml(config);
  return config;
};

function withCopilotoAccessibilityServiceManifest(config) {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);

    if (!Array.isArray(application.service)) {
      application.service = [];
    }

    // Idempotente: se o prebuild rodar de novo, substitui a entrada em vez
    // de duplicar o <service>.
    application.service = application.service.filter(
      (service) => service?.$?.["android:name"] !== SERVICE_CLASS_NAME
    );

    application.service.push({
      $: {
        "android:name": SERVICE_CLASS_NAME,
        "android:label": "Prumo Copiloto",
        "android:permission": "android.permission.BIND_ACCESSIBILITY_SERVICE",
        "android:exported": "true",
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": "android.accessibilityservice.AccessibilityService",
              },
            },
          ],
        },
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.accessibilityservice",
            "android:resource": "@xml/accessibility_service_config",
          },
        },
      ],
    });

    return config;
  });
}

function withAccessibilityServiceConfigXml(config) {
  return withDangerousMod(config, [
    "android",
    async (config) => {
      const xmlDir = path.join(config.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      fs.mkdirSync(xmlDir, { recursive: true });

      const xmlPath = path.join(xmlDir, "accessibility_service_config.xml");
      const packageNames = TARGET_PACKAGES.join(",");

      const contents = `<?xml version="1.0" encoding="utf-8"?>
<!-- Gerado pelo config plugin plugins/withCopilotoAccessibility.js — não editar direto, ele é sobrescrito a cada "expo prebuild". -->
<!--
  "flagRetrieveInteractiveWindows" adicionado depois de um
  teste real em aparelho: NENHUM dos 5 apps detectava nada (nao so a MT Entregas). Causa
  mais provavel: cards de oferta de corrida costumam aparecer numa janela SEPARADA
  sobreposta ao app (um alerta/overlay), nao como parte da janela "ativa" - e sem essa
  flag, o servico so enxerga a arvore de acessibilidade da janela ativa
  (rootInActiveWindow), nunca as demais. Com a flag, o servico tambem lista todas as
  janelas interativas (windows) e confere cada uma - ver
  CopilotoAccessibilityService.onAccessibilityEvent.
-->
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowContentChanged|typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:notificationTimeout="100"
    android:canRetrieveWindowContent="true"
    android:accessibilityFlags="flagRetrieveInteractiveWindows"
    android:packageNames="${packageNames}" />
`;

      fs.writeFileSync(xmlPath, contents, "utf-8");

      return config;
    },
  ]);
}

module.exports = withCopilotoAccessibility;
