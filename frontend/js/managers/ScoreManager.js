/* ============================================================
   ScoreManager — Points, Combos, Health (Fur Health)
   ============================================================ */

class ScoreManager {
    constructor(scene) {
        this.scene = scene;
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.comboMultiplier = 1;
        this.furHealth = 100;      // Health of the pet's fur
        this.sliced = 0;           // Total bugs sliced
        this.landed = 0;           // Bugs that landed on fur
        this.isComboActive = false;
        this.gameOverReason = '¡TIEMPO!';

        this.COMBO_THRESHOLD = 3;
        this.COMBO_MULTIPLIER = 2;
        this.SLICE_POINTS = 100;
        this.LAND_DAMAGE = 0;      // God mode for testing behavior
    }

    addSlice() {
        this.combo++;
        this.sliced++;

        if (this.combo >= this.COMBO_THRESHOLD && !this.isComboActive) {
            this.isComboActive = true;
            this.comboMultiplier = this.COMBO_MULTIPLIER;
            this.scene.events.emit('combo-activated', this.combo);
        }

        // Time-progressive scoring to prevent ties:
        // Each enemy is worth the base points + 2 points per second of the game passed.
        const initialTime = 35;
        const elapsedTime = Math.max(0, initialTime - this.scene.timeRemaining);
        const timeBonus = Math.floor(elapsedTime * 2); // e.g. at sec 30, bonus is 60 pts

        const basePoints = this.SLICE_POINTS + timeBonus;
        const points = basePoints * this.comboMultiplier;
        this.score += points;

        if (this.combo > this.maxCombo) {
            this.maxCombo = this.combo;
        }

        // Emit weapon unlock event for every slice
        this.scene.events.emit('slice-for-weapon');

        this.scene.events.emit('score-changed', this.score);
        return points;
    }

    addPoints(amount) {
        this.score += amount;
        this.scene.events.emit('score-changed', this.score);
    }

    pestLanded() {
        this.landed++;
        this.breakCombo();
        this.furHealth = Math.max(0, this.furHealth - this.LAND_DAMAGE);
        console.log(`[ScoreManager] Pest landed! Health: ${this.furHealth}`);
        this.scene.events.emit('health-changed', this.furHealth);

        if (this.furHealth <= 0) {
            console.log('[ScoreManager] Health depleted!');
            this.scene.events.emit('health-depleted');
        }
    }

    breakCombo() {
        if (this.isComboActive) {
            this.scene.events.emit('combo-broken');
        }
        this.combo = 0;
        this.comboMultiplier = 1;
        this.isComboActive = false;
    }

    getStats() {
        return {
            score: this.score,
            sliced: this.sliced,
            landed: this.landed,
            maxCombo: this.maxCombo,
            furHealth: this.furHealth,
        };
    }
}
