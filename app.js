/* ═══════════════════════════════════════════════════════════
   THERMOSPARK — app.js
   WebSerial API + Real-time Gauges + Dashboard Logic
   Team IGNOVATORS | Hackathon 2026
   ═══════════════════════════════════════════════════════════ */

(() => {
    'use strict';

    // ── DOM REFERENCES ──
    const $ = (sel) => document.querySelector(sel);
    const connectBtn       = $('#connectBtn');
    const connectBtnText   = $('#connectBtnText');
    const statusDot        = $('#statusDot');
    const statusText       = $('#statusText');
    const connectStatus    = $('#connectStatus');
    const terminalBody     = $('#terminalBody');
    const clearTerminal    = $('#clearTerminal');
    const killSwitchCard   = $('#killSwitchCard');
    const killSwitchLabel  = $('#killSwitchLabel');
    const killSwitchSub    = $('#killSwitchSublabel');
    const indicatorCore    = $('#indicatorCore');
    const tempValueEl      = $('#tempValue');
    const gasValueEl       = $('#gasValue');
    const batteryFill      = $('#batteryFill');
    const batterySvg       = $('#batterySvg');
    const alertOverlay     = $('#alertOverlay');
    const alertDismiss     = $('#alertDismiss');
    const alertMessage     = $('#alertMessage');
    const systemClock      = $('#systemClock');
    const tempCanvas       = $('#tempGaugeCanvas');
    const gasCanvas        = $('#gasGaugeCanvas');
    const particleCanvas   = $('#particleCanvas');

    // ── STATE ──
    let port = null;
    let reader = null;
    let isConnected = false;
    let latestGas = 0;
    let latestTemp = 0;
    let animatedGas = 0;
    let animatedTemp = 0;
    let killState = 'safe'; // 'safe' | 'warning' | 'killed'
    let alertShown = false;
    let dataBuffer = '';

    // ── THRESHOLDS ──
    const TEMP_WARN  = 60;
    const TEMP_CRIT  = 80;
    const GAS_WARN   = 400;
    const GAS_CRIT   = 700;
    const TEMP_MAX   = 120;
    const GAS_MAX    = 1023;

    // ══════════════════════════════════════
    //  SYSTEM CLOCK
    // ══════════════════════════════════════
    function updateClock() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        systemClock.textContent = `${h}:${m}:${s}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ══════════════════════════════════════
    //  TERMINAL LOGGING
    // ══════════════════════════════════════
    function termLog(msg, type = 'system-msg') {
        const line = document.createElement('div');
        line.className = `terminal-line ${type}`;
        const ts = new Date().toLocaleTimeString();
        line.textContent = `[${ts}] ${msg}`;
        terminalBody.appendChild(line);
        // Keep max 200 lines
        while (terminalBody.children.length > 200) {
            terminalBody.removeChild(terminalBody.firstChild);
        }
        terminalBody.scrollTop = terminalBody.scrollHeight;
    }

    clearTerminal.addEventListener('click', () => {
        terminalBody.innerHTML = '';
        termLog('Console cleared', 'system-msg');
    });

    // ══════════════════════════════════════
    //  SEMI-CIRCULAR GAUGE RENDERER
    // ══════════════════════════════════════
    class SemiGauge {
        constructor(canvas, opts) {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            this.min = opts.min || 0;
            this.max = opts.max || 100;
            this.warnAt = opts.warnAt || 60;
            this.critAt = opts.critAt || 80;
            this.label = opts.label || '';
            this.value = 0;
            this.drawStatic();
        }

        drawStatic() {
            // Called once to set up the canvas size via DPR
            const dpr = window.devicePixelRatio || 1;
            const rect = this.canvas.getBoundingClientRect();
            if (rect.width > 0) {
                this.canvas.width = rect.width * dpr;
                this.canvas.height = rect.height * dpr;
                this.ctx.scale(dpr, dpr);
            }
        }

        draw(value) {
            this.value = value;
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            const h = this.canvas.height / (window.devicePixelRatio || 1);
            ctx.clearRect(0, 0, w, h);

            const cx = w / 2;
            const cy = h - 20;
            const radius = Math.min(cx - 20, cy - 10);
            const startAngle = Math.PI;
            const endAngle = 2 * Math.PI;
            const lineWidth = 14;

            // Background arc
            ctx.beginPath();
            ctx.arc(cx, cy, radius, startAngle, endAngle);
            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();

            // Tick marks
            const numTicks = 12;
            for (let i = 0; i <= numTicks; i++) {
                const angle = Math.PI + (i / numTicks) * Math.PI;
                const innerR = radius - lineWidth / 2 - 6;
                const outerR = radius - lineWidth / 2 - 14;
                const x1 = cx + Math.cos(angle) * innerR;
                const y1 = cy + Math.sin(angle) * innerR;
                const x2 = cx + Math.cos(angle) * outerR;
                const y2 = cy + Math.sin(angle) * outerR;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Value arc with gradient
            const pct = Math.min(Math.max((value - this.min) / (this.max - this.min), 0), 1);
            const valueAngle = startAngle + pct * Math.PI;

            // Determine colour
            let color;
            if (value >= this.critAt) {
                color = '#ff3344';
            } else if (value >= this.warnAt) {
                color = '#ffaa00';
            } else {
                color = '#00ff88';
            }

            // Gradient arc
            const grad = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
            grad.addColorStop(0, '#00ff88');
            grad.addColorStop(0.5, '#ffaa00');
            grad.addColorStop(1, '#ff3344');

            if (pct > 0.005) {
                // Glow layer
                ctx.beginPath();
                ctx.arc(cx, cy, radius, startAngle, valueAngle);
                ctx.strokeStyle = color;
                ctx.lineWidth = lineWidth + 8;
                ctx.lineCap = 'round';
                ctx.globalAlpha = 0.15;
                ctx.stroke();
                ctx.globalAlpha = 1;

                // Main arc
                ctx.beginPath();
                ctx.arc(cx, cy, radius, startAngle, valueAngle);
                ctx.strokeStyle = grad;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = 'round';
                ctx.stroke();

                // Needle dot
                const dotX = cx + Math.cos(valueAngle) * radius;
                const dotY = cy + Math.sin(valueAngle) * radius;
                ctx.beginPath();
                ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.shadowColor = color;
                ctx.shadowBlur = 12;
                ctx.fill();
                ctx.shadowBlur = 0;
            }
        }
    }

    // Create gauges
    const tempGauge = new SemiGauge(tempCanvas, {
        min: 0, max: TEMP_MAX, warnAt: TEMP_WARN, critAt: TEMP_CRIT, label: 'TEMP'
    });
    const gasGauge = new SemiGauge(gasCanvas, {
        min: 0, max: GAS_MAX, warnAt: GAS_WARN, critAt: GAS_CRIT, label: 'GAS'
    });

    // Initial draw
    tempGauge.draw(0);
    gasGauge.draw(0);

    // ══════════════════════════════════════
    //  UI UPDATE LOGIC
    // ══════════════════════════════════════
    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function updateDashboard() {
        // Smooth animation
        animatedTemp = lerp(animatedTemp, latestTemp, 0.15);
        animatedGas = lerp(animatedGas, latestGas, 0.15);

        // Gauges
        tempGauge.draw(animatedTemp);
        gasGauge.draw(animatedGas);

        // Value displays
        tempValueEl.textContent = animatedTemp.toFixed(1);
        gasValueEl.textContent = Math.round(animatedGas);

        // Value colour classes
        applyValueClass(tempValueEl, animatedTemp, TEMP_WARN, TEMP_CRIT);
        applyValueClass(gasValueEl, animatedGas, GAS_WARN, GAS_CRIT);

        // Kill Switch logic
        const prevState = killState;
        if (latestTemp >= TEMP_CRIT || latestGas >= GAS_CRIT) {
            killState = 'killed';
        } else if (latestTemp >= TEMP_WARN || latestGas >= GAS_WARN) {
            killState = 'warning';
        } else {
            killState = 'safe';
        }

        updateKillSwitch(killState);

        // Show alert on first kill
        if (killState === 'killed' && prevState !== 'killed' && !alertShown) {
            showAlert();
        }
        if (killState === 'safe') {
            alertShown = false;
        }

        requestAnimationFrame(updateDashboard);
    }

    function applyValueClass(el, val, warn, crit) {
        el.classList.remove('warn', 'crit');
        if (val >= crit) el.classList.add('crit');
        else if (val >= warn) el.classList.add('warn');
    }

    function updateKillSwitch(state) {
        killSwitchCard.classList.remove('kill-active', 'kill-warning');

        if (state === 'killed') {
            killSwitchCard.classList.add('kill-active');
            killSwitchLabel.textContent = 'POWER KILLED';
            killSwitchSub.textContent = 'Monitored cell isolated via MOSFET';
            // Battery glow red
            batteryFill.setAttribute('fill', 'url(#batteryFillDanger)');
            batteryFill.setAttribute('filter', 'url(#glowRed)');
            batteryFill.setAttribute('opacity', '0.6');
        } else if (state === 'warning') {
            killSwitchCard.classList.add('kill-warning');
            killSwitchLabel.textContent = 'ELEVATED';
            killSwitchSub.textContent = 'Parameters approaching thresholds';
            batteryFill.setAttribute('fill', 'url(#batteryFillSafe)');
            batteryFill.setAttribute('filter', 'url(#glowGreen)');
            batteryFill.setAttribute('opacity', '0.4');
        } else {
            killSwitchLabel.textContent = 'SYSTEM SAFE';
            killSwitchSub.textContent = 'Monitored cell parameters nominal';
            batteryFill.setAttribute('fill', 'url(#batteryFillSafe)');
            batteryFill.setAttribute('filter', 'url(#glowGreen)');
            batteryFill.setAttribute('opacity', '0.3');
        }
    }

    // ══════════════════════════════════════
    //  ALERT MODAL
    // ══════════════════════════════════════
    function showAlert() {
        alertShown = true;
        alertMessage.textContent = 
            `Temperature: ${latestTemp.toFixed(1)}°C | Gas: ${latestGas} PPM — ` +
            `Critical thresholds exceeded. Kill switch activated — monitored cell/load isolated.`;
        alertOverlay.classList.add('visible');
    }

    alertDismiss.addEventListener('click', () => {
        alertOverlay.classList.remove('visible');
    });

    // ══════════════════════════════════════
    //  WEBSERIAL CONNECTION
    // ══════════════════════════════════════
    connectBtn.addEventListener('click', async () => {
        if (isConnected) {
            await disconnect();
        } else {
            await connect();
        }
    });

    async function connect() {
        if (!('serial' in navigator)) {
            termLog('WebSerial API not supported in this browser. Use Chrome or Edge.', 'error-msg');
            alert('WebSerial API is not supported.\nPlease use Google Chrome or Microsoft Edge.');
            return;
        }

        try {
            port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });

            isConnected = true;
            connectBtn.classList.add('connected');
            connectBtnText.textContent = 'Disconnect Hardware';
            statusDot.className = 'status-dot connected';
            statusText.textContent = 'Connected';
            termLog('Serial port opened at 9600 baud', 'system-msg');
            termLog('Receiving data stream...', 'data-msg');

            readLoop();
        } catch (err) {
            termLog(`Connection failed: ${err.message}`, 'error-msg');
        }
    }

    async function disconnect() {
        try {
            if (reader) {
                await reader.cancel();
                reader = null;
            }
            if (port) {
                await port.close();
                port = null;
            }
        } catch (e) {
            // Ignore close errors
        }
        isConnected = false;
        connectBtn.classList.remove('connected');
        connectBtnText.textContent = 'Connect to ThermoSpark Hardware';
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Disconnected';
        termLog('Serial port disconnected', 'warn-msg');
    }

    async function readLoop() {
        const decoder = new TextDecoderStream();
        const inputDone = port.readable.pipeTo(decoder.writable);
        const inputStream = decoder.readable;
        reader = inputStream.getReader();

        try {
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                if (value) {
                    dataBuffer += value;
                    // Process complete lines
                    let lines = dataBuffer.split('\n');
                    dataBuffer = lines.pop(); // Keep incomplete last line in buffer

                    for (const raw of lines) {
                        const line = raw.trim();
                        if (!line) continue;
                        processLine(line);
                    }
                }
            }
        } catch (err) {
            if (isConnected) {
                termLog(`Read error: ${err.message}`, 'error-msg');
            }
        } finally {
            reader.releaseLock();
        }
    }

    function processLine(line) {
        // Log raw
        termLog(line, 'data-msg');

        // Expected format: gas_value,temp_value
        const parts = line.split(',');
        if (parts.length >= 2) {
            const gas = parseFloat(parts[0]);
            const temp = parseFloat(parts[1]);

            if (!isNaN(gas)) latestGas = gas;
            if (!isNaN(temp)) latestTemp = temp;

            // Check and log warnings
            if (temp >= TEMP_CRIT) {
                termLog(`⚠ CRITICAL TEMP: ${temp.toFixed(1)}°C — Kill switch activated!`, 'error-msg');
            } else if (temp >= TEMP_WARN) {
                termLog(`⚠ WARNING: Temperature elevated at ${temp.toFixed(1)}°C`, 'warn-msg');
            }

            if (gas >= GAS_CRIT) {
                termLog(`⚠ CRITICAL GAS: ${gas} PPM — Electrolyte venting detected!`, 'error-msg');
            } else if (gas >= GAS_WARN) {
                termLog(`⚠ WARNING: Gas levels elevated at ${gas} PPM`, 'warn-msg');
            }
        } else {
            // Try handling "gas 450, temp 32" style
            const gasMatch = line.match(/gas\s*(\d+)/i);
            const tempMatch = line.match(/temp\s*([\d.]+)/i);
            if (gasMatch) latestGas = parseFloat(gasMatch[1]);
            if (tempMatch) latestTemp = parseFloat(tempMatch[1]);
        }
    }

    // ══════════════════════════════════════
    //  PARTICLE BACKGROUND
    // ══════════════════════════════════════
    const pCtx = particleCanvas.getContext('2d');
    const particles = [];
    const PARTICLE_COUNT = 60;

    function resizeParticleCanvas() {
        particleCanvas.width = window.innerWidth;
        particleCanvas.height = window.innerHeight;
    }
    window.addEventListener('resize', () => {
        resizeParticleCanvas();
        tempGauge.drawStatic();
        gasGauge.drawStatic();
        tempGauge.draw(animatedTemp);
        gasGauge.draw(animatedGas);
    });
    resizeParticleCanvas();

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * particleCanvas.width;
            this.y = Math.random() * particleCanvas.height;
            this.vx = (Math.random() - 0.5) * 0.3;
            this.vy = (Math.random() - 0.5) * 0.3;
            this.size = Math.random() * 2 + 0.5;
            this.alpha = Math.random() * 0.3 + 0.05;
            this.color = killState === 'killed' 
                ? `rgba(255, 51, 68, ${this.alpha})`
                : `rgba(0, 255, 136, ${this.alpha})`;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > particleCanvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > particleCanvas.height) this.vy *= -1;
            this.color = killState === 'killed' 
                ? `rgba(255, 51, 68, ${this.alpha})`
                : killState === 'warning'
                    ? `rgba(255, 170, 0, ${this.alpha})`
                    : `rgba(0, 255, 136, ${this.alpha})`;
        }
        draw() {
            pCtx.beginPath();
            pCtx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            pCtx.fillStyle = this.color;
            pCtx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function drawParticles() {
        pCtx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
        for (const p of particles) {
            p.update();
            p.draw();
        }
        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 120) {
                    const alpha = (1 - dist / 120) * 0.06;
                    const lineColor = killState === 'killed'
                        ? `rgba(255, 51, 68, ${alpha})`
                        : `rgba(0, 255, 136, ${alpha})`;
                    pCtx.beginPath();
                    pCtx.moveTo(particles[i].x, particles[i].y);
                    pCtx.lineTo(particles[j].x, particles[j].y);
                    pCtx.strokeStyle = lineColor;
                    pCtx.lineWidth = 0.5;
                    pCtx.stroke();
                }
            }
        }
        requestAnimationFrame(drawParticles);
    }

    drawParticles();

    // ══════════════════════════════════════
    //  DEMO MODE (no Arduino connected)
    // ══════════════════════════════════════
    // Uncomment below to simulate data for UI testing:
    /*
    let demoPhase = 0;
    setInterval(() => {
        demoPhase += 0.02;
        latestTemp = 25 + Math.sin(demoPhase) * 35 + Math.sin(demoPhase * 3) * 10;
        latestGas = 200 + Math.sin(demoPhase * 0.8) * 350 + Math.sin(demoPhase * 2.5) * 100;
        latestTemp = Math.max(0, Math.min(TEMP_MAX, latestTemp));
        latestGas = Math.max(0, Math.min(GAS_MAX, latestGas));
        termLog(`${Math.round(latestGas)},${latestTemp.toFixed(1)}`, 'data-msg');
    }, 500);
    */

    // ── START RENDER LOOP ──
    requestAnimationFrame(updateDashboard);

})();
