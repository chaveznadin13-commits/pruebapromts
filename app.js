// ============================================================
// Biblioteca de Prompts — Frontend Logic
// ============================================================

/**
 * ⚠️ IMPORTANTE: Reemplaza esta URL con la URL de tu Web App de Apps Script.
 * Menú Apps Script → Implementar → Nueva implementación → App web → copiar URL.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbzSQ4FQ-BKTp9OliR_8fvhn2iww70xpqDRsNMhWabFc7rvR9DQnOLBBNNeb4NKcSALIuA/exec';

// ── State ──────────────────────────────────────────────────
let prompts = [];
let filteredPrompts = [];
let editingId = null;
let deletingId = null;
let currentCategoryFilter = '';

const CATEGORY_ICONS = {
  'Marketing': '📱',
  'Ventas': '💼',
  'RRHH': '👥',
  'Desarrollo': '💻',
  'Diseño': '🎨',
  'Educación': '🎓',
  'Finanzas': '💰',
  'Salud': '⚕️',
  'Legal': '⚖️',
  'SEO': '🔎',
  'Copywriting': '✍️',
  'Redes Sociales': '👍',
  'Email Marketing': '✉️'
};

// ── DOM refs ───────────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DOM = {
  // Theme
  themeToggle: $('#theme-toggle'),

  // Categories
  categoryPills: $('#category-pills'),
  promptsCountLabel: $('#prompts-count-label'),

  // Toolbar
  searchInput: $('#search-input'),
  btnGenerateSamples: $('#btn-generate-samples'),
  btnAdd: $('#btn-add-prompt'),

  // Table
  tableBody: $('#table-body'),
  emptyState: $('#empty-state'),
  promptTable: $('#prompt-table'),

  // Form Modal
  formOverlay: $('#modal-form-overlay'),
  formTitle: $('#modal-form-title'),
  formClose: $('#modal-form-close'),
  form: $('#prompt-form'),
  formId: $('#form-id'),
  formCategoria: $('#form-categoria'),
  formNombre: $('#form-nombre'),
  formPrompt: $('#form-prompt'),
  formEjemplos: $('#form-ejemplos'),
  btnCancel: $('#btn-cancel-form'),
  btnSubmit: $('#btn-submit-form'),

  // Detail Modal
  detailOverlay: $('#modal-detail-overlay'),
  detailTitle: $('#modal-detail-title'),
  detailClose: $('#modal-detail-close'),
  detailCategoria: $('#detail-categoria'),
  detailNombre: $('#detail-nombre'),
  detailPrompt: $('#detail-prompt'),
  detailEjemplos: $('#detail-ejemplos'),

  // Confirm Modal
  confirmOverlay: $('#modal-confirm-overlay'),
  confirmClose: $('#modal-confirm-close'),
  confirmText: $('#confirm-text'),
  btnCancelDel: $('#btn-cancel-delete'),
  btnConfirmDel: $('#btn-confirm-delete'),

  // Spinner & Toast
  spinner: $('#spinner'),
  toastContainer: $('#toast-container'),
};

// ── Theme ──────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('prompts-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('prompts-theme', next);
}

// ── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${message}`;
  DOM.toastContainer.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ── Spinner ────────────────────────────────────────────────
function showSpinner() { DOM.spinner.classList.add('active'); }
function hideSpinner() { DOM.spinner.classList.remove('active'); }

// ── Modal Helpers ──────────────────────────────────────────
function openModal(overlay) { overlay.classList.add('active'); }
function closeModal(overlay) { overlay.classList.remove('active'); }

// ── API Communication ──────────────────────────────────────

function isApiConfigured() {
  return API_URL && API_URL !== 'PEGA_AQUÍ_TU_URL_DE_WEB_APP';
}

async function apiGet(action = 'getAll') {
  if (!isApiConfigured()) {
    loadDemoData();
    return;
  }
  const url = `${API_URL}?action=${action}`;
  const resp = await fetch(url);
  return resp.json();
}

async function apiPost(body) {
  if (!isApiConfigured()) {
    simulatePost(body);
    return { success: true, message: 'Operación simulada (modo demo).' };
  }
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  });
  return resp.json();
}

// ── Demo Data (cuando no hay API configurada) ──────────────
let demoIdCounter = 6;

function loadDemoData() {
  prompts = [
    { id: 2, categoria: 'Marketing', nombre: 'Generador de títulos', prompt: 'Actúa como un experto en copywriting. Genera 10 títulos atractivos para un artículo sobre [TEMA]. Los títulos deben ser llamativos, usar power words y tener entre 6 y 12 palabras.', ejemplos: 'Tema: Marketing Digital\n1. "7 Secretos del Marketing Digital que Nadie te Cuenta"\n2. "Cómo Triplicar tus Ventas con Marketing Digital en 30 Días"' },
    { id: 3, categoria: 'SEO', nombre: 'Meta description', prompt: 'Eres un especialista en SEO. Crea una meta description optimizada para una página web sobre [TEMA]. Debe tener entre 150-160 caracteres, incluir la keyword principal y un call-to-action.', ejemplos: 'Tema: Recetas de cocina saludable\n"Descubre recetas de cocina saludable fáciles y deliciosas. Aprende a comer mejor con nuestros platos nutritivos. ¡Empieza hoy!"' },
    { id: 4, categoria: 'Copywriting', nombre: 'Fórmula AIDA', prompt: 'Usa la fórmula AIDA (Atención, Interés, Deseo, Acción) para escribir un texto de venta para [PRODUCTO/SERVICIO]. El tono debe ser [TONO] y dirigido a [AUDIENCIA].', ejemplos: 'Producto: Curso de IA\nAtención: ¿Sabías que el 80% de los empleos cambiarán por la IA?\nInterés: Nuestro curso te enseña a dominar las herramientas de IA más demandadas.\nDeseo: Imagina automatizar tareas y multiplicar tu productividad.\nAcción: ¡Inscríbete hoy con 40% de descuento!' },
    { id: 5, categoria: 'Redes Sociales', nombre: 'Post para Instagram', prompt: 'Crea un post para Instagram sobre [TEMA]. Incluye: un hook inicial atrapante, cuerpo con valor, call-to-action, y 15 hashtags relevantes. Usa emojis de manera estratégica.', ejemplos: 'Tema: Productividad\n🚀 ¿Sientes que el día no te alcanza?\n\nAquí van 3 técnicas que cambiaron mi productividad:\n\n1️⃣ Pomodoro: 25 min de foco + 5 de descanso\n2️⃣ Regla 2 min: Si toma menos de 2 min, hazlo YA\n3️⃣ Time blocking: Bloquea tu agenda como un PRO\n\n💬 ¿Cuál vas a probar primero? Comenta abajo ⬇️' },
    { id: 6, categoria: 'Email Marketing', nombre: 'Secuencia de bienvenida', prompt: 'Crea una secuencia de 3 emails de bienvenida para [NEGOCIO]. Email 1: Presentación y entrega de lead magnet. Email 2: Historia y conexión emocional. Email 3: Oferta especial. Tono: cercano y profesional.', ejemplos: 'Negocio: Tienda de skincare\nEmail 1 - Asunto: "¡Bienvenida! Tu guía de skincare está aquí 🎁"\nEmail 2 - Asunto: "De piel problemática a piel radiante: mi historia"\nEmail 3 - Asunto: "Solo para ti: 25% OFF en tu primera compra ✨"' },
  ];
  updateUI();
}

function simulatePost(body) {
  switch (body.action) {
    case 'add':
      demoIdCounter++;
      prompts.push({
        id: demoIdCounter,
        categoria: body.categoria,
        nombre: body.nombre,
        prompt: body.prompt,
        ejemplos: body.ejemplos || ''
      });
      break;
    case 'update': {
      const idx = prompts.findIndex(p => p.id === body.id);
      if (idx !== -1) {
        prompts[idx] = { ...prompts[idx], categoria: body.categoria, nombre: body.nombre, prompt: body.prompt, ejemplos: body.ejemplos || '' };
      }
      break;
    }
    case 'delete': {
      prompts = prompts.filter(p => p.id !== body.id);
      break;
    }
    case 'generateSamples': {
      const samplePrompts = [
        { id: ++demoIdCounter, categoria: 'Marketing', nombre: 'Plan de Contenidos 30 días', prompt: 'Genera un calendario de contenidos de 30 días para [RED SOCIAL] en el nicho de [NICHO]...', ejemplos: 'Red social: Instagram\nNicho: Alimentación saludable' },
        { id: ++demoIdCounter, categoria: 'SEO', nombre: 'Intención de Búsqueda', prompt: 'Analiza la siguiente lista de keywords y clasifícalas según su intención de búsqueda (Informativa, Transaccional, Comercial, Navegacional)...', ejemplos: 'Keywords: comprar zapatillas, mejor cafetera 2026' }
      ];
      prompts.push(...samplePrompts);
      break;
    }
  }
}

// ── Data Fetching ──────────────────────────────────────────

async function fetchPrompts() {
  showSpinner();
  try {
    if (isApiConfigured()) {
      const data = await apiGet('getAll');
      prompts = data || [];
    } else {
      loadDemoData();
      return; // loadDemoData already calls updateUI
    }
    updateUI();
  } catch (err) {
    showToast('Error al cargar los prompts: ' + err.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ── Update UI ──────────────────────────────────────────────

function updateUI() {
  renderCategoryPills();
  applyFilters();
}

function getCategoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '📁';
}

function renderCategoryPills() {
  // Count prompts per category
  const counts = {};
  prompts.forEach(p => {
    counts[p.categoria] = (counts[p.categoria] || 0) + 1;
  });

  const cats = Object.keys(counts).sort();

  const makePill = (id, name, icon, count) => {
    const isActive = currentCategoryFilter === id;
    return `
      <button class="category-pill ${isActive ? 'active' : ''}" data-cat="${id}">
        <span class="pill-icon">${icon}</span>
        <span class="pill-name">${escapeHtml(name)}</span>
        <span class="pill-count">${count}</span>
      </button>
    `;
  };

  let html = makePill('', 'Todos', '📚', prompts.length);
  cats.forEach(c => {
    html += makePill(c, c, getCategoryIcon(c), counts[c]);
  });

  DOM.categoryPills.innerHTML = html;

  DOM.categoryPills.querySelectorAll('.category-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      currentCategoryFilter = btn.getAttribute('data-cat');
      renderCategoryPills();
      applyFilters();
    });
  });
}

function applyFilters() {
  const q = DOM.searchInput.value.toLowerCase().trim();
  const cat = currentCategoryFilter;

  filteredPrompts = prompts.filter(p => {
    const matchCat = !cat || p.categoria === cat;
    const matchSearch = !q || [p.categoria, p.nombre, p.prompt, p.ejemplos]
      .join(' ')
      .toLowerCase()
      .includes(q);
    return matchCat && matchSearch;
  });

  DOM.promptsCountLabel.textContent = `${filteredPrompts.length} prompts disponibles`;
  renderTable();
}

// ── Table Rendering ────────────────────────────────────────

function renderTable() {
  if (filteredPrompts.length === 0) {
    DOM.tableBody.innerHTML = '';
    DOM.emptyState.style.display = 'block';
    DOM.promptTable.querySelector('thead').style.display = 'none';
    return;
  }

  DOM.emptyState.style.display = 'none';
  DOM.promptTable.querySelector('thead').style.display = '';

  DOM.tableBody.innerHTML = filteredPrompts.map(p => `
    <tr class="fade-in" data-id="${p.id}">
      <td><span class="cell-category">📂 ${escapeHtml(p.categoria)}</span></td>
      <td><strong>${escapeHtml(p.nombre)}</strong></td>
      <td><div class="cell-truncate">${escapeHtml(p.prompt)}</div></td>
      <td><div class="cell-truncate">${escapeHtml(p.ejemplos || '—')}</div></td>
      <td class="cell-actions">
        <button class="btn btn--lila btn--sm" title="Copiar Prompt" onclick="copyPrompt(${p.id})">
          <img src="images/logo.png" alt="Copiar" class="btn-icon" /> Copiar Prompt
        </button>
        <button class="btn btn--ghost btn--sm" title="Ver detalle" onclick="viewPrompt(${p.id})">👁️</button>
        <button class="btn btn--ghost btn--sm" title="Editar" onclick="editPrompt(${p.id})">✏️</button>
        <button class="btn btn--ghost btn--sm" title="Eliminar" onclick="confirmDelete(${p.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── View Detail ────────────────────────────────────────────

function viewPrompt(id) {
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  DOM.detailTitle.textContent = p.nombre;
  DOM.detailCategoria.textContent = p.categoria;
  DOM.detailNombre.textContent = p.nombre;
  DOM.detailPrompt.textContent = p.prompt;
  DOM.detailEjemplos.textContent = p.ejemplos || 'Sin ejemplos.';
  openModal(DOM.detailOverlay);
}

// ── Copy Prompt ────────────────────────────────────────────

function copyPrompt(id) {
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  navigator.clipboard.writeText(p.prompt).then(() => {
    showToast('Prompt copiado al portapapeles', 'success');
  }).catch(err => {
    showToast('Error al copiar el prompt: ' + err, 'error');
  });
}

// ── Create / Edit ──────────────────────────────────────────

function openFormModal(prompt = null) {
  if (prompt) {
    editingId = prompt.id;
    DOM.formTitle.textContent = '✏️ Editar Prompt';
    DOM.btnSubmit.textContent = 'Actualizar';
    DOM.formId.value = prompt.id;
    DOM.formCategoria.value = prompt.categoria;
    DOM.formNombre.value = prompt.nombre;
    DOM.formPrompt.value = prompt.prompt;
    DOM.formEjemplos.value = prompt.ejemplos || '';
  } else {
    editingId = null;
    DOM.formTitle.textContent = '✨ Nuevo Prompt';
    DOM.btnSubmit.textContent = 'Guardar';
    DOM.form.reset();
    DOM.formId.value = '';
  }
  openModal(DOM.formOverlay);
  DOM.formCategoria.focus();
}

function editPrompt(id) {
  const p = prompts.find(x => x.id === id);
  if (p) openFormModal(p);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const data = {
    categoria: DOM.formCategoria.value.trim(),
    nombre: DOM.formNombre.value.trim(),
    prompt: DOM.formPrompt.value.trim(),
    ejemplos: DOM.formEjemplos.value.trim(),
  };

  showSpinner();
  try {
    if (editingId) {
      data.action = 'update';
      data.id = editingId;
    } else {
      data.action = 'add';
    }
    const result = await apiPost(data);
    showToast(result.message || (editingId ? 'Prompt actualizado.' : 'Prompt creado.'), 'success');
    closeModal(DOM.formOverlay);
    await fetchPrompts();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ── Delete ─────────────────────────────────────────────────

function confirmDelete(id) {
  const p = prompts.find(x => x.id === id);
  if (!p) return;
  deletingId = id;
  DOM.confirmText.textContent = `¿Estás seguro de que deseas eliminar "${p.nombre}"? Esta acción no se puede deshacer.`;
  openModal(DOM.confirmOverlay);
}

async function handleDelete() {
  if (!deletingId) return;
  showSpinner();
  try {
    const result = await apiPost({ action: 'delete', id: deletingId });
    showToast(result.message || 'Prompt eliminado.', 'success');
    closeModal(DOM.confirmOverlay);
    deletingId = null;
    await fetchPrompts();
  } catch (err) {
    showToast('Error al eliminar: ' + err.message, 'error');
  } finally {
    hideSpinner();
  }
}

async function handleGenerateSamples() {
  if (!confirm('¿Deseas cargar una lista de prompts profesionales de ejemplo en tu biblioteca?')) {
    return;
  }
  showSpinner();
  try {
    const result = await apiPost({ action: 'generateSamples' });
    showToast(result.message || 'Prompts de ejemplo generados.', 'success');
    await fetchPrompts();
  } catch (err) {
    showToast('Error al generar ejemplos: ' + err.message, 'error');
  } finally {
    hideSpinner();
  }
}

// ── Event Listeners ────────────────────────────────────────

function bindEvents() {
  // Theme
  DOM.themeToggle.addEventListener('click', toggleTheme);

  // Add / Generate Samples
  DOM.btnAdd.addEventListener('click', () => openFormModal());
  DOM.btnGenerateSamples.addEventListener('click', handleGenerateSamples);

  // Form
  DOM.form.addEventListener('submit', handleFormSubmit);
  DOM.btnCancel.addEventListener('click', () => closeModal(DOM.formOverlay));
  DOM.formClose.addEventListener('click', () => closeModal(DOM.formOverlay));

  // Detail
  DOM.detailClose.addEventListener('click', () => closeModal(DOM.detailOverlay));

  // Confirm delete
  DOM.btnConfirmDel.addEventListener('click', handleDelete);
  DOM.btnCancelDel.addEventListener('click', () => closeModal(DOM.confirmOverlay));
  DOM.confirmClose.addEventListener('click', () => closeModal(DOM.confirmOverlay));

  // Search
  let searchTimer;
  DOM.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 250);
  });

  // Close modals on overlay click
  [DOM.formOverlay, DOM.detailOverlay, DOM.confirmOverlay].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal(overlay);
    });
  });

  // Close modals on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      [DOM.formOverlay, DOM.detailOverlay, DOM.confirmOverlay].forEach(closeModal);
    }
  });
}

// ── Init ───────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  bindEvents();
  fetchPrompts();

  // Show configuration notice in demo mode
  if (!isApiConfigured()) {
    setTimeout(() => {
      showToast('Modo Demo: conecta tu Google Apps Script para datos reales.', 'info');
    }, 800);
  }
});
