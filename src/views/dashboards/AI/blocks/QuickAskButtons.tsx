import { Icon } from '@iconify/react';

interface Props {
  onAsk: (question: string) => void;
  disabled?: boolean;
}

const quickQuestions = [
  { label: 'Strategie', question: 'Welche Trading-Strategie nutzt dieser Account?', icon: 'solar:strategy-linear' },
  { label: 'Risiko', question: 'Wie ist das Risikoprofil dieses Accounts?', icon: 'solar:shield-warning-linear' },
  { label: 'Performance', question: 'Gib mir eine Zusammenfassung der Trading-Performance.', icon: 'solar:chart-2-linear' },
  { label: 'Copy Health', question: 'Wie performt das Copy-Trading? Gibt es Lag-Probleme?', icon: 'solar:copy-linear' },
];

const QuickAskButtons = ({ onAsk, disabled }: Props) => {
  return (
    <div className="flex flex-wrap gap-2">
      {quickQuestions.map(q => (
        <button
          key={q.label}
          onClick={() => onAsk(q.question)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon icon={q.icon} className="w-3.5 h-3.5" />
          {q.label}
        </button>
      ))}
    </div>
  );
};

export default QuickAskButtons;
