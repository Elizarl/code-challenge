import styles from './style.module.css';

export function Skeleton({
  height = '1rem',
  width = '100%',
}: {
  readonly height?: string;
  readonly width?: string;
}) {
  return <span className={styles['skeleton']} style={{ height, width }} />;
}
