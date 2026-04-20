/* ============================================================
   GameScene — 1920x1080 Landscape
   Disabled characters/fur temporarily as requested.
   Focus on pest behavior and slicing interaction.
   ============================================================ */

class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // ── Pre-generate textures for effects ──
        if (!this.textures.exists('warp_streak')) {
            const flare = this.make.graphics({ x: 0, y: 0, add: false });
            flare.fillStyle(0xffffff, 1);
            flare.fillRect(0, 0, 40, 2); // Thin line for "streak"
            flare.generateTexture('warp_streak', 40, 2);
        }

        // Ensure physics engine is running
        this.gameOver = false;
        this.inBossPhase = false;

        const { width, height } = this.cameras.main;

        // ── Background (Added game background) ──
        this.add.image(width / 2, height / 2, 'game_bg').setDisplaySize(width, height).setDepth(-20);
        this.add.rectangle(0, 0, width, height, 0x1a1a1a, 0.4).setOrigin(0).setDepth(-19); // Subtle overlay for contrast

        // ── Physics group for pests ──
        this.pests = this.physics.add.group();

        // ── Managers ──
        this.scoreManager = new ScoreManager(this);
        this.spawnManager = new SpawnManager(this, this.scoreManager);

        // ── Timer (50 seconds) ──
        this.timeRemaining = 35;
        this.gameOver = false;

        // ── Slash trail (Thicker for HD) ──
        this.slashGraphics = this.add.graphics().setDepth(100);
        this.slashPoints = [];
        this.isSlashing = false;

        // ── Sword cursor sprite (follows pointer while pressing) ──
        this.swordCursor = this.add.image(-200, -200, 'espada')
            .setDisplaySize(150, 76)
            .setDepth(500)
            .setAlpha(0)
            .setOrigin(0.15, 0.5); // Hot-spot near the tip

        // Hide canvas CSS cursor while slashing
        this._canvas = this.sys.game.canvas;
        this._prevX = 0;
        this._prevY = 0;

        // ── UI ──
        this.createUI();

        // ── Input ──
        this.input.on('pointerdown', (pointer) => {
            if (this.gameOver) return;
            this.isSlashing = true;
            this._prevX = pointer.x;
            this._prevY = pointer.y;
            this.slashPoints = [{ x: pointer.x, y: pointer.y, time: Date.now() }];
            this.checkSlashCollision(pointer.x, pointer.y);

            // Show sword cursor
            this.swordCursor.setPosition(pointer.x, pointer.y).setAlpha(0.92);
            this._canvas.style.cursor = 'none';
        });

        this.input.on('pointermove', (pointer) => {
            if (this.gameOver || !this.isSlashing || !pointer.isDown) return;
            this.slashPoints.push({ x: pointer.x, y: pointer.y, time: Date.now() });
            if (this.slashPoints.length > 15) this.slashPoints.shift();
            this.checkSlashCollision(pointer.x, pointer.y);

            // Move & rotate sword toward movement direction
            const dx = pointer.x - this._prevX;
            const dy = pointer.y - this._prevY;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                this.swordCursor.setRotation(Math.atan2(dy, dx));
            }
            this.swordCursor.setPosition(pointer.x, pointer.y);
            this._prevX = pointer.x;
            this._prevY = pointer.y;
        });

        this.input.on('pointerup', () => {
            this.isSlashing = false;
            this.slashPoints = [];

            // Hide sword cursor and restore default
            this.swordCursor.setAlpha(0);
            this._canvas.style.cursor = 'default';
        });

        // ── Events ──
        this.events.on('score-changed', (score) => {
            this.scoreText.setText(`${score}`);
            this.tweens.add({ targets: this.scoreText, scaleX: 1.3, scaleY: 1.3, duration: 100, yoyo: true });
        });
        this.events.on('health-changed', (health) => this.updateHealthBar(health));
        this.events.on('health-depleted', () => {
            console.log('[GameScene] Ending game due to health depletion');
            this.endGame('EL PELAJE SE INFECTÓ');
        });
        // combo events still show visual effect but no longer unlock weapons
        this.events.on('combo-activated', (combo) => this.showComboEffect(combo));
        this.events.on('combo-broken', () => this.hideComboEffect());

        // ── Start ──
        this.spawnManager.start();

        // ── Weapon unlock tracker: 1 arma per every 5 pests sliced ──
        this.weaponSliceTracker = 0;
        this.events.on('slice-for-weapon', () => {
            this.weaponSliceTracker++;
            // Every 5 slices = unlock one weapon
            const weaponsEarned = Math.floor(this.weaponSliceTracker / 5);
            while (this.activeWeaponsCount < weaponsEarned && this.activeWeaponsCount < 6) {
                this.activateNextWeapon();
            }
            this.updateWeaponCounter();
        });

        this.timerEvent = this.time.addEvent({
            delay: 1000, loop: true,
            callbackScope: this,
            callback: () => {
                if (this.gameOver || this.inBossPhase) return;

                this.timeRemaining--;
                this.updateTimerDisplay();

                if (this.timeRemaining <= 0) {
                    console.log('[GameScene] Timer ended. Active weapons:', this.activeWeaponsCount);
                    // Force stop the timer to prevent negative count
                    if (this.timerEvent) this.timerEvent.destroy();

                    if (this.activeWeaponsCount >= 6) {
                        console.log('[GameScene] All 6 weapons active -> BOSS PHASE');
                        this.startBossPhase();
                    } else {
                        console.log('[GameScene] Timeout without 6 weapons -> GAME OVER');
                        this.endGame('¡TIEMPO AGOTADO!');
                    }
                }
            },
        });

        this.cameras.main.fadeIn(300, 0, 0, 0);
        this.createBossAnimations();
    }

    createBossAnimations() {
        const stages = ['full', '95', '70', '30', '10', '0'];
        const prefixMap = {
            'full': 'jefe-final-idle',
            '95': 'jefe-final-95-vida-idle',
            '70': 'jefe-final-70vida-idle',
            '30': 'jefe-final-30vida-idle',
            '10': 'jefe-final-10vida-idle',
            '0': 'jefe-final-0vida-idle'
        };

        stages.forEach(s => {
            const prefix = prefixMap[s];
            const frames = [];
            
            // Try to load 3 frames, but fallback to frame 1 if others missing
            for (let i = 1; i <= 3; i++) {
                const key = `${prefix}${i}`;
                if (this.textures.exists(key)) {
                    frames.push({ key });
                } else if (frames.length > 0) {
                    frames.push(frames[0]); // Duplicate frame 1 if 2 or 3 are missing
                }
            }

            if (frames.length > 0) {
                this.anims.create({
                    key: `boss_idle_${s}`,
                    frames: frames,
                    frameRate: 6,
                    repeat: -1
                });
            }
        });
    }

    createUI() {
        const { width, height } = this.cameras.main;

        const topBar = this.add.graphics();
        topBar.fillStyle(0x000000, 0.8);
        topBar.fillRect(0, 0, width, 100);
        topBar.setDepth(200);

        // Timer
        const timerBg = this.add.graphics();
        timerBg.fillStyle(0x2c3e50, 1);
        timerBg.fillRoundedRect(width / 2 - 80, 15, 160, 70, 15);
        timerBg.setDepth(201);

        this.timerText = this.add.text(width / 2, 50, '0:50', {
            fontFamily: 'Outfit', fontSize: '48px', fontStyle: '800', color: '#ffffff',
        }).setOrigin(0.5).setDepth(202);

        // Score
        this.add.text(50, 20, '✂️ SCORE', {
            fontFamily: 'Outfit', fontSize: '20px', fontStyle: '600', color: '#bdc3c7',
        }).setDepth(202);
        this.scoreText = this.add.text(50, 55, '0', {
            fontFamily: 'Outfit', fontSize: '56px', fontStyle: '900',
            color: '#2ecc71', stroke: '#000', strokeThickness: 4,
        }).setDepth(202);

        // Health (Fur Health)
        this.add.text(width - 50, 20, 'PELAJE 🐾', {
            fontFamily: 'Outfit', fontSize: '20px', fontStyle: '600', color: '#bdc3c7',
        }).setOrigin(1, 0).setDepth(202);

        const hbBg = this.add.graphics();
        hbBg.fillStyle(0x333333, 1);
        hbBg.fillRoundedRect(width - 450, 55, 400, 25, 8);
        hbBg.setDepth(201);

        this.healthBar = this.add.graphics().setDepth(202);
        this.updateHealthBar(100);

        // Combo
        this.comboText = this.add.text(width / 2, 180, '', {
            fontFamily: 'Outfit', fontSize: '48px', fontStyle: '900',
            color: '#FFD700', stroke: '#000', strokeThickness: 8,
        }).setOrigin(0.5).setDepth(203).setAlpha(0);

        // Secret Weapons
        this.activeWeaponsCount = 0;
        this.weaponSprites = [];

        // Weapon config (Refined for compact layout)
        const spacingY = 180;
        const startY = height / 2 - spacingY; 
        const leftX = 120;
        const rightX = width - 120;

        for (let i = 0; i < 6; i++) {
            const isLeft = i < 3;
            const x = isLeft ? leftX : rightX;
            const y = startY + ((i % 3) * spacingY);

            const weapon = this.add.image(x, y, `arma-${i + 1}`).setDepth(151);
            weapon.setDisplaySize(110, 110); // Initial inactive size
            weapon.setAlpha(0.3);
            weapon.setTint(0x555555);
            
            // Save metadata
            weapon.setData('ox', x);
            weapon.setData('oy', y);
            weapon.setData('isDragging', false);

            this.weaponSprites.push(weapon);
        }

        // Weapon progress counter (centro, debajo del timer)
        this.weaponCounterText = this.add.text(width / 2, 90, '⚔️ 0/6', {
            fontFamily: 'Outfit', fontSize: '22px', fontStyle: '700',
            color: '#f1c40f', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5, 0).setDepth(202);
    }

    activateNextWeapon() {
        if (this.activeWeaponsCount < 6) {
            const idx = this.activeWeaponsCount;
            const weapon = this.weaponSprites[idx];

            weapon.setAlpha(1);
            weapon.clearTint();
            weapon.setDisplaySize(370, 370); // Target active size requested by user
            const targetScale = weapon.scaleX; // Capture the actual scale corresponding to 370px

            this.tweens.add({
                targets: weapon,
                scaleX: { from: targetScale * 0.5, to: targetScale },
                scaleY: { from: targetScale * 0.5, to: targetScale },
                duration: 400,
                ease: Phaser.Math.Easing.Back.EaseOut
            });

            this.activeWeaponsCount++;
            console.log('[GameScene] Weapon activated! Total:', this.activeWeaponsCount);
        }
    }

    updateWeaponCounter() {
        if (!this.weaponCounterText) return;
        const slicesNeeded = 6 * 5; // 30 total slices for all 6 weapons
        const progress = Math.min(this.weaponSliceTracker, slicesNeeded);
        this.weaponCounterText.setText(`⚔️ ${this.activeWeaponsCount}/6`);
    }

    updateHealthBar(health) {
        const { width } = this.cameras.main;
        this.healthBar.clear();
        let color = 0x2ecc71;
        if (health <= 50) color = 0xf39c12;
        if (health <= 25) color = 0xe74c3c;
        this.healthBar.fillStyle(color, 1);
        this.healthBar.fillRoundedRect(width - 446, 58, (health / 100) * 392, 19, 6);
    }

    updateBossHealthBar(health) {
        if (!this.bossHealthBar) return;
        this.bossHealthBar.clear();
        
        const barWidth = 800;
        const barHeight = 40;
        const x = this.cameras.main.width / 2 - barWidth / 2 + 4;
        const y = 154;
        
        let color = 0xe74c3c; // Red
        if (health > 70) color = 0x2ecc71; // Green
        else if (health > 30) color = 0xf39c12; // Orange
        
        this.bossHealthBar.fillStyle(color, 1);
        this.bossHealthBar.fillRoundedRect(x, y, (health / 100) * (barWidth - 8), barHeight - 8, 8);
    }

    checkSlashCollision(x, y) {
        const children = this.pests.getChildren();
        for (let i = children.length - 1; i >= 0; i--) {
            const sprite = children[i];
            if (!sprite || !sprite.active) continue;
            const entity = sprite.getData('entity');
            if (!entity || entity.isSliced || entity.hasLanded) continue;

            const dist = Phaser.Math.Distance.Between(x, y, sprite.x, sprite.y);
            // Hit radius larger for 1080p (effective for mouse/touch)
            if (dist < 120) {
                entity.slice();
            }
        }
    }

    updateTimerDisplay() {
        const m = Math.floor(this.timeRemaining / 60);
        const s = this.timeRemaining % 60;
        this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
        if (this.timeRemaining <= 10) {
            this.timerText.setColor('#e74c3c');
        }
    }

    showComboEffect(combo) {
        this.comboText.setText(`🔥 COMBO x2! (${combo})`);
        this.comboText.setAlpha(1);
        this.tweens.add({ targets: this.comboText, scaleX: 1.1, scaleY: 1.1, duration: 500, yoyo: true, repeat: -1 });
    }

    hideComboEffect() {
        this.tweens.killTweensOf(this.comboText);
        this.comboText.setAlpha(0);
    }

    update() {
        if (this.inBossPhase) return; // Disable slicing and normal updates

        this.slashGraphics.clear();

        if (this.isSlashing && this.slashPoints.length > 1) {
            const now = Date.now();
            this.slashPoints = this.slashPoints.filter(p => now - p.time < 150);

            if (this.slashPoints.length > 1) {
                for (let i = 1; i < this.slashPoints.length; i++) {
                    const alpha = i / this.slashPoints.length;
                    const thick = 5 + alpha * 10; // Thicker slash for HD

                    this.slashGraphics.lineStyle(thick, 0xffffff, alpha * 0.8);
                    this.slashGraphics.lineBetween(
                        this.slashPoints[i - 1].x, this.slashPoints[i - 1].y,
                        this.slashPoints[i].x, this.slashPoints[i].y
                    );
                    this.slashGraphics.lineStyle(thick + 6, 0x2ecc71, alpha * 0.3);
                    this.slashGraphics.lineBetween(
                        this.slashPoints[i - 1].x, this.slashPoints[i - 1].y,
                        this.slashPoints[i].x, this.slashPoints[i].y
                    );
                }
            }
        }

        const { width, height } = this.cameras.main;
        this.pests.getChildren().forEach((child) => {
            if (child && child.active && (child.y > height + 100 || child.x < -200 || child.x > width + 200)) {
                child.destroy();
            }
        });
    }

    endGame(reason = '¡TIEMPO!') {
        if (this.gameOver) return;
        this.gameOver = true;
        this.spawnManager.stop();
        if (this.timerEvent) this.timerEvent.remove(false);
        this.physics.pause();

        // Restore cursor
        if (this.swordCursor) this.swordCursor.setAlpha(0);
        if (this._canvas) this._canvas.style.cursor = 'default';

        this.cameras.main.fadeOut(500, 0, 0, 0);

        const stats = this.scoreManager.getStats();
        stats.reason = reason;

        this.time.delayedCall(500, () => this.scene.start('GameOverScene', stats));
    }

    // ══════════════════════════════════════════════
    //  FINAL BOSS PHASE
    // ══════════════════════════════════════════════
    startBossPhase() {
        if (this.gameOver || this.inBossPhase) return;
        console.log('[GameScene] Starting Final Boss Phase!');

        this.inBossPhase = true;
        this.spawnManager.stop(); // Stop pests
        if (this.timerEvent) this.timerEvent.remove(false); // Stop timer

        // Clear all remaining pests
        this.pests.clear(true, true);
        this.slashGraphics.clear();
        this.isSlashing = false;

        const { width, height } = this.cameras.main;

        // ── 1. TRANSITION (La Locura - WARP TUNNEL) ──

        // Vibration (Camera Shake)
        this.cameras.main.shake(2500, 0.02);

        // Intensive Stroboscopic Flashes (Reduced to 20% intensity)
        const strobe = this.add.rectangle(0, 0, width, height, 0xffffff, 1).setOrigin(0).setDepth(1000);
        this.time.addEvent({
            delay: 50,
            repeat: 8, // ~20% of previous 40
            callback: () => {
                strobe.alpha = strobe.alpha === 1 ? 0 : 1;
                if (strobe.alpha === 1) strobe.setFillStyle(Math.random() > 0.5 ? 0xffffff : 0x000000);
            },
            onComplete: () => strobe.destroy()
        });

        // High-Speed Warp Tunnel Particles (100% Speed increase)
        const warpGroup = this.add.group();

        const particles = this.add.particles(width / 2, height / 2, 'warp_streak', {
            angle: { min: 0, max: 360 },
            speed: { min: 2000, max: 5500 },
            lifespan: 800,
            scale: { start: 0.5, end: 3 },
            alpha: { start: 1, end: 0 },
            quantity: 12,
            blendMode: 'ADD',
            emitCallback: (p) => {
                const ang = Phaser.Math.Angle.Between(width / 2, height / 2, p.x, p.y);
                p.angle = Phaser.Math.RadToDeg(ang);
            }
        }).setDepth(50);

        this.time.delayedCall(3000, () => particles.stop());

        // Alert Text
        const alertGroup = this.add.group();
        const alertBox = this.add.rectangle(width / 2, height / 2, width, 300, 0x000000, 0.8).setDepth(301);
        const alertTitle = this.add.text(width / 2, height / 2 - 40, '¡JEFE FINAL!', {
            fontFamily: 'Outfit', fontSize: '100px', fontStyle: '900', color: '#e74c3c', stroke: '#fff', strokeThickness: 4
        }).setOrigin(0.5).setDepth(302);

        const alertSub = this.add.text(width / 2, height / 2 + 50, 'Alista tus antiparasitarios.\nDeja presionado los armamentos y arrójalos al centro.', {
            fontFamily: 'Outfit', fontSize: '36px', fontStyle: '700', color: '#f1c40f', align: 'center', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(302);

        alertGroup.addMultiple([alertBox, alertTitle, alertSub]);

        this.tweens.add({
            targets: alertGroup.getChildren(),
            scale: { from: 0.8, to: 1 },
            duration: 500,
            ease: 'Back.easeOut'
        });

        // ── 2. SPAWN BOSS ──
        this.time.delayedCall(3500, () => {
            alertGroup.destroy(true); // Remove alert

            // Spawn Boss Background (with Fade)
            this.bossBg = this.add.image(width / 2, height / 2, 'bg-boss').setDisplaySize(width * 1.1, height * 1.1).setDepth(-18);
            this.bossBg.setAlpha(0);
            this.tweens.add({ targets: this.bossBg, alpha: 1, duration: 1000 });

            // Create Boss Container for Parallax
            this.bossHits = 0;
            this.bossContainer = this.add.container(width / 2, height / 2).setDepth(40);

            // Spawn Boss Sprite inside container
            this.bossSprite = this.add.sprite(0, 0, 'jefe-final-idle1');
            this.bossSprite.setScale(0.1); 
            this.bossContainer.add(this.bossSprite);

            // ── 3. BOSS HEALTH BAR ──
            const barWidth = 800;
            const barHeight = 40;
            const barX = width / 2 - barWidth / 2;
            const barY = 150;

            const bHbBg = this.add.graphics().setDepth(300);
            bHbBg.fillStyle(0x333333, 0.8);
            bHbBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);
            bHbBg.lineStyle(4, 0xbdc3c7, 1);
            bHbBg.strokeRoundedRect(barX, barY, barWidth, barHeight, 10);

            this.bossHealthBar = this.add.graphics().setDepth(301);
            this.updateBossHealthBar(100);

            this.bossHealthLabel = this.add.text(width / 2, barY - 25, 'EL JEFE FINAL - SALUD: 100%', {
                fontFamily: 'Outfit', fontSize: '24px', fontStyle: '900', color: '#e74c3c'
            }).setOrigin(0.5).setDepth(302);

            // Dramatic Entrance
            this.tweens.add({
                targets: this.bossSprite,
                scale: 1,
                duration: 1000,
                ease: 'Elastic.easeOut',
                onComplete: () => {
                   this.bossSprite.play('boss_idle_full');
                   this.setupBossInteraction();
                }
            });

            // Boss idle float (inside parallax container)
            this.tweens.add({
                targets: this.bossSprite,
                y: 20,
                duration: 2000,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });

            // Boss Parallax Pointer Tracking
            this.input.on('pointermove', (pointer) => {
                if (!this.inBossPhase || !this.bossBg || !this.bossContainer) return;
                const cx = (pointer.x / width - 0.5) * 2;
                const cy = (pointer.y / height - 0.5) * 2;

                // Move BG opposite to cursor, boss with cursor
                this.bossBg.x = width / 2 - cx * 20;
                this.bossBg.y = height / 2 - cy * 15;
                this.bossContainer.x = width / 2 + cx * 10;
                this.bossContainer.y = height / 2 + cy * 8;
            });

            this.spotlightTimer = null;
        });
    }

    setupBossInteraction() {
        const { width, height } = this.cameras.main;
        
        // 1. Limpiar cualquier animación de "activación" previa
        this.weaponSprites.forEach(s => this.tweens.killTweensOf(s));

        // 2. Spotlight Timer (Pulsado cada 2 segundos)
        this.spotlightTimer = this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                // Solo animar si no estamos arrastrando nada
                const activeSprites = this.weaponSprites.filter(s => s.active && !s.getData('isDragging'));
                if (activeSprites.length === 0) return;
                
                const chosen = Phaser.Utils.Array.GetRandom(activeSprites);
                
                activeSprites.forEach(sprite => {
                    this.tweens.killTweensOf(sprite); // Evitar acumulación de tweens
                    
                    const isChosen = (sprite === chosen);
                    const targetScale = isChosen ? 1.4 : 0.7; 
                    
                    // Asegurar que la elegida esté por delante
                    sprite.setDepth(isChosen ? 155 : 151);
                    
                    this.tweens.add({
                        targets: sprite,
                        scale: targetScale,
                        duration: 500,
                        ease: 'Back.easeOut',
                        yoyo: true,
                        hold: 1000
                    });
                });
            }
        });

        // 3. Create an invisible drop zone over the boss container
        this.bossZone = this.add.zone(width / 2, height / 2, 400, 400).setRectangleDropZone(400, 400);

        // 4. Setup Draggable Weapons
        this.weaponSprites.forEach((sprite, index) => {
            // Constant sparkles
            const sparkleEm = this.add.particles(sprite.x, sprite.y, 'warp_streak', {
                speed: { min: 10, max: 40 }, scale: { start: 0.4, end: 0 },
                alpha: { start: 1, end: 0 }, lifespan: 600, blendMode: 'ADD'
            }).setDepth(150);
            sprite.setData('sparkle', sparkleEm);

            // Tutorial indicator
            const indicator = this.add.circle(sprite.x, sprite.y, 8, 0xffffff, 0.8).setDepth(200);
            const tw = this.tweens.add({
                targets: indicator, x: width / 2, y: height / 2,
                alpha: { start: 1, to: 0 }, duration: 1500,
                repeat: -1, delay: index * 200
            });
            sprite.setData('tut_tw', tw);
            sprite.setData('tut_ind', indicator);

            sprite.setInteractive({ draggable: true });

            sprite.on('dragstart', (pointer) => {
                sprite.setData('isDragging', true);
                this.tweens.killTweensOf(sprite); 
                
                sprite.setScale(1.5); // Tamaño fijo de agarre
                sprite.setDepth(500);
                
                // Limpiar tutorial
                const tutTw = sprite.getData('tut_tw');
                if (tutTw) { tutTw.stop(); sprite.getData('tut_ind').destroy(); }

                // Start drag trajectory tail
                const tail = this.add.particles(0, 0, 'warp_streak', {
                    speed: 0, scale: { start: 0.8, end: 0 }, alpha: { start: 0.8, end: 0 },
                    lifespan: 250, blendMode: 'ADD'
                }).setDepth(499);
                tail.startFollow(sprite);
                sprite.setData('tail', tail);
            });

            sprite.on('drag', (pointer, dragX, dragY) => {
                sprite.x = dragX;
                sprite.y = dragY;
            });

            sprite.on('drop', (pointer, target) => {
                this.hitBoss(sprite);
            });

            sprite.on('dragend', (pointer, dragX, dragY, dropped) => {
                sprite.setData('isDragging', false);
                const tail = sprite.getData('tail');
                if (tail) { tail.stop(); this.time.delayedCall(300, () => tail.destroy()); }

                if (!dropped) {
                    this.tweens.add({
                        targets: sprite,
                        x: sprite.getData('ox'),
                        y: sprite.getData('oy'),
                        scale: 0.7,
                        duration: 300,
                        ease: 'Power2'
                    });
                }
            });
        });
    }

