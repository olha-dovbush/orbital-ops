import { useFuel } from '../hooks/useFuel';
import { fuelEndurance, tankFill } from '../domain/fuel';
import PanelNotice from './PanelNotice';
import { TONE_CLASS } from '../config';

// Fuel reserves. Fuel Endurance leads, because "how many days can we keep
// flying" is the question an operator actually has; the reserve, the burn, and
// the tanks underneath are the evidence for it.
//
// No arithmetic here — every number on screen comes from src/domain/fuel.ts or
// straight off the payload, so each has one definition and one test. Tank rows
// carry no tone: the station's endurance is what an operator acts on.

export default function FuelPanel() {
  const fuel = useFuel();

  if (fuel.isPending) {
    return <PanelNotice title="Fuel" kind="loading" message="Loading fuel reserves…" />;
  }

  if (fuel.isError) {
    return (
      <PanelNotice
        title="Fuel"
        kind="error"
        message={fuel.error.message}
        onRetry={() => void fuel.refetch()}
      />
    );
  }

  const reading = fuelEndurance(fuel.data.tanks, fuel.data.dailyConsumptionKg);

  return (
    <section className="panel">
      <h2>Fuel</h2>
      <div className="fuel-headline">
        <span className={'fuel-endurance ' + TONE_CLASS[reading.tone]}>{reading.days ?? '—'}</span>
        <span className="fuel-endurance-label">days · Fuel Endurance</span>
      </div>
      <p className="fuel-inputs">
        Fuel Reserve {reading.reserveKg} kg · burning {fuel.data.dailyConsumptionKg} kg/day
      </p>
      <ul className="fuel-list">
        {fuel.data.tanks.map((tank) => (
          <li key={tank.id} className="fuel-row">
            <div className="fuel-main">
              <span className="fuel-id">{tank.id}</span>
              <span className="fuel-type">{tank.type}</span>
            </div>
            <span className="fuel-mass">
              {tank.currentKg} / {tank.capacityKg} kg
            </span>
            <span className="fuel-pct">{tankFill(tank)}%</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
