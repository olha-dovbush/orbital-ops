// Data models for the station API. Hand-written, not validated at runtime:
// `public/api/**` is a static fixture set, so the guarantee that matters is the
// compile-time one. Every payload is registered in `ApiResources` below.

export interface Station {
  id: string;
  name: string;
  orbit: string;
  inclinationDeg: number;
  velocityKms: number;
  crewCapacity: number;
  crewOnboard: number;
  commissioned: string;
  nextResupply: string;
  daysInService: number;
}

export type Severity = 'critical' | 'warning' | 'info';

export type TelemetryMetric = 'o2' | 'power' | 'hullTemp' | 'hullIntegrity';

export interface TelemetrySeries {
  label: string;
  unit: string;
  points: number[];
}

export interface TelemetryResponse {
  /** Board Time: the instant the board treats as "now". */
  updated: string;
  intervalMinutes: number;
  series: Record<TelemetryMetric, TelemetrySeries>;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  shift: string;
  onDuty: boolean;
  heartRate: number;
  sleepHours: number;
  missionDay: number;
}

export interface CrewResponse {
  updated: string;
  members: CrewMember[];
}

export interface Incident {
  id: string;
  severity: Severity;
  system: string;
  title: string;
  timestamp: string;
  resolved: boolean;
  assignee: string;
}

export interface IncidentsResponse {
  updated: string;
  items: Incident[];
}

/**
 * The resource registry: every fetchable path mapped to the response it returns.
 * `getData` is generic over these keys, so a resource can only produce its own
 * payload and an unregistered key does not compile.
 */
export interface ApiResources {
  station: Station;
  telemetry: TelemetryResponse;
  crew: CrewResponse;
  incidents: IncidentsResponse;
}
