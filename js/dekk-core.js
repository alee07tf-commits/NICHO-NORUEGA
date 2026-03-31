/**
 * Dekkalkulator Core — Motor de cálculo de neumáticos
 * Vanilla JS, 0 dependencias, reutilizable en todas las URLs
 * Fórmulas basadas en estándares STRO (Scandinavian Tire and Rim Organization)
 */

const Dekk = {
  // ── FÓRMULAS CORE ──

  /** Diámetro total del neumático en mm */
  diameter(width, profile, rim) {
    return 2 * (width * profile / 100) + (rim * 25.4);
  },

  /** Circunferencia (rulleomkrets) en mm */
  circumference(width, profile, rim) {
    return Math.PI * this.diameter(width, profile, rim);
  },

  /** Altura del flanco (sidewall) en mm */
  sidewall(width, profile) {
    return width * profile / 100;
  },

  /** Revoluciones por km */
  revsPerKm(width, profile, rim) {
    return 1000000 / this.circumference(width, profile, rim);
  },

  /** Desviación del velocímetro: velocidad real vs indicada */
  speedDeviation(origW, origP, origR, newW, newP, newR, indicatedSpeed) {
    const origCirc = this.circumference(origW, origP, origR);
    const newCirc = this.circumference(newW, newP, newR);
    const realSpeed = indicatedSpeed * (newCirc / origCirc);
    return {
      real: realSpeed,
      deviation: realSpeed - indicatedSpeed,
      deviationPercent: ((newCirc - origCirc) / origCirc) * 100
    };
  },

  /** Diferencia porcentual entre dos neumáticos */
  comparison(origW, origP, origR, newW, newP, newR) {
    const origD = this.diameter(origW, origP, origR);
    const newD = this.diameter(newW, newP, newR);
    const origC = this.circumference(origW, origP, origR);
    const newC = this.circumference(newW, newP, newR);
    const origS = this.sidewall(origW, origP);
    const newS = this.sidewall(newW, newP);
    const diffPercent = ((newC - origC) / origC) * 100;

    return {
      orig: { diameter: origD, circumference: origC, sidewall: origS, revsKm: 1000000 / origC },
      new: { diameter: newD, circumference: newC, sidewall: newS, revsKm: 1000000 / newC },
      diff: {
        diameter: newD - origD,
        circumference: newC - origC,
        sidewall: newS - origS,
        percent: diffPercent,
        legal: Math.abs(diffPercent) <= 5 // STRO ±5% tolerance
      }
    };
  },

  /** Verificar si la dimensión está dentro del margen legal STRO (±5%) */
  isLegal(origW, origP, origR, newW, newP, newR) {
    const origC = this.circumference(origW, origP, origR);
    const newC = this.circumference(newW, newP, newR);
    const diffPercent = Math.abs(((newC - origC) / origC) * 100);
    return { legal: diffPercent <= 5, deviation: diffPercent };
  },

  /** Convertir pulgadas a cm */
  inchToCm(inches) { return inches * 2.54; },

  /** Convertir pulgadas a mm */
  inchToMm(inches) { return inches * 25.4; },

  /** Convertir cm a pulgadas */
  cmToInch(cm) { return cm / 2.54; },

  /** Convertir mm a pulgadas */
  mmToInch(mm) { return mm / 25.4; },

  /** Cálculo de offset/innpress para llantas (ET) */
  rimOffset(rimWidth, et) {
    const rimWidthMm = rimWidth * 25.4;
    const centerToInner = (rimWidthMm / 2) - et;
    const centerToOuter = (rimWidthMm / 2) + et;
    return { innerClearance: centerToInner, outerClearance: centerToOuter, rimWidthMm };
  },

  /** Comparar offset de dos llantas */
  rimComparison(origWidth, origET, newWidth, newET) {
    const orig = this.rimOffset(origWidth, origET);
    const newR = this.rimOffset(newWidth, newET);
    return {
      orig, new: newR,
      innerDiff: newR.innerClearance - orig.innerClearance,
      outerDiff: newR.outerClearance - orig.outerClearance
    };
  },

  // ── DATOS DE REFERENCIA ──

  /** Anchos de neumático comunes */
  widths: [145,155,165,175,185,195,205,215,225,235,245,255,265,275,285,295,305,315,325,335,345],

  /** Perfiles comunes */
  profiles: [25,30,35,40,45,50,55,60,65,70,75,80,85],

  /** Tamaños de llanta comunes */
  rims: [13,14,15,16,17,18,19,20,21,22],

  /** Tabla de índice de carga (load index) */
  loadIndex: {
    60:250,61:257,62:265,63:272,64:280,65:290,66:300,67:307,68:315,69:325,
    70:335,71:345,72:355,73:365,74:375,75:387,76:400,77:412,78:425,79:437,
    80:450,81:462,82:475,83:487,84:500,85:515,86:530,87:545,88:560,89:580,
    90:600,91:615,92:630,93:650,94:670,95:690,96:710,97:730,98:750,99:775,
    100:800,101:825,102:850,103:875,104:900,105:925,106:950,107:975,108:1000,
    109:1030,110:1060,111:1090,112:1120,113:1150,114:1180,115:1215,116:1250,
    117:1285,118:1320,119:1360,120:1400
  },

  /** Tabla de índice de velocidad */
  speedIndex: {
    'L':120,'M':130,'N':140,'P':150,'Q':160,'R':170,'S':180,'T':190,
    'U':200,'H':210,'V':240,'W':270,'Y':300,'Z':'240+'
  },

  // ── FORMATEO ──

  /** Formatear número al estilo noruego (coma decimal, punto miles) */
  fmt(n, decimals = 1) {
    return n.toLocaleString('nb-NO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  },

  fmtInt(n) {
    return n.toLocaleString('nb-NO', { maximumFractionDigits: 0 });
  }
};

// ── UI HELPERS ──

/** Crear opciones de select */
function populateSelect(id, values, selected, suffix) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = '';
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = suffix ? v + suffix : v;
    if (v == selected) opt.selected = true;
    sel.appendChild(opt);
  });
}

