import { useState } from 'react';
import Modal from './Modal.jsx';
import Icon from './Icon.jsx';

export default function Preferences({ current, options, onSave, onClose }) {
  const [value, setValue] = useState(current);
  return <Modal title="Make campus feel like you." onClose={onClose} className="preferences-modal">
    <p className="modal-intro">A few details. A whole campus of possibilities. We’ll find the events that connect with your world.</p>
    <form onSubmit={(event) => { event.preventDefault(); onSave(value); }}>
      <div className="preference-selects"><label>Your major<select value={value.major} onChange={(event) => setValue({ ...value, major: event.target.value })}>{options.majors.map((major) => <option key={major}>{major}</option>)}</select></label><label>Your campus<select value={value.campus} onChange={(event) => setValue({ ...value, campus: event.target.value })}>{options.campuses.map((campus) => <option key={campus}>{campus}</option>)}</select></label></div>
      <fieldset><legend>What sparks your curiosity? <span>Pick as many as you like.</span></legend><div className="interest-options">{options.interests.map((interest) => <button key={interest} type="button" aria-pressed={value.interests.includes(interest)} className={value.interests.includes(interest) ? 'selected' : ''} onClick={() => setValue({ ...value, interests: value.interests.includes(interest) ? value.interests.filter((item) => item !== interest) : [...value.interests, interest] })}>{value.interests.includes(interest) && <Icon name="check" size={14} />}{interest}</button>)}</div></fieldset>
      <p className="privacy-note">No account needed. Your preferences stay in this browser.</p><button className="button primary full-width" type="submit">Find my events <Icon name="arrow" size={18} /></button>
    </form>
  </Modal>;
}
