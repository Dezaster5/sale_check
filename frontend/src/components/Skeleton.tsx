import styles from './Skeleton.module.css'

interface SkeletonProps {
  width?: string
  height?: string
}

export function Skeleton({ width = '100%', height = '14px' }: SkeletonProps) {
  return <span className={styles.bar} style={{ width, height }} aria-hidden="true" />
}

export function SkeletonRows({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <tr key={rowIndex}>
          {Array.from({ length: columns }).map((__, columnIndex) => (
            <td key={columnIndex}>
              <Skeleton width={columnIndex === 0 ? '70px' : '100%'} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
