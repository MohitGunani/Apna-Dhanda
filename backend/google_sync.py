"""Google Sheets + Drive helpers (service account). Share the Sheet (Editor) and the music folder (Viewer) with its client_email."""
import os, json, time, hashlib
from google.oauth2 import service_account
from google.auth.transport.requests import AuthorizedSession
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.readonly"]
HEAD = ["ID", "Timestamp", "Name", "Problem", "Solution", "Category", "Status", "Upvotes", "Downvotes", "Instagram", "LinkedIn", "Twitter"]
FIELDS = ["name", "problem", "solution", "category", "status", "instagram", "linkedin", "twitter"]
KEYS = {"ts": ["time"], "name": ["name", "contributor"], "problem": ["problem", "idea"], "solution": ["solution", "fix"],
        "category": ["category", "tag"], "status": ["status"], "up": ["up"], "down": ["down"],
        "instagram": ["instagram", "insta"], "linkedin": ["linkedin"], "twitter": ["twitter"]}
_creds = None
_cache = {"t": 0, "songs": []}

def sheet_enabled(): return bool(os.environ.get("GOOGLE_SHEET_ID") and os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"))
def drive_enabled(): return bool(os.environ.get("GOOGLE_DRIVE_FOLDER_ID") and os.environ.get("GOOGLE_SERVICE_ACCOUNT_JSON"))

def creds():
    global _creds
    if _creds is None:
        raw = os.environ["GOOGLE_SERVICE_ACCOUNT_JSON"].strip()
        info = json.loads(raw) if raw.startswith("{") else json.load(open(raw if os.path.isabs(raw) else os.path.join(os.path.dirname(__file__), raw)))
        _creds = service_account.Credentials.from_service_account_info(info, scopes=SCOPES)
    return _creds

def row_hash(d) -> str:
    return hashlib.md5("\x1f".join(str(d.get(k, "")).strip() for k in FIELDS).encode()).hexdigest()

def _title(s):
    meta = s.spreadsheets().get(spreadsheetId=os.environ["GOOGLE_SHEET_ID"], fields="sheets.properties.title").execute()
    return meta["sheets"][0]["properties"]["title"]

def read_rows():
    s = build("sheets", "v4", credentials=creds(), cache_discovery=False)
    title = _title(s)
    vals = s.spreadsheets().values().get(spreadsheetId=os.environ["GOOGLE_SHEET_ID"], range=f"'{title}'!A1:Z").execute().get("values", [])
    if not vals:
        return []
    head = [str(h).strip().lower() for h in vals[0]]
    col = {}
    for k, pats in [("id", None)] + list(KEYS.items()):
        for i, h in enumerate(head):
            if (k == "id" and h == "id") or (k != "id" and any(p in h for p in pats)):
                col[k] = i; break
    def cell(r, k):
        i = col.get(k)
        return str(r[i]).strip() if i is not None and i < len(r) else ""
    def num(x):
        try: return max(0, int(float(x)))
        except ValueError: return 0
    out = []
    for r in vals[1:]:
        p = cell(r, "problem")
        if not p: continue
        st = cell(r, "status").capitalize()
        out.append({"id": cell(r, "id"), "created": cell(r, "ts"), "name": cell(r, "name"), "problem": p, "solution": cell(r, "solution"),
                    "category": cell(r, "category"), "status": st if st in ("Pending", "Approved", "Rejected") else "Pending",
                    "up": num(cell(r, "up")), "down": num(cell(r, "down")), "instagram": cell(r, "instagram"),
                    "linkedin": cell(r, "linkedin"), "twitter": cell(r, "twitter")})
    return out

def write_rows(docs):
    s = build("sheets", "v4", credentials=creds(), cache_discovery=False)
    sid, title = os.environ["GOOGLE_SHEET_ID"], None
    title = _title(s)
    values = [HEAD] + [[d["_id"], d.get("created", ""), d.get("name", ""), d.get("problem", ""), d.get("solution", ""), d.get("category", ""),
                        d.get("status", "Pending"), d.get("up", 0), d.get("down", 0), d.get("instagram", ""), d.get("linkedin", ""),
                        d.get("twitter", "")] for d in docs]
    s.spreadsheets().values().clear(spreadsheetId=sid, range=f"'{title}'!A:Z").execute()
    s.spreadsheets().values().update(spreadsheetId=sid, range=f"'{title}'!A1", valueInputOption="RAW", body={"values": values}).execute()

def list_songs(force=False):
    if not drive_enabled(): return []
    if not force and time.time() - _cache["t"] < 300 and _cache["songs"]: return _cache["songs"]
    try:
        d = build("drive", "v3", credentials=creds(), cache_discovery=False)
        res = d.files().list(q=f"'{os.environ['GOOGLE_DRIVE_FOLDER_ID']}' in parents and trashed=false",
                             fields="files(id,name,mimeType)", pageSize=200, orderBy="name").execute()
        _cache["songs"] = [{"id": f["id"], "name": f["name"]} for f in res.get("files", [])
                           if f["mimeType"].startswith("audio/") or f["name"].lower().endswith((".mp3", ".m4a", ".wav", ".ogg", ".aac", ".flac"))]
        _cache["t"] = time.time()
    except Exception as e:
        print("Drive list failed:", e)
    return _cache["songs"]

def open_stream(file_id, rng=None):
    """Proxy a Drive file (supports Range so seeking works). Songs never need to be public."""
    return AuthorizedSession(creds()).get(f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media",
                                          headers={"Range": rng} if rng else {}, stream=True, timeout=30)
