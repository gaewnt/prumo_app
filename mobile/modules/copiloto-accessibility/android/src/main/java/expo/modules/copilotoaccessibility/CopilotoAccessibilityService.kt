package expo.modules.copilotoaccessibility

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

/**
 * ATENÇÃO — leia antes de mexer aqui:
 *
 * As regexes por app abaixo (`parseUberCard`, `parse99Card`, `parseInDriveCard`,
 * `parseIfoodCard`, `parseMtEntregasCard`) foram escritas a partir de
 * screenshots REAIS dos cards de oferta de corrida/entrega dos 5 apps
 * suportados, enviadas pela Ana em 28/08/2026 — não são mais heurística
 * genérica às cegas como na primeira versão deste arquivo. A confiança de
 * cada padrão é bem maior agora (o texto exato de cada card foi transcrito
 * das imagens, campo a campo), mas ainda NENHUM desses padrões foi testado
 * contra uma instância rodando de verdade de cada app num aparelho Android —
 * screenshot mostra o texto visível na tela, não necessariamente como esse
 * texto está de fato dividido entre nós da árvore de acessibilidade (um
 * `TextView` pode estar quebrado em mais de um nó, ou o texto pode vir só
 * no `contentDescription` de um ícone em vez do `text` de um label). Ou
 * seja: o teste de verdade continua sendo abrir cada app num aparelho com o
 * Copiloto ativo e conferir se a oferta é detectada e os números batem.
 *
 * Cada app tem sua própria função de parsing, despachada por `packageName`
 * em `processarJanela` — de propósito, pra ficar fácil de debugar/ajustar
 * um app por vez sem risco de quebrar os outros 4. Nenhuma delas depende de
 * `resourceId`/`viewId` específico do app (esses IDs mudam a cada versão e
 * quebrariam a leitura silenciosamente na primeira atualização) — todas
 * trabalham em cima do texto visível (`text` + `contentDescription`) da
 * árvore de acessibilidade da janela ativa.
 *
 * Se alguma oferta não for detectada ou vier com número errado, o primeiro
 * lugar pra olhar é a função de parsing do app em questão — cada uma tem um
 * comentário citando o texto real do card em que foi baseada.
 */
class CopilotoAccessibilityService : AccessibilityService() {

