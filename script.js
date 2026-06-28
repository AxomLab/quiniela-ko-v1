/* ============================================================
   QUINIELA KO MUNDIAL 2026 — SCRIPT PÚBLICO v1.0
   Contrato compatible con JSON KO:
   schemaVersion, metadata, configuracionPublica, estadoOperativo,
   ranking, partidos, bracket, estadisticas, mensajes, validacionesPublicas

   Objetivo:
   - Leer data/quiniela.json generado por n8n.
   - Renderizar ranking, carrera, top/bottom, partidos abiertos y resumen.
   - No calcular puntos oficiales en navegador.
   ============================================================ */

const DATA_URL = 'data/quiniela.json?v=' + Date.now();

let appData = null;
let participantes = [];
let partidos = [];

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  await cargarDatos();
});

function initTheme() {
  const saved = localStorage.getItem('quiniela-theme-ko') || localStorage.getItem('quiniela-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeButton(saved);

  const btn = $('theme-toggle');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('quiniela-theme-ko', next);
    updateThemeButton(next);
  });
}

function updateThemeButton(theme) {
  const btn = $('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

async function cargarDatos() {
  try {
    const res = await fetch(DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar data/quiniela.json');

    const rawText = await res.text();
    const cleanText = rawText.trim().startsWith('=') ? rawText.trim().slice(1) : rawText;
    appData = JSON.parse(cleanText);

    participantes = normalizarRankingKO(appData.ranking || []);
    partidos = normalizarPartidosKO(appData.partidos || []);

    renderAll();
  } catch (err) {
    console.error(err);
    renderError();
  }
}

function normalizarRankingKO(rows) {
  return rows
    .map((p, index) => {
      const ganador = numero(p.aciertosGanador);
      const marcador = numero(p.aciertosMarcador);
      const metodo = numero(p.aciertosMetodo);
      const aciertosTotales = ganador + marcador + metodo;

      return {
        id: p.participanteId || p.ParticipanteID || `P${index + 1}`,
        nombre: texto(p.nombre || p.Nombre || ''),
        alias: texto(p.alias || p.Alias || p.nombre || p.Nombre || `Participante ${index + 1}`),
        avatar: texto(p.avatar || p.Avatar || ''),
        color: texto(p.color || p.Color || '') || colorPorIndice(index),
        puntos: numero(p.puntosTotal ?? p.PuntosTotal),
        aciertosGanador: ganador,
        aciertosMarcador: marcador,
        aciertosMetodo: metodo,
        aciertos: aciertosTotales,
        pronosticados: numero(p.partidosPronosticados ?? p.PartidosPronosticados),
        puntuados: numero(p.partidosPuntuados ?? p.PartidosPuntuados),
        porcentaje: numero(p.porcentajeEfectividad ?? p.PorcentajeEfectividad),
        posicion: numero(p.posicion ?? p.Posicion) || index + 1,
        raw: p
      };
    })
    .sort((a, b) => {
      if (b.puntos !== a.puntos) return b.puntos - a.puntos;
      if (b.aciertosGanador !== a.aciertosGanador) return b.aciertosGanador - a.aciertosGanador;
      if (b.aciertosMarcador !== a.aciertosMarcador) return b.aciertosMarcador - a.aciertosMarcador;
      if (b.aciertosMetodo !== a.aciertosMetodo) return b.aciertosMetodo - a.aciertosMetodo;
      return a.alias.localeCompare(b.alias, 'es');
    })
    .map((p, index) => ({ ...p, posicionVisual: p.posicion || index + 1 }));
}

function normalizarPartidosKO(rows) {
  return rows
    .filter((p) => p && p.visibleWeb !== false)
    .map((p) => {
      const local = p.local || {};
      const visitante = p.visitante || {};
      const resultado = p.resultado || {};
      const estadoId = texto(p.estadoId || p.estado?.estadoId || p.EstadoID || '');
      const visibleCaptura = Boolean(p.visibleCaptura ?? p.estado?.visibleCaptura ?? false);
      const validado = Boolean(resultado.resultadoValidado);

      return {
        id: texto(p.partidoId || p.PartidoID || ''),
        rondaId: texto(p.rondaId || ''),
        ronda: texto(p.rondaEtiqueta || p.rondaId || ''),
        numero: numero(p.numeroPartido),
        fechaHoraLocal: texto(p.fechaHoraLocal || ''),
        cierrePronostico: texto(p.cierrePronostico || ''),
        estadoId,
        estadoEtiqueta: texto(p.estadoEtiqueta || p.estado?.etiqueta || estadoId),
        visibleCaptura,
        resultadoValidado: validado,
        calculableResultado: Boolean(p.calculableResultado),
        local: {
          id: texto(local.equipoId || ''),
          nombre: texto(local.visual || local.nombreCorto || local.nombre || 'Por definir'),
          bandera: texto(local.bandera || '')
        },
        visitante: {
          id: texto(visitante.equipoId || ''),
          nombre: texto(visitante.visual || visitante.nombreCorto || visitante.nombre || 'Por definir'),
          bandera: texto(visitante.bandera || '')
        },
        resultado: {
          golesLocal90: resultado.golesLocal90,
          golesVisitante90: resultado.golesVisitante90,
          ganadorFinalId: resultado.ganadorFinalId,
          metodoVictoriaEtiqueta: resultado.metodoVictoriaEtiqueta,
          resultadoValidado: validado
        },
        raw: p
      };
    })
    .sort((a, b) => {
      const an = a.numero || 999;
      const bn = b.numero || 999;
      return an - bn;
    });
}

function texto(value) {
  return String(value ?? '').trim();
}

function numero(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = Number(String(value).replace('%', '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

function colorPorIndice(i) {
  const colors = ['#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#FDD835', '#6D4C41'];
  return colors[i % colors.length];
}

function renderAll() {
  renderStats();
  renderCarrera();
  renderTopBottom();
  renderPartidoCaliente();
  renderDatoLoco();
  renderRanking();
  renderResumen();
  initAvatarInteractions();
}

function renderError() {
  document.body.innerHTML = `
    <main class="error-screen">
      <h1>No se pudo cargar la Quiniela KO</h1>
      <p>Revisa que <strong>data/quiniela.json</strong> exista, sea válido y conserve el contrato público KO.</p>
    </main>
  `;
}

function formatearFechaCDMX(valor) {
  if (!valor) return '';
  const normalizado = String(valor).includes('T') ? String(valor) : String(valor).replace(' ', 'T');
  const fecha = new Date(normalizado);
  if (isNaN(fecha.getTime())) return valor;

  return fecha.toLocaleString('es-MX', {
    timeZone: 'America/Mexico_City',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CDMX';
}

function formatearHoraCDMX(valor) {
  if (!valor) return '';
  const normalizado = String(valor).includes('T') ? String(valor) : String(valor).replace(' ', 'T');
  const fecha = new Date(normalizado);
  if (isNaN(fecha.getTime())) return valor;

  return fecha.toLocaleTimeString('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }) + ' CDMX';
}

function contarPartidosFinalizados() {
  return partidos.filter(p => p.resultadoValidado || p.estadoId === 'EST_FINALIZADO').length;
}

function contarPartidosAbiertos() {
  return partidos.filter(p => p.visibleCaptura || p.estadoId === 'EST_ABIERTO').length;
}

function contarPartidosPendientes() {
  return Math.max(0, partidos.length - contarPartidosFinalizados());
}

function renderStats() {
  const metadata = appData.metadata || {};
  const el = $('stats-rapidos');
  if (!el) return;

  const actualizacion = formatearFechaCDMX(metadata.ultimaActualizacion);

  const stats = [
    { icon: '👥', value: metadata.participantesActivos ?? participantes.length, label: 'Participantes' },
    { icon: '🏆', value: metadata.totalPartidos ?? partidos.length, label: 'Partidos KO' },
    { icon: '🟢', value: metadata.partidosAbiertos ?? contarPartidosAbiertos(), label: 'Abiertos' },
    { icon: '⏱️', value: actualizacion || 'Sin fecha', label: 'Actualización', small: true }
  ];

  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-icon">${s.icon}</span>
      <strong class="${s.small ? 'stat-small' : ''}">${escapeHtml(s.value)}</strong>
      <span>${escapeHtml(s.label)}</span>
    </div>
  `).join('');
}

function renderCarrera() {
  const el = $('pista');
  if (!el) return;

  if (!participantes.length) {
    el.innerHTML = `<div class="empty-state">No hay ranking publicado.</div>`;
    return;
  }

  const maxPuntos = Math.max(...participantes.map(p => p.puntos), 1);

  el.innerHTML = `
    <div class="race-labels">
      <span>Inicio KO</span>
      <span>Campeón</span>
    </div>
    <div class="race-lanes">
      ${participantes.map((p) => renderCarril(p, maxPuntos)).join('')}
    </div>
  `;
}

function renderCarril(p, maxPuntos) {
  const progreso = p.puntos > 0
    ? Math.max(4, Math.min(92, (p.puntos / maxPuntos) * 82 + 4))
    : 0;

  return `
    <div class="race-lane ${p.posicionVisual === 1 ? 'race-leader' : ''}" style="--participant-color:${escapeAttr(p.color)}">
      <aside class="lane-info">
        <span class="rank-badge">${p.posicionVisual}</span>
        <div>
          <strong title="${escapeAttr(p.alias)}">${escapeHtml(p.alias)}</strong>
          <span>${p.puntos} pts</span>
        </div>
      </aside>

      <div class="lane-track">
        <span class="lane-watermark">${p.puntos}</span>
        <div class="runner" style="left:${progreso}%">
          ${renderRaceAvatar(p)}
        </div>
        <div class="score-chip">
          <strong>${p.puntos} pts</strong>
          <span>G ${p.aciertosGanador} · M ${p.aciertosMarcador} · Método ${p.aciertosMetodo}</span>
        </div>
      </div>
    </div>
  `;
}

function renderRaceAvatar(p) {
  const hasAvatar = Boolean(p.avatar);
  const img = hasAvatar
    ? `<img src="avatars/${escapeAttr(p.avatar)}" alt="${escapeAttr(p.alias)}" loading="lazy"
         onload="this.closest('.race-avatar').classList.add('has-image')"
         onerror="this.closest('.race-avatar').classList.add('no-image'); this.remove();" />`
    : '';

  return `
    <button class="race-avatar ${hasAvatar ? 'waiting-image' : 'no-image'}" type="button" aria-label="Ver ${escapeAttr(p.alias)}">
      ${img}
      <span class="avatar-fallback" aria-hidden="true">${escapeHtml(iniciales(p.alias))}</span>
      <span class="avatar-popover">
        <strong>${escapeHtml(p.alias)}</strong>
        <small>${p.puntos} pts · G ${p.aciertosGanador} · M ${p.aciertosMarcador} · Método ${p.aciertosMetodo}</small>
      </span>
    </button>
  `;
}

function renderTopBottom() {
  const top = participantes.slice(0, 5);
  const bottom = [...participantes].reverse().slice(0, 5);

  const topEl = $('top5');
  const bottomEl = $('bottom5');

  if (topEl) {
    topEl.innerHTML = top.length
      ? top.map((p, i) => renderMiniItem(p, ['🥇','🥈','🥉','⭐','🔥'][i] || '🏅', `${p.puntos} pts`)).join('')
      : `<div class="empty-state">Sin datos.</div>`;
  }

  if (bottomEl) {
    bottomEl.innerHTML = bottom.length
      ? bottom.map((p) => renderMiniItem(p, '😅', 'Inicio parejo')).join('')
      : `<div class="empty-state">Sin datos.</div>`;
  }
}

function renderMiniItem(p, icon, badge) {
  return `
    <div class="mini-item">
      <span class="mini-icon">${icon}</span>
      ${renderMiniAvatar(p)}
      <div class="mini-info">
        <strong>${escapeHtml(p.alias)}</strong>
        <span>${p.puntos} pts · G ${p.aciertosGanador} · M ${p.aciertosMarcador} · Método ${p.aciertosMetodo}</span>
      </div>
      <span class="mini-badge">${escapeHtml(badge)}</span>
    </div>
  `;
}

function renderMiniAvatar(p) {
  const hasAvatar = Boolean(p.avatar);
  const img = hasAvatar
    ? `<img src="avatars/${escapeAttr(p.avatar)}" alt="${escapeAttr(p.alias)}"
         onload="this.closest('.mini-avatar').classList.add('has-image')"
         onerror="this.closest('.mini-avatar').classList.add('no-image'); this.remove();" />`
    : '';

  return `
    <span class="mini-avatar ${hasAvatar ? 'waiting-image' : 'no-image'}" style="--participant-color:${escapeAttr(p.color)}">
      ${img}
      <span>${escapeHtml(iniciales(p.alias))}</span>
    </span>
  `;
}

function renderPartidoCaliente() {
  const el = $('partido-caliente');
  if (!el) return;

  const abierto = partidos.find(p => p.visibleCaptura || p.estadoId === 'EST_ABIERTO');
  const pendiente = partidos.find(p => p.estadoId === 'EST_PENDIENTE_EQUIPOS');
  const partido = abierto || pendiente || partidos[0];

  if (!partido) {
    el.innerHTML = `<div class="empty-state">Sin partidos registrados.</div>`;
    return;
  }

  const estado = partido.visibleCaptura ? 'Abierto para pronóstico' : partido.estadoEtiqueta || 'Pendiente';
  const fecha = formatearFechaCDMX(partido.fechaHoraLocal);
  const cierre = formatearHoraCDMX(partido.cierrePronostico);

  el.innerHTML = `
    <div class="match-card">
      <div class="match-date">${escapeHtml(partido.ronda)} · Partido ${escapeHtml(partido.numero || partido.id)}</div>

      <div class="match-teams">
        <div><strong>${escapeHtml(partido.local.bandera)} ${escapeHtml(partido.local.nombre)}</strong></div>
        <span>vs</span>
        <div><strong>${escapeHtml(partido.visitante.bandera)} ${escapeHtml(partido.visitante.nombre)}</strong></div>
      </div>

      <p class="match-hype">
        ${escapeHtml(estado)}${fecha ? ` · ${escapeHtml(fecha)}` : ''}${cierre ? ` · Cierra ${escapeHtml(cierre)}` : ''}
      </p>

      ${renderInfoBar('Ganador / clasificado', 3, 6)}
      ${renderInfoBar('Marcador exacto 90 min', 2, 6)}
      ${renderInfoBar('Método de avance', 1, 6)}
    </div>
  `;
}

function renderInfoBar(label, count, total) {
  const pct = Math.round((count / total) * 100);
  return `
    <div class="vote-row">
      <span>${escapeHtml(label)}</span>
      <div class="vote-track"><div style="width:${pct}%"></div></div>
      <strong>${count}</strong>
    </div>
  `;
}

function renderDatoLoco() {
  const el = $('dato-loco');
  if (!el) return;

  const metadata = appData.metadata || {};
  const estado = appData.estadoOperativo || {};
  const abiertos = metadata.partidosAbiertos ?? contarPartidosAbiertos();
  const finalizados = metadata.partidosFinalizados ?? contarPartidosFinalizados();
  const total = metadata.totalPartidos ?? partidos.length;
  const lider = participantes[0];

  const frases = [];

  if (finalizados === 0) {
    frases.push('Todos arrancan empatados. Aquí nadie ha ganado nada, pero varios ya se sienten expertos. ⚽');
    frases.push(`Hay ${abiertos} partidos abiertos para pronosticar. La eliminación directa no perdona despistes. 🏆`);
  }

  if (lider) {
    frases.push(`${escapeHtml(lider.alias)} aparece arriba por ahora. En KO, hasta el orden alfabético se siente como estrategia. 😅`);
  }

  frases.push(`El sistema KO reparte hasta 6 puntos por partido: 3 por clasificado, 2 por marcador y 1 por método.`);
  frases.push(`La quiniela tiene ${total} partidos publicados y ${participantes.length} participantes activos.`);
  frases.push(estado.mensajePrincipal || 'La Quiniela KO está conectada al JSON público generado desde Google Sheets.');

  const indice = new Date().getMinutes() % frases.length;

  el.innerHTML = `
    <div class="fun-fact">
      <div>🎙️</div>
      <p>${frases[indice]}</p>
    </div>
  `;
}

function renderRanking() {
  renderRankingDesktop();
  renderRankingMobile();
}

function renderRankingDesktop() {
  const el = $('ranking-desktop');
  if (!el) return;

  if (!participantes.length) {
    el.innerHTML = `<div class="empty-state">Sin ranking publicado.</div>`;
    return;
  }

  el.innerHTML = `
    <table class="ranking-table">
      <thead>
        <tr>
          <th>Pos</th>
          <th>Participante</th>
          <th>Puntos</th>
          <th>Ganador</th>
          <th>Marcador</th>
          <th>Método</th>
          <th>%</th>
        </tr>
      </thead>
      <tbody>
        ${participantes.map(p => `
          <tr>
            <td><span class="table-rank">${p.posicionVisual}</span></td>
            <td class="participant-cell">${renderMiniAvatar(p)} <strong>${escapeHtml(p.alias)}</strong></td>
            <td>${p.puntos}</td>
            <td>${p.aciertosGanador}</td>
            <td>${p.aciertosMarcador}</td>
            <td>${p.aciertosMetodo}</td>
            <td>${p.porcentaje}%</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRankingMobile() {
  const el = $('ranking-mobile');
  if (!el) return;

  el.innerHTML = participantes.map(p => `
    <div class="mobile-card">
      <div>${renderMiniAvatar(p)} <strong>${escapeHtml(p.alias)}</strong></div>
      <span>${p.puntos} pts · G ${p.aciertosGanador} · M ${p.aciertosMarcador} · Método ${p.aciertosMetodo} · ${p.porcentaje}%</span>
    </div>
  `).join('');
}

function renderResumen() {
  const el = $('resumen');
  if (!el) return;

  const metadata = appData.metadata || {};
  const estado = appData.estadoOperativo || {};
  const lider = participantes[0];
  const abiertos = metadata.partidosAbiertos ?? contarPartidosAbiertos();
  const finalizados = metadata.partidosFinalizados ?? contarPartidosFinalizados();
  const total = metadata.totalPartidos ?? partidos.length;
  const pendientes = Math.max(0, total - finalizados);

  const cards = [
    { icon: '🏆', value: lider ? lider.alias : '-', label: 'Líder actual' },
    { icon: '🟢', value: abiertos, label: 'Partidos abiertos' },
    { icon: '✅', value: finalizados, label: 'Finalizados' },
    { icon: '⏳', value: pendientes, label: 'Pendientes' },
    { icon: '👥', value: metadata.participantesActivos ?? participantes.length, label: 'Activos' },
    { icon: '🛡️', value: metadata.hayErroresCriticos ? 'Revisar' : 'OK', label: 'JSON público' }
  ];

  el.innerHTML = `
    ${cards.map(c => `
      <div class="summary-card">
        <span>${c.icon}</span>
        <strong>${escapeHtml(c.value)}</strong>
        <small>${escapeHtml(c.label)}</small>
      </div>
    `).join('')}
    ${renderMensajeOperativo(estado)}
  `;
}

function renderMensajeOperativo(estado) {
  if (!estado || !estado.mensajePrincipal) return '';
  return `
    <div class="summary-card summary-wide">
      <span>📣</span>
      <strong>${escapeHtml(estado.capturaGlobal || 'Estado')}</strong>
      <small>${escapeHtml(estado.mensajePrincipal)}</small>
    </div>
  `;
}

function initAvatarInteractions() {
  document.addEventListener('click', (e) => {
    const avatar = e.target.closest('.race-avatar');
    document.querySelectorAll('.race-avatar.is-open').forEach(a => {
      if (a !== avatar) a.classList.remove('is-open');
    });
    if (avatar) avatar.classList.toggle('is-open');
  });
}

function iniciales(textValue) {
  return String(textValue || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || '?';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
