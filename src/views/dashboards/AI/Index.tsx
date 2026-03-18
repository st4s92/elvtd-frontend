import { useState } from 'react';
import BreadcrumbComp from 'src/layouts/full/shared/breadcrumb/BreadcrumbComp';
import AccountSelector from './blocks/AccountSelector';
import AiChatPanel from './blocks/AiChatPanel';
import StrategyInsightsCard from './blocks/StrategyInsightsCard';
import RiskAnalysisCard from './blocks/RiskAnalysisCard';
import { useAiAnalysis } from './hooks/useAiAnalysis';

const BCrumb = [
  { to: '/', title: 'Home' },
  { title: 'AI Assistant' },
];

const AIDashboard = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'insights'>('chat');
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const { strategy, risk, loadingStrategy, loadingRisk, analyzeStrategy, analyzeRisk } = useAiAnalysis();

  return (
    <>
      <BreadcrumbComp title="AI Assistant" items={BCrumb} />

      {/* Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'chat'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'insights'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Insights
          </button>
        </div>

        <AccountSelector value={selectedAccountId} onChange={setSelectedAccountId} />
      </div>

      {/* Content */}
      {activeTab === 'chat' ? (
        <AiChatPanel selectedAccountId={selectedAccountId} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <StrategyInsightsCard
            data={strategy}
            loading={loadingStrategy}
            onAnalyze={() => selectedAccountId && analyzeStrategy(selectedAccountId)}
          />
          <RiskAnalysisCard
            data={risk}
            loading={loadingRisk}
            onAnalyze={() => selectedAccountId && analyzeRisk(selectedAccountId)}
          />
        </div>
      )}
    </>
  );
};

export default AIDashboard;