  companion object {
    private const val TAG = "CopilotoA11yService"
    private const val PREFS_NAME = "copiloto_accessibility_prefs"
    private const val KEY_WATCHING_ENABLED = "watching_enabled"

    /** Chave em SharedPreferences onde `CopilotoAccessibilityModule.setOverlayConfig` grava
     * o JSON de `CopilotoConfig` (ver `lib/copiloto.ts`) — `OverlayManager` lê daqui. */
    const val KEY_OVERLAY_CONFIG_JSON = "overlay_config_json"

    /** Não repete a mesma detecção antes desse intervalo (evita spam a cada micro-mudança de layout). */
    private const val DEBOUNCE_MS = 2000L

    /** Trava de segurança: nunca visita mais nós do que isso numa única passada. */
    private const val MAX_NOS_VISITADOS = 2000

    /** Trava de segurança contra árvores anormalmente profundas. */
    private const val PROFUNDIDADE_MAXIMA = 80

    // Pacotes reais dos 5 apps suportados — ver `lib/copiloto.ts` (`SUPPORTED_APPS`), a
    // fonte da verdade. MT Entregas confirmado pela Ana em 28/08/2026 via link da ficha
    // na Play Store.
    private const val PACOTE_UBER = "com.ubercab.driver"
    private const val PACOTE_99 = "com.app99.driver"
    private const val PACOTE_INDRIVE = "sinet.startup.inDriver"
    // Correção 16 (30/08) — bug real: esse pacote era o do iFood CONSUMIDOR (pra pedir
    // comida), não o do iFood Entregador. A Ana pegou isso na prática: o Copiloto apareceu
    // enquanto ela fazia um pedido de comida pra ela mesma. Pacote certo confirmado via URL
    // da própria Play Store (id=br.com.ifood.driver.app).
    private const val PACOTE_IFOOD = "br.com.ifood.driver.app"
    private const val PACOTE_MTENTREGAS = "br.com.mtentregas.taxi.taximachine"

    private val PACOTE_PARA_APP_ORIGEM = mapOf(
      PACOTE_UBER to "uber",
      PACOTE_99 to "99",
      PACOTE_INDRIVE to "indrive",
      PACOTE_IFOOD to "ifood",
      PACOTE_MTENTREGAS to "mtentregas",
    )

    /**
     * Correção 15 (30/08) — provável causa raiz de por que NENHUM app foi reconhecido em
     * teste real, mesmo com o card de oferta visivelmente na tela (vídeo da Ana, 99
     * Motorista, card "Entrega Moto R$6,60 · 12min (5km) · 11min (5,6km)"): `textos` é uma
     * lista de nós SEPARADOS da árvore de acessibilidade, e `haystack` junta essa lista com
     * " · " (`joinToString(" · ")`) — não com um espaço simples. Se "12min" e "(5km)" forem
     * nós diferentes (bem provável: são visualmente dois elementos, tempo e distância, às
     * vezes com estilos diferentes), o texto vira "...12min · (5km)..." e um `\s*` comum
     * nunca bate o "·" no meio. Isso quebra QUALQUER regex que assuma duas partes vizinhas
     * do texto vistas na tela como se fossem sempre uma string contígua — ou seja,
     * provavelmente afeta os 5 apps, não só o 99.
     *
     * `SEP` substitui todo `\s*`/`\s+`/`\s?` usado como "cola" entre dois pedaços de
     * informação nos regexes abaixo: continua batendo espaço normal (quando os nós não
     * foram quebrados) e agora também bate o separador " · " entre nós — sem exigir nenhum
     * dos dois, e sem impor limite de repetição (nós vazios nunca entram em `textos`, então
     * não tem risco de isso "engolir" um pedaço de texto de verdade no meio do caminho).
     */
    private const val SEP = """[\s·]*"""

    // "R$ 35,25", "R$54,89" — usado como base por quase todo parser de app; cada função
    // decide sozinha qual ocorrência (primeira/última, não-bônus, não-"por km" etc.) usar.
    private val VALOR_RS_REGEX = Regex("""R\$$SEP(\d+(?:[.,]\d+)?)""")

    /**
     * Correção 17 (30/08) — usado só pelo diagnóstico "grudento" abaixo, não pela detecção em
     * si. Padrão genérico "Nmin (Ykm)" (formato do 99 e da MT Entregas) usado como segundo
     * sinal de "essa tela parece um card de oferta", além de "R$" e "Aceitar" — ver comentário
     * grande logo abaixo, em `processarJanela`, sobre por que isso foi adicionado.
     */
    private val OFERTA_MIN_KM_REGEX =
      Regex("""\d+${SEP}[Mm]in$SEP\($SEP\d+(?:[.,]\d+)?${SEP}km\)""", RegexOption.IGNORE_CASE)

    /**
     * Converte um número no formato brasileiro pro `Double` que a gente usa internamente.
     *
     * Regra segura: se a string tiver vírgula, ela é o separador decimal — qualquer ponto
     * é separador de milhar e é descartado antes de trocar a vírgula por ponto. Se não
     * tiver vírgula (só ponto, ou nenhum separador), trata o ponto como decimal — cobre o
     * caso raro de algum app formatar em inglês.
     */
    private fun parseNumeroBr(bruto: String): Double? {
      val limpo = bruto.trim()
      if (limpo.isEmpty()) return null
      return if (limpo.contains(',')) {
        limpo.replace(".", "").replace(',', '.').toDoubleOrNull()
      } else {
        limpo.toDoubleOrNull()
      }
    }

    /**
     * Setado por `CopilotoAccessibilityModule` enquanto o runtime JS do app
     * estiver vivo (ver `OnCreate`/`OnDestroy` de lá) — é como esse serviço,
     * que roda independente do app, consegue avisar o lado JS quando algo é
     * detectado. `null` só significa "app fechado agora"; a bolha flutuante
     * continua funcionando de qualquer jeito, ela não depende disso.
     */
    @Volatile
    var eventListener: ((Map<String, Any?>) -> Unit)? = null

    /**
     * `startWatching`/`stopWatching` do lado JS (ver `CopilotoAccessibilityModule`)
     * não ligam/desligam este serviço — o Android não permite isso, quem
     * controla o ciclo de vida de um AccessibilityService é o sistema, a
     * partir da permissão concedida em Configurações. Em vez disso, elas só
     * gravam esta flag, que o serviço confere antes de processar qualquer
     * evento. Usamos SharedPreferences (não uma variável estática comum)
     * porque o processo do serviço pode continuar vivo — e ser reconectado —
     * mesmo depois do app "fechar" pra o usuário, então a flag precisa
     * sobreviver a isso.
     */
    fun setWatchingEnabled(context: Context, enabled: Boolean) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putBoolean(KEY_WATCHING_ENABLED, enabled)
        .apply()
    }

    fun isWatchingEnabled(context: Context): Boolean =
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getBoolean(KEY_WATCHING_ENABLED, false)

