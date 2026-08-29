# dekkalkulator.online — reglas de trabajo

Web nicho **call-to-click**: calculadoras de neumáticos para el mercado noruego,
monetizada con AdSense. La conversión es la página vista con anuncio. La
microconversión que la multiplica es el clic a otra calculadora del sitio.
El KPI del modelo es **páginas por sesión**, no visitas.

Lee esto entero antes de tocar nada. Cada regla está aquí porque algo se rompió.

---

## 1. Antes de decir que algo está hecho, ejecútalo

```bash
python3 -m http.server 8899 &      # desde la raíz del repo
node scripts/verificar.mjs
```

15 comprobaciones. Sale con código 1 si algo falla. **No se despliega en rojo.**

No sustituyas esto por leer el diff y suponer. En este proyecto, tres veces se
dio por terminado un trabajo que no lo estaba, y las tres se descubrió midiendo,
no mirando.

---

## 2. Invariantes que no se negocian

| Invariante | Cómo se comprueba |
|---|---|
| `js/dekk-core.js` no se toca | `git diff --stat HEAD -- js/dekk-core.js` vacío |
| Los bloques `.calc` / `.tool` conservan sus `id` | el JS se engancha por `id`; si cambia uno, la calculadora deja de calcular |
| Las tablas se sirven pre-renderizadas en el HTML | comprobación 3 del script |
| Las 36 URLs son alcanzables desde la home | comprobación 7 |
| 0 fallos de contraste WCAG AA | comprobación 5 |
| CLS = 0 | toda imagen con `width` y `height` |

El CSS sí se puede cambiar. El marcado de las calculadoras, no. Para rediseñar
se añade una capa de estilos que sobrescribe, nunca se reescribe el HTML del
bloque de la calculadora.

---

## 3. Regla de aislamiento

**Un tipo de cambio por despliegue, y de 3 a 4 semanas entre medias.**

Motivo: en una sola sesión se cambiaron a la vez el footer, el grid de enlaces
relacionados, 13 redirecciones y el contenido. El resultado fue que **18 páginas
quedaron inalcanzables desde la home**, entre ellas `/tommer-til-cm`, que tenía
1.824 impresiones. No se vio en la revisión; se vio al medir la alcanzabilidad.

Si tienes que agrupar cambios, ejecuta el script después de **cada uno**, no al
final.

---

## 4. Los cinco fallos que más se han repetido

### 4.1 Reemplazos automáticos que rompen frases
Sustituir un patrón en todo el sitio con una expresión regular parece barato y
no lo es. Una pasada para cambiar guiones convirtió la apertura de un inciso en
coma y dejó el cierre, y la frase quedó sin sentido:

> `Fordi kravet er ensidig, for lavt er ulovlig, for høyt er greit — kalibrerer…`

Después de cualquier reemplazo masivo en el texto, **lee las frases afectadas
una a una**, no solo el recuento.

### 4.2 Reescribir un bloque y perder sus enlaces
Al reescribir el cuerpo de la home se perdió el enlace a `/tommer-til-cm`, que
es el que reconecta 16 páginas. Compara el conjunto de `href` antes y después
de tocar cualquier bloque de contenido.

### 4.3 Cambiar el `title` y olvidar `og:title`
Cuatro campos van sincronizados: `title`, `og:title`, `twitter:title`, y lo
mismo con las descripciones. Un cambio en uno solo dejó 9 páginas
desincronizadas. La comprobación 8 lo detecta.

### 4.4 El cuerpo dice una cosa y la FAQ dice otra
El cuerpo atribuía el ±5 % a la norma STRO; la FAQ, que no se había tocado,
decía «Statens vegvesen tillater…». Dos pantallazos de distancia, y es riesgo
E-E-A-T. **Cuando cambies un dato, búscalo en todo el sitio**, incluidos los
bloques JSON-LD.

### 4.5 Un cambio de diseño rompe páginas que no miraste
Una regla que ponía fondo claro a un panel cuyo texto era blanco generó **288
fallos de contraste** de golpe. El diseño se verifica sobre las 37 páginas, no
sobre la que tenías abierta.

