# Buenas prácticas para webs nicho call-to-click

Playbook reutilizable en cualquier web del portafolio. Sale de lo que costó caro
en dekkalkulator.online: las cifras que aparecen son reales de ese proyecto.

---

## 0. El modelo, y qué se mide

Una web call-to-click es **un nicho, una intención, una herramienta**. Vive de
la publicidad, así que:

```
Ingresos = Páginas vistas × RPM
Páginas vistas = Sesiones × Páginas por sesión
```

**Páginas por sesión es el KPI.** Todo lo demás — impresiones, posición media,
autoridad — es métrica de control interno, no de negocio.

Consecuencia práctica: cada página debe empujar a otra. Una página que resuelve
la duda y termina en un pie de página es una página vista, no dos.

> **Instala la analítica antes de optimizar.** En dekkalkulator se trabajaron
> meses sin GA4. Sin páginas por sesión no hay forma de saber si algo funcionó,
> y todo el trabajo posterior se evalúa a ciegas.

---

## 1. Lo primero que hay que mirar: ¿Google ve el contenido?

Googlebot indexa en dos olas. **La primera no ejecuta JavaScript.** Todo lo que
tu calculadora pinta con JS no existe para esa primera ola.

En dekkalkulator, **18 de 36 páginas servían un `<tbody>` vacío** que el JS
rellenaba después. `/tommer-til-cm` servía 0 filas y mostraba 13. Ahí caía el
**97 % de las impresiones del sitio**.

**Comprobación, un minuto:**

```bash
curl -s https://tu-sitio.com/pagina | grep -c '<tr'
```

Si el número no coincide con las filas que ves en el navegador, tienes el mismo
problema.

**Solución sin tocar la lógica:** cargar cada página en Chromium, capturar el
`innerHTML` que el propio JS genera, y escribirlo en el HTML de origen. El
resultado es byte a byte lo que producía el JS, así que no hay riesgo de
divergencia. Después se verifica que crudo = renderizado en cada tabla.

---

## 2. Enlazado interno: la teoría del primer enlace

- Google cuenta **solo el primer enlace** de la página A hacia la página B, en
  orden del HTML. Los siguientes no aportan.
- `nofollow` **no esculpe**: divide la autoridad igual y la pierde. Dejó de
  servir para eso en 2009.
- El reparto es `autoridad / número de enlaces`, ponderado por emplazamiento:
  contextual 1,0 · navegación 0,8 · barra lateral 0,6 · **pie 0,1**.

De ahí que un pie con 18 enlaces sea casi todo desperdicio. **Pero cuidado:**
reducirlo de 18 a 4 en dekkalkulator dejó 18 páginas sin ningún camino desde el
resto del sitio. El pie era feo pero era el único puente.

**Regla:** antes de quitar enlaces, calcula la alcanzabilidad. Después, vuelve a
calcularla.

```js
// recorrido en anchura desde la home sobre el grafo de enlaces internos
const vistas = new Set(['/']), cola = ['/'];
while (cola.length) for (const d of grafo.get(cola.shift()) || [])
  if (!vistas.has(d)) { vistas.add(d); cola.push(d); }
// vistas.size debe ser igual al número de URLs del sitemap
```

Y comprueba también la **profundidad**: nada a 3 clics o más de la home, y desde
luego nada colgando de las dos páginas más débiles del sitio.

---

## 3. Contenido

- **La introducción se escribe al final**, después del cuerpo. Escrita antes
  sale imprecisa, y describe la herramienta en vez de responder la duda.
- **Abre con la respuesta.** El usuario que busca «tommer til cm» quiere el
  número, no una descripción del conversor.
- El mínimo viable ronda las **500 palabras**, pero la longitud correcta es la
  que responde a la intención. Si el competidor que domina la SERP concentra
  cinco intenciones en 2.800 palabras, no compites con una página débil:
  compites con cuarenta.
- **Cita fuentes verificables.** Es la diferencia entre contenido de nicho y
  contenido de relleno, y es lo que sostiene E-E-A-T en temas normativos.
