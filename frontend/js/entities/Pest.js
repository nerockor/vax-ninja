/* ============================================================
   Pest Entity — Flea / Tick (Landscape HD 1920x1080)
   Updated to use specific "live" and "dead" skins.
   ============================================================ */

class Pest {
    constructor(scene, x, y, type) {
        this.scene = scene;
        this.type = type; // 'flea' or 'tick'
        this.isSliced = false;
        this.hasLanded = false;

        // Use new textures: flea_live, tick_live
        const textureKey = `${type}_live`;
        this.sprite = scene.physics.add.sprite(x, y, textureKey);

        // Size adjustment (+20% for better visibility no tocar, estos tamaños)
        const size = type === 'flea' ? 315 : 325;
        this.sprite.setDisplaySize(size, size);
        this.sprite.setInteractive({ useHandCursor: false });
        this.sprite.setData('entity', this);
        this.sprite.setData('entityType', 'pest');

        // Initial spin
        this.sprite.setAngularVelocity(Phaser.Math.Between(-100, 100));
        this.sprite.setDepth(40);
    }

    launchFromSide(velocityX, velocityY) {
        this.sprite.body.setVelocity(velocityX, velocityY);
        this.sprite.body.setAllowGravity(true);
        // Gravity slightly low for a floating "ninja" fall
        this.sprite.body.setGravityY(-400);

        // Check for landing on "fur" (at bottom of 1080p screen)
        this.landCheck = this.scene.time.addEvent({
            delay: 100,
            loop: true,
            callback: () => {
                if (!this.sprite || !this.sprite.active) {
                    if (this.landCheck) this.landCheck.remove(false);
                    return;
                }
                // Fur zone in 1080p starts around Y=1020 (near bottom)
                if (this.sprite.y > 1020) {
                    this.landOnFur();
                }
            },
        });

        // Cleanup
        this.scene.time.delayedCall(7000, () => {
            if (this.sprite && this.sprite.active && !this.isSliced && !this.hasLanded) {
                if (this.landCheck) this.landCheck.remove(false);
                this.sprite.destroy();
            }
        });
    }

    // ── SLICED! Show dead skin and split ──
    slice() {
        if (this.isSliced || this.hasLanded) return;
        this.isSliced = true;
        if (this.landCheck) this.landCheck.remove(false);

        const x = this.sprite.x;
        const y = this.sprite.y;
        const deadTexture = `${this.type}_dead`;

        // Points
        const points = this.scene.scoreManager.addSlice();

        // Floating score
        const scoreText = this.scene.add.text(x, y - 40, `+${points}`, {
            fontFamily: 'Outfit', fontSize: '42px', fontStyle: 'bold', color: '#00FF88', stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(50);

        this.scene.tweens.add({
            targets: scoreText, y: scoreText.y - 120, alpha: 0, duration: 1000,
            onComplete: () => scoreText.destroy(),
        });

        // ── SPLIT INTO 4 PIECES using the DEAD texture ──
        const pieces = [
            { dx: -30, dy: -30, vx: -250, vy: -300 },
            { dx: 30, dy: -30, vx: 250, vy: -300 },
            { dx: -30, dy: 30, vx: -200, vy: 150 },
            { dx: 30, dy: 30, vx: 200, vy: 150 },
        ];

        pieces.forEach((p, idx) => {
            const piece = this.scene.physics.add.sprite(x + p.dx, y + p.dy, deadTexture);
            piece.setDisplaySize(60, 60);
            piece.body.setVelocity(p.vx + Phaser.Math.Between(-50, 50), p.vy + Phaser.Math.Between(-50, 50));
            piece.body.setAllowGravity(true);
            piece.setAngularVelocity(Phaser.Math.Between(-400, 400));
            piece.setDepth(45);

            const w = piece.width;
            const h = piece.height;
            piece.setCrop(idx % 2 === 0 ? 0 : w / 2, idx < 2 ? 0 : h / 2, w / 2, h / 2);

            this.scene.tweens.add({
                targets: piece, alpha: 0, duration: 1200, delay: 600,
                onComplete: () => piece.destroy(),
            });
        });

        // ── GREEN BLOOD SPLASH EXPLOSION ──
        SliceEffects.explode(this.scene, x, y);

        this.sprite.destroy();
    }

    landOnFur() {
        if (this.isSliced || this.hasLanded) return;
        this.hasLanded = true;
        if (this.landCheck) this.landCheck.remove(false);

        this.scene.scoreManager.pestLanded();

        this.sprite.body.setVelocity(0, 0);
        this.sprite.body.setAllowGravity(false);
        this.sprite.y = 970 + Phaser.Math.Between(0, 40);
        this.sprite.setScale(0.8);

        this.scene.cameras.main.shake(150, 0.005);

        this.scene.time.delayedCall(2000, () => {
            if (this.sprite && this.sprite.active) {
                this.scene.tweens.add({ targets: this.sprite, alpha: 0, duration: 400, onComplete: () => this.sprite.destroy() });
            }
        });
    }
}
