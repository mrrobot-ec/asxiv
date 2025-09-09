import { NextPageContext } from 'next';
import Link from 'next/link';
import styles from '@/styles/NotFound.module.css';

interface ErrorProps {
  statusCode?: number;
  hasGetInitialPropsRun?: boolean;
  err?: Error;
}

const Error = ({ statusCode }: ErrorProps) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <h1 className={styles.title}>
          {statusCode ? `${statusCode}` : 'Client-side error occurred'}
        </h1>
        <p className={styles.message}>
          {statusCode === 404
            ? 'This page could not be found.'
            : statusCode === 500
            ? 'A server-side error occurred.'
            : 'An error occurred on client.'}
        </p>
        <p className={styles.instruction}>
          Go back to: <Link href="/" className={styles.link}>Home</Link>
        </p>
        <div className={styles.instruction}>
          <a href="https://github.com/montanaflynn/asxiv" target="_blank" rel="noopener noreferrer" className={styles.link}>GitHub</a>
        </div>
      </div>
    </div>
  );
};

Error.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default Error;