hitBoss(weaponSprite) {
    // Stop spotlight if it was the last weapon
    if (this.weaponSprites.filter(s => s.active).length <= 1) {
        if (this.spotlightTimer) this.spotlightTimer.destroy();
    }

    // Destroy weapon components
    const tail = weaponSprite.getData('tail');
    if (tail) tail.destroy();
    const sparkle = weaponSprite.getData('sparkle');
    if (sparkle) sparkle.destroy();

    weaponSprite.destroy();
    this.bossHits++;

    // Flash boss
    this.bossSprite.setTint(0xff0000);
    this.time.delayedCall(100, () => this.bossSprite.clearTint());

    // Stroboscopic Hit Flash (Brief)
    const hf = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xffffff, 0.4).setOrigin(0).setDepth(1000);
    this.tweens.add({ targets: hf, alpha: 0, duration: 150, onComplete: () => hf.destroy() });

    // Impact effect (Shake, Explosion, Splash)
    this.cameras.main.shake(200, 0.02);

    // Position of Boss on screen
    const bx = this.bossContainer.x + this.bossSprite.x;
    const by = this.bossContainer.y + this.bossSprite.y;

    // Splash Particles (Small sparkles)
    this.add.particles(bx, by, 'warp_streak', {
        speed: { min: 200, max: 800 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.2, end: 0 },
        lifespan: 600,
        quantity: 30,
        emitting: false
    }).explode();

    // Damage logic based on health percentages
    const damageStages = [
        { threshold: 100, anim: 'boss_idle_full', healthPct: 100 },
        { threshold: 95, anim: 'boss_idle_95', healthPct: 95 },
        { threshold: 70, anim: 'boss_idle_70', healthPct: 70 },
        { threshold: 30, anim: 'boss_idle_30', healthPct: 30 },
        { threshold: 10, anim: 'boss_idle_10', healthPct: 10 },
        { threshold: 0, anim: null, healthPct: 0 }
    ];

    const currentState = damageStages[this.bossHits];
    if (currentState && currentState.anim) {
        this.bossSprite.play(currentState.anim, true);
    } else if (this.bossHits === 5) {
        this.bossSprite.play('boss_idle_0', true);
    }

    this.updateBossHealthBar(currentState ? currentState.healthPct : 0);
    if (this.bossHealthLabel && currentState) {
        this.bossHealthLabel.setText(`EL JEFE FINAL - SALUD: ${currentState.healthPct}%`);
    }

    // Check Victory
    if (this.bossHits >= 6) {
        this.winGame();
    }
}

