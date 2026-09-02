package expo.modules.copilotoaccessibility

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Módulo Expo do Copiloto — a ponte JS ↔ nativo descrita em
 * `modules/copiloto-accessibility/index.ts`.
 *
 * As funções de permissão (`isAccessibilityServiceEnabled`, `hasOverlayPermission`,
 * etc.) são consultas/atalhos simples pras APIs padrão do Android. As mais
 * importantes de entender são `startWatching`/`stopWatching`: como o Android
 * quem controla o ciclo de vida de um `AccessibilityService` (o app NÃO pode
 * iniciar/parar o serviço diretamente — só o usuário, na tela de
 * Configurações > Acessibilidade), o serviço em si roda sempre que a
 * permissão estiver concedida, independente do app estar aberto. Por isso
 * `startWatching`/`stopWatching` não ligam nem desligam o serviço: elas só
 * gravam um "sinal verde" (flag) em SharedPreferences que
 * `CopilotoAccessibilityService` lê antes de processar qualquer evento de
 * tela. É assim que o toggle "Copiloto ativo" da UI consegue pausar a
 * detecção sem exigir que a pessoa desligue a permissão de Acessibilidade
 * nas Configurações do sistema toda vez.
 */
class CopilotoAccessibilityModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CopilotoAccessibility")

    Events("onRideDetected")

    OnCreate {
      // Enquanto o módulo JS existir (app em primeiro ou segundo plano com o
      // runtime JS vivo), repassamos as corridas detectadas pelo serviço via
      // `sendEvent`. A bolha flutuante em si é desenhada pelo serviço direto
      // (`OverlayManager`), então continua funcionando mesmo se este listener
      // não estiver setado (app fechado).
      CopilotoAccessibilityService.eventListener = { rideData ->
        sendEvent("onRideDetected", rideData)
      }
    }

    OnDestroy {
      CopilotoAccessibilityService.eventListener = null
    }

    AsyncFunction<Boolean>("isAccessibilityServiceEnabled") {
      isAccessibilityServiceEnabled(context)
    }

    AsyncFunction("openAccessibilitySettings") {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction<Boolean>("hasOverlayPermission") {
      hasOverlayPermission(context)
    }

    AsyncFunction("requestOverlayPermission") {
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${context.packageName}")
      ).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
    }

    AsyncFunction("startWatching") {
      CopilotoAccessibilityService.setWatchingEnabled(context, true)
    }

    AsyncFunction("stopWatching") {
      CopilotoAccessibilityService.setWatchingEnabled(context, false)
    }

    // Espelha a config do card (posição, cores, quais infos mostrar, opacidade, tempo de
    // exibição, fonte) pra SharedPreferences — o `OverlayManager` roda dentro do
    // AccessibilityService, que continua vivo independente do runtime JS (app fechado
    // inclusive), então ele lê a config de lá em vez de depender de uma ponte ativa com o
    // React Native. Ver `OverlayConfigRecord` pro formato aceito (espelha `CopilotoConfig`
    // de `lib/copiloto.ts`) e `OverlayManager.OverlayConfig` pra leitura/aplicação de fato.
    AsyncFunction("setOverlayConfig") { config: OverlayConfigRecord ->
      CopilotoAccessibilityService.setOverlayConfigJson(context, config.toJson())
    }

    // Correção 12 (28/08) — "modo diagnóstico": depois do primeiro teste real mostrar
    // NENHUM dos 5 apps detectando nada, precisávamos de um jeito de enxergar o que o
    // serviço está realmente vendo sem depender de `adb logcat` (que a Ana não tem
    // configurado). A tela do Copiloto usa isto pra mostrar, em texto simples, se o
    // serviço está rodando, quantos eventos de tela ele já viu, e o último texto bruto
    // capturado de um app suportado — mesmo quando o parser não reconhece nada como oferta.
    AsyncFunction<Map<String, Any?>>("getDiagnostics") {
      CopilotoAccessibilityService.getDiagnosticsSnapshot(context)
    }
  }

  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "Contexto React indisponível." }

  /**
   * Confere se `CopilotoAccessibilityService` está na lista de serviços de
   * acessibilidade habilitados pelo usuário. Comparamos `ComponentName` a
   * `ComponentName` (não substring) pra evitar falso positivo/negativo com
   * nomes parecidos de outros apps/serviços.
   */
  private fun isAccessibilityServiceEnabled(context: Context): Boolean {
    val expected = ComponentName(context, CopilotoAccessibilityService::class.java)
    val enabledServices = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false

    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabledServices)
    while (splitter.hasNext()) {
      val enabled = ComponentName.unflattenFromString(splitter.next())
      if (enabled != null && enabled == expected) {
        return true
      }
    }
    return false
  }

  private fun hasOverlayPermission(context: Context): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      // Abaixo do Android 6.0 a permissão de overlay é concedida na instalação.
      true
    }
}
