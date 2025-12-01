import { X } from 'lucide-react';

type Props = {
  message?: string;
  type?: 'success' | 'error' | 'info';
  onClose?: () => void;
};

export default function TopMessage({ message, type = 'info', onClose }: Props) {
  if (!message) return null;

  const base = 'max-w-3xl w-full px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 justify-center text-sm font-medium';
  const styles: Record<string, string> = {
    success: 'bg-green-50 border border-green-200 text-green-700',
    error: 'bg-red-50 border border-red-200 text-red-700',
    info: 'bg-blue-50 border border-blue-200 text-blue-700',
  };

  return (
    <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
      <div className={`${base} ${styles[type]} pointer-events-auto`}> 
        <div className="flex-1 text-center">{message}</div>
        {onClose && (
          <button onClick={onClose} className="ml-3 p-1 rounded-md text-gray-500 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