- **Nunca prometas un resultado** («pasarás la inspección», «conseguirás»). Da
  el dato y di qué es lo que decide.

### Contenido que no vale la pena
Si un clúster tiene muchas impresiones y **cero clics** en posiciones 6-9, es
zero-click estructural: Google responde en la SERP. No es un fallo que corregir,
es una característica del mercado. En dekkalkulator son 1.520 impresiones al mes
que no van a convertirse en visitas jamás. Su único valor es donar enlaces
internos.

Ahí el `title` corto que contiene la respuesta **es lo correcto**: no lo alargues
buscando CTR que no existe.

---

## 4. Que el texto no suene a IA

Es un problema real de posicionamiento y de confianza, no de estética.

| Síntoma | Corrección |
|---|---|
| Raya larga `—` en exceso | En español y en lenguas nórdicas la raya de inciso es la **corta** `–`. La larga es convención inglesa |
| «no es solo X, es Y» | Reescribir en afirmativo |
| Frases perfectamente equilibradas, todas de la misma longitud | Alternar frases cortas y largas |
| Negrita sobre la keyword | La negrita va sobre **el concepto** que resume la historia |
| Misma técnica en todos los encabezados | Alternar: pregunta, cifra, objeción, norma |
| Muletillas: «gratis», «rápido y sencillo», «¡Pruébalo ya!» | Fuera. En un nicho de herramientas gratuitas, «gratis» no diferencia |

**Mide, no opines.** Un texto natural tiene 1-2 rayas por cada 1.000 palabras.
En dekkalkulator había **11,4**.

**Y revisa a mano después de un reemplazo masivo.** Corregir esto con una
expresión regular rompió tres frases: convirtió la apertura de un inciso en coma
y dejó el cierre.

### Localización
Cada idioma tiene marcadores que delatan la traducción automática. En noruego:
tres consonantes iguales se reducen a dos en composición, y la *særskriving*
(separar una palabra compuesta) es el error clásico. Búscalos explícitamente.

---

## 5. Title y metadescripción

- `title`: **50-70 caracteres**, keyword lo más al principio posible.
- Metadescripción: **130-155 caracteres**, única, con verbo y valor.
- El `H1` **puede y debe diferir** del `title`. El `title` gana el clic; el `H1`
  confirma al usuario que ha llegado bien. Repetirlo desperdicia un punto de
  captura.
- Los cuatro campos van sincronizados: `title` = `og:title` = `twitter:title`.
  Lo mismo con las descripciones.

**No alargues un título solo por llegar al rango.** Y no persigas keywords
navegacionales de marca ajena.

**Dónde se mide de verdad:** solo las URLs que ya están en primera página tienen
CTR que mover. En posición 30 o 50, el `title` no mueve clics — eso es trabajo de
contenido y enlazado. Márcalo antes de prometer resultados.

---

## 6. Datos estructurados

- **`FAQPage` ya no da resultados enriquecidos.** Google los retiró el **7 de
  mayo de 2026** y borró la documentación el 15 de junio. Mantenerlo no penaliza
  y otros consumidores lo leen, pero **deja de contarlo como palanca**.
- `HowTo` está deprecado desde 2023. No lo añadas.
- El buscador de sitio (`SearchAction`) se retiró en noviembre de 2023.
- Lo que **sí** sigue dando resultado: `BreadcrumbList`, y `Organization` en la
  home para la identidad del editor.
- **Conecta las entidades.** Un nodo suelto por página es una isla. Cada página
  debe llevar un `WebPage` con `isPartOf` hacia el `WebSite` y `publisher` hacia
  la `Organization`, ambos definidos una sola vez en la home.
- Verifica que **todas las referencias `@id` resuelven**. Y que el contenido del
  marcado coincide con el texto visible: si cambias una FAQ, cambia también su
  JSON-LD.

---

## 7. Diseño y rendimiento

