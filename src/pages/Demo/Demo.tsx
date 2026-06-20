import { useNameSpace } from "@/utils"
import styles from './Demo.css'

export function Demo(){
  const ns = useNameSpace(styles)
  return <div className={ns('demo')}></div>
}