import Modal from './Modal.jsx';
import Icon from './Icon.jsx';
import { formatDate } from '../services/api.js';

export default function EventDetails({ event, saved, onSave, onClose }) {
  return <Modal title={event.title} onClose={onClose}>
    <div className="detail-tags"><span className="pill">{event.category}</span><span className="pill">{event.isDemo ? 'Fictional demo event' : 'UConn Calendar'}</span></div>
    <p className="detail-description">{event.description || 'No description was provided. Visit the original event for details.'}</p>
    <dl className="detail-facts"><div><dt>When</dt><dd>{formatDate(event.startDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}<br />{event.allDay ? 'All day' : `${formatDate(event.startDate, { hour: 'numeric', minute: '2-digit' })}${event.endDate ? ` – ${formatDate(event.endDate, { hour: 'numeric', minute: '2-digit' })}` : ''} ET`}</dd></div><div><dt>Where</dt><dd>{event.location}<br />{event.campus}</dd></div><div><dt>Hosted by</dt><dd>{event.organization}</dd></div></dl>
    <div className="detail-relevance"><Icon name="sparkle" /><div><strong>{event.relevanceScore}% keyword match</strong><p>{event.explanation}</p></div></div>
    {event.isDemo && <p className="demo-disclaimer">This event is fictional and cannot be registered for. Dates roll forward to keep the demo fresh.</p>}
    <div className="detail-actions"><button className="button primary" onClick={() => onSave(event)}><Icon name="bookmark" size={17} />{saved ? 'Saved to your list' : 'Save event'}</button>{event.url ? <a className="button secondary" href={event.url} target="_blank" rel="noreferrer">Original event <Icon name="external" size={16} /></a> : <a className="text-link" href="https://events.uconn.edu/" target="_blank" rel="noreferrer">Browse real UConn events <Icon name="external" size={15} /></a>}</div>
  </Modal>;
}
