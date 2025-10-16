import Link from 'next/link';
import { useRouter } from 'next/router';
import { FC } from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './Navigation.module.css';

const Navigation: FC = () => {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className={styles.nav}>
      <div className={styles.navContainer}>
        <Link href="/" className={styles.logo}>
          asXiv
        </Link>
        
        <div className={styles.navLinks}>
          <Link 
            href="/" 
            className={`${styles.navLink} ${router.pathname === '/' ? styles.active : ''}`}
          >
            Home
          </Link>
          <Link 
            href="/search" 
            className={`${styles.navLink} ${router.pathname === '/search' ? styles.active : ''}`}
          >
            Search
          </Link>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? 'Light mode' : 'Dark mode'}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
