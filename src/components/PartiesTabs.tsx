// The two lists of people: your own parties, and the Gulfood directory. One switch, shown at the top of both pages.
import { useLocation, useNavigate } from 'react-router-dom';
import { Segmented } from '../ui';

export default function PartiesTabs() {
  const navigate = useNavigate();
  const onGulfood = useLocation().pathname.startsWith('/parties/gulfood');
  return (
    <div className="mb-4">
      <Segmented<'mine' | 'gulfood'> value={onGulfood ? 'gulfood' : 'mine'} label="Which list" onChange={v => navigate(v === 'gulfood' ? '/parties/gulfood' : '/parties')}
        options={[{ value: 'mine', label: 'My parties' }, { value: 'gulfood', label: 'Gulfood directory' }]} />
    </div>
  );
}
