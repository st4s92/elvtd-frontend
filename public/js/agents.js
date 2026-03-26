// ═══════════════════════════════════════════════════════
// LOADING OVERLAY — 1200 Particle Canvas
// ═══════════════════════════════════════════════════════
(function () {
    var canvas = document.getElementById('agentsCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var W, H, particles = [], gridLines = [], animId;
    var PC = 1200, GC = 20;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < PC; i++) {
        var s = Math.random() * 3.5 + 0.5;
        var sp = Math.random() * 0.8 + 0.1;
        var a = Math.random() * Math.PI * 2;
        particles.push({
            x: Math.random() * W, y: Math.random() * H,
            size: s, baseSize: s,
            vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
            opacity: Math.random() * 0.6 + 0.1,
            pulse: Math.random() * Math.PI * 2,
            pulseSpeed: Math.random() * 0.03 + 0.01,
            hue: Math.random() > 0.6 ? 160 : 142
        });
    }
    for (var i = 0; i < GC; i++) {
        gridLines.push({
            isH: i < GC / 2,
            pos: Math.random() * (i < GC / 2 ? H : W),
            opacity: Math.random() * 0.04 + 0.01
        });
    }

    function drawLoading() {
        ctx.clearRect(0, 0, W, H);
        ctx.lineWidth = 0.5;
        gridLines.forEach(function (g) {
            ctx.strokeStyle = 'rgba(22,163,74,' + g.opacity + ')';
            ctx.beginPath();
            if (g.isH) { ctx.moveTo(0, g.pos); ctx.lineTo(W, g.pos); }
            else { ctx.moveTo(g.pos, 0); ctx.lineTo(g.pos, H); }
            ctx.stroke();
        });
        var cx = W / 2, cy = H / 2 - H * 0.05;
        particles.forEach(function (p) {
            p.pulse += p.pulseSpeed;
            p.size = p.baseSize + Math.sin(p.pulse) * 0.8;
            p.x += p.vx;
            p.y += p.vy;
            var dx = cx - p.x, dy = cy - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 50) {
                p.vx += dx / dist * 0.003;
                p.vy += dy / dist * 0.003;
            }
            var spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (spd > 1.5) { p.vx *= 0.98; p.vy *= 0.98; }
            if (p.x < -10) p.x = W + 10;
            if (p.x > W + 10) p.x = -10;
            if (p.y < -10) p.y = H + 10;
            if (p.y > H + 10) p.y = -10;
            var alpha = p.opacity * (1 - Math.min(dist / (Math.max(W, H) * 0.5), 1) * 0.5);
            ctx.beginPath();
            ctx.arc(p.x, p.y, Math.max(p.size, 0.3), 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ',80%,50%,' + alpha + ')';
            ctx.fill();
            if (p.baseSize > 2.5) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(' + p.hue + ',80%,50%,' + (alpha * 0.15) + ')';
                ctx.fill();
            }
        });
        for (var i = 0; i < particles.length; i++) {
            var a = particles[i];
            var ad = Math.sqrt(Math.pow(a.x - cx, 2) + Math.pow(a.y - cy, 2));
            if (ad > 250) continue;
            for (var j = i + 1; j < particles.length; j++) {
                var b = particles[j];
                var d = Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
                if (d < 60) {
                    ctx.strokeStyle = 'rgba(22,163,74,' + (0.15 * (1 - d / 60)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
        animId = requestAnimationFrame(drawLoading);
    }
    drawLoading();

    var fill = document.getElementById('agLoadFill');
    var pct = document.getElementById('agLoadPct');
    var sub = document.getElementById('agLoadSub');
    var steps = [
        { p: 15, t: 'Marktdaten synchronisieren...' },
        { p: 35, t: 'Agenten-Netzwerk verbinden...' },
        { p: 55, t: 'Neuronale Pfade kalibrieren...' },
        { p: 75, t: 'Handelsstrategien laden...' },
        { p: 90, t: 'Risikoprofile analysieren...' },
        { p: 100, t: 'Bereit!' }
    ];
    var si = 0;
    function nextStep() {
        if (si >= steps.length) {
            setTimeout(function () {
                var o = document.getElementById('agentsLoadingOverlay');
                o.classList.add('fade-out');
                setTimeout(function () {
                    o.style.display = 'none';
                    cancelAnimationFrame(animId);
                }, 800);
            }, 400);
            return;
        }
        var s = steps[si];
        fill.style.width = s.p + '%';
        pct.textContent = s.p + '%';
        sub.textContent = s.t;
        si++;
        setTimeout(nextStep, 500 + Math.random() * 400);
    }
    setTimeout(nextStep, 600);
})();

// ═══════════════════════════════════════════════════════
// HERO — Canvas Particle Background
// ═══════════════════════════════════════════════════════
(function () {
    var canvas = document.getElementById('heroParticleCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var hero = canvas.parentElement;
    var W, H, particles = [];

    function resize() {
        var r = hero.getBoundingClientRect();
        W = canvas.width = r.width;
        H = canvas.height = r.height;
    }
    resize();
    window.addEventListener('resize', resize);

    for (var i = 0; i < 200; i++) {
        particles.push({
            x: Math.random() * (W || 800),
            y: Math.random() * (H || 400),
            size: Math.random() * 2.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.3,
            opacity: Math.random() * 0.25 + 0.05,
            hue: Math.random() > 0.5 ? 142 : 160
        });
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        particles.forEach(function (p) {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0) p.x = W;
            if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H;
            if (p.y > H) p.y = 0;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = 'hsla(' + p.hue + ',60%,35%,' + p.opacity + ')';
            ctx.fill();
        });
        for (var i = 0; i < particles.length; i++) {
            for (var j = i + 1; j < particles.length; j++) {
                var dx = particles[i].x - particles[j].x;
                var dy = particles[i].y - particles[j].y;
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < 80) {
                    ctx.strokeStyle = 'rgba(22,163,74,' + (0.08 * (1 - d / 80)) + ')';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(draw);
    }
    draw();
})();

// ═══════════════════════════════════════════════════════
// AGENT CARD — AI Neural Network Canvas
// ═══════════════════════════════════════════════════════
(function () {
    document.querySelectorAll('.agent-neural-canvas').forEach(function (canvas) {
        var ctx = canvas.getContext('2d');
        var wrap = canvas.parentElement;
        var W, H;
        var nodes = [];
        var NODE_COUNT = 28;
        var particles = [];
        var PARTICLE_COUNT = 80;
        var time = 0;

        function resize() {
            var r = wrap.getBoundingClientRect();
            W = canvas.width = r.width;
            H = canvas.height = r.height;
        }
        resize();
        window.addEventListener('resize', resize);

        function initNodes() {
            nodes.length = 0;
            var layers = [4, 6, 8, 6, 4];
            var totalLayers = layers.length;
            for (var l = 0; l < totalLayers; l++) {
                var count = layers[l];
                var lx = (W * 0.1) + (l / (totalLayers - 1)) * (W * 0.8);
                for (var n = 0; n < count; n++) {
                    var ny = (H * 0.1) + ((n + 0.5) / count) * (H * 0.8);
                    nodes.push({
                        x: lx, y: ny, layer: l,
                        baseRadius: 5 + Math.random() * 3,
                        pulse: Math.random() * Math.PI * 2,
                        pulseSpeed: 0.02 + Math.random() * 0.02,
                        hue: l <= 1 ? 142 : (l <= 3 ? 160 : 190),
                        active: false, activeTimer: 0
                    });
                }
            }
        }
        initNodes();

        function spawnParticle() {
            if (particles.length >= PARTICLE_COUNT) return;
            var srcLayer = Math.floor(Math.random() * 4);
            var srcNodes = nodes.filter(function (n) { return n.layer === srcLayer; });
            var dstNodes = nodes.filter(function (n) { return n.layer === srcLayer + 1; });
            if (!srcNodes.length || !dstNodes.length) return;
            var src = srcNodes[Math.floor(Math.random() * srcNodes.length)];
            var dst = dstNodes[Math.floor(Math.random() * dstNodes.length)];
            particles.push({
                x: src.x, y: src.y, tx: dst.x, ty: dst.y,
                progress: 0, speed: 0.002 + Math.random() * 0.004,
                hue: src.hue, size: 2 + Math.random() * 2
            });
            src.active = true;
            src.activeTimer = 30;
        }

        function draw() {
            ctx.clearRect(0, 0, W, H);
            time++;
            if (Math.random() < 0.3) spawnParticle();

            // Draw connections
            for (var l = 0; l < 4; l++) {
                var srcN = nodes.filter(function (n) { return n.layer === l; });
                var dstN = nodes.filter(function (n) { return n.layer === l + 1; });
                srcN.forEach(function (s) {
                    dstN.forEach(function (d) {
                        var alpha = s.active ? 0.2 : 0.06;
                        ctx.strokeStyle = 'rgba(74,222,128,' + alpha + ')';
                        ctx.lineWidth = s.active ? 1 : 0.5;
                        ctx.beginPath();
                        ctx.moveTo(s.x, s.y);
                        ctx.lineTo(d.x, d.y);
                        ctx.stroke();
                    });
                });
            }

            // Draw traveling particles
            for (var i = particles.length - 1; i >= 0; i--) {
                var p = particles[i];
                p.progress += p.speed;
                if (p.progress >= 1) {
                    var dst = nodes.find(function (n) { return Math.abs(n.x - p.tx) < 1 && Math.abs(n.y - p.ty) < 1; });
                    if (dst) { dst.active = true; dst.activeTimer = 30; }
                    particles.splice(i, 1);
                    continue;
                }
                p.x = p.x + (p.tx - p.x) * p.speed * 1.5;
                p.y = p.y + (p.ty - p.y) * p.speed * 1.5;

                var gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
                gradient.addColorStop(0, 'hsla(' + p.hue + ', 90%, 65%, 0.8)');
                gradient.addColorStop(1, 'hsla(' + p.hue + ', 90%, 65%, 0)');
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
                ctx.fillStyle = gradient;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fillStyle = 'hsla(' + p.hue + ', 90%, 70%, 0.9)';
                ctx.fill();
            }

            // Draw nodes
            nodes.forEach(function (n) {
                n.pulse += n.pulseSpeed;
                if (n.activeTimer > 0) n.activeTimer--;
                if (n.activeTimer <= 0) n.active = false;
                var r = n.baseRadius + Math.sin(n.pulse) * 1.5;
                var glow = n.active ? 0.6 : 0.2;

                var grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3);
                grad.addColorStop(0, 'hsla(' + n.hue + ', 80%, 60%, ' + glow + ')');
                grad.addColorStop(1, 'hsla(' + n.hue + ', 80%, 60%, 0)');
                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                ctx.fillStyle = n.active ? 'hsla(' + n.hue + ', 90%, 65%, 0.95)' : 'hsla(' + n.hue + ', 70%, 55%, 0.7)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(n.x, n.y, r * 0.35, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,' + (n.active ? 0.9 : 0.4) + ')';
                ctx.fill();
            });

            // Data flow wave
            var waveX = (time * 2) % (W + 200) - 100;
            var waveGrad = ctx.createLinearGradient(waveX - 60, 0, waveX + 60, 0);
            waveGrad.addColorStop(0, 'rgba(74,222,128,0)');
            waveGrad.addColorStop(0.5, 'rgba(74,222,128,0.04)');
            waveGrad.addColorStop(1, 'rgba(74,222,128,0)');
            ctx.fillStyle = waveGrad;
            ctx.fillRect(waveX - 60, 0, 120, H);

            requestAnimationFrame(draw);
        }
        draw();
    });
})();

// ═══════════════════════════════════════════════════════
// MASTER ORDERS — TradingView Chart + Click Handler
// ═══════════════════════════════════════════════════════
(function () {
    var chartSide = document.getElementById('moChartSide');
    var symbolLabel = document.getElementById('moChartSymbolText');
    if (!chartSide) return;

    var currentSymbol = '';
    var tvWidget = null;
    var tvLoaded = false;
    var tvLoadCallbacks = [];

    // Lazy-load TradingView charting library
    function ensureTradingView(cb) {
        if (typeof TradingView !== 'undefined') { cb(); return; }
        tvLoadCallbacks.push(cb);
        if (tvLoaded) return;
        tvLoaded = true;
        var s1 = document.createElement('script');
        s1.src = '/charting/charting_library/charting_library.standalone.js';
        s1.onload = function () {
            tvLoadCallbacks.forEach(function (fn) { fn(); });
            tvLoadCallbacks = [];
        };
        s1.onerror = function () {
            tvLoadCallbacks.forEach(function (fn) { fn(new Error('TradingView failed to load')); });
            tvLoadCallbacks = [];
        };
        document.head.appendChild(s1);
    }

    // Master account login for cTrader data
    var masterLogin = window.__MASTER_ACCOUNT_LOGIN__ || 0;

    // Custom datafeed using /api/chart-data (same as show_denies)
    function createChartDatafeed(symbol) {
        var decimals = 5;
        if (symbol.indexOf('JPY') >= 0) decimals = 3;
        if (/XAU|GOLD/i.test(symbol)) decimals = 2;
        if (/BTC/i.test(symbol)) decimals = 2;
        if (/US30|US100|US500|NAS|SPX|USTEC|DJ|DE40|DAX|GER|UK100|JP225|FRA/i.test(symbol)) decimals = 2;
        var psVal = Math.pow(10, decimals);
        var barsCache = {};

        return {
            onReady: function (cb) {
                setTimeout(function () {
                    cb({
                        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
                        supports_marks: false,
                        supports_timescale_marks: false,
                        supports_time: true
                    });
                }, 0);
            },
            searchSymbols: function (userInput, exchange, symbolType, onResult) { onResult([]); },
            resolveSymbol: function (symbolName, onResolve, onError) {
                setTimeout(function () {
                    onResolve({
                        name: symbol,
                        full_name: symbol,
                        description: symbol,
                        type: 'forex',
                        session: '24x7',
                        timezone: 'Etc/UTC',
                        exchange: '',
                        listed_exchange: '',
                        format: 'price',
                        minmov: 1,
                        pricescale: psVal,
                        has_intraday: true,
                        has_daily: true,
                        has_weekly_and_monthly: false,
                        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
                        volume_precision: 0,
                        data_status: 'streaming'
                    });
                }, 0);
            },
            getBars: function (symbolInfo, resolution, periodParams, onResult, onError) {
                var from = periodParams.from;
                var to = periodParams.to;
                var countBack = periodParams.countBack || 300;
                var ck = resolution + '_' + from + '_' + to;
                if (barsCache[ck]) {
                    onResult(barsCache[ck], { noData: barsCache[ck].length === 0 });
                    return;
                }
                // Use current time as 'to' if TradingView sends a future timestamp
                var now = Math.floor(Date.now() / 1000);
                var reqTo = Math.min(to, now + 86400);
                // Ensure we request enough history for countBack bars
                var minRange = countBack * (parseInt(resolution, 10) || 15) * 60;
                var reqFrom = Math.min(from, reqTo - minRange);

                var url = '/api/chart-data?symbol=' + encodeURIComponent(symbol) +
                    '&resolution=' + encodeURIComponent(resolution) +
                    '&from=' + reqFrom + '&to=' + reqTo +
                    (masterLogin ? '&account=' + masterLogin : '');
                console.log('[agents-chart] getBars', symbol, resolution, 'from=' + reqFrom, 'to=' + reqTo, 'account=' + masterLogin, 'url=' + url);
                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        console.log('[agents-chart] response', data.s, data.source, 'candles=' + (data.t ? data.t.length : 0));
                        if (data.s !== 'ok' || !data.t || data.t.length === 0) {
                            barsCache[ck] = [];
                            onResult([], { noData: true });
                            return;
                        }
                        var bars = [];
                        for (var i = 0; i < data.t.length; i++) {
                            bars.push({
                                time: data.t[i] * 1000,
                                open: data.o[i],
                                high: data.h[i],
                                low: data.l[i],
                                close: data.c[i],
                                volume: data.v ? data.v[i] : 0
                            });
                        }
                        barsCache[ck] = bars;
                        onResult(bars, { noData: false });
                    })
                    .catch(function (err) {
                        console.error('[agents-chart] fetch error', err);
                        onResult([], { noData: true });
                    });
            },
            subscribeBars: function () { },
            unsubscribeBars: function () { }
        };
    }

    // Chart container counter for unique IDs
    var chartCounter = 0;

    function getTradeFromItem(item) {
        if (!item) return null;
        var entry = parseFloat(item.getAttribute('data-entry') || 0);
        var exit = parseFloat(item.getAttribute('data-exit') || 0);
        if (!entry) return null;
        var sym = (item.getAttribute('data-symbol') || '').toUpperCase();
        var decimals = 5;
        if (/JPY/.test(sym)) decimals = 3;
        if (/XAU|GOLD/i.test(sym)) decimals = 2;
        if (/BTC/i.test(sym)) decimals = 2;
        if (/US30|US100|US500|NAS|SPX|USTEC|DJ|DE40|DAX|GER|UK100|JP225|FRA/i.test(sym)) decimals = 2;
        return {
            symbol: sym,
            entry: entry,
            exit: exit,
            isBuy: (item.getAttribute('data-type') || '').indexOf('BUY') !== -1,
            openAt: parseInt(item.getAttribute('data-open-at') || 0, 10),
            closeAt: parseInt(item.getAttribute('data-close-at') || 0, 10),
            lot: parseFloat(item.getAttribute('data-lot') || 0),
            profit: parseFloat(item.getAttribute('data-profit') || 0),
            isClosed: parseInt(item.getAttribute('data-status') || 0, 10) === 700,
            decimals: decimals
        };
    }

    function loadChart(symbol, trade) {
        var sym = (symbol || 'USTEC').toUpperCase();
        currentSymbol = sym;

        if (symbolLabel) symbolLabel.textContent = sym;

        // Destroy previous widget
        if (tvWidget) {
            try { tvWidget.remove(); } catch (e) { }
            tvWidget = null;
        }

        // Create fresh container each time (TradingView needs unique container)
        chartSide.innerHTML = '';
        var chartId = 'moTvChart_' + (++chartCounter);
        var chartDiv = document.createElement('div');
        chartDiv.id = chartId;
        chartDiv.style.cssText = 'width:100%;height:100%;';
        chartSide.appendChild(chartDiv);

        ensureTradingView(function (err) {
            if (err) {
                chartDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:rgba(255,255,255,0.3);"><span>Chart nicht verfügbar</span></div>';
                return;
            }
            try {
                tvWidget = new TradingView.widget({
                    container: chartId,
                    locale: 'de',
                    library_path: '/charting/charting_library/',
                    datafeed: createChartDatafeed(sym),
                    symbol: sym,
                    interval: '15',
                    fullscreen: false,
                    autosize: true,
                    theme: 'Dark',
                    style: '1',
                    toolbar_bg: '#0d1520',
                    overrides: {
                        'paneProperties.background': '#0d1520',
                        'paneProperties.backgroundType': 'solid',
                        'paneProperties.horzGridProperties.color': 'rgba(255,255,255,0.03)',
                        'paneProperties.vertGridProperties.color': 'rgba(255,255,255,0.03)',
                        'paneProperties.legendProperties.showSeriesOHLC': false,
                        'paneProperties.legendProperties.showStudyArguments': false,
                        'paneProperties.legendProperties.showStudyTitles': false,
                        'paneProperties.legendProperties.showStudyValues': false,
                        'mainSeriesProperties.statusViewStyle.showExchange': false,
                        'mainSeriesProperties.candleStyle.upColor': '#4ade80',
                        'mainSeriesProperties.candleStyle.downColor': '#f87171',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#4ade80',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#f87171',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#4ade80',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#f87171'
                    },
                    disabled_features: [
                        'use_localstorage_for_settings',
                        'save_chart_properties_to_local_storage',
                        'header_saveload',
                        'items_favoriting',
                        'show_object_tree',
                        'header_compare',
                        'header_quick_search',
                        'header_fullscreen_button',
                        'header_indicators',
                        'header_settings',
                        'header_undo_redo',
                        'header_chart_type',
                        'edit_buttons_in_legend',
                        'context_menus',
                        'go_to_date',
                        'timeframes_toolbar',
                        'left_toolbar',
                        'header_resolutions',
                        'create_volume_indicator_by_default',
                        'create_volume_indicator_by_default_once'
                    ],
                    enabled_features: [],
                    loading_screen: { backgroundColor: '#0d1520', foregroundColor: '#4ade80' }
                });

                // Draw entry/exit markers when chart is ready
                if (trade && tvWidget) {
                    tvWidget.onChartReady(function () {
                        var chart = tvWidget.activeChart();
                        var d = trade.decimals;
                        var entryColor = trade.isBuy ? '#4ade80' : '#f87171';
                        var typeLabel = trade.isBuy ? '▲ BUY' : '▼ SELL';

                        // Set visible range around the trade
                        if (trade.openAt) {
                            var padding = 3600; // 1h padding
                            var rangeFrom = trade.openAt - padding;
                            var rangeTo = trade.isClosed && trade.closeAt ? trade.closeAt + padding : Math.floor(Date.now() / 1000) + padding;
                            chart.setVisibleRange({ from: rangeFrom, to: rangeTo });
                        }

                        // Entry line
                        chart.createShape(
                            { time: trade.openAt, price: trade.entry },
                            {
                                shape: 'horizontal_line',
                                lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                overrides: {
                                    linecolor: entryColor,
                                    linestyle: 2, linewidth: 1, showLabel: true,
                                    text: typeLabel + '  ' + trade.lot.toFixed(2) + ' Lot @ ' + trade.entry.toFixed(d),
                                    textcolor: entryColor,
                                    fontsize: 11, bold: true, horzLabelsAlign: 'left',
                                }
                            }
                        );

                        // Entry arrow
                        chart.createShape(
                            { time: trade.openAt, price: trade.entry },
                            {
                                shape: 'arrow_' + (trade.isBuy ? 'up' : 'down'),
                                lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                overrides: { color: entryColor, fontsize: 14 }
                            }
                        );

                        // Exit line + arrow (only for closed trades)
                        if (trade.isClosed && trade.exit && trade.closeAt) {
                            var profitText = (trade.profit >= 0 ? '+' : '') + trade.profit.toFixed(2) + ' €';
                            var exitColor = '#a78bfa'; // purple

                            chart.createShape(
                                { time: trade.closeAt, price: trade.exit },
                                {
                                    shape: 'horizontal_line',
                                    lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: {
                                        linecolor: exitColor,
                                        linestyle: 2, linewidth: 1, showLabel: true,
                                        text: 'Exit ' + trade.exit.toFixed(d) + '  ' + profitText,
                                        textcolor: exitColor,
                                        fontsize: 11, bold: true, horzLabelsAlign: 'left',
                                    }
                                }
                            );

                            chart.createShape(
                                { time: trade.closeAt, price: trade.exit },
                                {
                                    shape: 'arrow_' + (trade.isBuy ? 'down' : 'up'),
                                    lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: { color: exitColor, fontsize: 14 }
                                }
                            );
                        }
                    });
                }
            } catch (e) {
                chartDiv.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:rgba(255,255,255,0.3);"><i class="fas fa-exclamation-triangle" style="font-size:1.5rem;opacity:.4;"></i><span>Chart nicht verfügbar</span></div>';
            }
        });
    }

    // Find first trade and load chart with its data
    var firstItem = document.querySelector('.mo-order-item');
    if (firstItem) {
        var firstTrade = getTradeFromItem(firstItem);
        loadChart(firstItem.getAttribute('data-symbol') || 'ustec', firstTrade);
        firstItem.classList.add('active');
    } else {
        loadChart('ustec');
    }

    // Click handler for order items
    document.addEventListener('click', function (e) {
        var item = e.target.closest('.mo-order-item');
        if (!item) return;

        var symbol = item.getAttribute('data-symbol');
        if (!symbol) return;

        // Remove active from all, add to clicked
        document.querySelectorAll('.mo-order-item.active').forEach(function (el) {
            el.classList.remove('active');
        });
        item.classList.add('active');

        var trade = getTradeFromItem(item);
        loadChart(symbol, trade);
    });

    // Search filter
    var input = document.getElementById('moSearchInput');
    if (input) {
        input.addEventListener('input', function () {
            var q = this.value.toLowerCase().trim();
            document.querySelectorAll('.mo-order-item').forEach(function (el) {
                var symbol = el.getAttribute('data-symbol') || '';
                el.style.display = (!q || symbol.indexOf(q) !== -1) ? '' : 'none';
            });
        });
    }
})();

// ═══════════════════════════════════════════════════════
// HERO Toggle
// ═══════════════════════════════════════════════════════
document.getElementById('heroToggleBtn').addEventListener('click', function () {
    var content = document.getElementById('heroExpandContent');
    var icon = document.getElementById('heroToggleIcon');
    var text = document.getElementById('heroToggleText');
    if (content.classList.contains('expanded')) {
        content.classList.remove('expanded');
        icon.style.transform = 'rotate(0deg)';
        text.textContent = 'Mehr erfahren';
    } else {
        content.classList.add('expanded');
        icon.style.transform = 'rotate(180deg)';
        text.textContent = 'Weniger anzeigen';
    }
});
