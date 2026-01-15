import { Plus } from 'lucide-react';

interface AddAssetButtonProps {
  onClick: () => void;
}

export const AddAssetButton = ({ onClick }: AddAssetButtonProps) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 w-14 h-14 rounded-full btn-premium flex items-center justify-center z-50 shadow-lg"
    >
      <Plus className="w-6 h-6 text-primary-foreground" />
    </button>
  );
};
