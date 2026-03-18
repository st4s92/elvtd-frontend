import { Icon } from '@iconify/react';
import { RiskResult } from '../hooks/useAiAnalysis';

interface Props {
  data: RiskResult | null;
  loading: boolean;
  onAnalyze: () => void;
}

function scoreColor(score: number): string {
  if (score <= 3) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
  if (score <= 6) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-600 bg-red-100 dark:bg-red-900/30';
}

function scoreBarColor(score: number): string {
  if (score <= 3) return 'bg-green-500';
  if (score <= 6) return 'bg-yellow-500';
  return 'bg-red-500';
}

const dimensionLabels: Record<string, string> = {
  drawdown_risk: 'Drawdown',
  position_sizing: 'Position Sizing',
  concentration: 'Konzentration',
  overtrading: 'Overtrading',
  copy_lag: 'Copy Lag',
};

const RiskAnalysisCard = ({ data, loading, onAnalyze }: Props) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="solar:shield-warning-linear" className="w-5 h-5 text-red-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Risiko-Analyse</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Analysiert...' : 'Analysieren'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          {/* Overall Score */}
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${scoreColor(data.overall_score)}`}>
              {data.overall_score}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                Gesamt-Risiko-Score
              </p>
              <p className="text-xs text-gray-500">1 = sehr sicher, 10 = sehr riskant</p>
            </div>
          </div>

          {/* Dimension Bars */}
          <div className="space-y-2.5">
            {Object.entries(data.dimensions).map(([key, dim]) => (
              <div key={key}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{dimensionLabels[key] || key}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{dim.score}/10</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${scoreBarColor(dim.score)}`}
                    style={{ width: `${dim.score * 10}%` }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">{dim.detail}</p>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">{data.summary}</p>

          {data.critical_warnings.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Warnungen</h4>
              <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
                {data.critical_warnings.map((w, i) => (
                  <li key={i}>- {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">
          Waehle einen Account und klicke "Analysieren"
        </p>
      )}
    </div>
  );
};

export default RiskAnalysisCard;
