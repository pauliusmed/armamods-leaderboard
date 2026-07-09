import { FavoriteStarButton } from './FavoriteStarButton';

interface FavoriteServerButtonProps {
  active: boolean;
  serverName: string;
  onToggle: () => void;
  className?: string;
}

export function FavoriteServerButton({
  active,
  serverName,
  onToggle,
  className = '',
}: FavoriteServerButtonProps) {
  return (
    <FavoriteStarButton
      active={active}
      itemName={serverName}
      onToggle={onToggle}
      className={className}
    />
  );
}
