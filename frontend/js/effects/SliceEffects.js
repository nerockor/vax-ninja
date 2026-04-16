/* ============================================================
   SliceEffects — Green Blood Splash & Dripping System
   Creates an explosion of green particles and persistent
   blood drops that drip down the screen.
   ============================================================ */

class SliceEffects {

    /**
     * Trigger a full slice explosion at (x, y) in the given scene.
     * @param {Phaser.Scene} scene
     * @param {number} x
     * @param {number} y
     */
    static explode(scene, x, y) {
        // ── 1. Central flash burst ──
        SliceEffects.flashBurst(scene, x, y);

        // ── 2. Particle spray (fast green droplets) ──
        SliceEffects.particleSpray(scene, x, y);

        // ── 3. Persistent blood drops that drip ──
        SliceEffects.bloodDrops(scene, x, y);

        // ── 4. Screen shake for impact ──
        scene.cameras.main.shake(80, 0.004);
    }

    /** Bright green flash that expands and fades */
    static flashBurst(scene, x, y) {
        const flash = scene.add.circle(x, y, 8, 0x39ff14, 0.9).setDepth(60);
        scene.tweens.add({
            targets: flash,
            scaleX: 6, scaleY: 6,
            alpha: 0,
            duration: 300,
            ease: 'Power2',
            onComplete: () => flash.destroy(),
        });

        // Secondary ring
        const ring = scene.add.circle(x, y, 12, 0x00ff88, 0).setDepth(59);
        ring.setStrokeStyle(4, 0x39ff14, 0.8);
        scene.tweens.add({
            targets: ring,
            scaleX: 5, scaleY: 5,
            alpha: 0,
            duration: 400,
            ease: 'Power1',
            onComplete: () => ring.destroy(),
        });
    }

    /** Fast-moving small particles that fly outward */
    static particleSpray(scene, x, y) {
        const count = Phaser.Math.Between(12, 20);

        for (let i = 0; i < count; i++) {
            const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
            const speed = Phaser.Math.Between(200, 600);
            const size = Phaser.Math.Between(3, 8);

            // Use different greens for variety
            const colors = [0x39ff14, 0x00ff88, 0x7fff00, 0x32cd32, 0x00e676];
            const color = Phaser.Utils.Array.GetRandom(colors);

            const particle = scene.add.circle(x, y, size, color, 0.9).setDepth(55);

            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            scene.tweens.add({
                targets: particle,
                x: particle.x + vx * 0.4,
                y: particle.y + vy * 0.4,
                scaleX: 0.2,
                scaleY: 0.2,
                alpha: 0,
                duration: Phaser.Math.Between(300, 700),
                ease: 'Power3',
                onComplete: () => particle.destroy(),
            });
        }
    }

    /** Persistent blood drops that stick to the screen and drip down slowly */
    static bloodDrops(scene, x, y) {
        const dropCount = Phaser.Math.Between(4, 8);

        for (let i = 0; i < dropCount; i++) {
            // Scatter drops around the impact point
            const dropX = x + Phaser.Math.Between(-80, 80);
            const dropY = y + Phaser.Math.Between(-60, 60);
            const size = Phaser.Math.Between(3, 7);

            const colors = [0x39ff14, 0x00ff88, 0x32cd32];
            const color = Phaser.Utils.Array.GetRandom(colors);

            const drop = scene.add.circle(dropX, dropY, size, color, 0.7).setDepth(2);

            // Drip effect: drop slides down slowly then fades
            const dripDistance = Phaser.Math.Between(30, 120);
            const dripDuration = Phaser.Math.Between(2000, 4000);

            scene.tweens.add({
                targets: drop,
                y: dropY + dripDistance,
                scaleX: { from: 1, to: 0.6 },
                scaleY: { from: 1, to: 1.8 }, // Elongate as it drips
                alpha: { from: 0.7, to: 0 },
                duration: dripDuration,
                delay: Phaser.Math.Between(200, 800),
                ease: 'Sine.easeIn',
                onComplete: () => drop.destroy(),
            });
        }

        // One big splat mark at center
        const splat = scene.add.circle(x, y, Phaser.Math.Between(10, 18), 0x39ff14, 0.5).setDepth(1);
        // Irregular shape by scaling
        splat.setScale(Phaser.Math.FloatBetween(0.8, 1.4), Phaser.Math.FloatBetween(0.6, 1.2));

        scene.tweens.add({
            targets: splat,
            alpha: 0,
            duration: 5000,
            delay: 1000,
            ease: 'Power1',
            onComplete: () => splat.destroy(),
        });
    }
}
