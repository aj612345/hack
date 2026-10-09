import { useEffect, useMemo, useState } from 'react';
import Icon from './components/Icon.jsx';
import Preferences from './components/Preferences.jsx';
import EventDetails from './components/EventDetails.jsx';
import Landing from './pages/Landing.jsx';
import Dashboard from './pages/Dashboard.jsx';
import { getOptions, getRecommendations, readStorage, writeStorage } from './services/api.js';

const defaults = { major: 'Undecided', campus: 'All Campuses', interests: [] };
const fallbackOptions = { majors: ['Computer Science', 'Computer Engineering', 'Finance', 'Economics', 'Biology', 'Psychology', 'Mathematics', 'Mechanical Engineering', 'Business', 'Nursing', 'Undecided'], campuses: ['Stamford', 'Storrs', 'Hartford', 'Avery Point', 'Waterbury', 'All Campuses'], interests: ['Technology', 'Artificial Intelligence', 'Entrepreneurship', 'Finance', 'Research', 'Networking', 'Career Development', 'Sports', 'Arts', 'Community Service'] };
function storedPreferences() {
  const value = readStorage('huskyconnect.preferences.v1', null);
  return value && fallbackOptions.majors.includes(value.major) && fallbackOptions.campuses.includes(value.campus) && Array.isArray(value.interests) && value.interests.every((item) => fallbackOptions.interests.includes(item)) ? value : null;
}
const initialPreferences = storedPreferences();
const initialFilters = { search: '', campus: initialPreferences?.campus || 'All Campuses', category: 'All categories', date: 'any', sort: 'relevance' };
function getPage() { return ['explore', 'saved'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'home'; }

export default function App() {
  const [page, setPage] = useState(getPage);
  const [preferences, setPreferences] = useState(initialPreferences || defaults);
  const [personalized, setPersonalized] = useState(Boolean(initialPreferences));
  const [options, setOptions] = useState(fallbackOptions);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [events, setEvents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [source, setSource] = useState(() => readStorage('huskyconnect.source.v1', 'demo') === 'live' ? 'live' : 'demo');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [toast, setToast] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState(() => ({ ...initialFilters, campus: getPage() === 'saved' ? 'All Campuses' : initialFilters.campus }));
  const [savedIds, setSavedIds] = useState(() => {
    const saved = readStorage('huskyconnect.bookmarks.v1', []);
    return new Set(Array.isArray(saved) ? saved.filter((id) => typeof id === 'string') : []);
  });
  useEffect(() => {
    const change = () => { const next = getPage(); setPage(next); if (next === 'saved') setFilters({ ...initialFilters, campus: 'All Campuses' }); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'instant' }); };
    window.addEventListener('hashchange', change);
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => { getOptions().then(setOptions).catch(() => {}); }, []);
  useEffect(() => { writeStorage('huskyconnect.source.v1', source); }, [source]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    getRecommendations(preferences, source, controller.signal).then((data) => { setEvents(data.events); setMeta(data.meta); }).catch((err) => { if (err.name !== 'AbortError') { setError(err.message); setEvents([]); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [preferences, source, retry]);
  useEffect(() => { if (toast) { const timeout = setTimeout(() => setToast(''), 4500); return () => clearTimeout(timeout); } }, [toast]);
  const savedCount = useMemo(() => events.filter((event) => savedIds.has(event.id)).length, [events, savedIds]);
  function navigate(next) { if (page === next) window.scrollTo({ top: 0, behavior: 'smooth' }); else location.hash = next === 'home' ? '' : next; setMenuOpen(false); }
  function explore(campus) { setFilters({ ...initialFilters, campus: typeof campus === 'string' ? campus : 'All Campuses' }); navigate('explore'); }
  function toggleSave(event) {
    const next = new Set(savedIds);
    if (next.has(event.id)) next.delete(event.id); else next.add(event.id);
    setSavedIds(next);
    const persisted = writeStorage('huskyconnect.bookmarks.v1', [...next]);
    setToast(persisted ? next.has(event.id) ? 'A good thing, saved for later.' : 'Event removed from your saved list.' : 'Saved for this session. Browser storage is unavailable.');
  }
  function savePreferences(value) {
    setPreferences(value); setPersonalized(true); setShowPreferences(false);
    setFilters({ ...initialFilters, campus: value.campus });
    if (!writeStorage('huskyconnect.preferences.v1', value)) setToast('Preferences apply this session. Browser storage is unavailable.');
    navigate('explore');
  }
  const shared = { events, loading, error, onRetry: () => setRetry(retry + 1), onSave: toggleSave, onOpen: setSelectedEvent, savedIds };
  return <>
    <a href="#main" className="skip-link" onClick={(event) => { event.preventDefault(); document.getElementById('main').focus(); }}>Skip to content</a>
    <header className="site-header"><div className="nav-inner"><a className="brand" href="#" onClick={(event) => { event.preventDefault(); navigate('home'); }} aria-label="HuskyConnect home"><span className="brand-mark">H<i /></span>Husky<span>Connect</span></a><button className="mobile-menu icon-button" aria-label="Toggle navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Icon name={menuOpen ? 'close' : 'menu'} /></button><nav className={menuOpen ? 'is-open' : ''} aria-label="Main navigation"><a href="#" className={page === 'home' ? 'active' : ''} aria-current={page === 'home' ? 'page' : undefined}>Home</a><a href="#explore" className={page === 'explore' ? 'active' : ''} aria-current={page === 'explore' ? 'page' : undefined}>Explore events</a><a href="#saved" className={page === 'saved' ? 'active' : ''} aria-current={page === 'saved' ? 'page' : undefined}><Icon name="bookmark" size={15} />Saved events{savedCount > 0 && <span className="nav-count">{savedCount}</span>}</a></nav><button className="button primary nav-cta" onClick={() => setShowPreferences(true)}>{personalized ? 'My preferences' : 'Make it personal'}<Icon name={personalized ? 'tune' : 'sparkle'} size={16} /></button></div></header>
    <div className="source-bar"><div><span><i className={meta?.mode === 'live' ? 'live-dot' : 'demo-dot'} /><b>{loading ? 'Finding your next connection…' : meta?.label || 'Event collection'}</b><span className="source-description">{meta?.mode === 'live' ? (meta.limited ? 'First 300 public calendar listings. Confirm details with the host.' : 'Public events from the UConn calendar. Confirm details with the host.') : 'Fictional events, real possibilities. Built for a student hackathon.'}</span></span><label className="source-select">Collection<select aria-label="Event collection" value={source} onChange={(event) => { setSource(event.target.value); setSelectedEvent(null); }}><option value="demo">Demo events</option><option value="live">Live UConn events</option></select></label></div></div>
    {meta?.warning && !loading && <div className="source-warning" role="status">{meta.warning}</div>}
    <div id="main" tabIndex={-1}>{page === 'home' ? <Landing {...shared} onStart={() => setShowPreferences(true)} onExplore={explore} /> : <Dashboard {...shared} options={options} preferences={preferences} personalized={personalized} filters={filters} setFilters={setFilters} savedOnly={page === 'saved'} onPreferences={() => setShowPreferences(true)} onExplore={explore} />}</div>
    <footer className="site-footer"><div><a className="brand" href="#"><span className="brand-mark">H<i /></span>Husky<span>Connect</span></a><p>Find your people. Find your place.</p></div><div><p>An independent student hackathon project.<br />Not affiliated with or endorsed by the University of Connecticut.</p><a href="https://events.uconn.edu/" target="_blank" rel="noreferrer">Official UConn calendar <Icon name="external" size={13} /></a></div><span className="footer-signoff">MADE WITH CURIOSITY ↗</span></footer>
    {showPreferences && <Preferences current={preferences} options={options} onSave={savePreferences} onClose={() => setShowPreferences(false)} />}
    {selectedEvent && <EventDetails event={selectedEvent} saved={savedIds.has(selectedEvent.id)} onSave={toggleSave} onClose={() => setSelectedEvent(null)} />}
    {toast && <div className="toast" role="status"><Icon name="check" size={17} />{toast}</div>}
  </>;
}
