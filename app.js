const $ = (id) => document.getElementById(id);
const KEY = "recordatorios_codigo";
const getCode = () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } };
const setCode = (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} };

function say(text, cls = "") { const m = $("msg"); m.textContent = text; m.className = "msg " + cls; }

async function api(action, extra = {}) {
  // text/plain evita la consulta previa (CORS) que Apps Script no responde.
  const res = await fetch(window.SCRIPT_URL, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ token: getCode(), action, ...extra }),
  });
  const data = await res.json().catch(() => ({}));
  if (data.auth === false) { setCode(""); show(); throw new Error("Código incorrecto. Escríbelo otra vez."); }
  if (!res.ok || data.error) throw new Error(data.error || "Error " + res.status);
  return data;
}

function show() {
  const has = !!getCode();
  $("setup").hidden = has;
  $("main").hidden = !has;
  if (has) loadToday();
}

async function loadToday() {
  const ul = $("today");
  try {
    const { eventos } = await api("today");
    ul.innerHTML = "";
    if (!eventos.length) { ul.innerHTML = '<li class="mut">Sin eventos hoy.</li>'; return; }
    for (const e of eventos) {
      const li = document.createElement("li");
      const t = document.createElement("time");
      t.textContent = e.todoElDia ? "Todo el día" : e.inicio.slice(11, 16);
      const s = document.createElement("span");
      s.textContent = e.titulo;
      li.append(t, s);
      ul.append(li);
    }
  } catch (e) {
    ul.innerHTML = "";
    const li = document.createElement("li");
    li.className = "bad";
    li.textContent = e.message;
    ul.append(li);
  }
}

$("saveCode").onclick = () => { const v = $("code").value.trim(); if (v) { setCode(v); $("code").value = ""; show(); } };
$("reset").onclick = (ev) => { ev.preventDefault(); setCode(""); show(); };

$("parse").onclick = async () => {
  const text = $("text").value.trim();
  if (!text) return;
  $("parse").disabled = true; say("Entendiendo…", "mut"); $("preview").hidden = true;
  try {
    const e = await api("parse", { text });
    $("title").value = e.titulo;
    $("start").value = e.inicio;
    $("end").value = e.fin;
    $("alert").value = String(e.aviso_min);
    $("notes").value = e.notas;
    $("doubt").hidden = !e.duda;
    $("doubt").textContent = e.duda ? "Ojo: " + e.duda : "";
    $("preview").hidden = false;
    say("");
  } catch (e) { say(e.message, "bad"); }
  $("parse").disabled = false;
};

$("cancel").onclick = () => { $("preview").hidden = true; say(""); };

$("create").onclick = async () => {
  $("create").disabled = true; say("Creando…", "mut");
  try {
    await api("create", {
      titulo: $("title").value.trim(),
      inicio: $("start").value,
      fin: $("end").value,
      aviso_min: Number($("alert").value),
      notas: $("notes").value.trim(),
    });
    $("preview").hidden = true; $("text").value = "";
    say("Listo, evento creado.", "ok");
    loadToday();
  } catch (e) { say(e.message, "bad"); }
  $("create").disabled = false;
};

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
show();
