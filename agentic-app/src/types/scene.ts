export type MotionStyle =
  | "orbit"
  | "wave"
  | "drift"
  | "burst"
  | "spiral"
  | "pulse";

export type ShapeType =
  | "orb"
  | "polygon"
  | "beam"
  | "particle"
  | "ribbon"
  | "flare";

export interface SceneElement {
  id: string;
  shape: ShapeType;
  color: string;
  glow: number;
  size: number;
  motion: MotionStyle;
  layer: number;
  density: number;
  pathPhase: number;
  pathAmplitude: number;
  pathFrequency: number;
}

export interface StoryBeat {
  at: number;
  title: string;
  description: string;
}

export interface CameraDesign {
  zoom: number;
  panStrength: number;
  roll: number;
  shake: number;
  lens: "anamorphic" | "wide" | "tele";
  grade: "dreamlike" | "cinematic" | "nocturne" | "ethereal" | "hyperreal";
}

export interface SceneRecipe {
  id: string;
  prompt: string;
  mood: string;
  vibeDescriptors: string[];
  background: string;
  palette: string[];
  duration: number;
  fps: number;
  audioHint: string;
  camera: CameraDesign;
  elements: SceneElement[];
  story: StoryBeat[];
}
