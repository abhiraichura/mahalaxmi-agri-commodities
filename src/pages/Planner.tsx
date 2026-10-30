// Tasks and notes together.
import { Hub } from '../ui';
import { TasksView } from './Todos';
import Notes from './Notes';

export default function Planner() {
  return (
    <Hub title="Tasks & notes" subtitle="Plan the day, jot things down" width="wide" tabs={[
      { id: 'tasks', label: 'Tasks', render: () => <div className="mx-auto max-w-3xl"><TasksView /></div> },
      { id: 'notes', label: 'Notes', render: () => <Notes /> },
    ]} />
  );
}
