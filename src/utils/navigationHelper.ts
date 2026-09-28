export type TurnAction =
  | 'straight'
  | 'turn-left'
  | 'turn-right'
  | 'slight-left'
  | 'slight-right'
  | 'u-turn'
  | 'roundabout'
  | 'arrive';

export interface TurnInstruction {
  action: TurnAction;
  instruction: string;
  streetName: string;
  distanceToTurnMeters: number;
  isApproaching: boolean;
}

export function detectTurnAction(instructionText: string): TurnAction {
  const lower = instructionText.toLowerCase();
  if (lower.includes('u-turn') || lower.includes('uturn')) return 'u-turn';
  if (lower.includes('sharp left') || lower.includes('turn left') || lower.includes('left onto')) return 'turn-left';
  if (lower.includes('sharp right') || lower.includes('turn right') || lower.includes('right onto')) return 'turn-right';
  if (lower.includes('slight left') || lower.includes('bear left') || lower.includes('keep left')) return 'slight-left';
  if (lower.includes('slight right') || lower.includes('bear right') || lower.includes('keep right')) return 'slight-right';
  if (lower.includes('roundabout') || lower.includes('rotary')) return 'roundabout';
  if (lower.includes('arrive') || lower.includes('destination') || lower.includes('reach')) return 'arrive';
  return 'straight';
}

export function extractStreetName(instructionText: string): string {
  const ontoMatch = instructionText.match(/onto\s+([^,.]+)/i);
  if (ontoMatch && ontoMatch[1]) return ontoMatch[1].trim();

  const onMatch = instructionText.match(/on\s+([^,.]+)/i);
  if (onMatch && onMatch[1]) return onMatch[1].trim();

  const towardMatch = instructionText.match(/toward\s+([^,.]+)/i);
  if (towardMatch && towardMatch[1]) return towardMatch[1].trim();

  return 'Main Road';
}

/**
 * Generates smooth realistic Dhaka / Bangladesh turn steps if route steps are sparse
 */
export function generateRealisticSteps(
  pickupName: string,
  dropoffName: string,
  totalDistanceMeters: number
): { instruction: string; distance: number; time: number }[] {
  const roads = [
    'Gulshan Avenue',
    'Kemal Ataturk Avenue',
    'Pragati Sarani',
    'Bir Uttam Mir Shawkat Sarak',
    'Mohakhali Flyover Link',
    'Airport Road (Dhaka-Mymensingh Hwy)',
    'Dhanmondi Satmasjid Road',
    'Mirpur Road',
    'Bijoy Sarani Expressway',
    'Hatirjheel Circular Road',
  ];

  const road1 = pickupName.split(',')[0] || roads[0];
  const road2 = roads[Math.floor(Math.random() * roads.length)];
  const road3 = roads[(Math.floor(Math.random() * roads.length) + 1) % roads.length];
  const destRoad = dropoffName.split(',')[0] || 'Destination';

  const part = Math.max(200, Math.round(totalDistanceMeters / 4));

  return [
    {
      instruction: `Head out from pickup onto ${road1}`,
      distance: part,
      time: Math.round(part / 10),
    },
    {
      instruction: `Turn right onto ${road2}`,
      distance: part,
      time: Math.round(part / 10),
    },
    {
      instruction: `Keep straight onto ${road3}`,
      distance: part,
      time: Math.round(part / 10),
    },
    {
      instruction: `Turn left towards ${destRoad}`,
      distance: part,
      time: Math.round(part / 10),
    },
    {
      instruction: `Arrive at destination: ${destRoad}`,
      distance: 50,
      time: 15,
    },
  ];
}

/**
 * Creates an alternative route variation with slightly different coordinates (simulating a faster shortcut)
 */
export function createAlternativeRoute(
  coords: [number, number][],
  seed = 0.003
): [number, number][] {
  if (coords.length < 4) return coords;

  return coords.map((pt, idx) => {
    if (idx === 0 || idx === coords.length - 1) return pt;
    const progress = idx / coords.length;
    // Lateral offset curve for alternative street
    const offset = Math.sin(progress * Math.PI) * seed;
    return [pt[0] + offset, pt[1] - offset * 0.8];
  });
}
