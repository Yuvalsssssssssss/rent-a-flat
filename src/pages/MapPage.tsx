import { useNavigate } from 'react-router-dom';
import { useData } from '../lib/data';
import { summarize } from '../lib/scoring';
import { DEFAULT_CENTER, hasLocation } from '../lib/geo';
import { apartmentMarker, placeMarker } from '../lib/mapMarkers';
import LeafletMap from '../components/LeafletMap';
import PageHeader from '../components/PageHeader';
import PlacesEditor from '../components/PlacesEditor';

export default function MapPage() {
  const { apartments, places, categories, scoreIndex, members } = useData();
  const navigate = useNavigate();
  const memberIds = members.map((m) => m.user_id);
  const located = apartments.filter(hasLocation);
  const missing = apartments.length - located.length;
  const markers = [
    ...places.map(placeMarker),
    ...located.map((a) => apartmentMarker(a, summarize(a.id, categories, scoreIndex, memberIds).combined, {
      onClick: () => navigate(`/apartment/${a.id}`),
    })),
  ];

  return (
    <div className="space-y-4">
      <PageHeader title="Map"
        subtitle={missing ? `${missing} apartment${missing === 1 ? '' : 's'} without a pin. Open it and tap its map to place one.` : 'Tap a pin to open the apartment.'} />
      <LeafletMap markers={markers} center={DEFAULT_CENTER} zoom={15} fit className="h-[55vh] min-h-80 rounded-2xl" />
      <PlacesEditor />
    </div>
  );
}
