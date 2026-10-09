import Icon from '../components/Icon.jsx';
import EventCard from '../components/EventCard.jsx';

function CampusArt() {
  return <div className="campus-art" aria-hidden="true">
    <div className="orbit-label"><span className="green-dot" /> YOUR NEXT CONNECTION IS CLOSER THAN YOU THINK</div>
    <svg className="campus-scene" viewBox="0 0 620 460" fill="none">
      <ellipse cx="307" cy="269" rx="252" ry="157" stroke="#354662" strokeDasharray="4 8" transform="rotate(-12 307 269)" />
      <ellipse cx="307" cy="269" rx="201" ry="118" stroke="#354662" transform="rotate(-12 307 269)" />
      <path d="m111 321 191-111 204 111-191 111z" fill="#233856" />
      <path d="m210 281 93-54 107 60-94 54z" fill="#5f7893" />
      <path d="m215 215 90-51 99 56v79l-90 52-99-56z" fill="#f3eee6" />
      <path d="m314 271 90-51v79l-90 52z" fill="#b8c7cf" />
      <path d="m215 215 90-51 99 56-90 51z" fill="#f6f3ee" />
      <path d="m196 210 109-63 116 66-18 10-98-56-91 53z" fill="#e78370" />
      <path d="m237 211 66-37 78 44-66 38z" fill="#213653" />
      <path d="m248 232 12 7v43l-12-7zm31 18 12 7v43l-12-7z" fill="#b4c3ca" />
      <path d="m331 265 11-6v43l-11 6zm27-15 11-6v43l-11 6z" fill="#6a8499" />
      <path d="m288 178 17-10 18 10v-54l-18-10-17 10z" fill="#ede8df" />
      <path d="m305 134 18-10v54l-18 10z" fill="#b8c7cf" />
      <path d="m280 125 25-44 26 44-26 15z" fill="#e78370" />
      <path d="m305 81 26 44-26 15z" fill="#b76357" />
      <circle cx="298" cy="149" r="5" fill="#253d58" />
      <path d="m263 323 51 29 67-38v12l-67 38-51-29z" fill="#9ab0bd" />
      <path d="m250 336 64 37 80-46v12l-80 46-64-37z" fill="#7792a6" />
      <path d="M167 282v49m290-53v49m-46-151v33" stroke="#92b5a4" strokeWidth="5" />
      <path d="m139 292 28-81 29 81z" fill="#6ca18f" /><path d="m167 211 29 81-29 15z" fill="#4b8475" />
      <path d="m430 288 27-81 28 81z" fill="#6ca18f" /><path d="m457 207 28 81-28 15z" fill="#4b8475" />
      <path d="m389 186 22-62 23 62z" fill="#6ca18f" />
      <path d="m181 360 73-42m138-100 53-30" stroke="#e9c3a0" strokeWidth="3" strokeDasharray="6 7" />
      <circle cx="184" cy="358" r="6" fill="#e9c3a0" /><circle cx="444" cy="188" r="6" fill="#e9c3a0" />
    </svg>
    <div className="floating-note note-one"><span className="note-icon"><Icon name="code" /></span><div><b>Your kind of curious.</b><small>Build. Learn. Find your people.</small></div></div>
    <div className="floating-note note-two"><span className="note-icon coral"><Icon name="sparkle" /></span><div><b>A little more you.</b><small>Personalized to your interests</small></div></div>
    <span className="scene-caption">FIVE CAMPUSES. ENDLESS POSSIBILITIES.</span>
  </div>;
}

export default function Landing({ events, loading, error, onRetry, onStart, onExplore, onSave, onOpen, savedIds }) {
  const featured = events.some((event) => event.featured) ? events.filter((event) => event.featured).slice(0, 3) : events.slice(0, 3);
  return <>
    <section className="hero"><div className="hero-inner"><div className="hero-copy"><div className="eyebrow light"><span /> BUILT FOR YOUR CAMPUS LIFE</div><h1>Discover events<br />that matter<br /><em>to you.</em><span className="headline-dot">*</span></h1><p>Your major. Your interests. Your people.<br />Find what’s happening across UConn—and where you fit in.</p><div className="hero-actions"><button className="button coral-button" onClick={onStart}>Get started <Icon name="arrow" size={18} /></button><button className="hero-text-link" onClick={onExplore}>Explore events <Icon name="arrow" size={17} /></button></div><div className="hero-footnote"><span className="mini-avatars"><i>H</i><i>C</i><i>U</i></span><span>A campus full of possibilities.<br /><strong>One place to find yours.</strong></span></div></div><CampusArt /></div></section>
    <div className="campus-strip"><div><span>ONE COMMUNITY.<br /><b>FIVE CAMPUSES.</b></span>{['Stamford', 'Storrs', 'Hartford', 'Avery Point', 'Waterbury'].map((campus) => <button key={campus} onClick={() => onExplore(campus)}><Icon name="pin" size={16} />{campus}</button>)}</div></div>
    <section className="section featured-section"><div className="section-heading"><div><span className="eyebrow">GET OUT THERE</span><h2>A few things to look forward to.</h2><p>New ideas, new faces, and a reason to close your laptop.</p></div><button className="text-link" onClick={onExplore}>Explore all events <Icon name="arrow" size={17} /></button></div>
      {loading ? <div className="card-grid" aria-label="Loading featured events">{[1,2,3].map((n) => <div key={n} className="skeleton-card" />)}</div> : error ? <div className="empty-state"><h3>Let’s try that again.</h3><p>{error}</p><button className="button primary" onClick={onRetry}>Retry loading events</button></div> : featured.length ? <div className="card-grid">{featured.map((event) => <EventCard key={event.id} event={event} saved={savedIds.has(event.id)} onSave={onSave} onOpen={onOpen} />)}</div> : <div className="empty-state"><h3>More events are on the way.</h3><p>Try the demo collection to explore HuskyConnect.</p></div>}
    </section>
    <section className="how-section section" id="how-it-works"><div className="section-heading"><div><span className="eyebrow">LESS SCROLLING. MORE CONNECTING.</span><h2>Your campus, on your wavelength.</h2></div><p>Finding your thing shouldn’t be another assignment.</p></div><div className="how-grid">{[['01', 'Tell us what you’re into.', 'Choose your major, campus, and the things that spark your curiosity.', 'tune'], ['02', 'Find a little inspiration.', 'Get recommendations with clear reasons for why an event fits you.', 'sparkle'], ['03', 'Make room for something good.', 'Save your favorites, invite a friend, and make your next connection.', 'bookmark']].map(([number,title,description,icon]) => <div className="how-card" key={number}><div className="how-card-top"><Icon name={icon} size={25} /><span>{number}</span></div><h3>{title}</h3><p>{description}</p></div>)}</div></section>
    <section className="bottom-cta section"><div><span className="eyebrow">YOUR NEXT CHAPTER STARTS WITH SHOWING UP.</span><h2>Let’s find your next thing.</h2></div><button className="button primary" onClick={onStart}>Make it personal <Icon name="arrow" size={18} /></button></section>
  </>;
}
