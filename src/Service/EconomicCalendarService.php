<?php

namespace App\Service;

use Symfony\Component\HttpKernel\KernelInterface;

class EconomicCalendarService
{
    private $kernel;
    private $cacheFile;
    private $cacheDuration = 300; // 5 minutes

    private $feedUrl = 'https://nfs.faireconomy.media/ff_calendar_thisweek.xml';

    public function __construct(KernelInterface $kernel)
    {
        $this->kernel = $kernel;
        $this->cacheFile = $this->kernel->getProjectDir() . '/var/cache/economic_calendar.json';
    }

    public function getEvents(): array
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
        $events = $this->fetchFeed();

        // Save to cache
        if (!is_dir(dirname($this->cacheFile))) {
            mkdir(dirname($this->cacheFile), 0777, true);
        }
        file_put_contents($this->cacheFile, json_encode($events));

        return $events;
    }

    private function fetchFeed(): array
    {
        $events = [];
        try {
            $options = [
                "http" => [
                    "method" => "GET",
                    "header" => "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36\r\n"
                ]
            ];
            $context = stream_context_create($options);
            
            $content = @file_get_contents($this->feedUrl, false, $context);
            if (!$content) {
                // Fallback to mock data if feed is unavailable
                return $this->getMockData();
            }

            $xml = simplexml_load_string($content);
            if (!$xml) {
                return $this->getMockData();
            }

            // Parse Forex Factory XML structure
            foreach ($xml->event as $event) {
                $title = (string)$event->title;
                $country = (string)$event->country;
                $date = (string)$event->date;
                $time = (string)$event->time;
                $impact = (string)$event->impact;
                $forecast = (string)$event->forecast;
                $previous = (string)$event->previous;

                // Parse impact level
                $impactLevel = 'Low';
                if (stripos($impact, 'high') !== false || $impact === 'High') {
                    $impactLevel = 'High';
                } elseif (stripos($impact, 'med') !== false || $impact === 'Medium') {
                    $impactLevel = 'Medium';
                }


                // Format time and date
                $dateTime = $this->parseDateTime($date, $time);
                
                // Separate date and time for display
                $dateFormatted = $dateTime ? $dateTime->format('d. M.') : $date;
                
                // Check if it's an all-day event or tentative time
                if (stripos($time, 'all day') !== false || stripos($time, 'tentative') !== false || empty($time)) {
                    $timeFormatted = 'All Day';
                } else {
                    $timeFormatted = $dateTime ? $dateTime->format('H:i') : $time;
                }

                $events[] = [
                    'id' => md5($title . $country . $date . $time),
                    'title' => $title,
                    'country' => $this->getCountryName($country),
                    'countryCode' => strtoupper($country),
                    'impact' => $impactLevel,
                    'date' => $dateFormatted,
                    'time' => $timeFormatted,
                    'actual' => '-',
                    'forecast' => $forecast ?: '-',
                    'previous' => $previous ?: '-',
                    'timestamp' => $dateTime ? $dateTime->getTimestamp() : time(),
                ];

            }

            // Sort by timestamp
            usort($events, function ($a, $b) {
                return $a['timestamp'] <=> $b['timestamp'];
            });

        } catch (\Exception $e) {
            return $this->getMockData();
        }

        return $events ?: $this->getMockData();
    }

    private function parseDateTime($date, $time): ?\DateTime
    {
        try {
            // Forex Factory format: "02-15-2026" and "9:30am"
            $dateTimeStr = $date . ' ' . $time;
            return new \DateTime($dateTimeStr);
        } catch (\Exception $e) {
            return null;
        }
    }

    private function getCountryName($code): string
    {
        $countries = [
            'USD' => 'United States',
            'EUR' => 'Eurozone',
            'GBP' => 'United Kingdom',
            'JPY' => 'Japan',
            'CHF' => 'Switzerland',
            'CAD' => 'Canada',
            'AUD' => 'Australia',
            'NZD' => 'New Zealand',
            'CNY' => 'China',
            'CNH' => 'China',
        ];

        return $countries[strtoupper($code)] ?? $code;
    }

    private function getMockData(): array
    {
        // Mock data for demonstration
        return [
            [
                'id' => '1',
                'title' => 'Bank Holiday',
                'country' => 'China',
                'countryCode' => 'CNY',
                'impact' => 'Neutral',
                'date' => '15. Feb.',
                'time' => 'All Day',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-15'),
            ],
            [
                'id' => '2',
                'title' => 'ECB President Lagarde Speaks',
                'country' => 'Eurozone',
                'countryCode' => 'EUR',
                'impact' => 'Medium',
                'date' => '15. Feb.',
                'time' => '10:30',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-15 10:30'),
            ],
            [
                'id' => '3',
                'title' => 'BusinessNZ Services Index',
                'country' => 'New Zealand',
                'countryCode' => 'NZD',
                'impact' => 'Low',
                'date' => '15. Feb.',
                'time' => '22:30',
                'actual' => '50.9',
                'forecast' => '-',
                'previous' => '51.5',
                'timestamp' => strtotime('2026-02-15 22:30'),
            ],
            [
                'id' => '4',
                'title' => 'Prelim GDP Price Index y/y',
                'country' => 'Japan',
                'countryCode' => 'JPY',
                'impact' => 'Low',
                'date' => '16. Feb.',
                'time' => '0:50',
                'actual' => '3.4%',
                'forecast' => '3.2%',
                'previous' => '2.8%',
                'timestamp' => strtotime('2026-02-16 00:50'),
            ],
            [
                'id' => '5',
                'title' => 'Prelim GDP q/q',
                'country' => 'Japan',
                'countryCode' => 'JPY',
                'impact' => 'Low',
                'date' => '16. Feb.',
                'time' => '0:50',
                'actual' => '0.1%',
                'forecast' => '0.4%',
                'previous' => '-0.4%',
                'timestamp' => strtotime('2026-02-16 00:50'),
            ],
            [
                'id' => '6',
                'title' => 'Eurogroup Meetings',
                'country' => 'Eurozone',
                'countryCode' => 'EUR',
                'impact' => 'Low',
                'date' => '16. Feb.',
                'time' => 'All Day',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-16'),
            ],
            [
                'id' => '7',
                'title' => 'Bank Holiday',
                'country' => 'Canada',
                'countryCode' => 'CAD',
                'impact' => 'Neutral',
                'date' => '16. Feb.',
                'time' => 'All Day',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-16'),
            ],
            [
                'id' => '8',
                'title' => 'Bank Holiday',
                'country' => 'United States',
                'countryCode' => 'USD',
                'impact' => 'Neutral',
                'date' => '16. Feb.',
                'time' => 'All Day',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-16'),
            ],
            [
                'id' => '9',
                'title' => 'Bank Holiday',
                'country' => 'China',
                'countryCode' => 'CNY',
                'impact' => 'Neutral',
                'date' => '16. Feb.',
                'time' => 'All Day',
                'actual' => '-',
                'forecast' => '-',
                'previous' => '-',
                'timestamp' => strtotime('2026-02-16'),
            ],
            [
                'id' => '10',
                'title' => 'Rightmove HPI m/m',
                'country' => 'United Kingdom',
                'countryCode' => 'GBP',
                'impact' => 'Low',
                'date' => '18. Feb.',
                'time' => '1:01',
                'actual' => '0.0%',
                'forecast' => '-',
                'previous' => '2.8%',
                'timestamp' => strtotime('2026-02-18 01:01'),
            ],
        ];
    }
}
