/* ============================================================
   SpawnManager — 1920x1080 Landscape
   Pests spawn from top/sides and fall down.
   ============================================================ */

class SpawnManager {
    constructor(scene, scoreManager) {
        this.scene = scene;
        this.scoreManager = scoreManager;

        this.baseInterval = 1100;
        this.minInterval = 400;
        this.currentInterval = this.baseInterval;

        this.tickChance = 0.35;
        this.multiSpawnChance = 0.15;
        this.difficultyRamp = 0.006;

        this.baseFallSpeed = 250; 
        this.speedIncrease = 1.0;

        this.spawnTimer = null;
        this.isRunning = false;
        this.spawnCount = 0;
    }

    start() {
        this.isRunning = true;
        this.scheduleNext();
    }

    stop() {
        this.isRunning = false;
        if (this.spawnTimer) {
            this.spawnTimer.remove(false);
            this.spawnTimer = null;
        }
    }

    scheduleNext() {
        if (!this.isRunning) return;
        this.spawnTimer = this.scene.time.delayedCall(this.currentInterval, () => {
            this.spawnWave();
            this.increaseDifficulty();
            this.scheduleNext();
        });
    }

    spawnWave() {
        let count = 1;
        if (Math.random() < this.multiSpawnChance) {
            count = Phaser.Math.Between(2, 4);
        }
        for (let i = 0; i < count; i++) {
            this.scene.time.delayedCall(i * 300, () => this.spawnPest());
        }
        this.spawnCount++;
    }

    spawnPest() {
        if (!this.isRunning) return;

        const type = Math.random() < this.tickChance ? 'tick' : 'flea';

        // Playable area: 60px to 1860px (1800px wide), within 1920x1080
        const marginX = 60;
        const maxX = 1920 - marginX;

        // All pests spawn from the top, distributed across the playable area
        const x = Phaser.Math.Between(marginX, maxX);
        const y = -80;

        const pest = new Pest(this.scene, x, y, type);

        // Horizontal drift to keep them inside the screen
        const horizontalSpeed = Phaser.Math.Between(-200, 200);
        const fallSpeed = this.baseFallSpeed * this.speedIncrease + Phaser.Math.Between(50, 150);

        pest.launchFromSide(horizontalSpeed, fallSpeed);

        this.scene.pests.add(pest.sprite);
    }

    increaseDifficulty() {
        // Difficulty doubles every 10 seconds based on elapsed time (Total 35s)
        const initialTime = 35;
        const elapsedTime = Math.max(0, initialTime - this.scene.timeRemaining);
        const phase = Math.floor(elapsedTime / 10); // 0, 1, 2, 3
        const multiplier = Math.pow(2, phase);

        // Exponential interval reduction
        this.currentInterval = Math.max(this.minInterval, this.baseInterval / multiplier);
        
        // Scale multi-spawn chance: starts at 0.15, increases with phase
        this.multiSpawnChance = Math.min(0.8, 0.15 + (phase * 0.2));

        // Scale speed: base speed + phase bonus + slight spawn count bonus
        this.speedIncrease = 1.0 + (phase * 0.4) + (this.spawnCount * 0.01);

        console.log(`[SpawnManager] Phase: ${phase} | Multiplier: ${multiplier} | Interval: ${this.currentInterval.toFixed(0)}ms | Speed: ${this.speedIncrease.toFixed(2)}`);
    }
}
