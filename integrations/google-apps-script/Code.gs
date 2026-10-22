/**
 * APNAधंधा backend (Google Apps Script). Runs as YOU, so it can read/write your
 * Sheet and list your Drive folder without any service-account key.
 * Setup: script.google.com > New project > paste this > set CLIENT_ID below >
 * run shareMusic() once (grants permissions + makes songs streamable) >
 * Deploy > New deployment > Web app (Execute as: Me, Access: Anyone) > copy the /exec URL.
 */
const SHEET_ID  = "1fUOt72NtoNMwQQCTYWfpPLpaUq-Rkfk9xU3YaWKBE7w";
const FOLDER_ID = "1iZjm_TrzlzPkfEUsBqH0C5ufbLehPgLG";
const ADMIN_EMAIL = "gunanimohit1221@gmail.com";
const CLIENT_ID = "YOUR_OAUTH_WEB_CLIENT_ID.apps.googleusercontent.com";

const HEAD = ["Timestamp","Name","Problem","Solution","Category","Status","Upvotes","Downvotes"];
const KEYS = { ts:["time"], name:["name","contributor"], problem:["problem","idea"], solution:["solution","fix"], category:["category","tag"], status:["status"], up:["up"], down:["down"] };

const sh = () => {
  const s = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  if (s.getLastRow() === 0) s.appendRow(HEAD);
  return s;
};
const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// map columns by header text so your existing sheet layout keeps working (1-based)
function cols(s) {
  const h = s.getRange(1, 1, 1, Math.max(s.getLastColumn(), 8)).getValues()[0].map(x => String(x).toLowerCase());
  const m = {};
  Object.keys(KEYS).forEach((k, d) => {
    const i = h.findIndex(x => KEYS[k].some(w => x.indexOf(w) >= 0));
    m[k] = i >= 0 ? i + 1 : d + 1;
  });
  return m;
}
function all() {
  const s = sh(), c = cols(s), v = s.getDataRange().getValues();
  return v.slice(1).map((r, i) => ({
    id: i + 2, name: r[c.name-1] || "", problem: r[c.problem-1] || "", solution: r[c.solution-1] || "",
    category: r[c.category-1] || "", status: r[c.status-1] || "Pending", up: +r[c.up-1] || 0, down: +r[c.down-1] || 0
  })).filter(x => String(x.problem).trim());
}
function songs() {
  const f = DriveApp.getFolderById(FOLDER_ID).getFiles(), a = [];
  while (f.hasNext()) { const x = f.next(); if (/^audio\//.test(x.getMimeType()) || /\.(mp3|m4a|wav|ogg)$/i.test(x.getName())) a.push({ id: x.getId(), name: x.getName() }); }
  return a.sort((p, q) => p.name.localeCompare(q.name));
}
function shareMusic() {   // run once from the editor
  const d = DriveApp.getFolderById(FOLDER_ID);
  d.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const f = d.getFiles(); while (f.hasNext()) f.next().setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  sh();
}

function doGet() { return out({ ideas: all().filter(i => i.status === "Approved"), songs: songs() }); }

function adminEmail(tok) {
  if (!tok) return null;
  const r = UrlFetchApp.fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(tok), { muteHttpExceptions: true });
  if (r.getResponseCode() !== 200) return null;
  const t = JSON.parse(r.getContentText());
  const ok = (t.aud === CLIENT_ID || t.azp === CLIENT_ID) && String(t.email_verified) === "true" && String(t.email).toLowerCase() === ADMIN_EMAIL.toLowerCase();
  return ok ? t.email : null;
}

function doPost(e) {
  const d = JSON.parse(e.postData.contents), lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = sh(), c = cols(s), put = (row, k, v) => s.getRange(row, c[k]).setValue(v);
    if (d.action === "submit") {
      if (!String(d.problem || "").trim()) return out({ error: "Problem required" });
      const row = new Array(Math.max(s.getLastColumn(), 8)).fill("");
      row[c.ts-1] = new Date(); row[c.name-1] = String(d.name || "").slice(0, 60); row[c.problem-1] = String(d.problem).slice(0, 600);
      row[c.solution-1] = String(d.solution || "").slice(0, 600); row[c.category-1] = d.category || ""; row[c.status-1] = "Pending"; row[c.up-1] = 0; row[c.down-1] = 0;
      s.appendRow(row); return out({ ok: true });
    }
    if (d.action === "vote") {
      const row = +d.id; if (row < 2 || row > s.getLastRow()) return out({ error: "Bad id" });
      const bump = (k, n) => put(row, k, Math.max(0, (+s.getRange(row, c[k]).getValue() || 0) + n));
      if (d.prev) bump(d.prev, -1); bump(d.dir, 1); return out({ ok: true });
    }
    const mail = adminEmail(d.token); if (!mail) return out({ error: "Not authorized" });
    if (d.action === "adminList") return out({ ideas: all(), songCount: songs().length, email: mail });
    if (d.action === "approve") put(+d.id, "status", "Approved");
    if (d.action === "reject")  put(+d.id, "status", "Rejected");
    if (d.action === "delete")  s.deleteRow(+d.id);
    if (d.action === "edit") { if (d.fields.problem != null) put(+d.id, "problem", d.fields.problem); if (d.fields.solution != null) put(+d.id, "solution", d.fields.solution); }
    if (d.action === "bulk") (d.items || []).forEach(x => {
      const row = new Array(Math.max(s.getLastColumn(), 8)).fill("");
      row[c.ts-1] = new Date(); row[c.name-1] = x.name || ""; row[c.problem-1] = x.problem || ""; row[c.solution-1] = x.solution || "";
      row[c.category-1] = x.category || ""; row[c.status-1] = "Approved"; row[c.up-1] = 0; row[c.down-1] = 0; s.appendRow(row);
    });
    return out({ ok: true });
  } finally { lock.releaseLock(); }
}
