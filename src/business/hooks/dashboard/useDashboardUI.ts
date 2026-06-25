import { useState } from 'react'

export interface DashboardUIState {
  greeting: string
}

export function useDashboardUI(): DashboardUIState {
  const [greeting] = useState(() => {
    const h = new Date().getHours()
    if (h < 6) return '夜深了，注意休息'
    if (h < 10) return '早上好，开始今天的备战'
    if (h < 13) return '上午好，专注备战'
    if (h < 17) return '下午好，继续加油'
    if (h < 20) return '晚上好，刷题时间到'
    return '晚上好，坚持就是胜利'
  })

  return { greeting }
}
