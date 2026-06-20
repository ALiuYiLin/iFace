import { Skeleton } from '@/components/ui'

export function DashboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
        }}
      >
        {['stats-skeleton-1', 'stats-skeleton-2', 'stats-skeleton-3', 'stats-skeleton-4'].map(
          (key) => (
            <div
              key={key}
              className="card"
              style={{
                padding: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Skeleton width={38} height={38} rounded="lg" />
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <Skeleton width="60%" height={11} />
                <Skeleton width="40%" height={18} />
              </div>
            </div>
          ),
        )}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 3fr',
          gap: 14,
        }}
      >
        <div
          className="card"
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <Skeleton width={80} height={14} />
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Skeleton width={140} height={140} rounded="full" />
          </div>
        </div>
        <div
          className="card"
          style={{
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Skeleton width={80} height={14} />
          {[
            'module-skeleton-1',
            'module-skeleton-2',
            'module-skeleton-3',
            'module-skeleton-4',
            'module-skeleton-5',
            'module-skeleton-6',
          ].map((key) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skeleton width="65%" height={12} />
                <Skeleton width="100%" height={4} />
              </div>
              <Skeleton width={28} height={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
