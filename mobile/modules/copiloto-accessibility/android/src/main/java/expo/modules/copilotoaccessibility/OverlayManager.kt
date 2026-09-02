package expo.modules.copilotoaccessibility

import android.content.Context
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.LinearLayout
import android.widget.TextView
import org.json.JSONObject
import java.util.Locale

/**
 * Bolha(s) flutuante(s) (WindowManager + TYPE_APPLICATION_OVERLAY) que mostram o valor
 * detectado — e, dependendo da config, R$/km, R$/hora, R$/min, totais e paradas — pra
 * pessoa conferir de relance, sem precisar abrir o Prumo.
 *
 * TUDO sobre a aparência do card (posição, design, cores, quais campos mostrar, tempo de
 * exibição, opacidade, tamanho da fonte, se empilha ofertas simultâneas) vem de
 * `OverlayConfig`, lido de SharedPreferences a cada `mostrar()` — quem grava essa config é
 * `CopilotoAccessibilityModule.setOverlayConfig`, chamado pelo JS toda vez que a pessoa muda
 * alguma coisa na tela de configuração do Copiloto (ver `app/(app)/modulo/veiculo-copiloto.tsx`).
 * Se a config nunca foi gravada (ou o JSON salvo não parsear por algum motivo), caímos nos
 * defaults abaixo — os MESMOS de `DEFAULT_COPILOTO_CONFIG` em `lib/copiloto.ts`.
 *
 * As contas de R$/km, R$/hora e R$/min são recalculadas aqui em cima do valor bruto
 * detectado — mesma matemática de `calculateRide` em `lib/copiloto.ts` (divisão simples,
 * `null` se o denominador for `null`/zero) — pra esse card nativo não depender de nenhuma
 * ponte ativa com o React Native pra existir (o AccessibilityService roda independente do
 * app estar aberto).
 *
 * LIMITAÇÃO CONHECIDA: `showCustoTotal`/`showCustoKm`/`showLucro` (custo e lucro da
 * corrida, que dependem dos custos do veículo cadastrado — km rodado, custo fixo mensal
 * etc.) NÃO são renderizados por este overlay nativo. Esses dados vivem só no banco/lado
 * JS (`lib/veiculo.ts`) e `CopilotoConfig`/`setOverlayConfig` não carrega nenhum valor de
 * custo do veículo pro nativo — só os togles de "mostrar ou não". Renderizar essas linhas
 * de verdade exigiria estender `CopilotoConfig`/`setOverlayConfig` pra também mandar os
 * números de custo (ou o próprio R$/km de custo já calculado) toda vez que o veículo ativo
 * mudar — não só quando a config do card muda. Por enquanto essas 3 chaves ficam
 * silenciosamente sem efeito no overlay nativo (a calculadora manual e a lista "Corridas
 * detectadas" dentro do app, do lado JS, continuam mostrando isso normalmente).
 */
class OverlayManager(private val context: Context) {

  /** Espelho de `CopilotoConfig` (`lib/copiloto.ts`) já com os defaults de `DEFAULT_COPILOTO_CONFIG`. */
  data class OverlayConfig(
    val enabled: Boolean = false,
    val position: String = "centro",
    val design: String = "tradicional",
    val colorScheme: String = "escuro",
    val showValorKm: Boolean = true,
    val showValorHora: Boolean = true,
    val showValorMin: Boolean = true,
    val showTotais: Boolean = true,
    val showParadas: Boolean = true,
    val showCustoTotal: Boolean = false,
    val showCustoKm: Boolean = false,
    val showLucro: Boolean = false,
    val displaySeconds: Int = 12,
    val opacityPct: Int = 100,
    val fontSize: String = "media",
    val stackSimultaneous: Boolean = true,
  ) {
    companion object {
      private const val TAG = "CopilotoOverlayConfig"

      /** Lê e valida a config salva; qualquer ausência/erro de parsing cai nos defaults acima. */
      fun load(context: Context): OverlayConfig {
        val json = CopilotoAccessibilityService.getOverlayConfigJson(context) ?: return OverlayConfig()
        return try {
          val obj = JSONObject(json)
          val defaults = OverlayConfig()
          OverlayConfig(
            enabled = obj.optBoolean("enabled", defaults.enabled),
            position = obj.optString("position", defaults.position),
            design = obj.optString("design", defaults.design),
            colorScheme = obj.optString("colorScheme", defaults.colorScheme),
            showValorKm = obj.optBoolean("showValorKm", defaults.showValorKm),
            showValorHora = obj.optBoolean("showValorHora", defaults.showValorHora),
            showValorMin = obj.optBoolean("showValorMin", defaults.showValorMin),
            showTotais = obj.optBoolean("showTotais", defaults.showTotais),
            showParadas = obj.optBoolean("showParadas", defaults.showParadas),
            showCustoTotal = obj.optBoolean("showCustoTotal", defaults.showCustoTotal),
            showCustoKm = obj.optBoolean("showCustoKm", defaults.showCustoKm),
            showLucro = obj.optBoolean("showLucro", defaults.showLucro),
            displaySeconds = obj.optInt("displaySeconds", defaults.displaySeconds).coerceIn(1, 30),
            opacityPct = obj.optInt("opacityPct", defaults.opacityPct).coerceIn(0, 100),
            fontSize = obj.optString("fontSize", defaults.fontSize),
            stackSimultaneous = obj.optBoolean("stackSimultaneous", defaults.stackSimultaneous),
          )
        } catch (e: Exception) {
          Log.w(TAG, "Config de overlay salva não parseou, usando defaults", e)
          OverlayConfig()
        }
      }
    }
  }

