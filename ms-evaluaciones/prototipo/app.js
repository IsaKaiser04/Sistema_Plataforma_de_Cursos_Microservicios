const $ = (selector) => document.querySelector(selector);
const userIdInput = $("#user-id");
const roleInput = $("#user-role");
const courseIdInput = $("#course-id");
const list = $("#evaluation-list");
const empty = $("#empty-state");
const message = $("#message");
const panel = $("#create-panel");
let evaluations = [];

const saved = JSON.parse(localStorage.getItem("lms-evaluaciones-prototype") || "{}");
if (saved.userId) userIdInput.value = saved.userId;
if (saved.role) roleInput.value = saved.role;
if (saved.courseId) courseIdInput.value = saved.courseId;

function headers(json = false) {
  const result = {
    "X-User-Id": userIdInput.value.trim(),
    "X-User-Rol": roleInput.value,
  };
  if (json) result["Content-Type"] = "application/json";
  return result;
}

function saveSettings() {
  localStorage.setItem("lms-evaluaciones-prototype", JSON.stringify({
    userId: userIdInput.value.trim(),
    role: roleInput.value,
    courseId: courseIdInput.value.trim(),
  }));
  $("#avatar").textContent = roleInput.value[0];
}

async function request(path, options = {}) {
  const response = await fetch(`/api/v1${path}`, {
    ...options,
    headers: { ...headers(Boolean(options.body)), ...options.headers },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(body?.mensaje || `Error HTTP ${response.status}`);
    error.code = body?.error;
    error.status = response.status;
    throw error;
  }
  return body;
}

function showMessage(text, kind = "success") {
  message.textContent = text;
  message.className = `message ${kind}`;
  message.classList.remove("hidden");
}

function formatDate(value) {
  if (!value) return "Sin fecha de cierre";
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(value));
}

function renderEvaluations() {
  list.replaceChildren();
  empty.classList.toggle("hidden", evaluations.length > 0);
  for (const evaluation of evaluations) {
    const row = document.createElement("article");
    row.className = "evaluation-row";
    const details = document.createElement("div");
    details.className = "evaluation-name";
    const icon = document.createElement("span");
    icon.className = "type-icon";
    icon.textContent = evaluation.tipo === "EXAMEN" ? "▤" : evaluation.tipo === "TAREA" ? "✓" : "◇";
    const text = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = evaluation.titulo;
    const meta = document.createElement("div");
    meta.className = "evaluation-meta";
    meta.textContent = `${evaluation.tipo} · ${evaluation.peso}% del curso · Cierra ${formatDate(evaluation.fechaCierre)}`;
    text.append(title, meta);
    if (evaluation.descripcion) {
      const description = document.createElement("p");
      description.className = "evaluation-description";
      description.textContent = evaluation.descripcion;
      text.append(description);
    }
    details.append(icon, text);

    const actions = document.createElement("div");
    actions.className = "row-actions";
    const state = document.createElement("span");
    state.className = `state state-${evaluation.estado.toLowerCase()}`;
    state.textContent = evaluation.estado;
    actions.append(state);
    if (roleInput.value === "DOCENTE" || roleInput.value === "ADMINISTRADOR") {
      if (evaluation.estado === "BORRADOR") {
        actions.append(actionButton("Publicar", () => changeState(evaluation.id, "publicar")));
      } else if (evaluation.estado === "PUBLICADA") {
        const student = document.createElement("input");
        student.placeholder = "ID estudiante";
        student.setAttribute("aria-label", "ID del estudiante para calificar");
        const score = document.createElement("input");
        score.type = "number";
        score.min = "0";
        score.max = String(evaluation.notaMaxima);
        score.step = "0.1";
        score.placeholder = "Nota";
        score.setAttribute("aria-label", "Nota");
        const gradeButton = actionButton("Guardar nota", () =>
          grade(evaluation.id, student.value.trim(), score.value));
        actions.append(student, score, gradeButton, actionButton("Cerrar", () => changeState(evaluation.id, "cerrar")));
      }
    }
    row.append(details, actions);
    list.append(row);
  }
}

function actionButton(label, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "button button-outline";
  button.textContent = label;
  button.addEventListener("click", action);
  return button;
}