- **El móvil manda.** En estos nichos el usuario llega con el móvil en la mano y
  el neumático delante. Mide dónde empieza la calculadora y dónde aparece el
  resultado, en 360, 390 y 430 px. Ambos deben caber en la primera pantalla.
- El mayor delator de «web antigua» son los **desplegables nativos del sistema**.
  `appearance:none` con una flecha propia los arregla sin tocar el elemento
  `<select>`, así que no se pierden ni el teclado ni el lector de pantalla.
- **CLS a cero**: `width` y `height` en toda imagen.
- **Fuentes autoalojadas y subseteadas.** Google Fonts sirve desde los servidores
  de Google, lo que contradice cualquier gestión seria del consentimiento en el
  EEE. Subsetear al alfabeto real del sitio bajó de 115 KB a 48 KB, y una fuente
  variable sustituyó a cuatro estáticas.
- **Contraste WCAG AA verificado en el navegador**, resolviendo también los
  fondos con degradado. Calcularlo sobre el CSS da falsos positivos y falsos
  negativos.
- Rediseña con **una capa que sobrescribe**, nunca reescribiendo el HTML de la
  herramienta. Así el cambio es reversible quitando una línea.

---

## 8. Consentimiento y publicidad

- Un banner de cookies que solo guarda la decisión en `localStorage` y no hace
  nada **no sirve de nada**. En dekkalkulator la función que debía aplicarlo
  estaba vacía, y el script de AdSense cargaba antes de cualquier consentimiento.
- La solución correcta no es bloquear el script, es **Google Consent Mode v2**:
  denegado por defecto, con `wait_for_update`, y el banner concede o deniega de
  verdad. Se siguen sirviendo anuncios no personalizados sin consentimiento.
- **Nada de anuncios en la página 404** ni en páginas sin contenido propio.
- El script de AdSense **no monetiza por sí solo**. O hay unidades
  `<ins class="adsbygoogle">` en el HTML, o Auto Ads está activo en la cuenta.
  Comprueba cuál de las dos, porque «el script está puesto» no es respuesta.

---

## 9. Off-page: cuándo NO comprar enlaces

Antes de gastar un euro, calcula el techo del proyecto:

```
techo mensual ≈ impresiones × CTR alcanzable × RPM
```

En dekkalkulator ese techo son **10-51 €/mes** con las 36 URLs. Un enlace de
200 € tarda entre 8 y 20 meses en pagarse solo. **Cada euro gastado en enlaces
en un proyecto así es un euro mal gastado.**

Lo que sí funciona a esta escala es que la gente enlace sola. Para eso el
resultado tiene que ser **compartible por URL**: si tu calculadora siempre está
en `/`, nadie puede enlazar un cálculo concreto, solo la portada. Con el estado
en la URL (`?de=205-55-16&a=225-45-17`) un hilo de foro produce un enlace con
contexto. El canonical debe seguir apuntando siempre a la URL limpia.

---

## 10. La disciplina, que es lo que más cuesta

**Un tipo de cambio por despliegue, y mide después de cada uno.**

Agrupar cambios ahorra tiempo hasta que algo se rompe: entonces no sabes cuál de
los cinco fue. En dekkalkulator se cambiaron footer, grid, redirecciones y
contenido a la vez, y 18 páginas quedaron inalcanzables sin que nadie lo notara
hasta medirlo.

**Verifica antes de decir que está hecho.** No leyendo el diff: ejecutando la
comprobación. En este proyecto, tres veces se dio algo por terminado que no lo
estaba, y las tres se descubrió midiendo.

**Automatiza la verificación.** Una lista de buenas prácticas que hay que
recordar no se cumple. Un script que sale con código 1 sí. En este repo está en
`scripts/verificar.mjs`: 15 comprobaciones, y cada una existe porque algo se
rompió de verdad.

**Y el punto de control real llega a las 4-6 semanas**, cuando Google haya
rastreado de nuevo. Antes de eso no hay nada que mirar, y cualquier conclusión
es ruido.
