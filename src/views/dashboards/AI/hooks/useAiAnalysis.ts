import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export interface StrategyResult {
  strategy_type: string;
  confidence: number;
  characteristics: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  summary: string;
}

export interface RiskDimension {
  score: number;
  detail: string;
}

export interface RiskResult {
  overall_score: number;
  dimensions: {
    drawdown_risk: RiskDimension;
    position_sizing: RiskDimension;
    concentration: RiskDimension;
    overtrading: RiskDimension;
    copy_lag: RiskDimension;
  };
  critical_warnings: string[];
  recommendations: string[];
  summary: string;
}

export function useAiAnalysis() {
  const [strategy, setStrategy] = useState<StrategyResult | null>(null);
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [loadingStrategy, setLoadingStrategy] = useState(false);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeStrategy = useCallback(async (accountId: number) => {
    setLoadingStrategy(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/trader/ai/analysis/strategy`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ account_id: accountId }),
      });
      const json = await res.json();
      if (json.status && json.data) {
        setStrategy(json.data);
      } else {
        setError(json.data?.message || 'Strategy analysis failed');
      }
    } catch (err) {
      console.error('Strategy analysis failed', err);
      setError('Strategy analysis failed');
    } finally {
      setLoadingStrategy(false);
    }
  }, []);

  const analyzeRisk = useCallback(async (accountId: number) => {
    setLoadingRisk(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/trader/ai/analysis/risk`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ account_id: accountId }),
      });
      const json = await res.json();
      if (json.status && json.data) {
        setRisk(json.data);
      } else {
        setError(json.data?.message || 'Risk analysis failed');
      }
    } catch (err) {
      console.error('Risk analysis failed', err);
      setError('Risk analysis failed');
    } finally {
      setLoadingRisk(false);
    }
  }, []);

  return {
    strategy,
    risk,
    loadingStrategy,
    loadingRisk,
    error,
    analyzeStrategy,
    analyzeRisk,
  };
}
