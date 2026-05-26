export type RouteName = "home" | "rules" | "game" | "leaderboard" | "profile";

export type OrderPriority = "low" | "medium" | "high";

export type OrderStatus = "waiting" | "picked" | "delivered" | "expired";

export type Direction = "up" | "down" | "left" | "right";

export type GameMode = "classic" | "arcade";

export interface Coordinate {
  x: number;
  y: number;
}

export interface OrderDto {
  id: string;
  clientName: string;
  street: string;
  pickup: Coordinate;
  destination: Coordinate;
  priority: OrderPriority;
  reward: number;
  deadlineSeconds: number;
  weightKg: number;
}

export interface Order extends OrderDto {
  status: OrderStatus;
  pickedAtSeconds: number | null;
  deliveredAtSeconds: number | null;
}

export interface Courier {
  position: Coordinate;
  speed: number;
  carriedOrderId: string | null;
}

export interface PlayerProfile {
  name: string;
  gamesPlayed: number;
  deliveries: number;
  bestScore: number;
  totalScore: number;
}

export interface LeaderboardRecord {
  id: string;
  playerName: string;
  score: number;
  delivered: number;
  date: string;
  mode: GameMode;
}

export interface GameSettings {
  durationSeconds: number;
  mapWidth: number;
  mapHeight: number;
  interactionRadius: number;
}

export interface GameSnapshot {
  orders: Order[];
  courier: Courier;
  score: number;
  timeLeft: number;
  elapsedSeconds: number;
  message: string;
  selectedOrderId: string | null;
  deliveredCount: number;
  expiredCount: number;
  isRunning: boolean;
  isPaused: boolean;
  isFinished: boolean;
  speedKmh: number;
  speedMode: "normal" | "boost";
  currentMode: GameMode;
}

export interface ResultSummary {
  score: number;
  delivered: number;
  expired: number;
  total: number;
}

export interface Building {
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
}

export interface KeyMap {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export type SnapshotListener = (snapshot: GameSnapshot) => void;

export type FinishListener = (result: ResultSummary) => void;

export type RoadKind = "rect" | "polyline" | "roundabout";

export interface Road {
  kind: RoadKind;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Coordinate[];
  radius?: number;
  roadWidth?: number;
  label?: string;
}

export type LightPhase = "horizontal" | "vertical";

export interface TrafficLight {
  id: string;
  x: number;
  y: number;
  phase: LightPhase;
  timeInPhase: number;
  cycleSeconds: number;
  yellowSeconds: number;
}

export interface TrafficCar {
  id: string;
  position: Coordinate;
  direction: Direction;
  speed: number;
  color: string;
  route: Coordinate[];
  routeIndex: number;
}


export type CameraAxis = "horizontal" | "vertical";

export interface SpeedCamera {
  id: string;
  x: number;
  y: number;
  axis: CameraAxis;
  speedLimitKmh: number;
  detectionRadius: number;
  label: string;
}


export type CrosswalkOrientation = "horizontal" | "vertical";

export interface Crosswalk {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  orientation: CrosswalkOrientation;
}

export interface Pedestrian {
  id: string;
  position: Coordinate;
  start: Coordinate;
  end: Coordinate;
  speed: number;
  direction: 1 | -1;
  pauseUntilSeconds: number;
}
