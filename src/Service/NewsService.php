<?php

namespace App\Service;

use Symfony\Component\HttpKernel\KernelInterface;

class NewsService
{
    private $kernel;
    private $cacheFile;
    private $cacheDuration = 300; // 5 minutes

    private $feeds = [
        'stocks' => 'https://www.investing.com/rss/news_25.rss',
        'forex' => 'https://www.investing.com/rss/news_1.rss',
        'commodities' => 'https://www.investing.com/rss/news_11.rss',
        'crypto' => 'https://www.investing.com/rss/news_301.rss',
        'financialjuice' => 'https://www.financialjuice.com/feed.ashx?xy=rss',
        'stockmarket' => 'https://stockmarket.com/rss', // Replaced MarketBeat due to 403/errors
        'marketbeat_alerts' => 'https://www.marketbeat.com/rss.ashx?type=instant-alerts',
    ];

    public function __construct(KernelInterface $kernel)
    {
        $this->kernel = $kernel;
        $this->cacheFile = $this->kernel->getProjectDir() . '/var/cache/market_news.json';
    }

    public function getNews(): array
    {
        // Check cache
        if (file_exists($this->cacheFile)) {
            $fileTime = filemtime($this->cacheFile);
            if (time() - $fileTime < $this->cacheDuration) {
                $content = file_get_contents($this->cacheFile);
                $data = json_decode($content, true);
                if ($data) {
                    return $data;
                }
            }
        }

        // Fetch fresh data
        $allItems = [];

        foreach ($this->feeds as $category => $url) {
            $items = $this->fetchFeed($url, $category);
            $allItems = array_merge($allItems, $items);
        }

        // Sort by date (newest first)
        usort($allItems, function ($a, $b) {
            return $b['timestamp'] <=> $a['timestamp'];
        });

        // Save to cache
        if (!is_dir(dirname($this->cacheFile))) {
            mkdir(dirname($this->cacheFile), 0777, true);
        }
        file_put_contents($this->cacheFile, json_encode($allItems));

        return $allItems;
    }

    private function fetchFeed(string $url, string $category): array
    {
        $items = [];
        try {
            $options = [
                "http" => [
                    "method" => "GET",
                    "header" => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36\r\n"
                ]
            ];
            $context = stream_context_create($options);
            
            $content = @file_get_contents($url, false, $context);
            if (!$content) {
                return [];
            }

            $xml = simplexml_load_string($content);
            if (!$xml) {
                return [];
            }

            foreach ($xml->channel->item as $item) {
                $namespaces = $item->getNamespaces(true);
                $imageUrl = null;
                
                // Try to find image in enclosure
                if (isset($item->enclosure) && isset($item->enclosure['url'])) {
                    $imageUrl = (string)$item->enclosure['url'];
                }

                $pubDate = (string)$item->pubDate;
                $timestamp = strtotime($pubDate);

                // Calculate "time ago" string roughly
                $timeAgo = $this->timeElapsedString($timestamp);
                
                // Author handling
                $author = (string)$item->author;
                if (empty($author)) {
                    if ($category === 'financialjuice') {
                        $author = 'FinancialJuice';
                    } elseif ($category === 'stockmarket') {
                        $author = 'StockMarket.com';
                    } elseif ($category === 'marketbeat_alerts') {
                        $author = 'MarketBeat Alerts';
                    } else {
                        $author = 'Investing.com';
                    }
                }

                $items[] = [
                    'id' => md5((string)$item->link),
                    'title' => (string)$item->title,
                    'link' => (string)$item->link,
                    'source' => $category === 'financialjuice' ? 'FinancialJuice' : ($category === 'stockmarket' ? 'StockMarket.com' : ($category === 'marketbeat_alerts' ? 'MarketBeat' : 'Investing.com')),
                    'pubDate' => $pubDate,
                    'timestamp' => $timestamp,
                    'timeAgo' => $timeAgo,
                    'category' => $category, // 'stocks', 'forex', etc.
                    'imageUrl' => $imageUrl,
                    'author' => $author,
                    'description' => strip_tags((string)$item->description) // clean HTML tags for safety
                ];
            }
        } catch (\Exception $e) {
            // Log error or ignore
        }

        return $items;
    }

    private function timeElapsedString($timestamp)
    {
        $diff = time() - $timestamp;
        if ($diff < 60) return 'Just now';
        
        $a = array(
            365 * 24 * 60 * 60  =>  'year',
            30 * 24 * 60 * 60  =>  'month',
            24 * 60 * 60  =>  'day',
            60 * 60  =>  'hour',
            60  =>  'minute',
            1  =>  'second'
        );
        
        $a_plural = array(
            'year'   => 'years',
            'month'  => 'months',
            'day'    => 'days',
            'hour'   => 'hours',
            'minute' => 'minutes',
            'second' => 'seconds'
        );

        foreach ($a as $secs => $str) {
            $d = $diff / $secs;
            if ($d >= 1) {
                $r = round($d);
                return $r . ' ' . ($r > 1 ? $a_plural[$str] : $str) . ' ago';
            }
        }
        return 'Just now';
    }
}
