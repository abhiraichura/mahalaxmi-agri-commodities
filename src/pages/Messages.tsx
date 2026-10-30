// Messages: everything you send on WhatsApp, in one place.
import { Hub } from '../ui';
import WhatsAppBroadcast from './WhatsAppBroadcast';
import MessageGenerator from './MessageGenerator';
import PartyMessageGenerator from './PartyMessageGenerator';
import CustomMessageGenerator from './CustomMessageGenerator';

export default function Messages() {
  return (
    <Hub title="Messages" subtitle="Write it once, send it on WhatsApp" tabs={[
      { id: 'broadcast', label: 'Broadcast', render: () => <WhatsAppBroadcast /> },
      { id: 'rate', label: 'Rates', render: () => <MessageGenerator /> },
      { id: 'party', label: 'One party', render: () => <PartyMessageGenerator /> },
      { id: 'custom', label: 'Custom', render: () => <CustomMessageGenerator /> },
    ]} />
  );
}
