// Money: your brokerage bills and the statement of each party.
import { Hub } from '../ui';
import BrokerageBills from './BrokerageBills';
import PartyLedger from './PartyLedger';

export default function Money() {
  return (
    <Hub title="Money" subtitle="Brokerage bills and party statements" tabs={[
      { id: 'bills', label: 'Brokerage bills', render: () => <BrokerageBills /> },
      { id: 'ledger', label: 'Party ledger', render: () => <PartyLedger /> },
    ]} />
  );
}
