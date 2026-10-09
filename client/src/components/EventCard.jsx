import Icon from './Icon.jsx';
import { formatDate } from '../services/api.js';

const categoryLook = {
  Technology: ['blue', 'code'], 'Artificial Intelligence': ['blue', 'sparkle'],
  'Career Development': ['peach', 'people'], Entrepreneurship: ['green', 'sparkle'],
  Finance: ['green', 'globe'], Research: ['lavender', 'globe'], Arts: ['rose', 'sparkle'],
  Sports: ['peach', 'globe'], 'Community Service': ['green', 'people'], Networking: ['lavender', 'people'],
};
export default function EventCard({ event, saved, onSave, onOpen, personalized = false }) {
  const [color, icon] = categoryLook[event.category] || ['blue', 'calendar'];
  return <article className="event-card">
    <div className={`event-art ${color}`}>
      <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" /><span className="art-dots" />
      <div className="event-art-symbol"><Icon name={icon} size={58} /></div>
      <span className="art-category">{event.category}</span>
      <button type="button" className={`save-button ${saved ? 'is-saved' : ''}`} onClick={() => onSave(event)} aria-label={`${saved ? 'Unsave' : 'Save'} ${event.title}`} aria-pressed={saved}><Icon name="bookmark" /></button>
      <div className="event-date"><b>{formatDate(event.startDate, { day: '2-digit' })}</b><span>{formatDate(event.startDate, { month: 'short' })}</span></div>
    </div>
    <div className="event-card-body">
      <div className="card-eyebrow"><span><i className={event.isDemo ? 'demo-dot' : 'live-dot'} />{event.isDemo ? 'DEMO EVENT' : 'UCONN CALENDAR'}</span>{personalized && <span className="match-score" title="Keyword relevance score, not a probability"><Icon name="sparkle" size={12} /> {event.relevanceScore}% match</span>}</div>
      <h3><button onClick={() => onOpen(event)}>{event.title}</button></h3>
      <p className="event-description">{event.description || 'Explore the original event for more details.'}</p>
      <div className="event-meta"><span><Icon name="calendar" size={15} />{formatDate(event.startDate, { weekday: 'short', month: 'short', day: 'numeric' })} · {event.allDay ? 'All day' : formatDate(event.startDate, { hour: 'numeric', minute: '2-digit' })}</span><span><Icon name="pin" size={15} />{event.campus} · {event.location}</span></div>
      <div className="card-bottom"><span>{event.organization}</span><button onClick={() => onOpen(event)} aria-label={`View ${event.title}`}><Icon name="arrow" size={18} /></button></div>
      {personalized && <p className="recommendation-reason"><Icon name="sparkle" size={14} />{event.explanation}</p>}
    </div>
  </article>;
}
