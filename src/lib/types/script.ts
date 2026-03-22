export interface ScriptEntry {
  shotId: string;
  text: string | null;
  order: number;
}

export interface Script {
  entries: ScriptEntry[];
}