    /** Grava o JSON de `CopilotoConfig` — chamado por `CopilotoAccessibilityModule.setOverlayConfig`. */
    fun setOverlayConfigJson(context: Context, json: String) {
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_OVERLAY_CONFIG_JSON, json)
        .apply()
    }

    /** Lido por `OverlayManager` — `null` se nunca foi configurado (usa os defaults então). */
    fun getOverlayConfigJson(context: Context): String? =
      context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        .getString(KEY_OVERLAY_CONFIG_JSON, null)

    // ===================== Diagnóstico (Correção 12, 28/08) =====================
    //
    // Adicionado depois do primeiro teste real em aparelho: NENHUM dos 5 apps detectou
    // nada em 2h de uso real (não só a MT Entregas). Sem acesso a `adb logcat` do lado da
    // Ana, esses campos dão visibilidade de dentro do próprio app (tela do Copiloto lê via
    // `getDiagnosticsSnapshot`) sobre o que o serviço está de fato vendo, sem precisar de
    // ferramenta de desenvolvedor nenhuma no celular dela.
    @Volatile private var diagTotalEventsSeen: Int = 0
    @Volatile private var diagLastPackageSeen: String? = null
    @Volatile private var diagTargetEventsSeen: Int = 0
    @Volatile private var diagLastTargetPackage: String? = null
    @Volatile private var diagLastRawText: String? = null
    @Volatile private var diagLastRawTextPackage: String? = null
    @Volatile private var diagLastParseSucceeded: Boolean? = null

    /**
     * Correção 14 (30/08) — `diagLastRawText` sozinho não bastava: o card de oferta some da
     * tela em 5-12s, e qualquer tela seguinte do mesmo app (ex: navegação já com a corrida
     * aceita) sobrescreve `diagLastRawText` antes da Ana conseguir tirar print a tempo. Esses
     * três campos guardam separadamente a ÚLTIMA tela que continha "R$" — só é sobrescrita
     * por uma tela de oferta mais nova, nunca por uma tela sem valor (navegação, menu, etc).
     * Isso deixa o diagnóstico "gruda" no texto real do card de oferta mesmo que a Ana só
     * consiga olhar a tela do Copiloto minutos depois.
     */
    @Volatile private var diagLastOfferLikeText: String? = null
    @Volatile private var diagLastOfferLikeTextPackage: String? = null
    @Volatile private var diagLastOfferLikeParseSucceeded: Boolean? = null

    /** `true` só entre `onServiceConnected` e `onDestroy` — confirma se o Android de fato
     * ligou o serviço (permissão concedida em Configurações), sem depender de nada mais. */
    @Volatile private var diagServiceConnected: Boolean = false

    /** Snapshot pra `CopilotoAccessibilityModule.getDiagnostics` — ver comentário acima. */
    fun getDiagnosticsSnapshot(context: Context): Map<String, Any?> = mapOf(
      "serviceRunning" to diagServiceConnected,
      "watchingEnabled" to isWatchingEnabled(context),
      "totalEventsSeen" to diagTotalEventsSeen,
      "lastPackageSeen" to diagLastPackageSeen,
      "targetEventsSeen" to diagTargetEventsSeen,
      "lastTargetPackage" to diagLastTargetPackage,
      "lastRawText" to diagLastRawText,
      "lastRawTextPackage" to diagLastRawTextPackage,
      "lastParseSucceeded" to diagLastParseSucceeded,
      "lastOfferLikeText" to diagLastOfferLikeText,
      "lastOfferLikeTextPackage" to diagLastOfferLikeTextPackage,
      "lastOfferLikeParseSucceeded" to diagLastOfferLikeParseSucceeded,
    )

    // ===================== Parsers por app =====================
    //
    // Cada função recebe a lista de textos coletados da árvore de acessibilidade (um item
    // por nó com `text`/`contentDescription` não vazio, na ordem em que a árvore foi
    // percorrida) e devolve uma `CorridaDetectada` ou `null` se o texto atual não parece
    // ser um card de oferta de verdade (ex.: alguma outra tela do app, sem "R$" nenhum, ou
    // faltando tanto distância quanto duração).

    /**
     * Uber Driver — card real (transcrito de screenshot em 28/08/2026):
     * ```
     * NOVO CARTÃO DE OFERTA
     * UberX
     * R$ 35,25
     * +R$4,25 incluído
     * 5,00 ★
     * A 1 min (0.2 km)
     * Rua Vergueiro - Liberdade, São Paulo - SP, Brasil
     * Viagem de 25 minutos (17,6 km)
     * Destino: Av Guarulhos 3810, Guarulhos - SP, Brasil
     * Menos de 5 viagens
     * ```
     */
    private val UBER_VIAGEM_REGEX =
      Regex("""Viagem de$SEP(\d+)${SEP}minutos?$SEP\($SEP(\d+(?:[.,]\d+)?)${SEP}km\)""", RegexOption.IGNORE_CASE)

    fun parseUberCard(textos: List<String>): CorridaDetectada? {
      val haystack = textos.joinToString(" · ")

      // O valor principal é o PRIMEIRO "R$" que não vem logo depois de um "+" — isso
      // evita pegar "+R$4,25 incluído" (bônus/gorjeta), que não é a corrida em si.
      val valor = primeiroValorNaoPrecedidoDe(haystack, '+') ?: return null

      // Âncora explícita na palavra "Viagem" pra não confundir com "A 1 min (0.2 km)",
      // que é a distância/tempo até o passageiro (pickup), não a viagem em si.
      val viagemMatch = UBER_VIAGEM_REGEX.find(haystack)
      val duracaoMin = viagemMatch?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      val distanciaKm = viagemMatch?.groupValues?.get(2)?.let { parseNumeroBr(it) }

      if (distanciaKm == null && duracaoMin == null) return null

      return CorridaDetectada(valor, distanciaKm, duracaoMin, paradas = null, textoOriginal = haystack)
    }

    /**
     * 99 Motorista — card real:
     * ```
     * 🔥 Corrida longa
     * R$54,89
     * R$2,20 por km
     * x2,0
     * R$15.50 incluídos
     * 4,8 · 12 corridas · Cartão Verif.
     * 5Min (2,5km)
     * 32Min (6,3km) ⚠️ Área de risco
     * ```
     */
    private val NOVENTA_E_NOVE_MIN_KM_REGEX =
      Regex("""(\d+)${SEP}[Mm]in$SEP\($SEP(\d+(?:[.,]\d+)?)${SEP}km\)""", RegexOption.IGNORE_CASE)
    private val NOVENTA_E_NOVE_POR_KM_REGEX =
      Regex("""R\$$SEP(\d+(?:[.,]\d+)?)${SEP}por${SEP}km""", RegexOption.IGNORE_CASE)

    fun parse99Card(textos: List<String>): CorridaDetectada? {
      val haystack = textos.joinToString(" · ")

      // O valor principal é o PRIMEIRO "R$" que não é seguido de "por km" — esse segundo
      // é a taxa por km já calculada pelo próprio 99, útil só como fallback abaixo.
      var valor = primeiroValorNaoSeguidoDe(haystack, "por km")

      // Duas ocorrências de "XMin (Ykm)" no card: a primeira é o trecho até o
      // passageiro (pickup), a última é a viagem em si (destino) — usamos a última.
      val minKmMatch = NOVENTA_E_NOVE_MIN_KM_REGEX.findAll(haystack).lastOrNull()
      val duracaoMin = minKmMatch?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      val distanciaKm = minKmMatch?.groupValues?.get(2)?.let { parseNumeroBr(it) }

      // Fallback: se por algum motivo o valor principal não bateu, dá pra estimar a
      // partir da taxa por km já pronta do 99 × a distância da viagem.
      if (valor == null) {
        val taxaPorKm = NOVENTA_E_NOVE_POR_KM_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
        if (taxaPorKm != null && distanciaKm != null && distanciaKm > 0) {
          valor = taxaPorKm * distanciaKm
        }
      }
      if (valor == null) return null
      if (distanciaKm == null && duracaoMin == null) return null

      return CorridaDetectada(valor, distanciaKm, duracaoMin, paradas = null, textoOriginal = haystack)
    }

    /**
     * InDrive — card real (motorista aceita/propõe um preço, não só vê um número fixo):
     * ```
     * Pedido de viagem
     * Talyta 5.0 (6) 3 min
     * 70 min 55,8km
     * R$ 1,6/km ~823 m
     * R$ 88  Preço justo
     * Rua João Barbosa Ortiz, 196 (Vila Buenos Aires, São Paulo - SP)
     * Estrada Elias Alves da Costa, 1000 (Vila Santa Flora, Itapevi - SP)
     * 5 passageiros ou mais
     * Aceitar por R$ 88
     * R$97  R$104
     * ```
     */
    private val INDRIVE_DURACAO_DISTANCIA_REGEX =
      Regex("""(\d+)${SEP}min[\s·]+(\d+(?:[.,]\d+)?)${SEP}km""", RegexOption.IGNORE_CASE)
    private val INDRIVE_ACEITAR_POR_REGEX =
      Regex("""Aceitar${SEP}por${SEP}R\$$SEP(\d+(?:[.,]\d+)?)""", RegexOption.IGNORE_CASE)
    private val INDRIVE_PRECO_JUSTO_REGEX =
      Regex("""R\$$SEP(\d+(?:[.,]\d+)?)${SEP}Preço${SEP}justo""", RegexOption.IGNORE_CASE)

    fun parseInDriveCard(textos: List<String>): CorridaDetectada? {
      val haystack = textos.joinToString(" · ")

      // Duração+distância da viagem toda: padrão "70 min 55,8km" — não confundir com
      // "3 min" (tempo até o passageiro, colado no nome/nota) nem com "~823 m" (distância
      // de referência do R$/km, em METROS, não km). A âncora "min ... km" junto evita as duas.
      val totalMatch = INDRIVE_DURACAO_DISTANCIA_REGEX.find(haystack)
      val duracaoMin = totalMatch?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      val distanciaKm = totalMatch?.groupValues?.get(2)?.let { parseNumeroBr(it) }

      // Preferimos o valor do botão "Aceitar por R$ X" — é o valor final e inequívoco.
      // Se não achar (variação de layout), cai pro "R$ X Preço justo".
      val valor = INDRIVE_ACEITAR_POR_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
        ?: INDRIVE_PRECO_JUSTO_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
        ?: return null

      if (distanciaKm == null && duracaoMin == null) return null

      return CorridaDetectada(valor, distanciaKm, duracaoMin, paradas = null, textoOriginal = haystack)
    }

    /**
     * iFood Entregador — card real:
     * ```
     * R$ 35,90
     * 2,58 Km
     * 1 parada
     * Pizzaria
     * Avenida Rio Branco, 174 - Centro, Rio de Janeiro
     * 1ª parada
     * R. da Assembleia, 110 - Centro
     * 1.80x Comum Dinheiro
     * ```
     * Esse card NÃO mostra duração/tempo estimado em lugar nenhum — `duracaoMin` fica
     * sempre `null` aqui, de propósito (não é um bug do parser, é o app que não expõe isso).
     */
    private val IFOOD_KM_REGEX = Regex("""(\d+(?:[.,]\d+)?)$SEP[Kk][Mm]\b""")
    private val IFOOD_PARADAS_REGEX = Regex("""(\d+)${SEP}paradas?\b""", RegexOption.IGNORE_CASE)

    fun parseIfoodCard(textos: List<String>): CorridaDetectada? {
      val haystack = textos.joinToString(" · ")

      val valor = VALOR_RS_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) } ?: return null
      val distanciaKm = IFOOD_KM_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      // Não confundir com "1ª parada" (cabeçalho de endereço) — a âncora exige que o
      // dígito seja seguido direto (sem "ª" no meio) de espaço + "parada(s)", então a
      // primeira ocorrência batida é sempre o contador do topo do card ("1 parada").
      val paradas = IFOOD_PARADAS_REGEX.find(haystack)?.groupValues?.get(1)?.toIntOrNull()

      if (distanciaKm == null) return null // duração nunca existe aqui — sem km também, não é uma oferta.

      return CorridaDetectada(valor, distanciaKm, duracaoMin = null, paradas = paradas, textoOriginal = haystack)
    }

    /**
     * MT Entregas — Correção 13 (29/08/2026): o formato abaixo (2) era o único conhecido até
     * agora, transcrito de UM screenshot que a Ana mandou em 28/08 — mas o teste real em
     * aparelho (vídeo que ela gravou em 29/08, card de oferta automática de verdade)
     * mostrou um formato BEM diferente (1), quase idêntico ao card do 99 Motorista. É por
     * isso que a detecção nunca funcionou pra MT Entregas: o regex procurava por um texto
     * ("Distância total", "Tempo aproximado de rota") que não existe no card de oferta de
     * verdade.
     *
     * Formato 1 — card de oferta automática, confirmado em vídeo real (29/08/2026):
     * ```
     * Entrega Moto
     * R$9,00
     * 4,97 · Perfil Essencial
     * 11min (4,2km)  Rua Cinquenta e Nove, 16, Morada da Serra
     * 14min (9km)    Rua Vinte, 73, São João Del Rei
     * Aceitar
     * ```
     *
     * Formato 2 — transcrito de screenshot em 28/08, nunca confirmado contra o app rodando
     * de verdade; mantido como fallback pra não perder cobertura caso seja uma tela
     * diferente (ex: "detalhes da entrega" expandido) que ainda apareça em algum fluxo:
     * ```
     * Entrega 1
     * Parque Santo Antonio
     * R$ 7,00
     * Rota para Bicicleta
     * Distância total 2,26 km
     * Tempo aproximado de rota 17 min
     * Possibilidade de devolução: Sim
     * ```
     */
    private val MTENTREGAS_MIN_KM_REGEX =
      Regex("""(\d+)${SEP}min$SEP\($SEP(\d+(?:[.,]\d+)?)${SEP}km\)""", RegexOption.IGNORE_CASE)
    private val MTENTREGAS_DISTANCIA_REGEX =
      Regex("""Distância${SEP}total$SEP[:]?$SEP(\d+(?:[.,]\d+)?)${SEP}km""", RegexOption.IGNORE_CASE)
    private val MTENTREGAS_DURACAO_REGEX =
      Regex("""Tempo${SEP}aproximado${SEP}de${SEP}rota$SEP[:]?$SEP(\d+)${SEP}min""", RegexOption.IGNORE_CASE)

    fun parseMtEntregasCard(textos: List<String>): CorridaDetectada? {
      val haystack = textos.joinToString(" · ")

      val valor = VALOR_RS_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) } ?: return null

      // Formato 1 (confirmado em vídeo real): duas ocorrências "Nmin (Ykm)" — a primeira é
      // até o ponto de coleta, a última é a entrega em si (mesmo padrão do 99 Motorista).
      val trajetoMatch = MTENTREGAS_MIN_KM_REGEX.findAll(haystack).lastOrNull()
      var duracaoMin = trajetoMatch?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      var distanciaKm = trajetoMatch?.groupValues?.get(2)?.let { parseNumeroBr(it) }

      // Formato 2 (fallback, não confirmado contra o app rodando de verdade).
      if (distanciaKm == null) {
        distanciaKm = MTENTREGAS_DISTANCIA_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      }
      if (duracaoMin == null) {
        duracaoMin = MTENTREGAS_DURACAO_REGEX.find(haystack)?.groupValues?.get(1)?.let { parseNumeroBr(it) }
      }

      if (distanciaKm == null && duracaoMin == null) return null

      return CorridaDetectada(valor, distanciaKm, duracaoMin, paradas = null, textoOriginal = haystack)
    }

    /** Correção 15 (30/08) — usado pelos dois helpers abaixo pra "pular" separadores de nó
     * (espaço normal OU " · " entre nós da árvore) na hora de olhar o que vem antes/depois
     * de um valor, pelo mesmo motivo do `SEP` acima: um "+" ou um "por km" podem estar num
     * nó separado do "R$X" ao lado, e não só um espaço comum entre eles. */
    private fun ehSeparador(c: Char) = c.isWhitespace() || c == '·'

    /** Acha o primeiro "R$ X" cujo caractere não-separador logo antes do match não é `caractere`. */
    private fun primeiroValorNaoPrecedidoDe(haystack: String, caractere: Char): Double? {
      for (match in VALOR_RS_REGEX.findAll(haystack)) {
        var i = match.range.first - 1
        while (i >= 0 && ehSeparador(haystack[i])) i--
        val precedido = i >= 0 && haystack[i] == caractere
        if (!precedido) return parseNumeroBr(match.groupValues[1])
      }
      return null
    }

    /** Acha o primeiro "R$ X" que não é seguido (ignorando separadores de nó) por `sufixo`. */
    private fun primeiroValorNaoSeguidoDe(haystack: String, sufixo: String): Double? {
      for (match in VALOR_RS_REGEX.findAll(haystack)) {
        var i = match.range.last + 1
        while (i < haystack.length && ehSeparador(haystack[i])) i++
        val restante = haystack.substring(i, minOf(haystack.length, i + sufixo.length + 4))
        if (!restante.startsWith(sufixo, ignoreCase = true)) {
          return parseNumeroBr(match.groupValues[1])
        }
      }
      return null
    }
  }

  /** Resultado de um parser de app — `null` de um parser individual significa "esse texto
   * não parece uma oferta de verdade" (tela errada, faltando valor, ou faltando tanto
   * distância quanto duração). */
  data class CorridaDetectada(
    val valor: Double,
    val distanciaKm: Double?,
    val duracaoMin: Double?,
    val paradas: Int?,
    val textoOriginal: String,
  )

  private var overlayManager: OverlayManager? = null

  private var ultimoTextoDetectado: String? = null
  private var ultimaDeteccaoEm: Long = 0L

  override fun onServiceConnected() {
    super.onServiceConnected()
    overlayManager = OverlayManager(applicationContext)
    diagServiceConnected = true
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED &&
      event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
    ) {
      return
    }

    diagTotalEventsSeen++
    val eventPackage = event.packageName?.toString()
    if (eventPackage != null) diagLastPackageSeen = eventPackage

    // Toggle "Copiloto ativo" da UI — ver comentário de `setWatchingEnabled` acima.
    if (!isWatchingEnabled(applicationContext)) return

    // Correção 12 (28/08): antes só olhávamos `rootInActiveWindow` — mas cards de oferta
    // de corrida costumam aparecer numa janela SEPARADA sobreposta ao app (um alerta/
    // overlay do próprio app), não como parte da janela "ativa". Sem varrer todas as
    // janelas interativas (exige `flagRetrieveInteractiveWindows` no XML de config), o
    // serviço nunca via esse card nenhuma vez — foi isso que fez os 5 apps falharem juntos
    // no primeiro teste real, não um problema de regex específico de cada um.
    // Correção 15 (30/08) — a Ana notou (com razão) "Telas de apps suportados vistas" maior
    // que "Telas vistas (qualquer app)", o que não devia nem ser possível. Causa: esse
    // contador subia uma vez POR JANELA batida (podiam ser 2+ na mesma passada de `windows`,
    // ex: janela principal + overlay do mesmo app), enquanto o de baixo só sobe uma vez POR
    // EVENTO. `tocouAlgumSuportado` garante no máximo +1 aqui por evento, igual ao de cima —
    // não muda a detecção em si (`processarJanela` continua rodando pra cada janela batida),
    // só corrige a contagem exibida pra nunca ultrapassar o total.
    var tocouAlgumSuportado = false
    val processados = mutableSetOf<String>()
    try {
      for (window in windows) {
        val root = window.root
        try {
          val packageName = root?.packageName?.toString() ?: continue
          val appOrigem = PACOTE_PARA_APP_ORIGEM[packageName] ?: continue
          if (!processados.add(packageName)) continue
          tocouAlgumSuportado = true
          diagLastTargetPackage = packageName
          processarJanela(root, packageName, appOrigem)
        } finally {
          @Suppress("DEPRECATION")
          root?.recycle()
          @Suppress("DEPRECATION")
          window.recycle()
        }
      }
    } catch (e: Exception) {
      // Uma falha de parsing/varredura nunca pode derrubar o serviço inteiro — no pior
      // caso, só essa oferta específica não é detectada dessa vez.
      Log.w(TAG, "Falha ao varrer janelas interativas", e)
    }

    // Repescagem: se por algum motivo `windows` não trouxe a janela do app do evento em si
    // (varia entre aparelhos/versões do Android), confere `rootInActiveWindow` direto —
    // barato, e o debounce evita processar a mesma oferta duas vezes.
    if (eventPackage != null && !processados.contains(eventPackage)) {
      val appOrigem = PACOTE_PARA_APP_ORIGEM[eventPackage]
      if (appOrigem != null) {
        val root = rootInActiveWindow
        try {
          if (root != null) {
            tocouAlgumSuportado = true
            diagLastTargetPackage = eventPackage
            processarJanela(root, eventPackage, appOrigem)
          }
        } catch (e: Exception) {
          Log.w(TAG, "Falha ao processar a janela ativa", e)
        } finally {
          @Suppress("DEPRECATION")
          root?.recycle()
        }
      }
    }

    if (tocouAlgumSuportado) diagTargetEventsSeen++
  }

  private fun processarJanela(root: AccessibilityNodeInfo, packageName: String, appOrigem: String) {
    val textos = mutableListOf<String>()
    coletarTextos(root, textos, contador = intArrayOf(0), profundidade = 0)
    if (textos.isEmpty()) return

    // Diagnóstico: guarda o texto bruto capturado MESMO que o parser não reconheça nada
    // como oferta — assim dá pra ver, de dentro do app, o que a árvore de acessibilidade
    // realmente devolveu pra esse app, sem precisar de `adb logcat`.
    val textoJuntado = textos.joinToString(" · ").take(1500)
    diagLastRawText = textoJuntado
    diagLastRawTextPackage = packageName

    val corrida = when (packageName) {
      PACOTE_UBER -> parseUberCard(textos)
      PACOTE_99 -> parse99Card(textos)
      PACOTE_INDRIVE -> parseInDriveCard(textos)
      PACOTE_IFOOD -> parseIfoodCard(textos)
      PACOTE_MTENTREGAS -> parseMtEntregasCard(textos)
      else -> null
    }
    diagLastParseSucceeded = corrida != null

    // Correção 14 (30/08) — só sobrescreve o snapshot "grudento" se ESSA tela tiver "R$"
    // (ou seja, parece mesmo um card de oferta). Uma tela de navegação/menu do mesmo app,
    // sem valor nenhum, nunca apaga o último card de oferta real visto.
    //
    // Correção 17 (30/08) — a Ana testou de novo (vídeo confirmado) com um card REAL do 99
    // ("Entrega Moto R$21,50") visível na tela por mais de 15 segundos, e mesmo assim esse
    // snapshot continuou vazio ("Nenhuma tela com R$ capturada"). Ou seja: pra essa tela, a
    // string "R$" NUNCA apareceu no texto colado da árvore de acessibilidade, apesar de
    // qualquer pessoa conseguir ler "R$21,50" a olho nu. A explicação mais provável agora
    // não é mais o separador entre nós (Correção 15, que continua válida e não foi
    // desfeita) — é o símbolo "R$" em si sendo desenhado como ícone/glifo separado, sem
    // texto nem contentDescription, enquanto o número ("21,50") vem como nó de texto puro,
    // sem o prefixo. Isso quebraria o parser E esse diagnóstico ao mesmo tempo, do mesmo
    // jeito — silenciosamente.
    //
    // Em vez de arriscar outro palpite de regex sem conseguir testar num aparelho de
    // verdade, este bloco só fica mais permissivo no que conta como "parece card de
    // oferta" pro diagnóstico (isso NÃO muda a detecção real, só o que fica visível na
    // tela de diagnóstico): além de "R$", também aceita o padrão "Nmin (Ykm)" (formato do
    // 99/MT Entregas) ou o texto do botão "Aceitar". Assim, na próxima vez que a Ana
    // estiver trabalhando normalmente (sem precisar de nenhum teste extra) e um card real
    // aparecer, o texto exato dele fica visível aqui mesmo que a hipótese acima esteja
    // certa e "R$" nunca apareça — isso confirma ou descarta a hipótese com evidência real,
    // em vez de mais uma correção às cegas.
    val pareceCardDeOferta = textoJuntado.contains("R$") ||
      textoJuntado.contains("Aceitar", ignoreCase = true) ||
      OFERTA_MIN_KM_REGEX.containsMatchIn(textoJuntado)
    if (pareceCardDeOferta) {
      diagLastOfferLikeText = textoJuntado
      diagLastOfferLikeTextPackage = packageName
      diagLastOfferLikeParseSucceeded = corrida != null
    }

    corrida ?: return

    val agora = SystemClock.elapsedRealtime()
    if (corrida.textoOriginal == ultimoTextoDetectado && agora - ultimaDeteccaoEm < DEBOUNCE_MS) {
      return
    }
    ultimoTextoDetectado = corrida.textoOriginal
    ultimaDeteccaoEm = agora

    overlayManager?.mostrar(appOrigem, corrida.valor, corrida.distanciaKm, corrida.duracaoMin, corrida.paradas)

    val rideData = mapOf(
      "appOrigem" to appOrigem,
      "valor" to corrida.valor,
      "distanciaKm" to corrida.distanciaKm,
      "duracaoMin" to corrida.duracaoMin,
      "textoOriginal" to corrida.textoOriginal,
    )
    eventListener?.invoke(rideData)
  }

  /**
   * Anda recursivamente pela árvore de nós de acessibilidade coletando todo
   * texto visível (`text` e `contentDescription`) de cada nó. `contador[0]`
   * e `profundidade` são travas de segurança contra árvores anormalmente
   * grandes/profundas — não deveriam disparar em telas normais, só existem
   * pra garantir que isso nunca trave o serviço.
   */
  private fun coletarTextos(
    node: AccessibilityNodeInfo?,
    out: MutableList<String>,
    contador: IntArray,
    profundidade: Int,
  ) {
    if (node == null) return
    if (contador[0] >= MAX_NOS_VISITADOS || profundidade >= PROFUNDIDADE_MAXIMA) return
    contador[0]++

    val texto = node.text?.toString()?.trim()
    if (!texto.isNullOrEmpty()) out.add(texto)

    val descricao = node.contentDescription?.toString()?.trim()
    if (!descricao.isNullOrEmpty()) out.add(descricao)

    for (i in 0 until node.childCount) {
      val child = node.getChild(i) ?: continue
      try {
        coletarTextos(child, out, contador, profundidade + 1)
      } finally {
        @Suppress("DEPRECATION")
        child.recycle()
      }
    }
  }

  override fun onInterrupt() {
    // Exigido pela API do AccessibilityService — nada nosso pra limpar aqui.
  }

  override fun onDestroy() {
    super.onDestroy()
    overlayManager?.remover()
    overlayManager = null
    diagServiceConnected = false
  }
}