async function loadCourse() {
  saveSettings();
  const courseId = courseIdInput.value.trim();
  if (!courseId) return showMessage("Ingresa el UUID del curso.", "error");
  try {
    evaluations = await request(`/evaluaciones/curso/${encodeURIComponent(courseId)}`);
    $("#course-caption").textContent = `Curso ${courseId}`;
    renderEvaluations();
    showMessage(`${evaluations.length} evaluación(es) cargada(s).`);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

async function changeState(id, state) {
  try {
    await request(`/evaluaciones/${id}/${state}`, { method: "PATCH" });
    showMessage(state === "publicar" ? "Evaluación publicada." : "Evaluación cerrada.");
    await loadCourse();
  } catch (error) {
    showMessage(`${error.code ? `${error.code}: ` : ""}${error.message}`, "error");
  }
}

async function grade(evaluationId, studentId, score) {
  if (!studentId || score === "") return showMessage("Ingresa el UUID del estudiante y su nota.", "error");
  try {
    await request(`/evaluaciones/${evaluationId}/calificaciones`, {
      method: "POST",
      body: JSON.stringify({ estudianteId: studentId, nota: Number(score), retroalimentacion: "" }),
    });
    showMessage("Calificación guardada y evento enviado.");
    await loadCourse();
  } catch (error) {
    showMessage(`${error.code ? `${error.code}: ` : ""}${error.message}`, "error");
  }
}

$("#create-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const courseId = courseIdInput.value.trim();
  if (!courseId) return showMessage("Ingresa el UUID del curso antes de crear.", "error");
  const values = Object.fromEntries(new FormData(event.currentTarget));
  const body = {
    cursoId: courseId,
    titulo: values.titulo.trim(),
    descripcion: values.descripcion.trim(),
    tipo: values.tipo,
    peso: Number(values.peso),
    notaMaxima: Number(values.notaMaxima),
    fechaApertura: values.fechaApertura.replace("T", ":") + ":00",
    fechaCierre: values.fechaCierre.replace("T", ":") + ":00",
  };
  try {
    await request("/evaluaciones", { method: "POST", body: JSON.stringify(body) });
    event.currentTarget.reset();
    panel.classList.add("hidden");
    showMessage("Borrador creado.");
    await loadCourse();
  } catch (error) {
    showMessage(`${error.code ? `${error.code}: ` : ""}${error.message}`, "error");
  }
});

$("#final-button").addEventListener("click", async () => {
  const courseId = courseIdInput.value.trim();
  if (!courseId) return showMessage("Ingresa un curso para consultar sus notas.", "error");
  try {
    const results = await request(`/calificaciones/curso/${encodeURIComponent(courseId)}/final`);
    const output = $("#final-results");
    output.replaceChildren();
    if (!results.length) {
      output.textContent = "Todavía no hay notas finales. Finaliza el curso para calcularlas.";
      return;
    }
    for (const result of results) {
      const line = document.createElement("div");
      line.className = "final-result";
      const student = document.createElement("span");
      student.textContent = result.estudianteId;
      const grade = document.createElement("strong");
      grade.className = result.aprobado ? "pass" : "fail";
      grade.textContent = `${Number(result.notaFinal).toFixed(1)} · ${result.aprobado ? "Aprobado" : "No aprobado"}`;
      line.append(student, grade);
      output.append(line);
    }
  } catch (error) {
    showMessage(`${error.code ? `${error.code}: ` : ""}${error.message}`, "error");
  }
});

$("#new-toggle").addEventListener("click", () => panel.classList.toggle("hidden"));
$("#close-form").addEventListener("click", () => panel.classList.add("hidden"));
$("#cancel-form").addEventListener("click", () => panel.classList.add("hidden"));
$("#load-button").addEventListener("click", loadCourse);
$("#refresh-button").addEventListener("click", loadCourse);
userIdInput.addEventListener("change", saveSettings);
roleInput.addEventListener("change", () => {
  saveSettings();
  renderEvaluations();
});
courseIdInput.addEventListener("change", saveSettings);
$("#avatar").textContent = roleInput.value[0];
