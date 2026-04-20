/* ============================================================
   GameOverScene — 1920x1080 Landscape
   Auto-saves score for the registered participant.
   ============================================================ */

class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.stats = data || { score: 0, sliced: 0, landed: 0, maxCombo: 0, furHealth: 100, reason: '¡TIEMPO!' };
    }

    create() {
        const { width, height } = this.cameras.main;

        const overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0.9);
        overlay.fillRect(0, 0, width, height);

        const centerX = width * 0.35; // Shift left to make room for ranking

        this.add.text(centerX, 150, this.stats.reason || '¡TIEMPO AGOTADO!', {
            fontFamily: 'Outfit', fontSize: '80px', fontStyle: '900', color: '#e74c3c',
        }).setOrigin(0.5);

        this.add.text(centerX, 280, `PUNTAJE: ${this.stats.score}`, {
            fontFamily: 'Outfit', fontSize: '70px', fontStyle: '800', color: '#2ecc71',
        }).setOrigin(0.5);

        this.add.text(centerX, 400, `BICHOS CORTADOS: ${this.stats.sliced}`, {
            fontFamily: 'Outfit', fontSize: '36px', color: '#ecf0f1',
        }).setOrigin(0.5);

        // Status text for auto-save
        this.saveStatusText = this.add.text(centerX, 480, 'Guardando puntaje...', {
            fontFamily: 'Outfit', fontSize: '24px', color: '#f39c12'
        }).setOrigin(0.5);

        // Replay Button
        const btnY = 650;
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x3498db, 1);
        btnBg.fillRoundedRect(centerX - 200, btnY - 50, 400, 100, 20);

        this.add.text(centerX, btnY, 'REINTENTAR', {
            fontFamily: 'Outfit', fontSize: '48px', fontStyle: '800', color: '#fff',
        }).setOrigin(0.5);

        const btnZone = this.add.zone(centerX, btnY, 400, 100).setInteractive({ useHandCursor: true });
        btnZone.on('pointerdown', () => {
            this.scene.start('GameScene');
        });

        // Ranking Area
        const rightX = width * 0.75;
        this.add.text(rightX, 150, '🏅 RANKING DIARIO', {
            fontFamily: 'Outfit', fontSize: '50px', fontStyle: '900', color: '#f1c40f',
        }).setOrigin(0.5);

        this.rankingContainer = this.add.container(rightX, 220);

        this.cameras.main.fadeIn(500, 0, 0, 0);

        // Auto-save and load ranking
        this.autoSaveScore();
    }

    async autoSaveScore() {
        const playerName = localStorage.getItem('vaxninja_player') || 'JugadorAnonimo';
        const isSurvey = localStorage.getItem('vaxninja_is_survey') === 'true';

        try {
            const response = await fetch('./api/score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: playerName,
                    score: this.stats.score,
                    is_survey: isSurvey
                }),
            });
            if (response.ok) {
                const result = await response.json();
                const displayName = result.display_name || playerName;
                this.saveStatusText.setText(`✅ Puntaje guardado para ${displayName}`).setColor('#2ecc71');
                this.loadRanking();
            } else {
                throw new Error("HTTP error");
            }
        } catch (err) {
            console.error("Save error:", err);
            this.saveStatusText.setText(`❌ Error al conectar con el servidor (Usando info local)`).setColor('#e74c3c');

            // Local fallback
            const saved = JSON.parse(localStorage.getItem('vaxninja_scores') || '[]');
            saved.push({ name: playerName, score: this.stats.score, date: new Date().toISOString().split('T')[0] });
            saved.sort((a, b) => b.score - a.score);
            localStorage.setItem('vaxninja_scores', JSON.stringify(saved.slice(0, 15)));
            this.showLocalRanking();
        }
    }

    async loadRanking() {
        try {
            const response = await fetch('/api/ranking');
            if (!response.ok) throw new Error("Rank API fail");

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                this.displayRanking(await response.json());
            } else {
                throw new Error("No JSON returned");
            }
        } catch (err) {
            this.showLocalRanking();
        }
    }

    showLocalRanking() {
        const saved = JSON.parse(localStorage.getItem('vaxninja_scores') || '[]');
        this.displayRanking(saved.slice(0, 10));
    }

    displayRanking(entries) {
        this.rankingContainer.removeAll(true);
        if (!entries || entries.length === 0) return;

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        entries.slice(0, 10).forEach((entry, i) => {
            const y = i * 60;
            const text = this.add.text(-250, y,
                `${medals[i] || '  '} ${entry.name.substring(0, 15)}`, {
                fontFamily: 'Outfit', fontSize: '36px',
                color: i === 0 ? '#f1c40f' : '#ecf0f1',
            }).setOrigin(0, 0.5);

            const scoreTxt = this.add.text(250, y,
                `${entry.score}`, {
                fontFamily: 'Outfit', fontSize: '36px', fontStyle: '800',
                color: i === 0 ? '#f1c40f' : '#2ecc71',
            }).setOrigin(1, 0.5);

            this.rankingContainer.add(text);
            this.rankingContainer.add(scoreTxt);
        });
    }
}
