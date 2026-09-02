package expo.modules.copilotoaccessibility

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/**
 * Forma do argumento que `CopilotoAccessibilityModule.setOverlayConfig` recebe do lado JS —
 * espelha `CopilotoConfig` de `lib/copiloto.ts` (a fonte da verdade; ver também o tipo
 * `CopilotoConfig` duplicado em `index.ts`, por causa do mesmo limite de não poder importar
 * de `lib/` dentro de um Expo Module local).
 *
 * Os defaults de cada campo aqui são só uma segunda linha de defesa (o valor que a JS manda
 * é sempre o objeto já mesclado com `DEFAULT_COPILOTO_CONFIG` do lado de lá) — quem decide o
 * que realmente vale como "não configurado ainda" é `OverlayManager.OverlayConfig`, lido a
 * partir do JSON gravado em SharedPreferences por este módulo.
 */
class OverlayConfigRecord : Record {
  @Field
  var enabled: Boolean = false

  @Field
  var position: String = "centro"

  @Field
  var design: String = "tradicional"

  @Field
  var colorScheme: String = "escuro"

  @Field
  var showValorKm: Boolean = true

  @Field
  var showValorHora: Boolean = true

  @Field
  var showValorMin: Boolean = true

  @Field
  var showTotais: Boolean = true

  @Field
  var showParadas: Boolean = true

  @Field
  var showCustoTotal: Boolean = false

  @Field
  var showCustoKm: Boolean = false

  @Field
  var showLucro: Boolean = false

  @Field
  var displaySeconds: Int = 12

  @Field
  var opacityPct: Int = 100

  @Field
  var fontSize: String = "media"

  @Field
  var stackSimultaneous: Boolean = true

  /** Serializa pro JSON gravado em SharedPreferences — ver `CopilotoAccessibilityService.setOverlayConfigJson`. */
  fun toJson(): String {
    val obj = org.json.JSONObject()
    obj.put("enabled", enabled)
    obj.put("position", position)
    obj.put("design", design)
    obj.put("colorScheme", colorScheme)
    obj.put("showValorKm", showValorKm)
    obj.put("showValorHora", showValorHora)
    obj.put("showValorMin", showValorMin)
    obj.put("showTotais", showTotais)
    obj.put("showParadas", showParadas)
    obj.put("showCustoTotal", showCustoTotal)
    obj.put("showCustoKm", showCustoKm)
    obj.put("showLucro", showLucro)
    obj.put("displaySeconds", displaySeconds)
    obj.put("opacityPct", opacityPct)
    obj.put("fontSize", fontSize)
    obj.put("stackSimultaneous", stackSimultaneous)
    return obj.toString()
  }
}