winGame() {
    if (this.gameOver) return;
    this.gameOver = true;

    // Big explosion
    this.cameras.main.shake(800, 0.03);
    const flashScreen = this.add.rectangle(0, 0, this.cameras.main.width, this.cameras.main.height, 0xffffff, 1).setOrigin(0).setDepth(1000);
    this.tweens.add({ targets: flashScreen, alpha: { from: 1, to: 0 }, duration: 1500 });

    this.bossSprite.setTint(0xff0000);
    this.tweens.add({
        targets: this.bossSprite,
        scale: 2, alpha: 0, angle: 180, duration: 1200, ease: 'Power2'
    });

    // Add huge bonus points logic with visual roll-up
    const currentScore = this.scoreManager.getStats().score;
    this.scoreManager.addPoints(5000);

    // Floating Bonus Text
    const bonusText = this.add.text(this.cameras.main.width / 2, this.cameras.main.height / 2, '+5000 BONUS!', {
        fontFamily: 'Outfit', fontSize: '80px', fontStyle: '900', color: '#f1c40f', stroke: '#000', strokeThickness: 8
    }).setOrigin(0.5).setDepth(600);

    this.tweens.add({
        targets: bonusText, y: this.cameras.main.height / 2 - 200,
        scale: 1.5, alpha: 0, duration: 1500, ease: 'Power2'
    });

    // Rolling Score text effect
    this.tweens.addCounter({
        from: currentScore, to: currentScore + 5000, duration: 1500,
        onUpdate: (tween) => { this.scoreText.setText(Math.floor(tween.getValue()).toString()); }
    });

    // Change text in GameOverScene
        this.time.delayedCall(2500, () => {
            this.cameras.main.fadeOut(500, 0, 0, 0);
            const stats = this.scoreManager.getStats();
            stats.reason = '¡JEFE DERROTADO!';
            stats.win = true; // Special victory flag
            this.time.delayedCall(500, () => this.scene.start('GameOverScene', stats));
        });
    }
}