  /** Cálculo espelhando `calculateRide` de `lib/copiloto.ts` (divisão simples, `null` se sem denominador). */
  private data class Calculo(val porKm: Double?, val porHora: Double?, val porMin: Double?)

  private fun calcular(valor: Double, distanciaKm: Double?, duracaoMin: Double?): Calculo {
    val porKm = if (distanciaKm != null && distanciaKm > 0) valor / distanciaKm else null
    val porMin = if (duracaoMin != null && duracaoMin > 0) valor / duracaoMin else null
    val porHora = porMin?.times(60.0)
    return Calculo(porKm, porHora, porMin)
  }

  private val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
  private val hideHandler = Handler(Looper.getMainLooper())

  private class OverlayEntry(val view: View, val hideRunnable: Runnable)

  /** Overlays atualmente na tela — mais de um só quando `stackSimultaneous` está ligado. */
  private val overlays = mutableListOf<OverlayEntry>()

  fun mostrar(appOrigem: String, valor: Double, distanciaKm: Double?, duracaoMin: Double?, paradas: Int?) {
    if (!temPermissaoDeOverlay()) {
      // Sem "Exibir sobre outros apps" concedida não tem como desenhar nada
      // por cima de outro app — `hasOverlayPermission`/`requestOverlayPermission`
      // no JS existem exatamente pra pessoa resolver isso antes de chegar aqui.
      return
    }

    val config = OverlayConfig.load(context)

    try {
      if (!config.stackSimultaneous) {
        // Uma oferta nova substitui a que estava na tela, em vez de empilhar.
        removerTodos()
      } else if (overlays.size >= MAX_OVERLAYS_EMPILHADOS) {
        // Trava pra nunca cobrir a tela inteira: remove o mais antigo antes de adicionar.
        removerMaisAntigo()
      }
      adicionarView(config, appOrigem, valor, distanciaKm, duracaoMin, paradas)
    } catch (e: Exception) {
      Log.w(TAG, "Falha ao desenhar o overlay", e)
    }
  }

  /** Remove todos os overlays visíveis — chamado no `onDestroy` do serviço. */
  fun remover() = removerTodos()

  private fun removerTodos() {
    val copia = overlays.toList()
    overlays.clear()
    copia.forEach { removerEntry(it) }
  }

  private fun removerMaisAntigo() {
    if (overlays.isEmpty()) return
    val maisAntigo = overlays.removeAt(0)
    removerEntry(maisAntigo)
  }

  private fun removerEntry(entry: OverlayEntry) {
    hideHandler.removeCallbacks(entry.hideRunnable)
    try {
      windowManager.removeView(entry.view)
    } catch (e: Exception) {
      // Já pode ter sido removida (ex.: serviço reconectado) — inofensivo.
    }
  }

