import React from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <h1 style={styles.logo}>
          <Link to="/" style={styles.link}>
            카드 생성기
          </Link>
        </h1>
        <nav>
          <ul style={styles.nav}>
            <li style={styles.navItem}>
              <Link to="/" style={styles.navLink}>
                홈
              </Link>
            </li>
            <li style={styles.navItem}>
              <Link to="/create" style={styles.navLink}>
                카드 생성
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: '#333',
    color: 'white',
    padding: '10px 0',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logo: {
    margin: 0,
    fontSize: '24px'
  },
  link: {
    color: 'white',
    textDecoration: 'none'
  },
  nav: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  navItem: {
    marginLeft: '20px'
  },
  navLink: {
    color: 'white',
    textDecoration: 'none',
    fontWeight: '500',
    padding: '5px 10px',
    borderRadius: '4px',
    transition: 'background-color 0.3s ease'
  }
};

export default Header; 