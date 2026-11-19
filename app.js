'use strict';

const states = ['Idea', 'Pendiente', 'Listo', 'Publicada'];
const recordingLabel = 'Recolección de contenido';
const storageKey = 'tablework-published-nnyHnMdHFoyTQ1C05y2+lpoYDzyzu1ft7L2JHoAzgZg=';
const initial = {"active":"fresh","companies":[{"id":"fresh","name":"Stay Fresh Malta"},{"id":"estanco","name":"El Estanco"}],"groups":[{"id":"fresh-grabacion-2026-11","title":"Recolección de contenido","company":"fresh"}],"tasks":[{"id":"fresh-piece-0","title":"Services","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-1","title":"How It Works","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-2","title":"Tracking","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-3","title":"FAQs","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-4","title":"For Business","company":"fresh","date":"","status":"Idea","archived":false},{"id":"fresh-piece-5","title":"Ropa de cama y toallas","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-6","title":"Recolección y entrega","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-7","title":"Seguimiento de pedidos","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-8","title":"Otros textiles","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-piece-9","title":"Control de manchas","company":"fresh","date":"","status":"Pendiente","archived":false},{"id":"fresh-recording-0","title":"Grabar: Recolección y entrega","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-1","title":"Grabar: Carga de máquinas","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-2","title":"Grabar: Doblado","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-3","title":"Grabar: Empaques","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-4","title":"Grabar: Transporte","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-5","title":"Grabar: Etiquetado","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-6","title":"Grabar: Control de manchas","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-7","title":"Grabar: Pedidos","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"fresh-recording-8","title":"Grabar: Tracking app","company":"fresh","groupId":"fresh-grabacion-2026-11","date":"2026-11-30","status":"Pendiente","archived":false},{"id":"estanco-story-1","title":"Preparar encuesta para el miércoles de vagabundina","company":"estanco","date":"","status":"Pendiente","archived":false},{"id":"estanco-carousel-1","title":"Revisar el carrusel ¿Y hoy qué hacemos?","company":"estanco","date":"","status":"Pendiente","archived":false}],"stayFreshAndEstancoImported":true,"recordingGroupScheduled":true};
const $ = (selector) => document.querySelector(selector);
const feedback = $('#feedback');
const statusFilters = $('#status-filters');
const taskTablePanel = $('#task-table-panel');
const tableToggle = $('#toggle-task-table');
const query = $('#query');
const taskForm = $('#task-form');
const taskDialog = $('#task-dialog');
const taskGroup = taskForm.elements.groupId;
const inlineGroup = $('#inline-group');
const inlineGroupName = $('#inline-group-name');
const inlineGroupError = $('#inline-group-error');
const newGroupOption = 'new-group';
let previousTaskGroup = '';
let taskDialogVersion = 0;
const companyForm = $('#company-form');
const companyDialog = $('#company-dialog');
let data = initial;
let editingId = null;
let selectedStatus = '';

const groupFilter = $('#group-filter');
const allGroupsButton = $('#all-groups');
const groupDetailsButton = $('#open-selected-group');
const groupForm = $('#group-form');
const groupDialog = $('#group-dialog');
const details = $('#group-details');
let groupId = null;
const selectedGroups = new Set();
let revision = 0;
let databaseMode = false;
let saving = false;
let month = new Date();
const dateLabel = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' });

async function save(next) {
  next = normalizeBoard(next);
  if (saving) throw new Error('Hay un guardado en curso.');
  saving = true;
  try {
    if (databaseMode) {
      const response = await fetch('/api/board', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: next, revision })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      revision = result.revision;
    } else {
      localStorage.setItem(storageKey, JSON.stringify(next));
    }
    data = next;
  } finally {
    saving = false;
  }
}

const importedTasks = [];

function normalizeBoard(board) {
  const existingIds = new Set(board.tasks.map(task => task.id));
  const seed = board.stayFreshAndEstancoImported ? [] : importedTasks.filter(task => !existingIds.has(task.id));
  const renamed = value => typeof value === 'string' ? value.replace(/\bMariana\b/giu, 'Maria Paula') : value;
  const renameFields = record => Object.fromEntries(Object.entries(record).map(([key, value]) =>
    [key, ['id', 'groupId', 'company'].includes(key) ? value : renamed(value)]));
  const tasks = [...board.tasks, ...seed].map(original => {
    const task = renameFields(original);
    if (/^grabaci[o\u00f3]n(?:\s*\u00b7\s*malta)?$/i.test(task.channel?.trim() ?? '')) {
      task.channel = recordingLabel;
    }
    if (task.status === 'Lista') return { ...task, status: 'Listo' };
    if (states.includes(task.status)) return task;
    const label = task.status === 'Pendiente de aprobación' ? 'Por aprobar' : task.status;
    const notes = task.notes || '';
    return { ...task, status: 'Pendiente',
      notes: !label || notes.split('\n').includes(label) ? notes : [label, notes].filter(Boolean).join('\n') };
  });
  const normalized = { ...board, companies: board.companies.map(renameFields),
    groups: (board.groups ?? []).map(original => {
      const { date, ...fields } = original;
      const group = renameFields(fields);
      if (group.id === 'fresh-grabacion-2026-11' && group.description) {
        group.description = group.description.replace(/ Todas vencen el 30 de noviembre de 2026\.$/, '');
      }
      if (textKey(group.title.trim()) !== 'grabacion') return group;
      return { ...group, title: recordingLabel,
        description: group.description?.replace(/^Grabaciones de Stay Fresh Malta\./, recordingLabel + ' de Stay Fresh Malta.') };
    }), tasks, stayFreshAndEstancoImported: true };
  if (normalized.recordingGroupScheduled) return normalized;

  const recordings = tasks.filter(task => task.company === 'fresh' &&
    textKey(task.channel?.trim() ?? '') === textKey(recordingLabel));
  if (!recordings.length) return normalized;

  const date = '2026-11-30';
  const existingGroup = normalized.groups.find(group => group.company === 'fresh' &&
    textKey(group.title.trim()) === textKey(recordingLabel));
  const group = {
    id: existingGroup?.id ?? 'fresh-grabacion-2026-11',
    company: 'fresh',
    title: recordingLabel,
    description: existingGroup?.description ||
      recordingLabel + ' de Stay Fresh Malta. El detalle de cada toma est\u00e1 en las notas de su tarea.'
  };
  const recordingIds = new Set(recordings.map(task => task.id));
  return { ...normalized, recordingGroupScheduled: true,
    groups: existingGroup ? normalized.groups.map(item => item.id === group.id ? group : item) : [...normalized.groups, group],
    tasks: tasks.map(task => recordingIds.has(task.id) ? { ...task, groupId: group.id, date } : task)
  };
}

async function start() {
  try {
    let persisted = null;
    if (false) {
      const response = await fetch('/api/board').catch(() => null);
      if (response?.ok && response.headers.get('content-type')?.includes('application/json')) {
        const result = await response.json();
        databaseMode = true;
        revision = result.revision;
        persisted = result.data;
      }
    }
    const raw = persisted ? null : localStorage.getItem(storageKey);
    const source = persisted ?? (raw ? JSON.parse(raw) : initial);
    const normalized = normalizeBoard(source);
    if (JSON.stringify(source) !== JSON.stringify(normalized)) await save(normalized);
    else data = normalized;
  } catch (error) {
    $('#feedback').textContent = error.message;
  }
  $('#storage-mode').textContent = databaseMode ? 'Base de datos central SQLite' : 'Modo local en este navegador';
  $('#import-board').hidden = !databaseMode;
  render();
}

function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}

function textKey(text) {
  return text.toLocaleLowerCase('es').normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

async function switchCompany(id) {
  try {
    if (id === data.active) return;
    await save({ ...data, active: id });
    selectedGroups.clear();
    query.value = '';
    selectedStatus = '';
    feedback.textContent = '';
    render();
    Array.from($('#companies').children).find((button) => button.dataset.id === id)?.focus();
  } catch {
    feedback.textContent = 'No se pudo guardar la selección.';
  }
}

function render() {
  const companies = $('#companies');
  const focusedCompany = document.activeElement?.dataset.id;
  companies.replaceChildren();
  for (const company of data.companies) {
    const button = element('button', company.name, 'company');
    const dot = element('span', '', 'dot');
    dot.setAttribute('aria-hidden', 'true');
    button.prepend(dot);
    button.dataset.id = company.id;
    button.setAttribute('aria-current', String(company.id === data.active));
    button.addEventListener('click', () => switchCompany(company.id));
    companies.append(button);
    if (focusedCompany === company.id) button.focus();
  }
  $('#heading').textContent = data.companies.find((company) => company.id === data.active).name;
  renderGroupFilter();
  renderCalendar();
  renderTasks();
}

function renderTasks() {
  const tasks = data.tasks.filter((task) => task.company === data.active);
  const active = tasks.filter((task) => !task.archived);
  for (const button of statusFilters.children) {
    button.setAttribute('aria-pressed', String(button.value === selectedStatus));
  }
  const needle = textKey(query.value.trim());
  const visible = tasks.filter((task) => {
    return matchesSelectedStatus(task) && matchesSelectedGroup(task) && textKey([task.title, task.owner, task.channel, task.notes].join(' ')).includes(needle);
  });
  const rows = $('#rows');
  rows.replaceChildren();
  for (const task of visible) {
    const row = document.createElement('tr');
    const title = element('td', '');
    title.append(element('strong', task.title));
    if (task.channel) title.append(element('small', task.channel));
    const state = element('td', '');
    const badge = element('span', task.status, 'badge');
    badge.dataset.state = task.status;
    state.append(badge);
    const date = task.date ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(task.date)) : '—';
    const action = element('td', '');
    const edit = element('button', 'Editar');
    edit.setAttribute('aria-label', 'Editar ' + task.title);
    edit.addEventListener('click', () => openTask(task));
    action.append(edit);
    const group = data.groups.find(item => item.id === task.groupId);
    row.append(title, element('td', group?.title || 'Sin grupo'), state, element('td', task.owner || '—'), element('td', date), action);
    rows.append(row);
  }
  const empty = $('#empty');
  empty.hidden = visible.length > 0;
  empty.textContent = selectedStatus === 'archived' ? 'No hay tareas archivadas que coincidan.' :
    active.length === 0 ? 'Agrega una tarea para empezar a organizar el trabajo de esta empresa.' :
      'No hay tareas que coincidan con los filtros.';
  $('#count').textContent = visible.length === 1 ? '1 tarea visible' : visible.length + ' tareas visibles';
}

function openTask(task) {
  taskDialogVersion++;
  taskForm.reset();
  clearInlineGroup();
  editingId = task?.id ?? null;
  $('#task-title').textContent = task ? 'Editar tarea' : 'Nueva tarea';
  const archive = $('#archive');
  archive.hidden = !task;
  archive.textContent = task?.archived ? 'Restaurar' : 'Archivar';
  taskForm.querySelector('.form-error').textContent = '';
  setTaskGroup(task ? (task.groupId || '') : (singleSelectedGroup()?.id ?? ''));
  taskForm.elements.status.value = 'Pendiente';
  if (task) {
    for (const field of ['title', 'status', 'owner', 'channel', 'date', 'notes']) {
      taskForm.elements[field].value = task[field] ?? '';
    }
  }
  taskDialog.showModal();
}

async function commitForm(form, dialog, next, message) {
  try {
    await save(next);
  } catch (error) {
    form.querySelector('.form-error').textContent = error.message || 'No se pudieron guardar los cambios.';
    return false;
  }
  dialog.close();
  feedback.textContent = message;
  return true;
}

function newId() {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
}

for (const [label, value] of [['Todas', ''], ...states.map((state) => [state, state]), ['Archivadas', 'archived']]) {
  const button = element('button', label, 'badge status-filter');
  button.type = 'button';
  button.value = value;
  button.dataset.state = value;
  button.addEventListener('click', () => {
    selectedStatus = value;
    renderCalendar();
    renderTasks();
  });
  statusFilters.append(button);
}
for (const state of states) {
  taskForm.elements.status.append(new Option(state, state));
}
query.addEventListener('input', renderTasks);
tableToggle.addEventListener('click', () => {
  taskTablePanel.hidden = !taskTablePanel.hidden;
  tableToggle.setAttribute('aria-expanded', String(!taskTablePanel.hidden));
  tableToggle.textContent = taskTablePanel.hidden ? 'Vista de tabla' : 'Ocultar tabla';
});
$('#new-task').addEventListener('click', () => openTask());
$('#add-company').addEventListener('click', () => {
  companyForm.reset();
  companyForm.querySelector('.form-error').textContent = '';
  companyDialog.showModal();
});
document.querySelectorAll('[data-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close());
});

taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!inlineGroup.hidden) {
    inlineGroupError.textContent = 'Crea o cancela el grupo antes de guardar la tarea.';
    return;
  }
  const fields = Object.fromEntries([...new FormData(taskForm)].map(([key, value]) => [key, value.trim()]));
  if (!fields.title) {
    taskForm.querySelector('.form-error').textContent = 'Escribe el nombre de la tarea.';
    return;
  }
  const tasks = editingId
    ? data.tasks.map((task) => task.id === editingId ? { ...task, ...fields } : task)
    : [{ ...fields, id: newId(), company: data.active, archived: false }, ...data.tasks];
  if (await commitForm(taskForm, taskDialog, { ...data, tasks }, 'Tarea guardada.')) {
    if (!editingId || (selectedStatus && selectedStatus !== 'archived' && selectedStatus !== fields.status)) selectedStatus = '';
    query.value = '';
    renderCalendar();
    renderTasks();
    if (!taskTablePanel.hidden) {
      Array.from($('#rows').querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Editar ' + fields.title)?.focus();
    }
  }
});

$('#archive').addEventListener('click', async () => {
  const current = data.tasks.find((task) => task.id === editingId);
  if (!current) return;
  const archived = !current.archived;
  const tasks = data.tasks.map((task) => task.id === editingId ? { ...task, archived } : task);
  if (await commitForm(taskForm, taskDialog, { ...data, tasks }, archived ? 'Tarea archivada.' : 'Tarea restaurada.')) {
    selectedStatus = archived ? 'archived' : '';
    query.value = '';
    renderCalendar();
    renderTasks();
    Array.from(statusFilters.children).find((button) => button.value === selectedStatus)?.focus();
  }
});

companyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = companyForm.elements.name.value.trim();
  if (!name || data.companies.some((company) => textKey(company.name) === textKey(name))) {
    companyForm.querySelector('.form-error').textContent = name ? 'Ya existe una empresa con ese nombre.' : 'Escribe el nombre de la empresa.';
    return;
  }
  const id = newId();
  const companies = [...data.companies, { id, name }];
  if (await commitForm(companyForm, companyDialog, { ...data, companies, active: id }, 'Empresa añadida.')) {
    query.value = '';
    selectedStatus = '';
    selectedGroups.clear();
    render();
    $('#new-task').focus();
  }
});

function companyGroups() {
  return data.groups.filter(group => group.company === data.active)
    .sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

function fillGroups(select, label) {
  select.replaceChildren(new Option(label, ''));
  for (const group of companyGroups()) select.append(new Option(group.title, group.id));
}

function setTaskGroup(id) {
  fillGroups(taskGroup, 'Sin grupo');
  taskGroup.append(new Option('+ Nuevo grupo', newGroupOption));
  taskGroup.value = id;
  previousTaskGroup = taskGroup.value;
}

function clearInlineGroup() {
  inlineGroup.hidden = true;
  inlineGroup.disabled = false;
  inlineGroupName.value = '';
  inlineGroupError.textContent = '';
}

taskGroup.addEventListener('change', () => {
  if (taskGroup.value === newGroupOption) {
    inlineGroup.hidden = false;
    inlineGroupName.focus();
  } else {
    previousTaskGroup = taskGroup.value;
    clearInlineGroup();
  }
});

$('#cancel-inline-group').addEventListener('click', () => {
  taskGroup.value = previousTaskGroup;
  clearInlineGroup();
  taskGroup.focus();
});

$('#save-inline-group').addEventListener('click', async () => {
  const title = inlineGroupName.value.trim();
  if (!title) {
    inlineGroupError.textContent = 'Escribe el nombre del grupo.';
    inlineGroupName.focus();
    return;
  }
  const version = taskDialogVersion;
  const group = { id: newId(), company: data.active, title };
  taskGroup.disabled = true;
  inlineGroup.disabled = true;
  inlineGroupError.textContent = '';
  try {
    await save({ ...data, groups: [...data.groups, group] });
    renderGroupFilter();
    if (taskDialog.open && version === taskDialogVersion) {
      setTaskGroup(group.id);
      clearInlineGroup();
      taskGroup.focus();
    }
  } catch (error) {
    if (taskDialog.open && version === taskDialogVersion) inlineGroupError.textContent = error.message;
  } finally {
    taskGroup.disabled = false;
    if (version === taskDialogVersion) inlineGroup.disabled = false;
  }
});

function matchesSelectedStatus(task) {
  return selectedStatus === 'archived'
    ? task.archived
    : !task.archived && (!selectedStatus || task.status === selectedStatus);
}

function matchesSelectedGroup(task) {
  return !selectedGroups.size || selectedGroups.has(task.groupId || 'ungrouped');
}

function singleSelectedGroup() {
  return selectedGroups.size === 1 ? companyGroups().find(group => selectedGroups.has(group.id)) : undefined;
}

function updateGroupFilter() {
  allGroupsButton.setAttribute('aria-pressed', String(!selectedGroups.size));
  for (const input of groupFilter.querySelectorAll('input')) input.checked = selectedGroups.has(input.value);
  groupDetailsButton.hidden = !singleSelectedGroup();
}

function renderGroupFilter() {
  const groups = companyGroups();
  const availableIds = new Set([...groups.map(group => group.id), 'ungrouped']);
  for (const id of selectedGroups) {
    if (!availableIds.has(id)) selectedGroups.delete(id);
  }
  groupFilter.replaceChildren();
  for (const { id, title } of [...groups, { id: 'ungrouped', title: 'Sin grupo' }]) {
    const label = element('label', '', 'group-filter-chip');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = id;
    label.append(input, element('span', title));
    groupFilter.append(label);
  }
  updateGroupFilter();
}

function calendarTaskButton(task) {
  const button = element('button', task.title, 'calendar-event');
  button.dataset.state = task.status;
  button.title = task.status;
  button.setAttribute('aria-label', task.title + ' (' + task.status + ')');
  button.type = 'button';
  button.addEventListener('click', () => openTask(task));
  return button;
}

function appendCalendarDayTasks(container, tasks, groupNames) {
  const groups = new Set();
  for (const task of tasks) {
    const name = groupNames.get(task.groupId);
    if (name) groups.add(name);
  }
  if (groups.size) container.append(element('div', [...groups].join(', '), 'calendar-day-groups'));
  for (const task of tasks) container.append(calendarTaskButton(task));
}

function renderCalendar() {
  const groupNames = new Map(companyGroups().map(group => [group.id, group.title]));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const first = new Date(month);
  first.setDate(1);
  const firstColumn = (first.getDay() + 6) % 7;
  const last = new Date(first);
  last.setMonth(monthIndex + 1, 0);
  const monthKey = year.toString().padStart(4, '0') + '-' + String(monthIndex + 1).padStart(2, '0');
  const tasksByDate = new Map();
  for (const task of data.tasks) {
    if (task.company !== data.active || !matchesSelectedStatus(task) || !matchesSelectedGroup(task) || !task.date?.startsWith(monthKey)) continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(task.date) || !Number.isFinite(Date.parse(task.date)) ||
        new Date(task.date).toISOString().slice(0, 10) !== task.date) continue;
    if (!tasksByDate.has(task.date)) tasksByDate.set(task.date, []);
    tasksByDate.get(task.date).push(task);
  }
  const today = new Date();
  $('#month-label').textContent = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(first);
  const table = $('#calendar-days');
  table.replaceChildren();
  for (let offset = 0; offset < firstColumn + last.getDate(); offset += 7) {
    const row = element('tr', '');
    for (let column = 0; column < 7; column++) {
      const day = offset + column - firstColumn + 1;
      const cell = element('td', '');
      if (day >= 1 && day <= last.getDate()) {
        const date = monthKey + '-' + String(day).padStart(2, '0');
        const number = element('time', day);
        number.dateTime = date;
        if (year === today.getFullYear() && monthIndex === today.getMonth() && day === today.getDate()) {
          number.setAttribute('aria-current', 'date');
        }
        cell.append(number);
        appendCalendarDayTasks(cell, tasksByDate.get(date) ?? [], groupNames);
      }
      row.append(cell);
    }
    table.append(row);
  }

  const agenda = $('#calendar-agenda');
  agenda.replaceChildren();
  if (!tasksByDate.size) agenda.append(element('p', 'No hay tareas con fecha para esta selecci\u00f3n en el mes.', 'empty'));
  for (const day of [...tasksByDate.keys()].sort()) {
    const row = element('div', '', 'agenda-row');
    const date = element('time', dateLabel.format(new Date(day)));
    date.dateTime = day;
    const items = element('div', '', 'agenda-tasks');
    appendCalendarDayTasks(items, tasksByDate.get(day), groupNames);
    row.append(date, items);
    agenda.append(row);
  }
}

