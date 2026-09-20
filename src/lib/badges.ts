export interface CreatorReliabilityBadge {
  label: string;
  shortLabel: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  description: string;
}

export function getCreatorBadge(approvedCount: number = 0, totalCount: number = 0): CreatorReliabilityBadge | null {
  if (approvedCount >= 15) {
    return {
      label: 'Top Creator (15+ Adds Verified)',
      shortLabel: 'Top Creator',
      icon: '👑',
      colorClass: 'text-amber-800',
      bgClass: 'bg-amber-100',
      borderClass: 'border-amber-300',
      description: 'Veteran creator with 15+ successfully approved claims.',
    };
  }

  if (approvedCount >= 5) {
    const rate = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 100;
    return {
      label: `Fast Verifier (${rate}% Approval)`,
      shortLabel: 'Fast Verifier',
      icon: '⚡',
      colorClass: 'text-orange-800',
      bgClass: 'bg-orange-100',
      borderClass: 'border-orange-300',
      description: 'Quickly reviews and confirms friend requests and messages.',
    };
  }

  if (approvedCount >= 2) {
    return {
      label: 'Verified Creator',
      shortLabel: 'Verified',
      icon: '🛡️',
      colorClass: 'text-emerald-800',
      bgClass: 'bg-emerald-100',
      borderClass: 'border-emerald-300',
      description: 'Trusted ad creator with active verified history.',
    };
  }

  return null;
}
