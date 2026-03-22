<?php

namespace App\Controller;

use App\Repository\AccountRepository;
use App\Service\DeniesClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class SentimentController extends AbstractController
{
    /**
     * @Route("/sentiment", name="app_sentiment")
     */
    public function index(AccountRepository $accountRepository, DeniesClient $deniesClient): Response
    {
        $user = $this->getUser();
        if (!$user) {
            return $this->redirectToRoute('app_login');
        }

        $aggregatedSymbols = [];

        try {
            // Fetch Global Positions (up to 1000) for server-wide sentiment
            $positions = $deniesClient->getGlobalOpenPositions(1000);
            
            foreach ($positions as $pos) {
                // Loosen filter: if the API already filters by Status=600
                $symbol = $pos->order_symbol ?? $pos->symbol ?? null;
                if (!$symbol) continue;

                $volume = (float)($pos->order_lot ?? $pos->volume ?? $pos->lots ?? 0);
                if ($volume <= 0) continue;
                
                $ticket = $pos->order_ticket ?? $pos->ticket ?? $pos->id ?? 0;
                if ($ticket <= 0) continue;

                // Mapping: DEAL_TYPE_BUY / BUY -> Long, else Short
                $type = strtoupper($pos->order_type ?? $pos->type ?? $pos->cmd ?? '');
                
                if (!isset($aggregatedSymbols[$symbol])) {
                    $aggregatedSymbols[$symbol] = [
                        'symbol' => $symbol,
                        'buy_vol' => 0,
                        'sell_vol' => 0,
                        'buy_count' => 0,
                        'sell_count' => 0,
                        'total_vol' => 0
                    ];
                }

                if (strpos($type, 'BUY') !== false) {
                    $aggregatedSymbols[$symbol]['buy_vol'] += $volume;
                    $aggregatedSymbols[$symbol]['buy_count']++;
                } else {
                    $aggregatedSymbols[$symbol]['sell_vol'] += $volume;
                    $aggregatedSymbols[$symbol]['sell_count']++;
                }
                $aggregatedSymbols[$symbol]['total_vol'] += $volume;
            }
        } catch (\Exception $e) {
            // Silently skip if API fails
        }

        // Final Calculations & Sorting
        foreach ($aggregatedSymbols as &$data) {
            $sum = $data['total_vol'] ?: 1;
            $data['buy_pct'] = round(($data['buy_vol'] / $sum) * 100);
            $data['sell_pct'] = 100 - $data['buy_pct'];
        }

        usort($aggregatedSymbols, fn($a, $b) => $b['total_vol'] <=> $a['total_vol']);

        return $this->render('pages/sentiment.html.twig', [
            'symbols' => $aggregatedSymbols,
            'account_count' => count($aggregatedSymbols) // Showing number of symbols analyzed
        ]);
    }
}