function changeMonth(offset) {
  month.setDate(1);
  month.setMonth(month.getMonth() + offset);
  renderCalendar();
}

function openGroupDetails(group) {
  groupId = group.id;
  $('#group-detail-title').textContent = group.title;
  const description = $('#group-detail-description');
  description.textContent = group.description ?? '';
  description.hidden = !group.description;
  const list = $('#group-detail-tasks');
  list.replaceChildren();
  const tasks = data.tasks.filter(task => task.groupId === group.id && !task.archived);
  for (const task of tasks) {
    const item = element('li', '');
    const button = element('button', task.title);
    const badge = element('span', task.status, 'badge');
    badge.dataset.state = task.status;
    button.addEventListener('click', () => { details.close(); openTask(task); });
    item.append(button, badge);
    list.append(item);
  }
  if (!tasks.length) list.append(element('li', 'Este grupo todav\u00eda no tiene tareas activas.'));
  details.showModal();
}

function openGroup(group) {
  groupId = group?.id ?? null;
  groupForm.reset();
  groupForm.querySelector('.form-error').textContent = '';
  $('#group-title').textContent = group ? 'Editar grupo' : 'Nuevo grupo';
  if (group) {
    groupForm.elements.title.value = group.title;
    groupForm.elements.description.value = group.description ?? '';
  }
  groupDialog.showModal();
}

