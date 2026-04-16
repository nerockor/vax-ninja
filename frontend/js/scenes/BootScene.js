/* ============================================================
   BootScene — Asset Preloader
   ============================================================ */

class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // ── Progress bar ──
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        const progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRoundedRect(width / 2 - 160, height / 2 - 15, 320, 50, 10);

        const progressBar = this.add.graphics();

        const loadingText = this.add.text(width / 2, height / 2 - 50, 'Cargando...', {
            fontFamily: 'Outfit',
            fontSize: '22px',
            color: '#ffffff',
        }).setOrigin(0.5);

        const percentText = this.add.text(width / 2, height / 2 + 10, '0%', {
            fontFamily: 'Outfit',
            fontSize: '18px',
            color: '#2ecc71',
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            percentText.setText(`${Math.round(value * 100)}%`);
            progressBar.clear();
            progressBar.fillStyle(0x2ecc71, 1);
            progressBar.fillRoundedRect(width / 2 - 150, height / 2 - 5, 300 * value, 30, 8);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
            percentText.destroy();
        });

        // ── Load assets ──
        this.load.image('dog', 'assets/sprites/dog.png');
        this.load.image('cat', 'assets/sprites/cat.png');
        this.load.image('flea', 'assets/sprites/flea.png');
        this.load.image('tick', 'assets/sprites/tick.png');
        this.load.image('syringe', 'assets/sprites/syringe.png');
        this.load.image('background', 'assets/sprites/background.png');
        
        // New interactive assets
        this.load.image('flea_live', 'assets/sprites/pulga-escena-live.png');
        this.load.image('flea_dead', 'assets/sprites/pulga-escena-dead.png');
        this.load.image('tick_live', 'assets/sprites/garrapata-escena-viva.png');
        this.load.image('tick_dead', 'assets/sprites/garrapata-escena-dead.png');
        this.load.image('game_bg', 'assets/sprites/bg-game.png');
        this.load.image('login_bg', 'assets/sprites/bg-login.png');
        for (let i = 1; i <= 6; i++) {
            this.load.image(`arma-${i}`, `assets/sprites/arma-${i}.png?v=10`);
        }
        
        // Boss assets
        this.load.image('jefe-final', 'assets/sprites/jefe-final.png?v=10');
        this.load.image('jefe-final-95-vida', 'assets/sprites/jefe-final-95-vida.png?v=10');
        this.load.image('jefe-final-70vida', 'assets/sprites/jefe-final-70vida.png?v=10');
        this.load.image('jefe-final-30vida', 'assets/sprites/jefe-final-30vida.png?v=10');
        this.load.image('jefe-final-10vida', 'assets/sprites/jefe-final-10vida.png?v=10');
        this.load.image('jefe-final-0vida', 'assets/sprites/jefe-final-0vida.png?v=10');
        this.load.image('bg-boss', 'assets/sprites/bg-gg-boss-opt.jpg?v=10');
    }

    create() {
        this.scene.start('MenuScene');
    }
}
