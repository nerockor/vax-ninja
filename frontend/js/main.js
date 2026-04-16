/* ============================================================
   Vax Ninja — Phaser Configuration & Entry Point
   ============================================================ */

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 1920,
    height: 1080,
    backgroundColor: '#87CEEB',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 980 },
            debug: false,
        },
    },
    input: {
        activePointers: 3,
    },
    scene: [BootScene, MenuScene, GameScene, GameOverScene],
};

const game = new Phaser.Game(config);