function selectGroup(id) {
  selectedGroups.clear();
  selectedGroups.add(id);
  selectedStatus = '';
  query.value = '';
  renderGroupFilter();
  renderCalendar();
  renderTasks();
}

$('#new-group').addEventListener('click', () => openGroup());
$('#previous-month').addEventListener('click', () => changeMonth(-1));
$('#next-month').addEventListener('click', () => changeMonth(1));
$('#current-month').addEventListener('click', () => { month = new Date(); renderCalendar(); });
function applyGroupFilter() {
  updateGroupFilter();
  renderCalendar();
  renderTasks();
}

groupFilter.addEventListener('change', event => {
  const input = event.target;
  if (input.checked) selectedGroups.add(input.value);
  else selectedGroups.delete(input.value);
  applyGroupFilter();
});
allGroupsButton.addEventListener('click', () => {
  selectedGroups.clear();
  applyGroupFilter();
});
groupDetailsButton.addEventListener('click', () => {
  const group = singleSelectedGroup();
  if (group) openGroupDetails(group);
});
$('#edit-group').addEventListener('click', () => {
  details.close();
  openGroup(data.groups.find(group => group.id === groupId));
});
$('#show-group-tasks').addEventListener('click', () => {
  details.close();
  selectGroup(groupId);
  groupFilter.querySelector('input:checked')?.focus();
});
$('#add-group-task').addEventListener('click', () => {
  details.close();
  openTask();
  setTaskGroup(groupId);
});
groupForm.addEventListener('submit', async event => {
  event.preventDefault();
  const title = groupForm.elements.title.value.trim();
  if (!title) {
    groupForm.querySelector('.form-error').textContent = 'Escribe el nombre del grupo.';
    return;
  }
  const group = { id: groupId || newId(), company: data.active, title,
    description: groupForm.elements.description.value.trim() };
  const groups = groupId ? data.groups.map(item => item.id === groupId ? group : item) : [...data.groups, group];
  if (await commitForm(groupForm, groupDialog, { ...data, groups }, 'Grupo guardado.')) {
    selectGroup(group.id);
    openGroupDetails(group);
  }
});

$('#export-board').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const link = element('a', '');
  link.href = url;
  link.download = 'tablework-respaldo.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
const backupFile = $('#backup-file');
$('#import-board').addEventListener('click', () => backupFile.click());
backupFile.addEventListener('change', async () => {
  const file = backupFile.files[0];
  if (!file) return;
  try {
    const backup = normalizeBoard(JSON.parse(await file.text()));
    const merge = (current, incoming) => {
      const items = new Map(current.map(item => [item.id, item]));
      for (const item of incoming) items.set(item.id, item);
      return [...items.values()];
    };
    if (!window.confirm('El respaldo se combinar\u00e1 con el tablero. Para registros con el mismo identificador se usar\u00e1 la versi\u00f3n del respaldo.')) return;
    await save({ ...data, companies: merge(data.companies, backup.companies),
      groups: merge(data.groups, backup.groups), tasks: merge(data.tasks, backup.tasks) });
    render();
    feedback.textContent = 'Respaldo importado.';
  } catch (error) {
    feedback.textContent = 'No se pudo importar el respaldo. ' + error.message;
  } finally {
    backupFile.value = '';
  }
});

start();
