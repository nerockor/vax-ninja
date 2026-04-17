/* ============================================================
   MenuScene — 1920x1080 Landscape
   bg-login.png with parallax, sparkles & Fruit Ninja lights.
   ============================================================ */

const API_BASE = '';

class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        this.w = width;
        this.h = height;

        // ── Background with parallax (slightly oversized for movement) ──
        this.bg = this.add.image(width / 2, height / 2, 'login_bg')
            .setDisplaySize(width * 1.08, height * 1.08)
            .setDepth(0);

        // ── Fruit-Ninja style light effects ──
        this.createLightEffects(width, height);

        // ── Floating sparkle particles ──
        this.sparkles = [];
        for (let i = 0; i < 25; i++) {
            this.createSparkle(width, height, true);
        }

        // ── Player logic (Check URL first, then localStorage) ──
        const urlParams = new URLSearchParams(window.location.search);
        const urlName = urlParams.get('name');
        if (urlName) {
            localStorage.setItem('vaxninja_player', urlName);
        }

        const savedName = localStorage.getItem('vaxninja_player');
        if (savedName) {
            this.showWelcomeBack(savedName, width, height);
        } else {
            this.showNamePopup(width, height);
        }

        // ── Parallax mouse tracking ──
        this.input.on('pointermove', (pointer) => {
            const cx = (pointer.x / width - 0.5) * 2;   // -1 to 1
            const cy = (pointer.y / height - 0.5) * 2;

            // Background moves opposite to cursor (parallax depth)
            this.tweens.add({
                targets: this.bg,
                x: width / 2 - cx * 25,
                y: height / 2 - cy * 15,
                duration: 600,
                ease: 'Power1',
            });

            // Move HTML elements slightly WITH the cursor (foreground parallax)
            this.moveHTMLParallax(cx, cy);
        });

        this.cameras.main.fadeIn(600, 0, 0, 0);
        this.events.on('shutdown', () => this.cleanupHTML());
    }

    // ══════════════════════════════════════════════
    //  FRUIT NINJA LIGHT EFFECTS
    // ══════════════════════════════════════════════
    createLightEffects(width, height) {
        // Ambient glow beams (diagonal light streaks)
        const beamColors = [0x39ff14, 0x00e5ff, 0xf1c40f, 0xff6ec7];

        for (let i = 0; i < 4; i++) {
            const beam = this.add.graphics().setDepth(1).setAlpha(0);
            const color = beamColors[i];
            const startX = Phaser.Math.Between(0, width);

            beam.fillStyle(color, 0.08);
            beam.fillRect(-20, -height, 40, height * 3);
            beam.setPosition(startX, height / 2);
            beam.setRotation(Phaser.Math.FloatBetween(-0.5, 0.5));

            // Animate: fade in, sweep, fade out, repeat
            this.tweens.add({
                targets: beam,
                alpha: { from: 0, to: 0.6 },
                x: startX + Phaser.Math.Between(-300, 300),
                duration: Phaser.Math.Between(3000, 5000),
                yoyo: true,
                repeat: -1,
                delay: i * 800,
                ease: 'Sine.easeInOut',
            });
        }

        // Pulsing central glow (behind the input area)
        const glow = this.add.circle(width / 2, height * 0.48, 200, 0x39ff14, 0.06).setDepth(1);
        this.tweens.add({
            targets: glow,
            scaleX: { from: 1, to: 1.8 },
            scaleY: { from: 1, to: 1.8 },
            alpha: { from: 0.06, to: 0.02 },
            duration: 2500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Lens flare sparkle (top-right, like Fruit Ninja)
        const flare = this.add.circle(width * 0.75, height * 0.15, 6, 0xffffff, 0.9).setDepth(2);
        this.tweens.add({
            targets: flare,
            scaleX: { from: 0.5, to: 3 },
            scaleY: { from: 0.5, to: 3 },
            alpha: { from: 0.9, to: 0 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            delay: 500,
        });

        // Secondary flare
        const flare2 = this.add.circle(width * 0.3, height * 0.2, 4, 0x00e5ff, 0.7).setDepth(2);
        this.tweens.add({
            targets: flare2,
            scaleX: { from: 1, to: 4 },
            scaleY: { from: 1, to: 4 },
            alpha: { from: 0.7, to: 0 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            delay: 1200,
        });
    }

    // ── Floating sparkle particles ──
    createSparkle(width, height, randomStart) {
        const x = Phaser.Math.Between(0, width);
        const y = randomStart ? Phaser.Math.Between(0, height) : -10;
        const size = Phaser.Math.FloatBetween(1, 3.5);
        const colors = [0xffffff, 0x39ff14, 0x00e5ff, 0xf1c40f, 0xff6ec7];
        const color = Phaser.Utils.Array.GetRandom(colors);

        const sparkle = this.add.circle(x, y, size, color, Phaser.Math.FloatBetween(0.3, 0.8))
            .setDepth(3);

        const duration = Phaser.Math.Between(4000, 9000);

        this.tweens.add({
            targets: sparkle,
            y: height + 20,
            x: x + Phaser.Math.Between(-100, 100),
            alpha: 0,
            duration: duration,
            delay: randomStart ? Phaser.Math.Between(0, 3000) : 0,
            ease: 'Sine.easeIn',
            onComplete: () => {
                sparkle.destroy();
                if (this.scene.isActive()) this.createSparkle(width, height, false);
            },
        });

        // Twinkle effect
        this.tweens.add({
            targets: sparkle,
            scaleX: { from: 1, to: 2.5 },
            scaleY: { from: 1, to: 2.5 },
            duration: Phaser.Math.Between(400, 800),
            yoyo: true,
            repeat: -1,
        });
    }

    // ══════════════════════════════════════════════
    //  HTML PARALLAX MOVEMENT
    // ══════════════════════════════════════════════
    moveHTMLParallax(cx, cy) {
        const input = document.getElementById('ninja-name-input');
        const btn = document.getElementById('ninja-confirm-btn');
        const err = document.getElementById('ninja-error');

        const offsetX = cx * 8;
        const offsetY = cy * 5;

        if (input) {
            input.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
        }
        if (btn) {
            btn.style.transform = `translate(calc(-50% + ${offsetX * 1.2}px), calc(-50% + ${offsetY * 1.2}px))`;
        }
        if (err) {
            err.style.transform = `translateX(calc(-50% + ${offsetX * 1.5}px))`;
        }
    }

    // ══════════════════════════════════════════════
    //  NEW PLAYER — Name Input Popup
    // ══════════════════════════════════════════════
    showNamePopup(width, height) {
        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.id = 'ninja-name-input';
        inputEl.placeholder = 'Tu nombre ninja…';
        inputEl.maxLength = 15;
        inputEl.style.cssText = `
            position: absolute;
            left: 50%; top: 47%;
            transform: translate(-50%, -50%);
            width: 280px; padding: 14px 20px;
            font-family: 'Outfit', sans-serif;
            font-size: 24px; font-weight: 800;
            text-align: center; color: #1a1a2e;
            background: rgba(255,255,255,0.95);
            border: 3px solid #2ecc71;
            border-radius: 12px; outline: none;
            z-index: 999;
            box-shadow: 0 0 20px rgba(46,204,113,0.5), 0 0 60px rgba(57,255,20,0.15);
            letter-spacing: 1px;
            transition: transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease;
        `;

        const btnEl = document.createElement('button');
        btnEl.id = 'ninja-confirm-btn';
        btnEl.textContent = '¡PARTICIPAR! ✂️';
        btnEl.style.cssText = `
            position: absolute;
            left: 50%; top: 58%;
            transform: translate(-50%, -50%);
            padding: 16px 48px;
            font-family: 'Outfit', sans-serif;
            font-size: 28px; font-weight: 900;
            color: #fff;
            background: linear-gradient(135deg, #2ecc71, #27ae60);
            border: none; border-radius: 16px;
            cursor: pointer; z-index: 999;
            box-shadow: 0 6px 20px rgba(46,204,113,0.4), 0 0 40px rgba(57,255,20,0.1);
            transition: all 0.25s ease;
            letter-spacing: 2px;
        `;

        const errorEl = document.createElement('div');
        errorEl.id = 'ninja-error';
        errorEl.style.cssText = `
            position: absolute;
            left: 50%; top: 65%;
            transform: translateX(-50%);
            font-family: 'Outfit', sans-serif;
            font-size: 18px; font-weight: 700;
            color: #e74c3c; z-index: 999;
            opacity: 0; transition: opacity 0.3s;
            text-shadow: 0 0 10px rgba(231,76,60,0.5);
        `;

        const canvas = document.querySelector('canvas');
        const parent = canvas.parentElement;
        parent.style.position = 'relative';
        parent.appendChild(inputEl);
        parent.appendChild(btnEl);
        parent.appendChild(errorEl);

        setTimeout(() => inputEl.focus(), 300);

        // Glow pulse on input focus
        inputEl.addEventListener('focus', () => {
            inputEl.style.boxShadow = '0 0 25px rgba(46,204,113,0.7), 0 0 80px rgba(57,255,20,0.25)';
        });
        inputEl.addEventListener('blur', () => {
            inputEl.style.boxShadow = '0 0 20px rgba(46,204,113,0.5), 0 0 60px rgba(57,255,20,0.15)';
        });

        btnEl.addEventListener('mouseenter', () => {
            btnEl.style.boxShadow = '0 8px 30px rgba(46,204,113,0.6), 0 0 60px rgba(57,255,20,0.3)';
            btnEl.style.background = 'linear-gradient(135deg, #39ff14, #2ecc71)';
        });
        btnEl.addEventListener('mouseleave', () => {
            btnEl.style.boxShadow = '0 6px 20px rgba(46,204,113,0.4), 0 0 40px rgba(57,255,20,0.1)';
            btnEl.style.background = 'linear-gradient(135deg, #2ecc71, #27ae60)';
        });

        const submitName = () => {
            const name = inputEl.value.trim().substring(0, 15);
            if (!name) {
                inputEl.style.borderColor = '#e74c3c';
                inputEl.style.boxShadow = '0 0 25px rgba(231,76,60,0.6)';
                errorEl.textContent = '¡Necesitamos tu nombre para participar!';
                errorEl.style.opacity = '1';
                inputEl.focus();
                return;
            }

            localStorage.setItem('vaxninja_player', name);
            try {
                fetch(`${API_BASE}/api/participant`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                }).catch(() => {});
            } catch (e) {}

            this.cleanupHTML();
            this.scene.restart();
        };

        btnEl.addEventListener('click', submitName);
        inputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') submitName();
            inputEl.style.borderColor = '#2ecc71';
            inputEl.style.boxShadow = '0 0 25px rgba(46,204,113,0.7)';
            errorEl.style.opacity = '0';
        });
    }

    // ══════════════════════════════════════════════
    //  RETURNING PLAYER — Welcome Back
    // ══════════════════════════════════════════════
    showWelcomeBack(name, width, height) {
        const overlay = this.add.graphics();
        overlay.fillStyle(0x1a1a2e, 0.55);
        overlay.fillRect(0, 0, width, height);
        overlay.setDepth(5);

        this.add.text(width / 2, height * 0.32, '✅ ¡Bienvenido de vuelta!', {
            fontFamily: 'Outfit', fontSize: '48px', fontStyle: '800', color: '#2ecc71',
            stroke: '#000', strokeThickness: 6,
        }).setOrigin(0.5).setDepth(6);

        const nameText = this.add.text(width / 2, height * 0.44, name, {
            fontFamily: 'Outfit', fontSize: '80px', fontStyle: '900', color: '#f1c40f',
            stroke: '#000', strokeThickness: 8,
        }).setOrigin(0.5).setDepth(6);

        // Name glow pulse
        this.tweens.add({
            targets: nameText,
            scaleX: { from: 1, to: 1.03 },
            scaleY: { from: 1, to: 1.03 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
        });

        // Play button
        const btnY = height * 0.62;
        const btnW = 500, btnH = 120;

        const btnBg = this.add.graphics().setDepth(6);
        btnBg.fillStyle(0x2ecc71, 1);
        btnBg.fillRoundedRect(width / 2 - btnW / 2, btnY - btnH / 2, btnW, btnH, 30);

        // Animated glow ring
        const glowRing = this.add.graphics().setDepth(5);
        glowRing.fillStyle(0x39ff14, 0.12);
        glowRing.fillRoundedRect(width / 2 - btnW / 2 - 15, btnY - btnH / 2 - 15, btnW + 30, btnH + 30, 38);
        this.tweens.add({
            targets: glowRing,
            alpha: { from: 0.12, to: 0.3 },
            scaleX: { from: 1, to: 1.04 },
            scaleY: { from: 1, to: 1.04 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
        });

        this.add.text(width / 2, btnY, '¡A CORTAR! ✂️', {
            fontFamily: 'Outfit', fontSize: '56px', fontStyle: '900', color: '#fff',
        }).setOrigin(0.5).setDepth(7);

        const btnZone = this.add.zone(width / 2, btnY, btnW, btnH)
            .setInteractive({ useHandCursor: true }).setDepth(7);

        btnZone.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(300, () => this.scene.start('GameScene'));
        });

        // Change name
        const changeBtn = this.add.text(width / 2, height * 0.76, '🔄 Cambiar nombre', {
            fontFamily: 'Outfit', fontSize: '26px', color: '#95a5a6',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(6);

        changeBtn.on('pointerover', () => changeBtn.setColor('#ecf0f1'));
        changeBtn.on('pointerout', () => changeBtn.setColor('#95a5a6'));
        changeBtn.on('pointerdown', () => {
            localStorage.removeItem('vaxninja_player');
            this.scene.restart();
        });
    }

    // ══════════════════════════════════════════════
    //  UPDATE — Continuous sparkle management
    // ══════════════════════════════════════════════
    update() {
        // Sparkles are self-managed via tweens
    }

    cleanupHTML() {
        ['ninja-name-input', 'ninja-confirm-btn', 'ninja-error'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.remove();
        });
    }
}
