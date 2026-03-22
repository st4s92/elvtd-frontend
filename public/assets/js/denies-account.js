/**
 * Denies Account Detail — Analytics, Calendar, Charts, TradingView
 * Reads window.__DENIES_TRADES__ (injected by Twig)
 */
document.addEventListener('DOMContentLoaded', function () {
    var allTrades = window.__DENIES_TRADES__ || [];
    var accountLogin = window.__ACCOUNT_LOGIN__ || 0;
    var accountPlatform = window.__ACCOUNT_PLATFORM__ || '';

    // ── AI Loading Animation ──
    var loader = document.getElementById('aiLoader');
    var content = document.getElementById('aiContent');
    if (loader && content) {
        var delay = Math.max(800, Math.min(2000, allTrades.length * 5));
        setTimeout(function () {
            loader.style.transition = 'opacity .4s ease';
            loader.style.opacity = '0';
            setTimeout(function () {
                loader.style.display = 'none';
                content.style.display = 'block';
                var sections = content.querySelectorAll('.card-d, .row');
                sections.forEach(function (el, i) {
                    el.style.opacity = '0';
                    el.style.transform = 'translateY(12px)';
                    setTimeout(function () {
                        el.style.transition = 'opacity .5s ease, transform .5s ease';
                        el.style.opacity = '1';
                        el.style.transform = 'translateY(0)';
                    }, i * 120);
                });
            }, 400);
        }, delay);
    }

    // ── Build daily P/L map + trades-by-day lookup ──
    var dayMap = {};
    var tradesByDay = {};
    allTrades.forEach(function (t) {
        var closeAt = t.order_close_at || t.orderCloseAt || '';
        if (!closeAt) return;
        var date = closeAt.slice(0, 10);
        var pnl = parseFloat(t.order_profit || t.orderProfit || 0);
        if (!dayMap[date]) dayMap[date] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
        dayMap[date].pnl += pnl;
        dayMap[date].trades++;
        if (pnl >= 0) dayMap[date].wins++; else dayMap[date].losses++;
        if (!tradesByDay[date]) tradesByDay[date] = [];
        tradesByDay[date].push(t);
    });

    // ── Analytics Stats ──
    var statsEl = document.getElementById('analyticsStats');
    if (allTrades.length > 0 && statsEl) {
        var totalPnl = 0, wins = 0, losses = 0, grossProfit = 0, grossLoss = 0;
        var bestTrade = -Infinity, worstTrade = Infinity;
        var symbolMap = {};

        allTrades.forEach(function (t) {
            var pnl = parseFloat(t.order_profit || t.orderProfit || 0);
            totalPnl += pnl;
            if (pnl >= 0) { wins++; grossProfit += pnl; }
            else { losses++; grossLoss += Math.abs(pnl); }
            if (pnl > bestTrade) bestTrade = pnl;
            if (pnl < worstTrade) worstTrade = pnl;
            var sym = t.order_symbol || t.orderSymbol || '?';
            if (!symbolMap[sym]) symbolMap[sym] = 0;
            symbolMap[sym] += pnl;
        });

        var total = wins + losses;
        var winRate = total > 0 ? (wins / total * 100) : 0;
        var avgWin = wins > 0 ? grossProfit / wins : 0;
        var avgLoss = losses > 0 ? grossLoss / losses : 0;
        var profitFactor = grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? 999 : 0);
        var tradingDays = Object.keys(dayMap).length;
        var bestDay = Object.values(dayMap).reduce(function (b, d) { return d.pnl > b ? d.pnl : b; }, -Infinity);
        var worstDay = Object.values(dayMap).reduce(function (w, d) { return d.pnl < w ? d.pnl : w; }, Infinity);
        var topSymbol = Object.entries(symbolMap).sort(function (a, b) { return b[1] - a[1]; })[0];

        function fmt(v) { return (v >= 0 ? '+' : '') + '$' + v.toFixed(2); }
        function card(label, value, cls) {
            return '<div class="col-6 col-lg-3"><div class="card-d p-3 h-100"><div class="lbl mb-1">' + label + '</div><div class="val ' + (cls || '') + '" style="font-size:1.3rem;">' + value + '</div></div></div>';
        }

        statsEl.innerHTML =
            '<div class="sec-t mb-2" style="margin-top:.5rem;"><i class="fas fa-chart-pie"></i> Performance Analytics</div>' +
            '<div class="row g-3 mb-3">' +
            card('Net P/L', fmt(totalPnl), totalPnl >= 0 ? 'tg' : 'tr') +
            card('Win Rate', winRate.toFixed(1) + '%', winRate >= 50 ? 'tg' : 'tr') +
            card('Total Trades', total, '') +
            card('Profit Factor', profitFactor >= 999 ? '∞' : profitFactor.toFixed(2), profitFactor >= 1 ? 'tg' : 'tr') +
            card('Avg Win', fmt(avgWin), 'tg') +
            card('Avg Loss', '-$' + avgLoss.toFixed(2), 'tr') +
            card('Best Trade', fmt(bestTrade), 'tg') +
            card('Worst Trade', fmt(worstTrade), 'tr') +
            card('Best Day', fmt(bestDay), 'tg') +
            card('Worst Day', fmt(worstDay), 'tr') +
            card('Trading Days', tradingDays, '') +
            card('Best Symbol', topSymbol ? topSymbol[0] + ' ' + fmt(topSymbol[1]) : '-', 'tg') +
            '</div>';
    }

    // ══════════════════════════════════════════════════════
    // ── Trade Calendar with Day-Click Expansion ──
    // ══════════════════════════════════════════════════════
    var calEl = document.getElementById('tradeCalendar');
    var dayTradesPanel = document.getElementById('dayTradesPanel');
    var dayTradesList = document.getElementById('dayTradesList');
    var dayTradesTitle = document.getElementById('dayTradesTitle');
    var closeDayTradesBtn = document.getElementById('closeDayTrades');
    var selectedDate = null;

    if (closeDayTradesBtn) {
        closeDayTradesBtn.onclick = function () {
            closeDayTrades();
        };
    }

    function closeDayTrades() {
        if (dayTradesPanel) dayTradesPanel.classList.remove('open');
        selectedDate = null;
        // Remove selected class from all days
        var allDays = calEl ? calEl.querySelectorAll('.cal-day.selected') : [];
        allDays.forEach(function (d) { d.classList.remove('selected'); });
    }

    function formatDate(ds) {
        var parts = ds.split('-');
        return parts[2] + '.' + parts[1] + '.' + parts[0];
    }

    function showDayTrades(dateStr) {
        var trades = tradesByDay[dateStr] || [];
        if (!trades.length || !dayTradesPanel || !dayTradesList) return;

        // Toggle: if same day clicked, close
        if (selectedDate === dateStr) {
            closeDayTrades();
            return;
        }
        selectedDate = dateStr;

        // Update selected state on calendar
        var allDays = calEl ? calEl.querySelectorAll('.cal-day') : [];
        allDays.forEach(function (d) { d.classList.remove('selected'); });
        var clickedDay = calEl ? calEl.querySelector('[data-date="' + dateStr + '"]') : null;
        if (clickedDay) clickedDay.classList.add('selected');

        dayTradesTitle.textContent = formatDate(dateStr) + ' — ' + trades.length + ' Trade' + (trades.length > 1 ? 's' : '');

        var dayPnl = dayMap[dateStr] ? dayMap[dateStr].pnl : 0;
        var h = '';

        trades.forEach(function (t, idx) {
            var sym = t.order_symbol || t.orderSymbol || '-';
            var isBuy = (t.order_type || t.orderType || '').toUpperCase().indexOf('BUY') >= 0;
            var pnl = parseFloat(t.order_profit || t.orderProfit || 0);
            var lot = parseFloat(t.order_lot || t.orderLot || 0).toFixed(2);
            var entry = parseFloat(t.order_price || t.orderPrice || 0);
            var exit = parseFloat(t.order_close_price || t.orderClosePrice || 0);
            var openAt = t.order_open_at || t.orderOpenAt || '';
            var closeAt = t.order_close_at || t.orderCloseAt || '';
            var openTime = openAt.length > 10 ? openAt.slice(11, 16) : '';
            var closeTime = closeAt.length > 10 ? closeAt.slice(11, 16) : '';

            h += '<div class="trade-row" data-trade-idx="' + idx + '" data-date="' + dateStr + '">';
            h += '<span class="' + (isBuy ? 'b-buy' : 'b-sell') + '">' + (isBuy ? 'BUY' : 'SELL') + '</span>';
            h += '<span class="tr-symbol">' + sym + '</span>';
            h += '<span class="tr-meta">';
            h += '<span>' + lot + '</span>';
            h += '<span>' + entry.toFixed(5) + ' → ' + exit.toFixed(5) + '</span>';
            if (openTime && closeTime) h += '<span>' + openTime + ' – ' + closeTime + '</span>';
            h += '</span>';
            h += '<span class="tr-pnl ' + (pnl >= 0 ? 'tg' : 'tr') + '">' + (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2) + '</span>';
            h += '<span class="tr-arrow"><i class="fas fa-chart-line"></i></span>';
            h += '</div>';
        });

        dayTradesList.innerHTML = h;
        dayTradesPanel.classList.add('open');

        // Bind click events for each trade row
        dayTradesList.querySelectorAll('.trade-row').forEach(function (row) {
            row.onclick = function () {
                var tIdx = parseInt(row.getAttribute('data-trade-idx'));
                var tDate = row.getAttribute('data-date');
                var trade = (tradesByDay[tDate] || [])[tIdx];
                if (trade) openTradeChart(trade);
            };
        });
    }

    if (calEl) {
        var curDate = new Date();
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        function pad2(n) { return n < 10 ? '0' + n : '' + n; }

        function renderCalendar() {
            closeDayTrades();
            var year = curDate.getFullYear();
            var month = curDate.getMonth();
            var startDay = (new Date(year, month, 1).getDay() + 6) % 7;
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var prevLast = new Date(year, month, 0).getDate();
            var mPnl = 0, mTrades = 0, mWins = 0, mLosses = 0;
            var todayStr = new Date().toISOString().slice(0, 10);

            var h = '<div class="cal-nav">' +
                '<button id="calPrev"><i class="fas fa-chevron-left"></i></button>' +
                '<span class="cal-month">' + monthNames[month] + ' ' + year + '</span>' +
                '<button id="calNext"><i class="fas fa-chevron-right"></i></button>' +
                '</div><div class="cal-grid">';

            ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].forEach(function (d) {
                h += '<div class="cal-head">' + d + '</div>';
            });

            for (var i = startDay - 1; i >= 0; i--) {
                h += '<div class="cal-day outside"><span class="day-num">' + (prevLast - i) + '</span></div>';
            }

            for (var d = 1; d <= daysInMonth; d++) {
                var ds = year + '-' + pad2(month + 1) + '-' + pad2(d);
                var isToday = ds === todayStr;
                var data = dayMap[ds];
                var hasTrades = !!tradesByDay[ds];
                h += '<div class="cal-day' + (isToday ? ' today' : '') + (hasTrades ? ' has-trades' : '') + '" data-date="' + ds + '">';
                h += '<span class="day-num">' + d + '</span>';
                if (data) {
                    var c = data.pnl >= 0 ? 'tg' : 'tr';
                    var barC = data.pnl >= 0 ? 'var(--g)' : 'var(--r)';
                    h += '<span class="day-pnl ' + c + '">' + (data.pnl >= 0 ? '+' : '') + data.pnl.toFixed(0) + '</span>';
                    h += '<span class="day-cnt">' + data.trades + ' trade' + (data.trades > 1 ? 's' : '') + '</span>';
                    h += '<div class="day-bar" style="background:' + barC + ';opacity:.5;"></div>';
                    mPnl += data.pnl; mTrades += data.trades; mWins += data.wins; mLosses += data.losses;
                }
                h += '</div>';
            }

            var rem = (7 - (startDay + daysInMonth) % 7) % 7;
            for (var d2 = 1; d2 <= rem; d2++) {
                h += '<div class="cal-day outside"><span class="day-num">' + d2 + '</span></div>';
            }

            h += '</div>';
            h += '<div class="cal-summary">' +
                '<span>P/L: <strong class="' + (mPnl >= 0 ? 'tg' : 'tr') + '">' + (mPnl >= 0 ? '+' : '') + '$' + mPnl.toFixed(2) + '</strong></span>' +
                '<span>Days: <strong>' + mTrades + '</strong></span>' +
                '<span>Win: <strong class="tg">' + mWins + '</strong></span>' +
                '<span>Loss: <strong class="tr">' + mLosses + '</strong></span>' +
                '</div>';

            calEl.innerHTML = h;
            document.getElementById('calPrev').onclick = function () { curDate.setMonth(curDate.getMonth() - 1); renderCalendar(); };
            document.getElementById('calNext').onclick = function () { curDate.setMonth(curDate.getMonth() + 1); renderCalendar(); };

            // Bind click on days with trades
            calEl.querySelectorAll('.cal-day.has-trades').forEach(function (dayEl) {
                dayEl.onclick = function () {
                    var dateStr = dayEl.getAttribute('data-date');
                    showDayTrades(dateStr);
                };
            });
        }
        renderCalendar();
    }

    // ══════════════════════════════════════════════════════
    // ── TradingView Fullscreen Chart Modal ──
    // ══════════════════════════════════════════════════════
    var chartOverlay = document.getElementById('chartOverlay');
    var chartContainer = document.getElementById('chartContainer');
    var cmClose = document.getElementById('cmClose');
    var tvWidget = null;

    var _activeOrderId = null;
    var _activeMetaId = null;
    var _activeCsrfToken = null;

    function closeChartModal() {
        if (chartOverlay) chartOverlay.classList.remove('active');
        if (tvWidget) {
            try { tvWidget.remove(); } catch (e) { }
            tvWidget = null;
        }
        if (chartContainer) chartContainer.innerHTML = '';
        var liveBadge = document.getElementById('cmLiveBadge');
        if (liveBadge) liveBadge.style.display = 'none';
        var closeBtn = document.getElementById('cmClosePosition');
        if (closeBtn) closeBtn.style.display = 'none';
        _activeOrderId = null;
        _activeMetaId = null;
        _activeCsrfToken = null;
        document.body.style.overflow = '';
    }

    if (cmClose) cmClose.onclick = closeChartModal;

    // Close Position button in header
    var cmClosePosition = document.getElementById('cmClosePosition');
    if (cmClosePosition) {
        cmClosePosition.onclick = function () {
            if (!_activeOrderId || !_activeMetaId) return;
            if (!confirm('Position jetzt schließen?')) return;
            cmClosePosition.disabled = true;
            cmClosePosition.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Closing...';
            fetch('/account/' + _activeMetaId + '/close-order/' + _activeOrderId, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: '_token=' + encodeURIComponent(_activeCsrfToken),
            })
                .then(function (r) {
                    if (r.ok || r.redirected) {
                        closeChartModal();
                        window.location.reload();
                    } else {
                        alert('Fehler beim Schließen der Position');
                        cmClosePosition.disabled = false;
                        cmClosePosition.innerHTML = '<i class="fas fa-times-circle"></i> Close Position';
                    }
                })
                .catch(function () {
                    alert('Netzwerkfehler');
                    cmClosePosition.disabled = false;
                    cmClosePosition.innerHTML = '<i class="fas fa-times-circle"></i> Close Position';
                });
        };
    }
    if (chartOverlay) {
        chartOverlay.onclick = function (e) {
            if (e.target === chartOverlay) closeChartModal();
        };
    }
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && chartOverlay && chartOverlay.classList.contains('active')) {
            closeChartModal();
        }
    });

    // Lazy-load TradingView library
    var tvLoaded = false;
    var tvLoadCallbacks = [];
    function ensureTradingView(cb) {
        if (typeof TradingView !== 'undefined') { cb(); return; }
        tvLoadCallbacks.push(cb);
        if (tvLoaded) return; // already loading
        tvLoaded = true;
        var s = document.createElement('script');
        s.src = '/charting/charting_library/charting_library.standalone.js';
        s.onload = function () {
            tvLoadCallbacks.forEach(function (fn) { fn(); });
            tvLoadCallbacks = [];
        };
        s.onerror = function () {
            tvLoadCallbacks.forEach(function (fn) { fn(new Error('TradingView failed to load')); });
            tvLoadCallbacks = [];
        };
        document.head.appendChild(s);
    }

    function openTradeChart(trade) {
        var sym = trade.order_symbol || trade.orderSymbol || 'EURUSD';
        var isBuy = (trade.order_type || trade.orderType || '').toUpperCase().indexOf('BUY') >= 0;
        var pnl = parseFloat(trade.order_profit || trade.orderProfit || 0);
        var lot = parseFloat(trade.order_lot || trade.orderLot || 0);
        var entry = parseFloat(trade.order_price || trade.orderPrice || 0);
        var exit = parseFloat(trade.order_close_price || trade.orderClosePrice || 0);
        var openAt = trade.order_open_at || trade.orderOpenAt || '';
        var closeAt = trade.order_close_at || trade.orderCloseAt || '';

        var decimals = 5;
        if (sym.indexOf('JPY') >= 0) decimals = 3;
        if (sym.indexOf('XAU') >= 0 || sym.indexOf('GOLD') >= 0) decimals = 2;
        if (sym.indexOf('BTC') >= 0) decimals = 2;
        if (/US30|US100|US500|NAS|SPX|USTEC|DJ|DE40|DAX|GER|UK100|JP225|FRA/i.test(sym)) decimals = 2;

        // Update modal header
        document.getElementById('cmSymbol').textContent = sym;
        var badge = document.getElementById('cmBadge');
        badge.textContent = isBuy ? 'BUY' : 'SELL';
        badge.className = isBuy ? 'b-buy' : 'b-sell';
        var liveBadge = document.getElementById('cmLiveBadge');
        if (liveBadge) liveBadge.style.display = 'none';
        document.getElementById('cmEntry').textContent = entry.toFixed(decimals);
        document.getElementById('cmExit').textContent = exit.toFixed(decimals);
        document.getElementById('cmLot').textContent = lot.toFixed(2);
        var pnlEl = document.getElementById('cmPnl');
        pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
        pnlEl.style.fontWeight = '700';
        pnlEl.style.color = pnl >= 0 ? 'var(--g)' : 'var(--r)';

        // Show modal with loading state
        document.body.style.overflow = 'hidden';
        chartOverlay.classList.add('active');
        chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:.8rem;color:#64748b;"><div class="ai-spinner" style="width:30px;height:30px;border:3px solid rgba(0,0,0,.1);border-top-color:#16a34a;border-radius:50%;animation:ai-spin .8s linear infinite;"></div><span>Loading Chart...</span></div>';

        // Parse trade times
        var openTime = openAt ? new Date(openAt.replace(' ', 'T') + 'Z') : new Date();
        var closeTime = closeAt ? new Date(closeAt.replace(' ', 'T') + 'Z') : new Date();
        var tradeDurationMs = closeTime - openTime;
        if (tradeDurationMs < 60000) tradeDurationMs = 3600000;

        var resolution = '5';
        if (tradeDurationMs > 7 * 24 * 3600000) resolution = '240';
        else if (tradeDurationMs > 2 * 24 * 3600000) resolution = '60';
        else if (tradeDurationMs > 12 * 3600000) resolution = '30';
        else if (tradeDurationMs > 4 * 3600000) resolution = '15';
        else if (tradeDurationMs > 1 * 3600000) resolution = '5';
        else resolution = '1';

        var paddingMs = Math.max(tradeDurationMs * 0.5, 3600000 * 4);
        var visibleFrom = openTime.getTime() / 1000 - paddingMs / 1000;
        var visibleTo = closeTime.getTime() / 1000 + paddingMs / 1000;
        var datafeed = createTradeDatafeed(sym, resolution, decimals, false);

        // Lazy-load TradingView, then init chart
        ensureTradingView(function (err) {
            if (err) {
                chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i><span>TradingView konnte nicht geladen werden</span></div>';
                return;
            }

            chartContainer.innerHTML = '';
            try {
                tvWidget = new TradingView.widget({
                    container: chartContainer,
                    locale: 'en',
                    library_path: '/charting/charting_library/',
                    datafeed: datafeed,
                    symbol: sym,
                    interval: resolution,
                    fullscreen: false,
                    autosize: true,
                    theme: 'Light',
                    style: '1',
                    toolbar_bg: '#f9f7f6',
                    enable_publishing: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    hide_side_toolbar: false,
                    allow_symbol_change: false,
                    save_image: false,
                    disabled_features: [
                        'header_symbol_search',
                        'symbol_search_hot_key',
                        'header_compare',
                        'header_undo_redo',
                        'go_to_date',
                        'timeframes_toolbar',
                        'use_localstorage_for_settings',
                        'create_volume_indicator_by_default',
                        'create_volume_indicator_by_default_once',
                    ],
                    enabled_features: [
                        'hide_left_toolbar_by_default',
                    ],
                    overrides: {
                        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.downColor': '#424242',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#424242',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#424242',
                        'mainSeriesProperties.candleStyle.drawBorder': false,
                        'paneProperties.background': '#ffffff',
                        'paneProperties.backgroundType': 'solid',
                        'scalesProperties.backgroundColor': '#ffffff',
                        'scalesProperties.textColor': '#94a3b8',
                        'paneProperties.vertGridProperties.color': 'rgba(0,0,0,0.025)',
                        'paneProperties.horzGridProperties.color': 'rgba(0,0,0,0.025)',
                        'paneProperties.crossHairProperties.color': '#cbd5e1',
                    },
                    loading_screen: {
                        backgroundColor: '#ffffff',
                        foregroundColor: '#26a69a',
                    },
                });

                tvWidget.onChartReady(function () {
                    var chart = tvWidget.activeChart();

                    chart.setVisibleRange({
                        from: visibleFrom,
                        to: visibleTo,
                    });

                    // Entry line
                    chart.createShape(
                        { time: openTime.getTime() / 1000, price: entry },
                        {
                            shape: 'horizontal_line',
                            lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                            overrides: {
                                linecolor: isBuy ? '#16a34a' : '#dc2626',
                                linestyle: 2, linewidth: 1, showLabel: true,
                                text: 'Entry ' + entry.toFixed(decimals),
                                textcolor: isBuy ? '#16a34a' : '#dc2626',
                                fontsize: 11, bold: true, horzLabelsAlign: 'left',
                            }
                        }
                    );

                    // Exit line
                    chart.createShape(
                        { time: closeTime.getTime() / 1000, price: exit },
                        {
                            shape: 'horizontal_line',
                            lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                            overrides: {
                                linecolor: '#6366f1',
                                linestyle: 2, linewidth: 1, showLabel: true,
                                text: 'Exit ' + exit.toFixed(decimals),
                                textcolor: '#6366f1',
                                fontsize: 11, bold: true, horzLabelsAlign: 'left',
                            }
                        }
                    );

                    // Entry arrow
                    chart.createShape(
                        { time: openTime.getTime() / 1000, price: entry },
                        {
                            shape: 'arrow_' + (isBuy ? 'up' : 'down'),
                            lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                            overrides: { color: isBuy ? '#16a34a' : '#dc2626', fontsize: 14 }
                        }
                    );

                    // Exit arrow
                    chart.createShape(
                        { time: closeTime.getTime() / 1000, price: exit },
                        {
                            shape: 'arrow_' + (isBuy ? 'down' : 'up'),
                            lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                            overrides: { color: '#6366f1', fontsize: 14 }
                        }
                    );
                });
            } catch (e) {
                chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i>' +
                    '<span>Chart konnte nicht geladen werden</span>' +
                    '<span style="font-size:.75rem;opacity:.5;">' + e.message + '</span></div>';
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // ── Open Position Chart (live) ──
    // ══════════════════════════════════════════════════════
    function openPositionChart(sym, entry, isBuy, lot, pnl, orderId, metaId, csrfToken) {
        var decimals = 5;
        if (sym.indexOf('JPY') >= 0) decimals = 3;
        if (/XAU|GOLD/i.test(sym)) decimals = 2;
        if (/BTC/i.test(sym)) decimals = 2;
        if (/US30|US100|US500|NAS|SPX|USTEC|DJ|DE40|DAX|GER|UK100|JP225|FRA/i.test(sym)) decimals = 2;

        var posColor = isBuy ? '#16a34a' : '#dc2626';
        var accountMetaId = metaId || window.__ACCOUNT_META_ID__ || '';

        // Store close data for header button
        _activeOrderId = orderId || null;
        _activeMetaId = accountMetaId || null;
        _activeCsrfToken = csrfToken || null;

        // Show/hide close position button
        var closePosBtn = document.getElementById('cmClosePosition');
        if (closePosBtn) {
            if (orderId && accountMetaId) {
                closePosBtn.style.display = 'flex';
                closePosBtn.disabled = false;
                closePosBtn.innerHTML = '<i class="fas fa-times-circle"></i> Close Position';
            } else {
                closePosBtn.style.display = 'none';
            }
        }

        // Update modal header
        document.getElementById('cmSymbol').textContent = sym;
        var badge = document.getElementById('cmBadge');
        badge.textContent = isBuy ? 'BUY' : 'SELL';
        badge.className = isBuy ? 'b-buy' : 'b-sell';
        var liveBadge = document.getElementById('cmLiveBadge');
        if (liveBadge) liveBadge.style.display = 'inline-flex';
        document.getElementById('cmEntry').textContent = entry.toFixed(decimals);
        document.getElementById('cmExit').textContent = '—';
        document.getElementById('cmLot').textContent = lot.toFixed(2);
        var pnlEl = document.getElementById('cmPnl');
        pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
        pnlEl.style.fontWeight = '700';
        pnlEl.style.color = pnl >= 0 ? 'var(--g)' : 'var(--r)';

        document.body.style.overflow = 'hidden';
        chartOverlay.classList.add('active');
        chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:.8rem;color:#64748b;"><div class="ai-spinner" style="width:30px;height:30px;border:3px solid rgba(0,0,0,.1);border-top-color:' + posColor + ';border-radius:50%;animation:ai-spin .8s linear infinite;"></div><span>Loading Chart...</span></div>';

        var resolution = '15';
        var now = Math.floor(Date.now() / 1000);
        var visibleFrom = now - 48 * 3600; // 48h back
        var visibleTo = now + 3600;
        var datafeed = createTradeDatafeed(sym, resolution, decimals, true);

        ensureTradingView(function (err) {
            if (err) {
                chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i><span>TradingView konnte nicht geladen werden</span></div>';
                return;
            }

            chartContainer.innerHTML = '';
            try {
                tvWidget = new TradingView.widget({
                    container: chartContainer,
                    locale: 'en',
                    library_path: '/charting/charting_library/',
                    datafeed: datafeed,
                    symbol: sym,
                    interval: resolution,
                    fullscreen: false,
                    autosize: true,
                    theme: 'Light',
                    style: '1',
                    toolbar_bg: '#f9f7f6',
                    enable_publishing: false,
                    hide_top_toolbar: false,
                    hide_legend: false,
                    hide_side_toolbar: false,
                    allow_symbol_change: false,
                    save_image: false,
                    disabled_features: [
                        'header_symbol_search',
                        'symbol_search_hot_key',
                        'header_compare',
                        'header_undo_redo',
                        'go_to_date',
                        'timeframes_toolbar',
                        'use_localstorage_for_settings',
                        'create_volume_indicator_by_default',
                        'create_volume_indicator_by_default_once',
                    ],
                    enabled_features: [
                        'hide_left_toolbar_by_default',
                        'trading_notifications',
                    ],
                    overrides: {
                        // Flat candles — turquoise up, grey down
                        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.downColor': '#424242',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#424242',
                        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#424242',
                        'mainSeriesProperties.candleStyle.drawBorder': false,
                        // Clean background
                        'paneProperties.background': '#ffffff',
                        'paneProperties.backgroundType': 'solid',
                        'scalesProperties.backgroundColor': '#ffffff',
                        'scalesProperties.textColor': '#94a3b8',
                        'scalesProperties.fontSize': 11,
                        'scalesProperties.autoScale': false,
                        // Subtle grid
                        'paneProperties.vertGridProperties.color': 'rgba(0,0,0,0.025)',
                        'paneProperties.horzGridProperties.color': 'rgba(0,0,0,0.025)',
                        'paneProperties.crossHairProperties.color': '#cbd5e1',
                    },
                    loading_screen: {
                        backgroundColor: '#ffffff',
                        foregroundColor: posColor,
                    },
                });

                tvWidget.onChartReady(function () {
                    var chart = tvWidget.activeChart();
                    chart.setVisibleRange({ from: visibleFrom, to: visibleTo });

                    // ── Entry line (solid blue) with live P/L ──
                    var _entryLabel = (isBuy ? '▲ BUY' : '▼ SELL') + '  ' + lot.toFixed(2) + ' @ ' + entry.toFixed(decimals);
                    var _curShapeId = null;

                    function drawEntryLine(pnlSuffix) {
                        if (_curShapeId !== null) {
                            try { chart.removeEntity(_curShapeId); } catch (e) { }
                        }
                        _curShapeId = chart.createShape(
                            { time: visibleFrom, price: entry },
                            {
                                shape: 'horizontal_line',
                                lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                overrides: {
                                    linecolor: '#2563eb', linestyle: 0, linewidth: 1,
                                    showLabel: true, horzLabelsAlign: 'right', showPrice: true,
                                    text: _entryLabel + (pnlSuffix ? '     P/L: ' + pnlSuffix : ''),
                                    textcolor: '#1e293b', fontsize: 11, bold: true,
                                },
                            }
                        );
                    }
                    drawEntryLine(null);

                    // ── Live P/L from cTrader via WebSocket ──
                    _onPnlUpdate = function (pnls) {
                        if (!pnls || !pnls.length) return;
                        var totalNet = 0;
                        pnls.forEach(function (p) { totalNet += (p.netPnl || 0); });
                        var pnlVal = totalNet / 100;
                        var pnlText = (pnlVal >= 0 ? '+' : '') + '$' + pnlVal.toFixed(2);

                        drawEntryLine(pnlText);

                        var pH = document.getElementById('cmPnl');
                        if (pH) {
                            pH.textContent = pnlText;
                            pH.style.color = pnlVal >= 0 ? 'var(--g)' : 'var(--r)';
                        }
                    };

                    // Poll PnL every 2s
                    if (_pnlPollingTimer) clearInterval(_pnlPollingTimer);
                    _pnlPollingTimer = setInterval(function () {
                        if (!tvWidget || !chartOverlay.classList.contains('active')) {
                            clearInterval(_pnlPollingTimer);
                            _onPnlUpdate = null;
                            return;
                        }
                        if (_tickWs && _tickWsReady) {
                            _tickWs.send(JSON.stringify({ type: 'getPnl' }));
                        } else {
                            console.log('[PnL] WS not ready');
                        }
                    }, 2000);
                });
            } catch (e) {
                chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;">' +
                    '<i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i>' +
                    '<span>Chart konnte nicht geladen werden</span>' +
                    '<span style="font-size:.75rem;opacity:.5;">' + e.message + '</span></div>';
            }
        });
    }

    // Click handler for open position chart buttons
    document.querySelectorAll('.open-chart-btn').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            openPositionChart(
                btn.getAttribute('data-symbol'),
                parseFloat(btn.getAttribute('data-entry') || 0),
                btn.getAttribute('data-type') === 'BUY',
                parseFloat(btn.getAttribute('data-lot') || 0),
                parseFloat(btn.getAttribute('data-pnl') || 0),
                btn.getAttribute('data-order-id') || '',
                btn.getAttribute('data-meta-id') || '',
                btn.getAttribute('data-csrf') || ''
            );
        });
    });

    // ══════════════════════════════════════════════════════
    // ── Standalone USTEC Chart (Chart button in header) ──
    // ══════════════════════════════════════════════════════
    var standaloneChartBtn = document.getElementById('openStandaloneChart');
    if (standaloneChartBtn && chartOverlay) {
        standaloneChartBtn.addEventListener('click', function () {
            var sym = 'USTEC';
            var decimals = 1;
            var resolution = '15';
            var now = Math.floor(Date.now() / 1000);
            var visibleFrom = now - 48 * 3600;
            var visibleTo = now + 3600;

            // Set modal header for standalone chart
            var symEl = document.getElementById('cmSymbol');
            var badgeEl = document.getElementById('cmBadge');
            var entryEl = document.getElementById('cmEntry');
            var exitEl = document.getElementById('cmExit');
            var lotEl = document.getElementById('cmLot');
            var pnlWrap = document.getElementById('cmPnlWrap');
            var closePos = document.getElementById('cmClosePosition');

            if (symEl) symEl.textContent = sym;
            if (badgeEl) badgeEl.style.display = 'none';
            if (closePos) closePos.style.display = 'none';

            // Hide position info, show order panel
            var cmInfo = document.querySelector('#chartOverlay .cm-info');
            if (cmInfo) cmInfo.style.display = 'none';
            var orderPanel = document.getElementById('cmOrderPanel');
            if (orderPanel) orderPanel.style.display = '';

            // Order panel interactivity
            var _orderSide = 'buy';
            var _orderType = 'market';
            var qtyInput = document.getElementById('cmQtyInput');
            var submitBtn = document.getElementById('cmSubmitOrder');

            function updateSubmitBtn() {
                var qty = qtyInput ? qtyInput.value : '1';
                var label = (_orderSide === 'buy' ? 'Buy' : 'Sell') + ' ' + qty + ' ' + _orderType.charAt(0).toUpperCase() + _orderType.slice(1);
                if (submitBtn) {
                    submitBtn.textContent = label;
                    submitBtn.className = 'op-submit ' + _orderSide;
                }
            }

            // Type buttons
            document.querySelectorAll('#cmOrderPanel .op-type-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#cmOrderPanel .op-type-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    _orderType = btn.getAttribute('data-type');
                    updateSubmitBtn();
                });
            });

            // Side buttons
            var sideBuy = document.getElementById('cmSideBuy');
            var sideSell = document.getElementById('cmSideSell');
            if (sideBuy) sideBuy.onclick = function() {
                _orderSide = 'buy';
                sideBuy.className = 'op-side-btn active-buy';
                sideSell.className = 'op-side-btn active-sell';
                updateSubmitBtn();
            };
            if (sideSell) sideSell.onclick = function() {
                _orderSide = 'sell';
                sideSell.className = 'op-side-btn sell-active';
                sideBuy.className = 'op-side-btn buy-inactive';
                updateSubmitBtn();
            };

            // Qty +/-
            var qtyMinus = document.getElementById('cmQtyMinus');
            var qtyPlus = document.getElementById('cmQtyPlus');
            if (qtyMinus) qtyMinus.onclick = function() { var v = parseFloat(qtyInput.value) - 1; if (v >= 0.01) { qtyInput.value = v; updateSubmitBtn(); } };
            if (qtyPlus) qtyPlus.onclick = function() { qtyInput.value = parseFloat(qtyInput.value) + 1; updateSubmitBtn(); };
            if (qtyInput) qtyInput.addEventListener('input', updateSubmitBtn);

            // Presets
            document.querySelectorAll('#cmOrderPanel .op-preset-btn').forEach(function(btn) {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('#cmOrderPanel .op-preset-btn').forEach(function(b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    if (qtyInput) qtyInput.value = btn.getAttribute('data-qty');
                    updateSubmitBtn();
                });
            });

            updateSubmitBtn();

            var liveBadge = document.getElementById('cmLiveBadge');
            if (liveBadge) { liveBadge.style.display = 'inline-flex'; }

            document.body.style.overflow = 'hidden';
            chartOverlay.classList.add('active');
            chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;gap:.8rem;color:#64748b;"><div class="ai-spinner" style="width:30px;height:30px;border:3px solid rgba(0,0,0,.1);border-top-color:#4338ca;border-radius:50%;animation:ai-spin .8s linear infinite;"></div><span>Loading Chart...</span></div>';

            var datafeed = createTradeDatafeed(sym, resolution, decimals, true);

            // Intercept getBars to collect bar data for killzones
            var _collectedBars = [];
            var _origGetBars = datafeed.getBars.bind(datafeed);
            datafeed.getBars = function (symbolInfo, resolution, periodParams, onResult, onError) {
                _origGetBars(symbolInfo, resolution, periodParams, function (bars, meta) {
                    if (bars && bars.length) {
                        bars.forEach(function (b) { _collectedBars.push({ time: b.time, high: b.high, low: b.low }); });
                    }
                    onResult(bars, meta);
                }, onError);
            };

            ensureTradingView(function (err) {
                if (err) {
                    chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;"><i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i><span>TradingView konnte nicht geladen werden</span></div>';
                    return;
                }

                chartContainer.innerHTML = '';
                try {
                    tvWidget = new TradingView.widget({
                        container: chartContainer,
                        locale: 'en',
                        library_path: '/charting/charting_library/',
                        datafeed: datafeed,
                        symbol: sym,
                        interval: resolution,
                        fullscreen: false,
                        autosize: true,
                        theme: 'Light',
                        style: '1',
                        toolbar_bg: '#f9f7f6',
                        enable_publishing: false,
                        hide_top_toolbar: false,
                        hide_legend: false,
                        hide_side_toolbar: false,
                        allow_symbol_change: false,
                        save_image: false,
                        disabled_features: [
                            'header_symbol_search',
                            'symbol_search_hot_key',
                            'header_compare',
                            'header_undo_redo',
                            'header_settings',
                            'go_to_date',
                            'timeframes_toolbar',
                            'use_localstorage_for_settings',
                            'create_volume_indicator_by_default',
                            'create_volume_indicator_by_default_once',
                            'legend_context_menu',
                            'show_chart_property_page',
                            'chart_property_page_scales',
                            'chart_property_page_background',
                            'chart_property_page_trading',
                            // 'edit_buttons_in_legend',
                            // 'context_menus',
                            'display_market_status',
                        ],
                        enabled_features: [
                            'hide_left_toolbar_by_default',
                        ],
                        overrides: {
                            'mainSeriesProperties.candleStyle.upColor': '#26a69a',
                            'mainSeriesProperties.candleStyle.downColor': '#424242',
                            'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
                            'mainSeriesProperties.candleStyle.wickDownColor': '#424242',
                            'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
                            'mainSeriesProperties.candleStyle.borderDownColor': '#424242',
                            'mainSeriesProperties.candleStyle.drawBorder': false,
                            'paneProperties.background': '#ffffff',
                            'paneProperties.backgroundType': 'solid',
                            'scalesProperties.backgroundColor': '#ffffff',
                            'scalesProperties.textColor': '#94a3b8',
                            'paneProperties.vertGridProperties.color': 'rgba(0,0,0,0.025)',
                            'paneProperties.horzGridProperties.color': 'rgba(0,0,0,0.025)',
                            'paneProperties.crossHairProperties.color': '#cbd5e1',
                            'paneProperties.legendProperties.showSeriesOHLC': true,
                            'paneProperties.legendProperties.showStudyArguments': false,
                            'paneProperties.legendProperties.showStudyTitles': true,
                            'paneProperties.legendProperties.showStudyValues': false,
                            'paneProperties.legendProperties.showBarChange': false,
                            'paneProperties.legendProperties.showVolume': false,
                        },
                        // no custom indicators
                        loading_screen: {
                            backgroundColor: '#ffffff',
                            foregroundColor: '#4338ca',
                        },
                    });

                    window._tvWidgetInstance = tvWidget;
                    tvWidget.onChartReady(function () {
                        var chart = tvWidget.activeChart();
                        chart.setVisibleRange({ from: visibleFrom, to: visibleTo });
                        chart.getAllStudies().forEach(function (s) { chart.removeEntity(s.id); });

                        // Shape tracking for toggling studies (ids + draw data for re-creation)
                        window._studyShapes = { depthZones: [], killzones: [] };
                        window._studyData = { depthZones: [], killzones: [] };

                        // Depth Zones as rectangles + WS for price
                        function drawDepthRects(price) {
                            var offset = 100, step = offset / 5;
                            var vr = chart.getVisibleRange();
                            var farLeft = Math.floor(vr.to - 900);
                            var farRight = Math.floor(vr.to + 90000);
                            var upTr = [60, 72, 82, 90];
                            var dnTr = [60, 72, 82, 90];
                            for (var i = 0; i < 4; i++) {
                                var pts1 = [{ time: farLeft, price: price + step * (i + 1) }, { time: farRight, price: price + step * (i + 2) }];
                                var opts1 = { shape: 'rectangle', lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: { backgroundColor: '#ff5000', color: '#ff500000', transparency: upTr[i], fillBackground: true, linewidth: 0 } };
                                var pts2 = [{ time: farLeft, price: price - step * (i + 1) }, { time: farRight, price: price - step * (i + 2) }];
                                var opts2 = { shape: 'rectangle', lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: { backgroundColor: '#0078ff', color: '#0078ff00', transparency: dnTr[i], fillBackground: true, linewidth: 0 } };
                                var id1 = chart.createMultipointShape(pts1, opts1);
                                var id2 = chart.createMultipointShape(pts2, opts2);
                                if (id1) { window._studyShapes.depthZones.push(id1); window._studyData.depthZones.push({pts: pts1, opts: opts1}); }
                                if (id2) { window._studyShapes.depthZones.push(id2); window._studyData.depthZones.push({pts: pts2, opts: opts2}); }
                            }
                        }

                        // Connect WS, draw depth zones + load positions
                        var posPanel = document.getElementById('cmPositionsPanel');
                        var posBody = document.getElementById('cmPosBody');
                        var posCount = document.getElementById('cmPosCount');
                        var posPnl = document.getElementById('cmPosPnl');

                        // Render positions from Denies API data (already on page)
                        function renderApiPositions() {
                            if (!posBody || !posPanel) return;
                            posPanel.style.display = '';
                            var orders = window.__OPEN_POSITIONS__ || [];
                            var balance = window.__ACCOUNT_BALANCE__ || 0;
                            var balanceEl = document.getElementById('cmPosBalance');
                            if (balanceEl) balanceEl.textContent = '$' + balance.toFixed(2);

                            var totalPnl = 0;
                            var rows = '';
                            orders.forEach(function (o) {
                                var sym = o.OrderSymbol || o.orderSymbol || o.order_symbol || '-';
                                var side = (o.OrderType || o.orderType || o.order_type || 0);
                                var isBuy = side === 0 || side === 'Buy' || side === 'BUY';
                                var sideLabel = isBuy ? 'Long' : 'Short';
                                var sideClass = isBuy ? 'side-long' : 'side-short';
                                var lot = parseFloat(o.OrderLot || o.orderLot || o.order_lot || 0);
                                var entry = parseFloat(o.OrderPrice || o.orderPrice || o.order_price || 0);
                                var pnl = parseFloat(o.OrderProfit || o.orderProfit || o.order_profit || 0);
                                totalPnl += pnl;
                                var pnlClass = pnl >= 0 ? 'pnl-pos' : 'pnl-neg';
                                var pnlStr = (pnl >= 0 ? '+$' : '$') + pnl.toFixed(2);
                                var openAt = o.order_open_at || o.OrderOpenAt || o.orderOpenAt || '';
                                var timeStr = openAt ? openAt.substring(11, 19) : '-';
                                var ticket = o.OrderTicket || o.orderTicket || o.order_ticket || 0;
                                rows += '<tr>' +
                                    '<td><strong>' + sym + '</strong></td>' +
                                    '<td class="' + sideClass + '">' + sideLabel + '</td>' +
                                    '<td>' + lot.toFixed(2) + '</td>' +
                                    '<td>' + entry.toFixed(2) + '</td>' +
                                    '<td class="' + pnlClass + '"><strong>' + pnlStr + '</strong></td>' +
                                    '<td>' + timeStr + '</td>' +
                                    '<td><button class="cm-pos-close-btn" data-ticket="' + ticket + '">Close</button></td>' +
                                    '</tr>';
                            });
                            posBody.innerHTML = rows || '<tr><td colspan="7" style="text-align:center;color:#94a3b8;padding:16px;">No open positions</td></tr>';
                            if (posCount) posCount.textContent = orders.length;
                            if (posPnl) {
                                posPnl.textContent = (totalPnl >= 0 ? '+$' : '$') + totalPnl.toFixed(2);
                                posPnl.className = totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg';
                            }
                            // Sync mobile header stats
                            var hPnl = document.getElementById('cmHeaderPnl');
                            var hBal = document.getElementById('cmHeaderBalance');
                            if (hPnl) {
                                hPnl.textContent = (totalPnl >= 0 ? '+$' : '$') + totalPnl.toFixed(2);
                                hPnl.className = totalPnl >= 0 ? 'pnl-pos' : 'pnl-neg';
                            }
                            if (hBal) hBal.textContent = '$' + balance.toFixed(2);
                        }
                        renderApiPositions();

                        // Draw positions on chart as entry lines
                        var orders = window.__OPEN_POSITIONS__ || [];
                        orders.forEach(function(o) {
                            var sym = o.OrderSymbol || o.orderSymbol || o.order_symbol || '';
                            var side = (o.OrderType || o.orderType || o.order_type || 0);
                            var isBuy = side === 0 || side === 'Buy' || side === 'BUY';
                            var entry = parseFloat(o.OrderPrice || o.orderPrice || o.order_price || 0);
                            var lot = parseFloat(o.OrderLot || o.orderLot || o.order_lot || 0);
                            var pnl = parseFloat(o.OrderProfit || o.orderProfit || o.order_profit || 0);
                            if (!entry || entry < 1) return;
                            var color = isBuy ? '#16a34a' : '#dc2626';
                            var pnlStr = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
                            var label = (isBuy ? '▲ BUY' : '▼ SELL') + '  ' + lot.toFixed(2) + ' @ ' + pnlStr;
                            var now = Math.floor(Date.now() / 1000);
                            chart.createShape(
                                { time: now, price: entry },
                                {
                                    shape: 'horizontal_line', lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: {
                                        linecolor: '#2563eb', linestyle: 0, linewidth: 1,
                                        showLabel: true, showPrice: true,
                                        text: label, textcolor: '#1e293b', fontsize: 10,
                                        horzLabelsAlign: 'right', bold: true,
                                    }
                                }
                            );
                        });

                        ensureTickWs(function (ok) {
                            if (ok) {
                                var _depthDrawn = false;
                                var bidPriceEl = document.getElementById('cmBidPrice');
                                var askPriceEl = document.getElementById('cmAskPrice');
                                subscribeTickWs(sym, function (bid, ask, time) {
                                    if (!_depthDrawn && bid) {
                                        _depthDrawn = true;
                                        drawDepthRects(bid);
                                    }
                                    if (bidPriceEl && bid) bidPriceEl.textContent = 'BID ' + bid.toFixed(1);
                                    if (askPriceEl && ask) askPriceEl.textContent = 'ASK ' + ask.toFixed(1);
                                });
                                // Load positions
                                console.log('[StandaloneChart] Requesting positions...');
                                _tickWs.send(JSON.stringify({ type: 'getPositions' }));
                                _tickWs.send(JSON.stringify({ type: 'getLiveData' }));
                                var _posInterval = setInterval(function () {
                                    if (!chartOverlay.classList.contains('active')) { clearInterval(_posInterval); return; }
                                    if (_tickWs && _tickWsReady) _tickWs.send(JSON.stringify({ type: 'getLiveData' }));
                                }, 3000);
                            }
                        });

                        // Killzones from exported bar data
                        function _toNYMin2(ts) {
                            var d = new Date(ts), m = d.getUTCMonth(), dy = d.getUTCDate(), dst = false;
                            if (m > 2 && m < 10) dst = true;
                            else if (m === 2) { var s = 14 - new Date(d.getUTCFullYear(), 2, 1).getUTCDay(); dst = dy >= s; }
                            else if (m === 10) { var f = 7 - new Date(d.getUTCFullYear(), 10, 1).getUTCDay(); dst = dy < f; }
                            return ((d.getUTCHours() + 24 + (dst ? -4 : -5)) % 24) * 60 + d.getUTCMinutes();
                        }
                        var _kzSessions2 = [
                            [1200, 1440, '#2962ff', 'Asia'], [120, 300, '#ef5350', 'London'],
                            [570, 660, '#089981', 'NY AM'], [720, 780, '#ffeb3b', 'NY Lunch'], [810, 960, '#9c27b0', 'NY PM']
                        ];
                        // Killzones from collected bar data (intercepted from datafeed)
                        setTimeout(function () {
                            if (!_collectedBars.length) { console.warn('[Killzones] No bars collected'); return; }
                            // Sort and deduplicate
                            _collectedBars.sort(function (a, b) { return a.time - b.time; });
                            var sessions = [], active = {};
                            var cutoff = Date.now() - 3 * 86400000;
                            _collectedBars.forEach(function (bar) {
                                if (bar.time < cutoff) return;
                                var t = _toNYMin2(bar.time);
                                _kzSessions2.forEach(function (kz, idx) {
                                    var inS = (kz[0] < kz[1]) ? (t >= kz[0] && t < kz[1]) : (t >= kz[0] || t < kz[1]);
                                    if (inS) {
                                        if (!active[idx]) active[idx] = { startTime: bar.time / 1000, high: bar.high, low: bar.low, highTime: bar.time / 1000, lowTime: bar.time / 1000, color: kz[2], label: kz[3] };
                                        else {
                                            if (bar.high > active[idx].high) { active[idx].high = bar.high; active[idx].highTime = bar.time / 1000; }
                                            if (bar.low < active[idx].low) { active[idx].low = bar.low; active[idx].lowTime = bar.time / 1000; }
                                            active[idx].endTime = bar.time / 1000;
                                        }
                                    } else if (active[idx]) {
                                        active[idx].endTime = active[idx].endTime || bar.time / 1000;
                                        sessions.push(active[idx]);
                                        delete active[idx];
                                    }
                                });
                            });
                            Object.keys(active).forEach(function (k) { active[k].endTime = active[k].endTime || Math.floor(Date.now() / 1000); sessions.push(active[k]); });

                            // Find mitigation points: where price touches the session high/low after session ends
                            var sortedBars = _collectedBars.filter(function(b) { return b.time >= cutoff; });
                            sessions.forEach(function (s) {
                                var sessionEndMs = (s.endTime || s.startTime) * 1000;
                                s.highEndTime = null;
                                s.lowEndTime = null;
                                for (var bi = 0; bi < sortedBars.length; bi++) {
                                    var b = sortedBars[bi];
                                    if (b.time <= sessionEndMs) continue;
                                    // High mitigated when bar's high reaches session high
                                    if (!s.highEndTime && b.high >= s.high) s.highEndTime = b.time / 1000;
                                    // Low mitigated when bar's low reaches session low
                                    if (!s.lowEndTime && b.low <= s.low) s.lowEndTime = b.time / 1000;
                                    if (s.highEndTime && s.lowEndTime) break;
                                }
                                // Unmitigated lines extend to last bar + 5 bars
                                var lastBarTime = sortedBars.length ? sortedBars[sortedBars.length - 1].time / 1000 : s.endTime;
                                var barInterval = sortedBars.length > 1 ? (sortedBars[sortedBars.length - 1].time - sortedBars[sortedBars.length - 2].time) / 1000 : 900;
                                var defaultEnd = lastBarTime + (barInterval * 5);
                                var highEnd = s.highEndTime || defaultEnd;
                                var lowEnd = s.lowEndTime || defaultEnd;

                                var kzPts1 = [{ time: s.highTime || s.startTime, price: s.high }, { time: highEnd, price: s.high }];
                                var kzOpts1 = { shape: 'trend_line', lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: { linecolor: '#94a3b8', linestyle: 0, linewidth: 1, showLabel: true, text: s.label + ' H', textcolor: '#94a3b8', fontsize: 7, vertLabelsAlign: 'bottom' } };
                                var kzPts2 = [{ time: s.lowTime || s.startTime, price: s.low }, { time: lowEnd, price: s.low }];
                                var kzOpts2 = { shape: 'trend_line', lock: true, disableSelection: true, disableSave: true, disableUndo: true,
                                    overrides: { linecolor: '#94a3b8', linestyle: 0, linewidth: 1, showLabel: true, text: s.label + ' L', textcolor: '#94a3b8', fontsize: 7, vertLabelsAlign: 'top' } };
                                var kzId1 = chart.createMultipointShape(kzPts1, kzOpts1);
                                var kzId2 = chart.createMultipointShape(kzPts2, kzOpts2);
                                if (kzId1) { window._studyShapes.killzones.push(kzId1); window._studyData.killzones.push({pts: kzPts1, opts: kzOpts1}); }
                                if (kzId2) { window._studyShapes.killzones.push(kzId2); window._studyData.killzones.push({pts: kzPts2, opts: kzOpts2}); }
                            });
                            console.log('[Killzones] Drew ' + sessions.length + ' sessions from ' + _collectedBars.length + ' bars');
                        }, 4000);
                    });
                } catch (e) {
                    chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;flex-direction:column;gap:1rem;color:#64748b;">' +
                        '<i class="fas fa-exclamation-triangle" style="font-size:2rem;opacity:.4;"></i>' +
                        '<span>Chart konnte nicht geladen werden</span>' +
                        '<span style="font-size:.75rem;opacity:.5;">' + e.message + '</span></div>';
                }
            });
        });
    }

    // ══════════════════════════════════════════════════════
    // ── WebSocket Tick Stream Manager ──
    // ══════════════════════════════════════════════════════
    var _tickWs = null;
    var _tickWsReady = false;
    var _tickCallbacks = {}; // symbol → [callback, callback, ...]
    var _tickWsQueue = []; // messages to send after auth
    var _onPnlUpdate = null;
    var _onPositionsUpdate = null;
    var _pnlPollingTimer = null;

    function ensureTickWs(cb) {
        var wsConfig = window.__CTRADER_WS__;
        if (!wsConfig) { if (cb) cb(false); return; }

        if (_tickWs && _tickWsReady) { if (cb) cb(true); return; }
        if (_tickWs) { if (cb) _tickWsQueue.push(cb); return; } // connecting

        var wsUrl = (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws';
        _tickWs = new WebSocket(wsUrl);

        _tickWs.onopen = function () {
            // Send auth
            _tickWs.send(JSON.stringify({
                type: 'auth',
                accessToken: wsConfig.accessToken,
                ctid: wsConfig.ctid,
                isLive: wsConfig.isLive,
            }));
        };

        _tickWs.onmessage = function (evt) {
            var msg;
            try { msg = JSON.parse(evt.data); } catch (e) { return; }

            if (msg.type === 'auth' && msg.status === 'ok') {
                _tickWsReady = true;
                console.log('[TickStream] WebSocket authenticated');
                if (cb) cb(true);
                _tickWsQueue.forEach(function (fn) { fn(true); });
                _tickWsQueue = [];
                return;
            }

            if (msg.type === 'tick') {
                var fns = _tickCallbacks[msg.symbol];
                if (fns) fns.forEach(function (fn) { fn(msg.bid, msg.ask, msg.time); });
            }

            if (msg.type === 'pnl' && _onPnlUpdate) {
                _onPnlUpdate(msg.pnls);
            }

            if (msg.type === 'positions') {
                console.log('[WS] Received positions:', msg.positions ? msg.positions.length : 0);
                if (_onPositionsUpdate) _onPositionsUpdate(msg.positions);
                // Also render in standalone chart panel
                if (typeof window.renderStandalonePositions === 'function') {
                    window.renderStandalonePositions(msg.positions, null);
                }
            }

            if (msg.type === 'liveData') {
                console.log('[WS] liveData received — positions:', msg.positions ? msg.positions.length : 0, 'pnls:', msg.pnls ? msg.pnls.length : 0);
                // Always update cached data so standalone chart can use it
                if (msg.pnls) _lastPnls = msg.pnls;
                if (msg.positions) _lastPositions = msg.positions;

                // Standalone chart positions panel (independent of _autoUpdateActive)
                if (msg.positions && typeof window.renderStandalonePositions === 'function') {
                    window.renderStandalonePositions(msg.positions, msg.pnls);
                }

                // Auto-update dashboard panels (only when toggle is active)
                if (_autoUpdateActive) {
                    if (msg.positions) {
                        renderLivePositions();
                        updateLiveStats();
                    }
                }
                // Also forward to chart modal pnl handler if open
                if (_onPnlUpdate && msg.pnls) _onPnlUpdate(msg.pnls);
            }

            if (msg.type === 'positionClosed') {
                console.log('[WS] Position closed: ' + msg.positionId);
                fetchLiveData(); // refresh immediately
            }

            if (msg.type === 'allPositionsClosed') {
                console.log('[WS] All positions closed: ' + msg.closed + '/' + msg.total);
                var cab = document.getElementById('closeAllBtn');
                if (cab) cab.innerHTML = '<i class="fas fa-times-circle me-1"></i>Alle schließen';
                if (msg.failed > 0) alert(msg.failed + ' von ' + msg.total + ' Positionen konnten nicht geschlossen werden.');
                fetchLiveData();
            }

            if (msg.type === 'closeError') {
                alert('Fehler beim Schließen: ' + (msg.error || 'Unbekannt'));
                var cab2 = document.getElementById('closeAllBtn');
                if (cab2) cab2.innerHTML = '<i class="fas fa-times-circle me-1"></i>Alle schließen';
            }
        };

        _tickWs.onerror = function () {
            console.warn('[TickStream] WebSocket error, falling back to polling');
            _tickWsReady = false;
            if (cb) cb(false);
            _tickWsQueue.forEach(function (fn) { fn(false); });
            _tickWsQueue = [];
        };

        _tickWs.onclose = function () {
            _tickWsReady = false;
            _tickWs = null;
            console.log('[TickStream] WebSocket closed');
        };
    }

    function subscribeTickWs(symbol, callback) {
        if (!_tickCallbacks[symbol]) _tickCallbacks[symbol] = [];
        _tickCallbacks[symbol].push(callback);
        ensureTickWs(function (ok) {
            if (ok && _tickWs) {
                _tickWs.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
                console.log('[TickStream] Subscribed to ' + symbol);
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // ── Live Market Data TradingView DataFeed ──
    // ══════════════════════════════════════════════════════
    function createTradeDatafeed(symbol, resolution, pricescale, enableRealtime) {
        var psVal = Math.pow(10, pricescale);
        var barsCache = {};
        var realtimeSubscriptions = {};
        var realtimeIntervals = {};
        var lastBar = null;

        function cacheKey(res, from, to) { return res + '_' + from + '_' + to; }

        // Polling interval — fast enough for near-realtime feel
        function getPollingInterval(res) {
            var map = { '1': 3000, '5': 5000, '15': 5000, '30': 10000, '60': 15000, '240': 30000, 'D': 60000 };
            return map[res] || 5000;
        }

        // Resolution → bar duration in ms
        function getBarDuration(res) {
            var map = { '1': 60000, '5': 300000, '15': 900000, '30': 1800000, '60': 3600000, '240': 14400000, 'D': 86400000 };
            return map[res] || 900000;
        }

        var newestBarTime = 0; // tracks the newest bar time we've ever seen

        var feed = {
            _lastPrice: 0,
            onReady: function (cb) {
                setTimeout(function () {
                    cb({
                        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
                        supports_marks: false,
                        supports_timescale_marks: false,
                        supports_time: true,
                    });
                }, 0);
            },

            searchSymbols: function (userInput, exchange, symbolType, onResult) {
                onResult([]);
            },

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
                        data_status: 'streaming',
                    });
                }, 0);
            },

            getBars: function (symbolInfo, resolution, periodParams, onResult, onError) {
                var from = periodParams.from;
                var to = periodParams.to;
                var ck = cacheKey(resolution, from, to);

                if (barsCache[ck]) {
                    var cached = barsCache[ck];
                    onResult(cached.bars, { noData: cached.bars.length === 0 });
                    return;
                }

                var url = '/api/chart-data?symbol=' + encodeURIComponent(symbol) +
                    '&resolution=' + encodeURIComponent(resolution) +
                    '&from=' + from + '&to=' + to +
                    (accountLogin ? '&account=' + accountLogin : '');

                fetch(url)
                    .then(function (r) { return r.json(); })
                    .then(function (data) {
                        console.log('[ChartData] source=' + (data.source || '?') + ' bars=' + (data.t ? data.t.length : 0) + ' url=' + url);
                        if (data.source === 'yahoo') console.warn('[ChartData] Using Yahoo fallback - prices may differ from broker! Add &debug to URL for details.');
                        if (data.s !== 'ok' || !data.t || data.t.length === 0) {
                            barsCache[ck] = { bars: [] };
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
                                volume: data.v[i],
                            });
                        }

                        barsCache[ck] = { bars: bars };
                        if (bars.length > 0) {
                            var newest = bars[bars.length - 1];
                            if (newest.time >= newestBarTime) {
                                lastBar = newest;
                                newestBarTime = newest.time;
                                feed._lastPrice = lastBar.close;
                            }
                        }
                        onResult(bars, { noData: false });
                    })
                    .catch(function (err) {
                        console.error('Chart data fetch error:', err);
                        onResult([], { noData: true });
                    });
            },

            subscribeBars: function (symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
                if (!enableRealtime) return;

                var barDuration = getBarDuration(resolution);
                var wsConnected = false;

                // Try WebSocket first, fall back to polling
                if (window.__CTRADER_WS__) {
                    subscribeTickWs(symbol, function (bid, ask, tickTime) {
                        wsConnected = true;
                        var price = bid || ask;
                        if (!price || !lastBar) return;
                        feed._lastPrice = price;

                        // Only update the current bar — never create new bars from ticks
                        // (new bars come from polling getBars)
                        lastBar.high = Math.max(lastBar.high, price);
                        lastBar.low = Math.min(lastBar.low, price);
                        lastBar.close = price;

                        try { onRealtimeCallback(lastBar); } catch (e) { }
                    });
                }

                // Polling fallback only when WebSocket is NOT connected
                if (!window.__CTRADER_WS__) {
                    var pollMs = getPollingInterval(resolution);
                    realtimeIntervals[subscriberUID] = setInterval(function () {
                        var now = Math.floor(Date.now() / 1000);
                        var from = now - 600;
                        var url = '/api/chart-data?symbol=' + encodeURIComponent(symbol) +
                            '&resolution=' + encodeURIComponent(resolution) +
                            '&from=' + from + '&to=' + now +
                            (accountLogin ? '&account=' + accountLogin : '');

                        fetch(url)
                            .then(function (r) { return r.json(); })
                            .then(function (data) {
                                if (data.s !== 'ok' || !data.t || data.t.length === 0) return;
                                var lastIdx = data.t.length - 1;
                                var bar = {
                                    time: data.t[lastIdx] * 1000,
                                    open: data.o[lastIdx],
                                    high: data.h[lastIdx],
                                    low: data.l[lastIdx],
                                    close: data.c[lastIdx],
                                    volume: data.v[lastIdx],
                                };
                                if (!lastBar || bar.time >= lastBar.time) {
                                    lastBar = bar;
                                    feed._lastPrice = bar.close;
                                    try { onRealtimeCallback(bar); } catch (e) { }
                                }
                            })
                            .catch(function () { });
                    }, pollMs);
                }

                realtimeSubscriptions[subscriberUID] = true;
            },

            unsubscribeBars: function (subscriberUID) {
                if (realtimeIntervals[subscriberUID]) {
                    clearInterval(realtimeIntervals[subscriberUID]);
                    delete realtimeIntervals[subscriberUID];
                }
                delete realtimeSubscriptions[subscriberUID];
            },
        };
        return feed;
    }

    // ══════════════════════════════════════════════════════
    // ── Charts (Chart.js) ──
    // ══════════════════════════════════════════════════════
    var sortedDays = Object.keys(dayMap).sort();

    var ctx1 = document.getElementById('dailyPnlChart');
    if (ctx1 && sortedDays.length > 0) {
        var profits = sortedDays.map(function (d) { return dayMap[d].pnl; });
        new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: sortedDays,
                datasets: [{
                    data: profits,
                    backgroundColor: profits.map(function (v) { return v >= 0 ? 'rgba(22,163,74,.6)' : 'rgba(220,38,38,.6)'; }),
                    hoverBackgroundColor: profits.map(function (v) { return v >= 0 ? 'rgba(22,163,74,.9)' : 'rgba(220,38,38,.9)'; }),
                    borderRadius: 3, borderSkipped: false, barPercentage: 0.6
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(255,255,255,.95)', borderColor: 'rgba(0,0,0,.1)', borderWidth: 1, padding: 8, titleColor: '#1e293b', bodyColor: '#1e293b', callbacks: { label: function (c) { return (c.parsed.y >= 0 ? '+' : '') + c.parsed.y.toFixed(2) + ' $'; } } } },
                scales: { x: { grid: { display: false }, ticks: { color: 'rgba(0,0,0,.35)', font: { size: 9 }, maxRotation: 45 } }, y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { color: 'rgba(0,0,0,.35)', font: { size: 9 }, callback: function (v) { return v.toFixed(0) + '$'; } } } }
            }
        });
    }

    var ctx2 = document.getElementById('cumulativeChart');
    if (ctx2 && sortedDays.length > 0) {
        var cum = 0;
        var cumData = sortedDays.map(function (d) { cum += dayMap[d].pnl; return cum; });
        var lineColor = cum >= 0 ? 'rgba(22,163,74,.8)' : 'rgba(220,38,38,.8)';
        var fillColor = cum >= 0 ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)';
        new Chart(ctx2, {
            type: 'line',
            data: {
                labels: sortedDays,
                datasets: [{ data: cumData, borderColor: lineColor, backgroundColor: fillColor, fill: true, tension: 0.3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(255,255,255,.95)', borderColor: 'rgba(0,0,0,.1)', borderWidth: 1, padding: 8, titleColor: '#1e293b', bodyColor: '#1e293b', callbacks: { label: function (c) { return (c.parsed.y >= 0 ? '+' : '') + c.parsed.y.toFixed(2) + ' $'; } } } },
                scales: { x: { grid: { display: false }, ticks: { color: 'rgba(0,0,0,.35)', font: { size: 9 }, maxRotation: 45 } }, y: { grid: { color: 'rgba(0,0,0,.06)' }, ticks: { color: 'rgba(0,0,0,.35)', font: { size: 9 }, callback: function (v) { return v.toFixed(0) + '$'; } } } }
            }
        });
    }

    // ══════════════════════════════════════════════════════
    // ── Auto-Update: Live Positions + PNL via WebSocket ──
    // ══════════════════════════════════════════════════════
    var _autoUpdateActive = false;
    var _autoUpdateTimer = null;
    var _lastPositions = null;
    var _lastPnls = null;
    var autoBtn = document.getElementById('autoUpdateBtn');

    function setCloseButtonsEnabled(enabled) {
        // Per-position close buttons (server-rendered)
        document.querySelectorAll('.ws-close-btn').forEach(function (btn) {
            if (enabled) {
                btn.classList.remove('close-btn-disabled');
                btn.style.cursor = 'pointer';
                btn.title = 'Position schließen';
            } else {
                btn.classList.add('close-btn-disabled');
                btn.style.cursor = 'not-allowed';
                btn.title = 'Position schließen (Live Modus erforderlich)';
            }
        });
        // "Alle schließen" button
        var closeAllBtn = document.getElementById('closeAllBtn');
        if (closeAllBtn) {
            if (enabled) {
                closeAllBtn.classList.remove('close-all-disabled');
                closeAllBtn.style.cursor = 'pointer';
            } else {
                closeAllBtn.classList.add('close-all-disabled');
                closeAllBtn.style.cursor = 'not-allowed';
            }
        }
    }

    if (autoBtn) {
        autoBtn.addEventListener('click', function () {
            _autoUpdateActive = !_autoUpdateActive;
            autoBtn.classList.toggle('active', _autoUpdateActive);
            var indicator = document.getElementById('liveIndicator');

            if (_autoUpdateActive) {
                if (indicator) indicator.style.display = 'inline-flex';
                startAutoUpdate();
            } else {
                if (indicator) indicator.style.display = 'none';
                setCloseButtonsEnabled(false);
                stopAutoUpdate();
            }
        });
    }

    // ── Close button handlers (cTrader: WebSocket only) ──
    document.addEventListener('click', function (e) {
        var closeBtn = e.target.closest('.ws-close-btn');
        if (!closeBtn) return;
        e.preventDefault();

        if (!_autoUpdateActive || !_tickWs || !_tickWsReady) {
            alert('Bitte zuerst den LIVE Modus aktivieren, um Positionen zu schließen.');
            return;
        }

        if (!confirm('Position schließen?')) return;

        var posId = parseInt(closeBtn.getAttribute('data-position-id'));
        var rawVolume = parseInt(closeBtn.getAttribute('data-raw-volume') || 0);

        closeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        _tickWs.send(JSON.stringify({ type: 'closePosition', positionId: posId, volume: rawVolume }));
    });

    // ── Close All button handler ──
    var closeAllBtn = document.getElementById('closeAllBtn');
    if (closeAllBtn) {
        closeAllBtn.addEventListener('click', function () {
            if (!_autoUpdateActive || !_tickWs || !_tickWsReady) {
                alert('Bitte zuerst den LIVE Modus aktivieren, um Positionen zu schließen.');
                return;
            }

            var count = _lastPositions ? _lastPositions.length : '?';
            if (!confirm('Alle ' + count + ' Positionen schließen?')) return;

            closeAllBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Schließe...';
            _tickWs.send(JSON.stringify({ type: 'closeAllPositions' }));
        });
    }

    function startAutoUpdate() {
        if (_autoUpdateTimer) clearInterval(_autoUpdateTimer);

        ensureTickWs(function (ok) {
            if (!ok) {
                console.warn('[AutoUpdate] WebSocket not available');
                _autoUpdateActive = false;
                if (autoBtn) autoBtn.classList.remove('active');
                setCloseButtonsEnabled(false);
                return;
            }
            setCloseButtonsEnabled(true);
            fetchLiveData();
            _autoUpdateTimer = setInterval(fetchLiveData, 2000);
        });
    }

    function stopAutoUpdate() {
        if (_autoUpdateTimer) {
            clearInterval(_autoUpdateTimer);
            _autoUpdateTimer = null;
        }
    }

    function fetchLiveData() {
        if (!_tickWs || !_tickWsReady || !_autoUpdateActive) return;
        _tickWs.send(JSON.stringify({ type: 'getLiveData' }));
    }

    // Hook into existing WS message handler for positions + pnl
    _onPositionsUpdate = function (positions) {
        if (!_autoUpdateActive) return;
        _lastPositions = positions;
        renderLivePositions();
        updateLiveStats();
    };

    var _origPnlUpdate = _onPnlUpdate;
    _onPnlUpdate = function (pnls) {
        if (_origPnlUpdate) _origPnlUpdate(pnls);
        if (!_autoUpdateActive) return;
        _lastPnls = pnls;
        updateLiveStats();
    };

    function updateLiveStats() {
        if (!_lastPnls || !_lastPositions) return;

        var totalPnl = 0;
        _lastPnls.forEach(function (p) {
            totalPnl += (p.netPnl || 0) / 100;
        });

        var opEl = document.getElementById('liveOpenProfit');
        if (opEl) {
            var sign = totalPnl >= 0 ? '+' : '';
            opEl.textContent = sign + '$' + totalPnl.toFixed(2);
            opEl.className = 'val ' + (totalPnl >= 0 ? 'tg' : 'tr');
        }

        var opCard = document.getElementById('liveOpenProfitCard');
        if (opCard) {
            opCard.className = 'card-d p-3 h-100 ' + (totalPnl >= 0 ? 'accent-top' : 'accent-top-r');
        }

        var countEl = document.getElementById('livePositionCount');
        if (countEl) countEl.textContent = _lastPositions.length;

        var pctEl = document.getElementById('liveOpenProfitPct');
        var balEl = document.getElementById('liveBalance');
        if (pctEl && balEl) {
            var balText = balEl.textContent.replace(/[^0-9.,\-]/g, '').replace('.', '').replace(',', '.');
            var bal = parseFloat(balText) || 1;
            var pct = (totalPnl / bal) * 100;
            pctEl.textContent = pct.toFixed(2) + '%';
        }

        var eqEl = document.getElementById('liveEquity');
        if (eqEl && balEl) {
            var balText2 = balEl.textContent.replace(/[^0-9.,\-]/g, '').replace('.', '').replace(',', '.');
            var bal2 = parseFloat(balText2) || 0;
            var eq = bal2 + totalPnl;
            eqEl.textContent = '$' + formatNumber(eq);
        }

        var tsEl = document.getElementById('liveUpdatedAtTime');
        if (tsEl) {
            var now = new Date();
            tsEl.textContent = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
                ' ' + now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        }

        var statsRow = document.getElementById('liveStatsRow');
        if (statsRow) {
            statsRow.classList.remove('ws-update-flash');
            void statsRow.offsetWidth;
            statsRow.classList.add('ws-update-flash');
        }
    }

    function formatNumber(n) {
        var parts = n.toFixed(2).split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
        return parts.join(',');
    }

    function renderLivePositions() {
        if (!_lastPositions) return;
        var accountMetaId = window.__ACCOUNT_META_ID__ || '';

        var pnlMap = {};
        if (_lastPnls) {
            _lastPnls.forEach(function (p) {
                pnlMap[p.positionId] = (p.netPnl || 0) / 100;
            });
        }

        var card = document.getElementById('livePositionsCard');
        if (!card) return;

        var scrollDiv = card.querySelector('.scroll-t');
        var emptyDiv = card.querySelector('.empty');

        if (_lastPositions.length === 0) {
            if (scrollDiv) scrollDiv.style.display = 'none';
            if (!emptyDiv) {
                var emp = document.createElement('div');
                emp.className = 'empty';
                emp.innerHTML = '<i class="fas fa-inbox"></i>No open positions';
                card.appendChild(emp);
            } else {
                emptyDiv.style.display = '';
            }
            return;
        }

        if (emptyDiv) emptyDiv.style.display = 'none';

        var rows = '';
        _lastPositions.forEach(function (pos) {
            var pnl = pnlMap[pos.positionId] !== undefined ? pnlMap[pos.positionId] : 0;
            var isBuy = pos.side === 'BUY';
            var volume = parseFloat(pos.volume) || 0;
            var digits = pos.symbol.indexOf('JPY') >= 0 ? 3 : (pos.symbol.indexOf('XAU') >= 0 ? 2 : 5);
            var entryPrice = parseFloat(pos.entryPrice) || 0;

            if (entryPrice > 100000) {
                var sample = entryPrice, extra = 0;
                while (sample > 100000 && extra < 8) { extra++; sample /= 10; }
                entryPrice = entryPrice / Math.pow(10, extra);
            }

            rows += '<tr>' +
                '<td style="opacity:.4;">' + pos.positionId + '</td>' +
                '<td style="opacity:.6;font-size:.72rem;">' + (pos.openTime || '-') + '</td>' +
                '<td><strong>' + pos.symbol + '</strong>' +
                (accountPlatform === 'ctrader' ? ' <a href="#" class="open-chart-btn" data-symbol="' + pos.symbol +
                    '" data-account="' + accountLogin + '" data-order-id="' + pos.positionId +
                    '" data-meta-id="' + accountMetaId + '" data-entry="' + entryPrice +
                    '" data-lot="' + volume + '" data-pnl="' + pnl +
                    '" data-type="' + pos.side + '" data-csrf=""' +
                    ' title="Chart öffnen">' +
                    '<i class="fas fa-chart-area"></i> Chart</a>' : '') +
                '</td>' +
                '<td><span class="' + (isBuy ? 'b-buy' : 'b-sell') + '">' + pos.side + '</span></td>' +
                '<td>' + volume.toFixed(2) + '</td>' +
                '<td>' + entryPrice.toFixed(digits) + '</td>' +
                '<td style="text-align:right;font-weight:700" class="' + (pnl >= 0 ? 'tg' : 'tr') + '">' +
                (pnl >= 0 ? '+' : '') + pnl.toFixed(2) + '</td>' +
                '<td style="text-align:center;">' +
                (accountPlatform === 'ctrader' ?
                    '<button type="button" class="ws-close-btn" data-position-id="' + pos.positionId +
                    '" data-raw-volume="' + (pos.rawVolume || Math.round(pos.volume * 100)) +
                    '" style="background:none;border:none;cursor:pointer;color:var(--r);font-size:.85rem;padding:2px 6px;" title="Position schließen">' +
                    '<i class="fas fa-times"></i></button>' :
                    '<form method="post" action="/account/' + accountMetaId + '/close-order/' + pos.positionId +
                    '" style="display:inline;" onsubmit="return confirm(\'Position schließen?\');">' +
                    '<input type="hidden" name="_token" value="">' +
                    '<button type="submit" style="background:none;border:none;cursor:pointer;color:var(--r);font-size:.85rem;padding:2px 6px;" title="Position schließen">' +
                    '<i class="fas fa-times"></i></button></form>') +
                '</td></tr>';
        });

        if (!scrollDiv) {
            scrollDiv = document.createElement('div');
            scrollDiv.className = 'scroll-t';
            card.appendChild(scrollDiv);
        }
        scrollDiv.style.display = '';

        scrollDiv.innerHTML =
            '<table class="tt"><thead><tr>' +
            '<th>Ticket</th><th>Open Time</th><th>Symbol</th><th>Type</th>' +
            '<th>Lot</th><th>Entry</th><th style="text-align:right">Profit</th>' +
            '<th style="text-align:center;width:40px;"></th>' +
            '</tr></thead><tbody>' + rows + '</tbody></table>';

        // Re-attach chart button handlers
        scrollDiv.querySelectorAll('.open-chart-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                openPositionChart(
                    btn.getAttribute('data-symbol'),
                    parseFloat(btn.getAttribute('data-entry') || 0),
                    btn.getAttribute('data-type') === 'BUY',
                    parseFloat(btn.getAttribute('data-lot') || 0),
                    parseFloat(btn.getAttribute('data-pnl') || 0),
                    btn.getAttribute('data-order-id') || '',
                    btn.getAttribute('data-meta-id') || '',
                    btn.getAttribute('data-csrf') || ''
                );
            });
        });
    }
});
