// Data models for the station API.
// Only two of the six payloads are typed. The rest travel as `any`.
// TODO: TelemetryResponse, CrewResponse, CrewMember, IncidentsResponse, Incident

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
