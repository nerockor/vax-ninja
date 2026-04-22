"""
Vax Ninja — Ranking API (FastAPI + SQLite)
"""
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from database import Database
from datetime import date
import io
import csv
import os
import re

app = FastAPI(title="Vax Ninja API", version="1.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Client Data for Autocomplete
CLIENTS_DATA = []
CSV_PATH = os.path.join(os.path.dirname(__file__), "data", "id-nombre.csv")
def load_clients():
    global CLIENTS_DATA
    try:
        with open(CSV_PATH, newline='', encoding='utf-8', errors='ignore') as csvfile:
            # Semicolon separated, ignoring BOM if present
            reader = csv.reader(csvfile, delimiter=';')
            headers = next(reader, None) # skip header if needed
            for row in reader:
                if len(row) >= 2:
                    name = row[1].strip()
                    if name:
                        # Normalize name: keep only letters, numbers, spaces, make lower
                        normalized = re.sub(r'[^a-zA-Z0-9\s]', '', name).lower()
                        CLIENTS_DATA.append({
                            "original": name,
                            "normalized": normalized
                        })
    except Exception as e:
        print(f"Error loading client CSV: {e}")

load_clients()

db = Database()


class ScoreInput(BaseModel):
    name: str
    score: int
    is_survey: bool = False

class ParticipantInput(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    year: str = ""

class ProspectInput(BaseModel):
    name: str
    dni: str
    matricula: str
    razon_social: str
    email: str = ""

class SurveyInput(BaseModel):
    razon_social: str = ""
    canal_pedidos: str = ""
    razon_canal: str = ""
    comunicacion: str
    funcionalidad: str
    funcionalidad_detalle: str = ""
    obsequios: str
    pedidos: str = ""
    satisfaccion: int = 0


@app.post("/api/score")
async def save_score(data: ScoreInput):
    disp_name = db.insert_score(data.name, data.score, data.is_survey)
    status_msg = f"Score saved as {disp_name}" if not data.is_survey else "Anonymized score saved"
    return {"status": "ok", "message": status_msg, "display_name": disp_name}


@app.get("/api/ranking")
async def get_ranking():
    today = date.today().isoformat()
    scores = db.get_top_scores(today, limit=10)
    return scores


@app.get("/api/ranking/all")
async def get_all_ranking():
    scores = db.get_all_scores(limit=50)
    return scores

@app.post("/api/participant")
async def register_participant(data: ParticipantInput, request: Request):
    client_ip = request.client.host
    
    # First, check if IP is already registered
    existing = db.get_participant_by_ip(client_ip)
    if existing:
        # Proceed with upsert even if exists
        pass

    clean_name = data.name.strip()[:15]
    if clean_name:
        db.insert_participant(clean_name, client_ip, data.email, data.phone, data.year)
    return {"status": "ok", "message": "Participant Registered"}

@app.get("/api/participant/check")
async def check_participant(request: Request):
    client_ip = request.client.host
    existing = db.get_participant_by_ip(client_ip)
    if existing:
        return {"status": "exists", "name": existing["name"]}
    return {"status": "new"}

@app.get("/api/clients/search")
async def search_clients(q: str = ""):
    if not q or len(q) < 3:
        return {"data": []}
        
    # Normalize query and split into words
    term = re.sub(r'[^a-zA-Z0-9\s]', '', q).lower()
    query_words = [w for w in term.split() if w]
    
    if not query_words:
        return {"data": []}

    matches = []
    for client in CLIENTS_DATA:
        # Check if ALL words from query are present in the client name (in any order)
        if all(word in client["normalized"] for word in query_words):
            matches.append(client["original"])
            if len(matches) >= 10:
                break
                
    return {"data": matches}

@app.get("/api/admin/data")
async def get_admin_data():
    # In a real app, protect this with a token/password
    report = db.get_admin_report()
    return {"status": "ok", "data": report}

@app.get("/api/admin/participants")
async def get_admin_participants():
    participants = db.get_all_participants()
    return {"status": "ok", "data": participants}

@app.post("/api/register")
async def save_registration(data: ProspectInput):
    db.insert_prospect(data.dict())
    return {"status": "ok", "message": "Prospect registration saved successfully"}

@app.post("/api/survey")
async def save_survey(data: SurveyInput):
    db.insert_survey(data.dict())
    return {"status": "ok", "message": "Survey saved successfully"}

@app.get("/api/admin/prospects")
async def get_admin_prospects():
    prospects = db.get_prospects()
    return {"status": "ok", "data": prospects}

@app.get("/api/admin/survey/export")
async def export_survey_csv():
    responses = db.get_all_survey_responses()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Fecha", "Razón Social", "Canal de Pedido", "Razón del Canal", "Comunicación", "Funcionalidad", 
        "Canales Aprobados (Gustan)", "Canales Rechazados (No quieren)", "Obsequios", "Pedidos (Legacy)", "Satisfacción"
    ])
    
    for r in responses:
        detalle = r.get("funcionalidad_detalle", "") or ""
        gusta = ""
        rechaza = ""
        
        # Parse "Gusta: X, Y | Rechaza: Z"
        if "Gusta:" in detalle:
            parts = detalle.split("Gusta:")[1].split("|")
            gusta = parts[0].strip()
        if "Rechaza:" in detalle:
            rechaza = detalle.split("Rechaza:")[1].strip()

        writer.writerow([
            r["created_at"],
            r.get("razon_social", ""),
            r.get("canal_pedidos", ""),
            r.get("razon_canal", ""),
            r["comunicacion"],
            r["funcionalidad"],
            gusta,
            rechaza,
            r["obsequios"],
            r.get("pedidos", ""),
            r.get("satisfaccion", 0)
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=encuestasVaxNinja.csv"}
    )

@app.get("/api/admin/survey/stats")
async def get_admin_survey_stats():
    stats = db.get_survey_stats()
    return {"status": "ok", "data": stats}

@app.get("/api/admin/ranking/export")
async def export_ranking_csv():
    report = db.get_admin_report()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "Player ID (Alias)", "Nombre Real / Clínica", "IP Origen", 
        "Fecha Primer Juego", "Mejor Puntaje", "Sesiones Jugadas"
    ])
    
    for row in report:
        writer.writerow([
            row["player_id"],
            row["real_name"],
            row["ip_address"],
            row["first_played_date"],
            row["top_score"],
            row["sessions_played"]
        ])
    
    output.seek(0)
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=rankingVaxNinja.csv"}
    )

@app.get("/api/health")
async def health():
    return {"status": "ok", "game": "Vax Ninja"}
