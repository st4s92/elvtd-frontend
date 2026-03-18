import { Icon } from '@iconify/react';
import { StrategyResult } from '../hooks/useAiAnalysis';

interface Props {
  data: StrategyResult | null;
  loading: boolean;
  onAnalyze: () => void;
}

const StrategyInsightsCard = ({ data, loading, onAnalyze }: Props) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon icon="solar:strategy-linear" className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Strategie-Erkennung</h3>
        </div>
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
        >
          {loading ? 'Analysiert...' : 'Analysieren'}
        </button>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
        </div>
      ) : data ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 dark:bg-blue-900 dark:text-blue-300 rounded-full">
              {data.strategy_type}
            </span>
            <span className="text-sm text-gray-500">
              Konfidenz: {(data.confidence * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">{data.summary}</p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-green-600 uppercase mb-1">Staerken</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {data.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Icon icon="solar:check-circle-bold" className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-red-600 uppercase mb-1">Schwaechen</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {data.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Icon icon="solar:danger-triangle-bold" className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {data.recommendations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-purple-600 uppercase mb-1">Empfehlungen</h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {data.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <Icon icon="solar:lightbulb-bolt-bold" className="w-3.5 h-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                    {r}
                  </li>
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

export default StrategyInsightsCard;
