<?php

namespace App\Controller;

use App\Repository\AccountRepository;
use App\Service\CtraderMarketData;
use App\Service\DeniesClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class ChartDataController extends AbstractController
{
    private HttpClientInterface $httpClient;

    // Map broker symbols → Yahoo Finance symbols (fallback)
    private const SYMBOL_MAP = [
        'EURUSD' => 'EURUSD=X', 'GBPUSD' => 'GBPUSD=X', 'USDJPY' => 'USDJPY=X',
        'USDCHF' => 'USDCHF=X', 'AUDUSD' => 'AUDUSD=X', 'NZDUSD' => 'NZDUSD=X',
        'USDCAD' => 'USDCAD=X', 'EURGBP' => 'EURGBP=X', 'EURJPY' => 'EURJPY=X',
        'GBPJPY' => 'GBPJPY=X', 'EURCHF' => 'EURCHF=X', 'AUDCAD' => 'AUDCAD=X',
        'AUDCHF' => 'AUDCHF=X', 'AUDJPY' => 'AUDJPY=X', 'AUDNZD' => 'AUDNZD=X',
        'CADCHF' => 'CADCHF=X', 'CADJPY' => 'CADJPY=X', 'CHFJPY' => 'CHFJPY=X',
        'EURAUD' => 'EURAUD=X', 'EURCAD' => 'EURCAD=X', 'EURNZD' => 'EURNZD=X',
        'GBPAUD' => 'GBPAUD=X', 'GBPCAD' => 'GBPCAD=X', 'GBPCHF' => 'GBPCHF=X',
        'GBPNZD' => 'GBPNZD=X', 'NZDCAD' => 'NZDCAD=X', 'NZDCHF' => 'NZDCHF=X',
        'NZDJPY' => 'NZDJPY=X',
        'XAUUSD' => 'GC=F', 'GOLD' => 'GC=F', 'XAGUSD' => 'SI=F', 'SILVER' => 'SI=F',
        'XTIUSD' => 'CL=F', 'USOIL' => 'CL=F', 'UKOIL' => 'BZ=F', 'XBRUSD' => 'BZ=F',
        'US100' => 'NQ=F', 'NAS100' => 'NQ=F', 'USTEC' => 'NQ=F',
        'US30' => 'YM=F', 'DJ30' => 'YM=F', 'US500' => 'ES=F', 'SPX500' => 'ES=F',
        'DE40' => '^GDAXI', 'DAX' => '^GDAXI', 'GER40' => '^GDAXI',
        'UK100' => '^FTSE', 'JP225' => '^N225', 'FRA40' => '^FCHI',
        'BTCUSD' => 'BTC-USD', 'ETHUSD' => 'ETH-USD',
    ];

    private const INTERVAL_MAP = [
        '1' => '1m', '5' => '5m', '15' => '15m', '30' => '30m',
        '60' => '1h', '240' => '1h', 'D' => '1d', '1D' => '1d',
    ];

    private const RANGE_MAP = [
        '1m' => '7d', '5m' => '60d', '15m' => '60d', '30m' => '60d',
        '1h' => '730d', '1d' => '10y',
    ];

    public function __construct(HttpClientInterface $httpClient)
    {
        $this->httpClient = $httpClient;
    }

    #[Route('/api/chart-data', name: 'api_chart_data', methods: ['GET'])]
    public function chartData(Request $request, AccountRepository $accountRepository, DeniesClient $deniesClient): JsonResponse
    {
        $symbol = trim($request->query->get('symbol', ''));
        $resolution = $request->query->get('resolution', '5');
        $from = (int) $request->query->get('from', 0);
        $to = (int) $request->query->get('to', 0);
        $accountLogin = (int) $request->query->get('account', 0);
        $debug = $request->query->has('debug');

        $debugInfo = [
            'symbol' => $symbol,
            'account' => $accountLogin,
            'resolution' => $resolution,
            'from' => $from,
            'to' => $to,
            'steps' => [],
        ];

        if (!$symbol) {
            return new JsonResponse(['s' => 'error', 'errmsg' => 'Missing symbol'], 400);
        }

        // ── Try cTrader first if account is specified ──
        $ctraderError = null;
        if ($accountLogin > 0) {
            $debugInfo['steps'][] = 'ctrader: trying with account ' . $accountLogin;
            try {
                $result = $this->fetchFromCtrader($accountLogin, $symbol, $resolution, $from, $to, $accountRepository, $deniesClient, $debugInfo);
                if ($result) {
                    if ($debug) $result['_debug'] = $debugInfo;
                    return new JsonResponse($result);
                }
                $ctraderError = 'returned null';
                $debugInfo['steps'][] = 'ctrader: returned null, falling back to yahoo';
            } catch (\Exception $e) {
                $ctraderError = $e->getMessage();
                $debugInfo['steps'][] = 'ctrader: exception → ' . $e->getMessage();
            }
        } else {
            $debugInfo['steps'][] = 'ctrader: skipped (no account param)';
        }

        // ── Fallback: Yahoo Finance ──
        $debugInfo['steps'][] = 'yahoo: trying';
        $response = $this->fetchFromYahoo(strtoupper($symbol), $resolution, $from, $to);

        if ($debug) {
            $data = json_decode($response->getContent(), true);
            $data['_debug'] = $debugInfo;
            return new JsonResponse($data);
        }

        return $response;
    }

    private function fetchFromCtrader(
        int $accountLogin,
        string $symbol,
        string $resolution,
        int $from,
        int $to,
        AccountRepository $accountRepository,
        DeniesClient $deniesClient,
        array &$debugInfo = []
    ): ?array {
        try {
            $account = $accountRepository->findOneBy(['login' => $accountLogin]);
            if (!$account) {
                $debugInfo['steps'][] = 'ctrader: account not found in DB for login ' . $accountLogin;
                return null;
            }

            $debugInfo['steps'][] = 'ctrader: found account → platform=' . $account->getPlatform() . ' host=' . $account->getHost() . ' name=' . $account->getName();

            if ($account->getPlatform() !== 'ctrader') {
                $debugInfo['steps'][] = 'ctrader: not a ctrader account, skipping';
                return null;
            }

            // Chart data (OHLC candles) is public market data — no ownership check needed.
            // The cTrader access token from Denies API provides the actual authorization.

            // Fetch ctid + isLive + accessToken from Denies API
            $ctraderInfo = $deniesClient->getCtraderInfoByLogin($accountLogin);
            $ctid = $ctraderInfo['ctid'];
            $isLive = $ctraderInfo['isLive'];

            // Prefer access token from Denies API (always up-to-date), fallback to local DB
            $accessToken = $ctraderInfo['accessToken'] ?? $account->getCtraderAccessToken();
            $debugInfo['steps'][] = 'ctrader: ctid=' . ($ctid ?? 'NULL') . ' isLive=' . ($isLive ? 'true' : 'false')
                . ' token=' . ($accessToken ? substr($accessToken, 0, 15) . '...' : 'NULL')
                . ' tokenSource=' . ($ctraderInfo['accessToken'] ? 'denies-api' : 'local-db');

            if (!$accessToken) {
                $debugInfo['steps'][] = 'ctrader: no access token available';
                return null;
            }

            $debugInfo['steps'][] = 'ctrader: connecting to cTrader Open API...';

            $ctrader = new CtraderMarketData();
            $candles = $ctrader->getCandles(
                $accessToken,
                $accountLogin,
                $symbol,
                $resolution,
                $from,
                $to,
                $isLive,
                $ctid
            );

            // Merge internal debug from cTrader service
            foreach ($ctrader->debug as $d) {
                $debugInfo['steps'][] = 'ctrader-api: ' . $d;
            }

            if ($candles && !empty($candles['t'])) {
                $debugInfo['steps'][] = 'ctrader: SUCCESS → ' . count($candles['t']) . ' candles received';
                $candles['s'] = 'ok';
                $candles['source'] = 'ctrader';
                return $candles;
            }

            $debugInfo['steps'][] = 'ctrader: returned empty candles';

        } catch (\Exception $e) {
            $debugInfo['steps'][] = 'ctrader: EXCEPTION → ' . $e->getMessage();
        }

        return null;
    }

    private function fetchFromYahoo(string $symbol, string $resolution, int $from, int $to): JsonResponse
    {
        $cleanSymbol = preg_replace('/[._](cash|raw|std|pro|micro|mini|m|i|k|z)$/i', '', $symbol);
        $cleanSymbol = str_replace(['/', '.', '_', '-', '#'], '', $cleanSymbol);

        $yahooSymbol = self::SYMBOL_MAP[$cleanSymbol] ?? null;
        if (!$yahooSymbol && strlen($cleanSymbol) === 6 && ctype_alpha($cleanSymbol)) {
            $yahooSymbol = $cleanSymbol . '=X';
        }
        if (!$yahooSymbol) {
            $yahooSymbol = $cleanSymbol;
        }

        $interval = self::INTERVAL_MAP[$resolution] ?? '5m';
        $range = self::RANGE_MAP[$interval] ?? '60d';

        $url = 'https://query1.finance.yahoo.com/v8/finance/chart/' . urlencode($yahooSymbol);
        $params = ['interval' => $interval, 'includePrePost' => 'false'];

        if ($from > 0 && $to > 0) {
            $params['period1'] = $from;
            $params['period2'] = $to;
        } else {
            $params['range'] = $range;
        }

        try {
            $response = $this->httpClient->request('GET', $url, [
                'query' => $params,
                'headers' => ['User-Agent' => 'Mozilla/5.0'],
                'timeout' => 10,
            ]);

            $data = json_decode($response->getContent(), true);

            if (!$data || !isset($data['chart']['result'][0])) {
                return new JsonResponse(['s' => 'no_data', 'errmsg' => 'No data for ' . $yahooSymbol]);
            }

            $result = $data['chart']['result'][0];
            $timestamps = $result['timestamp'] ?? [];
            $quote = $result['indicators']['quote'][0] ?? [];

            if (empty($timestamps)) {
                return new JsonResponse(['s' => 'no_data']);
            }

            $t = []; $o = []; $h = []; $l = []; $c = []; $v = [];
            $opens = $quote['open'] ?? [];
            $highs = $quote['high'] ?? [];
            $lows = $quote['low'] ?? [];
            $closes = $quote['close'] ?? [];
            $volumes = $quote['volume'] ?? [];

            for ($i = 0, $len = count($timestamps); $i < $len; $i++) {
                if (($opens[$i] ?? null) === null || ($closes[$i] ?? null) === null) continue;
                $t[] = $timestamps[$i];
                $o[] = round($opens[$i], 6);
                $h[] = round($highs[$i], 6);
                $l[] = round($lows[$i], 6);
                $c[] = round($closes[$i], 6);
                $v[] = (int) ($volumes[$i] ?? 0);
            }

            return new JsonResponse([
                's' => 'ok',
                't' => $t, 'o' => $o, 'h' => $h, 'l' => $l, 'c' => $c, 'v' => $v,
                'source' => 'yahoo',
            ]);

        } catch (\Exception $e) {
            return new JsonResponse(['s' => 'error', 'errmsg' => 'Fetch failed: ' . $e->getMessage()]);
        }
    }
}
