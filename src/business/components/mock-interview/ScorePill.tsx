import { Badge } from '@/components/ui'

export function ScorePill({ score, size = 'md' }: { score: number | null; size?: 'sm' | 'md' }) {
  if (score === null)
    return (
      <Badge variant="ghost" size={size}>
        未评分
      </Badge>
    )
  const variant = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger'
  return (
    <Badge variant={variant} size={size}>
      {score}/100
    </Badge>
  )
}