---

## 5. Contenido y copy

- **La introducción se escribe después del cuerpo.** Escrita antes sale genérica
  y describe la herramienta en vez de responder la duda. El síntoma es que
  empieza por «Regn om…», «Bruk denne…», «Beregn…».
- **Abre con la respuesta**, no con lo que hace la calculadora.
  `«Én tomme er nøyaktig 2,54 centimeter»`, no `«Regn om tommer til cm»`.
- La negrita va sobre **el concepto**, nunca sobre la keyword literal.
- Ninguna cifra sin fuente verificable. Nada de prueba social inventada.
- **Prohibido prometer que pasará la EU-kontroll.** Se da el dato (±5 %, norma
  STRO) y se dice qué es lo que decide (el vognkortet).
- Las llamadas a la acción llevan verbo conjugado en 2ª persona. `Sjekk om
  avviket ditt er lovlig`, no `Lovlig avvik dekkdimensjon`.
- **La CTA principal de cada página apunta a OTRA URL.** Si apunta a sí misma
  no puede producir la microconversión del modelo.

### Noruego
- La raya es la **corta** (`–`). La larga (`—`) es convención inglesa y es lo que
  hace que el texto suene a traducción. Comprobación 10 del script.
- Tres consonantes iguales se reducen a dos en composición: `dekk` + `kalkulator`
  = **`dekkalkulator`**.
- Nada de *særskriving*: `konverteringsverktøy`, no `konverterings verktøy`.
- Siempre `du`. Nunca `vi` ni `vår`: el sitio no tiene opinión, tiene aritmética.
- **Excepción deliberada:** en `title` y `H1` se mantienen `dekk kalkulator`,
  `felg kalkulator`, `rulleomkrets kalkulator`, `dekk og felg tabell` y
  `speedometer avvik` separados. Es como busca la gente, confirmado en Search
  Console. En prosa corrida, forma compuesta.

---

## 6. Decisiones ya tomadas — no se reabren sin datos nuevos

| Decisión | Motivo |
|---|---|
| No se compran enlaces | El techo del sitio son 10-51 €/mes. Un enlace de 200 € tarda 8-20 meses en pagarse |
| No se hacen tests A/B | ~30 clics orgánicos al mes. El tamaño de muestra devuelve años |
| No se invierte en el clúster `N-tommer-i-cm` | 1.520 impresiones y casi cero clics en posiciones 6,7-9,7. Google responde en la SERP. **Su `title` corto es correcto: es la respuesta** |
| No se persigue el 100 % de indexación | 36 URLs bien indexadas valen más que 60 a medias |
| No se persigue `dekkalkulator.no` | Es navegacional de marca ajena |

---

## 7. Lo que no depende del código

- **GA4**: no está instalado. Sin él no existe el KPI del modelo. El hueco ya
  está preparado en `js/cookie-banner.js`; falta el ID `G-` y los eventos
  `kalkulator_bruk` y `klikk_ut`.
- **Unidades de anuncio**: hay 0 `<ins class="adsbygoogle">` en el sitio. El
  script de AdSense está en las 36 páginas, pero **solo monetiza si Auto Ads
  está activo en la cuenta**. Decisión del dueño.
- **Rich Results Test** de Google: necesita la URL en producción. Pásale la home
  y `/dekkdimensjon` después de cada despliegue.

---

## 8. Estructura

```
*.html                    36 URLs vivas (sitemap.xml) + 13 orígenes de 301 + 404
css/dk-design.css         capa de diseño, sobrescribe sin borrar
js/dekk-core.js           motor de las calculadoras — NO TOCAR
js/cookie-banner.js       consentimiento (Consent Mode v2)
fonts/                    Instrument Serif + Inter variable, subseteadas
scripts/verificar.mjs     las 15 comprobaciones
vercel.json               13 redirecciones 301 + cabeceras de caché y seguridad
docs/                     playbook de nicho reutilizable
```

Las 13 páginas que no están en el sitemap son orígenes de redirección 301
declarados en `vercel.json`. Siguen en disco: si la regla desapareciera, vuelve
el contenido duplicado.