/** Obtener valor numérico de un select */
function getVal(id) {
  const el = document.getElementById(id);
  return el ? parseFloat(el.value) : 0;
}

/** Mostrar texto en un elemento */
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

/** Mostrar/ocultar clase */
function toggleClass(id, cls, add) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(cls, add);
}

/** Dibujar comparación visual SVG de dos neumáticos */
function drawTireComparison(containerId, origD, newD) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const maxD = Math.max(origD, newD);
  const scale = 120 / maxD;
  const origR = (origD * scale) / 2;
  const newR = (newD * scale) / 2;
  const cx1 = 80, cx2 = 220, cy = 75;

  container.innerHTML = `
    <svg width="300" height="150" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tireGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#334155"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
        <linearGradient id="rimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#94a3b8"/>
          <stop offset="100%" stop-color="#64748b"/>
        </linearGradient>
      </defs>
      <!-- Original -->
      <circle cx="${cx1}" cy="${cy}" r="${origR}" fill="url(#tireGrad)" stroke="#475569" stroke-width="1.5"/>
      <circle cx="${cx1}" cy="${cy}" r="${origR * 0.55}" fill="url(#rimGrad)" stroke="#94a3b8" stroke-width="1"/>
      <circle cx="${cx1}" cy="${cy}" r="${origR * 0.2}" fill="#e2e8f0"/>
      <text x="${cx1}" y="148" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui">Original</text>
      <!-- Ny -->
      <circle cx="${cx2}" cy="${cy}" r="${newR}" fill="url(#tireGrad)" stroke="#475569" stroke-width="1.5"/>
      <circle cx="${cx2}" cy="${cy}" r="${newR * 0.55}" fill="url(#rimGrad)" stroke="#94a3b8" stroke-width="1"/>
      <circle cx="${cx2}" cy="${cy}" r="${newR * 0.2}" fill="#e2e8f0"/>
      <text x="${cx2}" y="148" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui">Ny</text>
      <!-- Diff line -->
      <line x1="${cx1 + origR + 5}" y1="${cy}" x2="${cx2 - newR - 5}" y2="${cy}" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="4,3"/>
    </svg>`;
}
