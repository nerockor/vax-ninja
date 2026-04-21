"""
Vax Ninja — SQLite Database Helper
"""
import sqlite3
from datetime import date
import os

# Use a local path instead of root /data
DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "data", "vaxninja.db"))

class Database:
    def __init__(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self._create_tables()

    def _create_tables(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                score INTEGER NOT NULL,
                date TEXT NOT NULL,
                is_survey INTEGER DEFAULT 0,
                real_name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                ip_address TEXT,
                first_played_date TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS prospects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dni TEXT,
                matricula TEXT,
                razon_social TEXT,
                email TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS survey_responses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                razon_social TEXT,
                canal_pedidos TEXT,
                razon_canal TEXT,
                comunicacion TEXT,
                funcionalidad TEXT,
                funcionalidad_detalle TEXT,
                obsequios TEXT,
                pedidos TEXT,
                satisfaccion INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Migrations: Ensure new columns exist for existing DBs
        try: self.conn.execute("ALTER TABLE survey_responses ADD COLUMN funcionalidad_detalle TEXT")
        except sqlite3.OperationalError: pass
            
        try: self.conn.execute("ALTER TABLE survey_responses ADD COLUMN razon_social TEXT")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE survey_responses ADD COLUMN canal_pedidos TEXT")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE survey_responses ADD COLUMN razon_canal TEXT")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE scores ADD COLUMN is_survey INTEGER DEFAULT 0")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE scores ADD COLUMN real_name TEXT")
        except sqlite3.OperationalError: pass
            
        try: self.conn.execute("ALTER TABLE participants ADD COLUMN email TEXT")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE participants ADD COLUMN phone TEXT")
        except sqlite3.OperationalError: pass

        try: self.conn.execute("ALTER TABLE participants ADD COLUMN year TEXT")
        except sqlite3.OperationalError: pass

        self.conn.commit()

    def insert_score(self, name: str, score: int, is_survey: bool = False):
        display_name = name
        real_name = name if is_survey else None
        
        if is_survey:
            # Generate sequential nickname: Ninja vet 1, Ninja vet 2...
            # We count unique real names in survey scores to maintain the same index if they play again
            existing = self.conn.execute(
                "SELECT name FROM scores WHERE (real_name = ? OR name = ?) AND is_survey = 1 LIMIT 1",
                (name, name)
            ).fetchone()
            
            if existing:
                display_name = existing["name"]
            else:
                # Count how many distinct survey names we have so far
                count_row = self.conn.execute(
                    "SELECT COUNT(DISTINCT real_name) as total FROM scores WHERE is_survey = 1"
                ).fetchone()
                total = count_row["total"] if count_row else 0
                display_name = f"Ninja vet {total + 1}"

        self.conn.execute(
            "INSERT INTO scores (name, score, date, is_survey, real_name) VALUES (?, ?, ?, ?, ?)",
            (display_name[:15], score, date.today().isoformat(), 1 if is_survey else 0, real_name),
        )
        self.conn.commit()
        return display_name # Return what we decided to call them

    def get_top_scores(self, today: str, limit: int = 10):
        cursor = self.conn.execute(
            "SELECT name, score, date FROM scores WHERE date = ? ORDER BY score DESC LIMIT ?",
            (today, limit),
        )
        return [dict(row) for row in cursor.fetchall()]

    def get_all_scores(self, limit: int = 50):
        cursor = self.conn.execute(
            "SELECT name, score, date FROM scores ORDER BY score DESC LIMIT ?",
            (limit,),
        )
        return [dict(row) for row in cursor.fetchall()]

    def insert_participant(self, name: str, ip: str = None, email: str = "", phone: str = "", year: str = ""):
        today = date.today().isoformat()
        try:
            self.conn.execute("""
                INSERT INTO participants (name, first_played_date, ip_address, email, phone, year)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(name) DO UPDATE SET
                    email = excluded.email,
                    phone = excluded.phone,
                    year = excluded.year,
                    ip_address = excluded.ip_address
            """, (name, today, ip, email, phone, year))
            self.conn.commit()
        except sqlite3.Error as e:
            print(f"Error inserting participant: {e}")

    def get_participant_by_ip(self, ip: str):
        cursor = self.conn.execute(
            "SELECT name FROM participants WHERE ip_address = ? ORDER BY created_at ASC LIMIT 1",
            (ip,)
        )
        row = cursor.fetchone()
        return dict(row) if row else None

    def get_all_participants(self):
        cursor = self.conn.execute("SELECT * FROM participants ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]

    def insert_prospect(self, data: dict):
        self.conn.execute(
            """INSERT INTO prospects (name, dni, matricula, razon_social, email) 
               VALUES (?, ?, ?, ?, ?)""",
            (
                data.get("name"),
                data.get("dni"),
                data.get("matricula"),
                data.get("razon_social"),
                data.get("email")
            )
        )
        self.conn.commit()

    def get_prospects(self):
        cursor = self.conn.execute("SELECT * FROM prospects ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]

    def insert_survey(self, data: dict):
        self.conn.execute(
            """INSERT INTO survey_responses 
               (razon_social, canal_pedidos, razon_canal, comunicacion, funcionalidad, funcionalidad_detalle, obsequios, pedidos, satisfaccion) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data.get("razon_social", "Desconocido"),
                data.get("canal_pedidos"),
                data.get("razon_canal"),
                data.get("comunicacion"),
                data.get("funcionalidad"),
                data.get("funcionalidad_detalle"),
                data.get("obsequios"),
                data.get("pedidos", ""),
                data.get("satisfaccion", 0)
            )
        )
        self.conn.commit()

    def get_all_survey_responses(self):
        cursor = self.conn.execute("SELECT * FROM survey_responses ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]

    def get_admin_report(self):
        # Returns all participants from all sources (students, prospects, surveys, and legacy scores)
        cursor = self.conn.execute("""
            WITH all_users AS (
                SELECT name, ip_address, created_at FROM participants
                UNION
                SELECT razon_social as name, 'Encuesta' as ip_address, created_at FROM survey_responses WHERE razon_social IS NOT NULL AND razon_social != '' AND razon_social != 'Desconocido'
                UNION
                SELECT razon_social as name, 'Prospecto' as ip_address, created_at FROM prospects WHERE razon_social IS NOT NULL AND razon_social != ''
                UNION
                SELECT COALESCE(real_name, name) as name, 'Directo' as ip_address, date as created_at FROM scores
            ),
            user_stats AS (
                SELECT 
                    u.name as final_real_name,
                    MAX(u.ip_address) as final_ip_address,
                    MIN(u.created_at) as first_played_date,
                    COALESCE(MAX(s.score), 0) as top_score,
                    COUNT(s.id) as sessions_played,
                    MAX(CASE WHEN s.is_survey = 1 THEN s.name ELSE '' END) as alias
                FROM all_users u
                LEFT JOIN scores s ON u.name = s.name OR u.name = s.real_name
                GROUP BY u.name
            )
            SELECT 
                CASE WHEN alias != '' THEN alias ELSE final_real_name END as player_id,
                final_real_name as real_name,
                final_ip_address as ip_address,
                first_played_date,
                top_score,
                sessions_played
            FROM user_stats
            ORDER BY top_score DESC, first_played_date DESC
        """)
        return [dict(row) for row in cursor.fetchall()]

    def get_survey_stats(self):
        cursor = self.conn.execute("SELECT * FROM survey_responses")
        rows = cursor.fetchall()
        
        stats = {
            "total_responses": len(rows),
            "canal_pedidos": {},
            "razon_canal": {},
            "comunicacion": {},
            "funcionalidad_general": {},
            "funcionalidad_detalle_gusta": {},
            "funcionalidad_detalle_rechaza": {},
            "obsequios": {},
            "pedidos": {},
            "satisfaccion_promedio": 0
        }
        
        if not rows:
            return stats
            
        total_satisfaccion = 0
        
        for r in rows:
            # Simple aggregations
            self._count_csv(r["canal_pedidos"], stats["canal_pedidos"])
            self._count_csv(r["razon_canal"], stats["razon_canal"])
            self._count_csv(r["comunicacion"], stats["comunicacion"])
            self._count_csv(r["funcionalidad"], stats["funcionalidad_general"])
            self._count_csv(r["obsequios"], stats["obsequios"])
            self._count_csv(r["pedidos"], stats["pedidos"])
            
            # Complex functionality aggregation
            detalle = r["funcionalidad_detalle"] or ""
            if "Gusta:" in detalle:
                gusta_part = detalle.split("Gusta:")[1].split("|")[0].strip()
                self._count_csv(gusta_part, stats["funcionalidad_detalle_gusta"])
            if "Rechaza:" in detalle:
                rechaza_part = detalle.split("Rechaza:")[1].strip()
                self._count_csv(rechaza_part, stats["funcionalidad_detalle_rechaza"])

            total_satisfaccion += r["satisfaccion"]
            
        stats["satisfaccion_promedio"] = round(total_satisfaccion / len(rows), 1)
        return stats

    def _count_csv(self, csv_str, target_dict):
        if not csv_str: return
        items = [i.strip() for i in csv_str.split(',')]
        for item in items:
            if item:
                target_dict[item] = target_dict.get(item, 0) + 1
