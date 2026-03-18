/**
 * Denies Account Detail — Analytics, Calendar, Charts
 * Reads window.__DENIES_TRADES__ (injected by Twig)
 */
document.addEventListener('DOMContentLoaded', function () {
    var allTrades = window.__DENIES_TRADES__ || [];

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
                // Staggered reveal of sections
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

    // Build daily P/L map from ALL closed trades
    var dayMap = {};
    allTrades.forEach(function (t) {
        var closeAt = t.order_close_at || t.orderCloseAt || '';
        if (!closeAt) return;
        var date = closeAt.slice(0, 10);
        var pnl = parseFloat(t.order_profit || t.orderProfit || 0);
        if (!dayMap[date]) dayMap[date] = { pnl: 0, trades: 0, wins: 0, losses: 0 };
        dayMap[date].pnl += pnl;
        dayMap[date].trades++;
        if (pnl >= 0) dayMap[date].wins++; else dayMap[date].losses++;
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

    // ── Trade Calendar ──
    var calEl = document.getElementById('tradeCalendar');
    if (calEl) {
        var curDate = new Date();
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        function pad2(n) { return n < 10 ? '0' + n : '' + n; }

        function renderCalendar() {
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

            // Previous month fill
            for (var i = startDay - 1; i >= 0; i--) {
                h += '<div class="cal-day outside"><span class="day-num">' + (prevLast - i) + '</span></div>';
            }

            // Current month days
            for (var d = 1; d <= daysInMonth; d++) {
                var ds = year + '-' + pad2(month + 1) + '-' + pad2(d);
                var isToday = ds === todayStr;
                var data = dayMap[ds];
                h += '<div class="cal-day' + (isToday ? ' today' : '') + '">';
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

            // Next month fill
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
        }
        renderCalendar();
    }

    // ── Charts ──
    var sortedDays = Object.keys(dayMap).sort();

    // Daily P/L Bar Chart
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

    // Cumulative P/L Line Chart
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
});
