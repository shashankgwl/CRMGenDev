import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@fluentui/react';
import AuthButton from './components/AuthButton';
import Home from './components/Home';
import ArticleList from './components/ArticleList';
import ArticleView from './components/ArticleView';
import ArticleForm from './components/ArticleForm';
import Videos from './components/Videos';
import About from './components/About';
import Contact from './components/Contact';
import Footer from './components/Footer';
import './App.css';

const theme = createTheme({
  palette: {
    themePrimary: '#0078d4',
    themeLighterAlt: '#eff6fc',
    themeLighter: '#deecf9',
    themeLight: '#c7e4f7',
    themeTertiary: '#71afe5',
    themeSecondary: '#2b88d8',
    themeDarkAlt: '#106ebe',
    themeDark: '#005a9e',
    themeDarker: '#004578',
    neutralLighterAlt: '#faf9f8',
    neutralLighter: '#f3f2f1',
    neutralLight: '#edebe9',
    neutralQuaternaryAlt: '#e1dfdd',
    neutralQuaternary: '#d0d0d0',
    neutralTertiaryAlt: '#c8c6c4',
    neutralTertiary: '#a19f9d',
    neutralSecondary: '#605e5c',
    neutralPrimaryAlt: '#3b3a39',
    neutralPrimary: '#323130',
    neutralDark: '#201f1e',
    black: '#000000',
    white: '#ffffff',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <div className="app-layout">
          <div className="top-strip">
            <div className="strip-inner">
              <AuthButton />
            </div>
          </div>

          <header className="app-header">
            <div className="header-inner">
              <Link to="/" className="brand-link">
                <span className="brand-mark" />
                <span className="brand-title">Northstar Leadership</span>
              </Link>
              <nav className="header-nav">
                <Link to="/">Home</Link>
                <Link to="/articles">Explore Articles</Link>
                <Link to="/videos">Videos</Link>
                <Link to="/about">About me</Link>
                <Link to="/contact">Contact Us</Link>
              </nav>
            </div>
          </header>

          <div className="site-shell">
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/articles" element={<ArticleList />} />
                <Route path="/article/:id" element={<ArticleView />} />
                <Route path="/create" element={<ArticleForm />} />
                <Route path="/edit/:id" element={<ArticleForm />} />
                <Route path="/videos" element={<Videos />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
              </Routes>
            </main>
          </div>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