  private fun temPermissaoDeOverlay(): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(context)
    } else {
      true
    }

  private fun adicionarView(
    config: OverlayConfig,
    appOrigem: String,
    valor: Double,
    distanciaKm: Double?,
    duracaoMin: Double?,
    paradas: Int?,
  ) {
    val calculo = calcular(valor, distanciaKm, duracaoMin)
    val view = criarView(config, appOrigem, valor, distanciaKm, duracaoMin, paradas, calculo)
    val layoutParams = criarLayoutParams(config, indiceEmpilhado = overlays.size)

    val hideRunnable = Runnable { removerPorView(view) }
    val entry = OverlayEntry(view, hideRunnable)
    overlays.add(entry)

    windowManager.addView(view, layoutParams)
    hideHandler.postDelayed(hideRunnable, config.displaySeconds.coerceIn(1, 30) * 1000L)
  }

  private fun removerPorView(view: View) {
    val entry = overlays.firstOrNull { it.view === view } ?: return
    overlays.remove(entry)
    removerEntry(entry)
  }

  private fun criarLayoutParams(config: OverlayConfig, indiceEmpilhado: Int): WindowManager.LayoutParams {
    val tipoOverlay = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_PHONE
    }

    val gravity = when (config.position) {
      "esquerda" -> Gravity.TOP or Gravity.START
      "direita" -> Gravity.TOP or Gravity.END
      else -> Gravity.TOP or Gravity.CENTER_HORIZONTAL // "centro"
    }
    val xOffset = if (config.position == "centro") 0 else dp(12)

    return WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT,
      WindowManager.LayoutParams.WRAP_CONTENT,
      tipoOverlay,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL,
      PixelFormat.TRANSLUCENT,
    ).apply {
      this.gravity = gravity
      x = xOffset
      // Empilha verticalmente: cada oferta nova aparece um pouco mais abaixo da anterior,
      // pra não desenhar exatamente por cima (a altura estimada por card é aproximada, já
      // que o conteúdo varia conforme os campos habilitados — suficiente pra não sobrepor
      // na prática, sem precisar medir a view antes de adicioná-la à janela).
      y = dp(120) + indiceEmpilhado * dp(76)
      alpha = config.opacityPct.coerceIn(0, 100) / 100f
    }
  }

  private fun criarView(
    config: OverlayConfig,
    appOrigem: String,
    valor: Double,
    distanciaKm: Double?,
    duracaoMin: Double?,
    paradas: Int?,
    calculo: Calculo,
  ): LinearLayout {
    val locale = Locale("pt", "BR")
    val claro = config.colorScheme == "claro"
    val novo = config.design == "novo"

    val corFundo = if (claro) COR_FUNDO_CLARO else COR_FUNDO_ESCURO
    val corTexto = if (claro) COR_TEXTO_CLARO else COR_TEXTO_ESCURO
    val corTextoMuted = if (claro) COR_TEXTO_MUTED_CLARO else COR_TEXTO_MUTED_ESCURO

    val fontScale = when (config.fontSize) {
      "pequena" -> 0.85f
      "grande" -> 1.2f
      else -> 1f // "media"
    }

    val backgroundDrawable = GradientDrawable().apply {
      // "novo" = visual mais arredondado (pílula); "tradicional" = card retangular clássico.
      cornerRadius = (if (novo) dp(24) else dp(14)).toFloat()
      setColor(corFundo)
    }

    val container = LinearLayout(context).apply {
      orientation = LinearLayout.VERTICAL
      background = backgroundDrawable
      val padH = if (novo) dp(16) else dp(14)
      val padV = if (novo) dp(12) else dp(10)
      setPadding(padH, padV, padH, padV)
      elevation = dp(6).toFloat()
    }

    fun linha(texto: String, tamanhoBaseSp: Float, negrito: Boolean, cor: Int, prefixoIcone: String? = null) {
      val label = if (novo && prefixoIcone != null) "$prefixoIcone $texto" else texto
      val textView = TextView(context).apply {
        text = label
        setTextColor(cor)
        textSize = tamanhoBaseSp * fontScale
        setTypeface(typeface, if (negrito) Typeface.BOLD else Typeface.NORMAL)
        setPadding(0, dp(1), 0, dp(1))
      }
      container.addView(textView)
    }

    // Valor bruto — sempre visível, é a informação principal do card.
    linha(String.format(locale, "R$ %.2f", valor), 17f, negrito = true, cor = corTexto, prefixoIcone = "💰")

    if (config.showTotais) {
      val distanciaTexto = if (distanciaKm != null) String.format(locale, "%.1f km", distanciaKm) else "-- km"
      val duracaoTexto = if (duracaoMin != null) String.format(locale, "%.0f min", duracaoMin) else "-- min"
      linha("$distanciaTexto · $duracaoTexto", 13f, negrito = false, cor = corTextoMuted, prefixoIcone = "📍")
    }

    if (config.showValorKm && calculo.porKm != null) {
      linha(String.format(locale, "R$/km: %.2f", calculo.porKm), 14f, negrito = false, cor = corTexto, prefixoIcone = "🛣️")
    }
    if (config.showValorHora && calculo.porHora != null) {
      linha(String.format(locale, "R$/hora: %.2f", calculo.porHora), 14f, negrito = false, cor = corTexto, prefixoIcone = "⏱️")
    }
    if (config.showValorMin && calculo.porMin != null) {
      linha(String.format(locale, "R$/min: %.2f", calculo.porMin), 14f, negrito = false, cor = corTexto, prefixoIcone = "⏳")
    }
    if (config.showParadas && paradas != null) {
      val texto = if (paradas == 1) "1 parada" else "$paradas paradas"
      linha(texto, 12.5f, negrito = false, cor = corTextoMuted, prefixoIcone = "🛑")
    }

    // showCustoTotal/showCustoKm/showLucro: ver comentário grande no topo do arquivo —
    // sem os custos do veículo disponíveis no lado nativo, não tem o que desenhar aqui
    // ainda; de propósito não fingimos um valor.

    return container
  }

  private fun dp(valor: Int): Int = (valor * context.resources.displayMetrics.density).toInt()

  private companion object {
    const val TAG = "CopilotoOverlay"
    const val MAX_OVERLAYS_EMPILHADOS = 3

    val COR_FUNDO_ESCURO = Color.parseColor("#2F455C")
    val COR_TEXTO_ESCURO = Color.WHITE
    val COR_TEXTO_MUTED_ESCURO = Color.parseColor("#C7D2DE")

    val COR_FUNDO_CLARO = Color.parseColor("#F5F7FA")
    val COR_TEXTO_CLARO = Color.parseColor("#1B2733")
    val COR_TEXTO_MUTED_CLARO = Color.parseColor("#5B6B7A")
  }
}
