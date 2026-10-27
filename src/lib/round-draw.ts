import { movementSlots } from "@/lib/class-movement";

export type DrawAthlete = {
  id: string;
  current_class: number;
  status: string;
  birth_date?: string | null;
  points?: number;
  set_balance?: number;
  game_balance?: number;
};

export type ExistingMatch = {
  athlete_one_id: string;
  athlete_two_id: string | null;
  result_type?: string | null;
};

export type DrawPair = {
  classNumber: number;
  athleteOneId: string;
  athleteTwoId: string | null;
  drawOrder: number;
  isBye: boolean;
  justification: string;
};

export type DrawOptions = {
  finalRound?: boolean;
};

type Zone = "upper" | "middle" | "lower";
type Stake = "title" | "promotion" | "relegation";
type RankedAthlete = DrawAthlete & {
  position: number;
  zone: Zone;
  stakes: Set<Stake>;
  sweetZone: boolean;
  minimumFinalPoints: number;
  maximumFinalPoints: number;
};
type Pairing = { first: number; second: number | null };
type Cost = [number, number, number, number, number, number, number, number];
type Solution = { cost: Cost; pairings: Pairing[] };

const ELIGIBLE_STATUSES = new Set(["active", "licensed"]);
const COMPLETED_BYE_TYPES = new Set(["bye", "double_walkover"]);

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededValue(seed: string, value: string) {
  return hashSeed(`${seed}:${value}`) % 1_000_003;
}

function pairKey(first: string, second: string) {
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function compareRank(first: DrawAthlete, second: DrawAthlete) {
  return (second.points ?? 0) - (first.points ?? 0) ||
    (second.set_balance ?? 0) - (first.set_balance ?? 0) ||
    (second.game_balance ?? 0) - (first.game_balance ?? 0) ||
    (first.birth_date ?? "9999-12-31").localeCompare(second.birth_date ?? "9999-12-31") ||
    first.id.localeCompare(second.id);
}

function getRankedAthletes(athletes: DrawAthlete[], finalRound: boolean) {
  const rankedByClass = new Map<number, DrawAthlete[]>();
  for (const athlete of athletes.filter((entry) => ELIGIBLE_STATUSES.has(entry.status))) {
    const classAthletes = rankedByClass.get(athlete.current_class) ?? [];
    classAthletes.push(athlete);
    rankedByClass.set(athlete.current_class, classAthletes);
  }

  const result = new Map<string, RankedAthlete>();
  for (const [classNumber, classAthletes] of rankedByClass) {
    const ranking = [...classAthletes].sort(compareRank);
    const slots = movementSlots(ranking.length);
    ranking.forEach((athlete, index) => {
      const position = index + 1;
      const zone: Zone = position <= slots ? "upper" : position > ranking.length - slots ? "lower" : "middle";
      const stakes = new Set<Stake>();
      let minimumFinalPoints = athlete.points ?? 0;
      let maximumFinalPoints = athlete.points ?? 0;

      if (finalRound) {
        const isActive = athlete.status === "active";
        minimumFinalPoints += isActive ? 0 : 3;
        maximumFinalPoints += isActive ? 7 : 3;
        const otherAthletes = ranking.filter((other) => other.id !== athlete.id);
        const guaranteedAbove = otherAthletes.filter((other) =>
          (other.points ?? 0) + (other.status === "active" ? 0 : 3) > maximumFinalPoints,
        ).length;
        const guaranteedBelow = otherAthletes.filter((other) =>
          (other.points ?? 0) + (other.status === "active" ? 7 : 3) < minimumFinalPoints,
        ).length;

        if (guaranteedAbove < 1) stakes.add("title");
        if (classNumber > 1 && classNumber < 7 && guaranteedAbove < slots) stakes.add("promotion");
        if (classNumber < 7 && guaranteedBelow < slots) stakes.add("relegation");
      }

      result.set(athlete.id, {
        ...athlete,
        position,
        zone,
        stakes,
        sweetZone: finalRound && !stakes.has("promotion") && !stakes.has("relegation"),
        minimumFinalPoints,
        maximumFinalPoints,
      });
    });
  }
  return result;
}

function addCost(first: Cost, second: Cost): Cost {
  return first.map((value, index) => value + second[index]) as Cost;
}

function subtractCost(first: Cost, second: Cost): Cost {
  return first.map((value, index) => value - second[index]) as Cost;
}

function compareCost(first: Cost, second: Cost) {
  for (let index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) return first[index] - second[index];
  }
  return 0;
}

function zeroCost(): Cost {
  return [0, 0, 0, 0, 0, 0, 0, 0];
}

function getPairCost(
  first: RankedAthlete,
  second: RankedAthlete,
  previousMeetings: Map<string, number>,
  finalRound: boolean,
  seed: string,
): Cost {
  const meetings = previousMeetings.get(pairKey(first.id, second.id)) ?? 0;
  const zoneDistance = Math.abs(["upper", "middle", "lower"].indexOf(first.zone) - ["upper", "middle", "lower"].indexOf(second.zone));
  const bothHaveStakes = first.stakes.size > 0 && second.stakes.size > 0;
  const oneHasStakes = (first.stakes.size > 0) !== (second.stakes.size > 0);
  const sharedStakes = [...first.stakes].filter((stake) => second.stakes.has(stake)).length;
  const finalRelevance = !finalRound ? 0 : sharedStakes ? -sharedStakes : bothHaveStakes ? 1 : oneHasStakes ? 2 : 0;

  return [
    meetings > 0 ? 1 : 0,
    meetings,
    Math.abs(first.position - second.position),
    zoneDistance,
    Math.abs((first.points ?? 0) - (second.points ?? 0)),
    finalRelevance,
    0,
    seededValue(seed, pairKey(first.id, second.id)),
  ];
}

function getByeCost(athlete: RankedAthlete, previousByeCount: number, seed: string): Cost {
  return [0, 0, 0, 0, 0, 0, previousByeCount, seededValue(seed, `bye:${athlete.id}`)];
}

function countBits(value: number) {
  let count = 0;
  for (let remaining = value; remaining; remaining &= remaining - 1) count += 1;
  return count;
}

function findExactPairing(
  athletes: RankedAthlete[],
  pairCosts: Cost[][],
  byeCosts: Cost[],
): Solution {
  const memo = new Map<number, Solution>();
  const solve = (mask: number): Solution => {
    if (mask === 0) return { cost: zeroCost(), pairings: [] };
    const cached = memo.get(mask);
    if (cached) return cached;

    const firstBit = mask & -mask;
    const first = Math.log2(firstBit);
    const withoutFirst = mask ^ firstBit;
    let best: Solution | null = null;
    if (countBits(mask) % 2 === 1) {
      const tail = solve(withoutFirst);
      best = {
        cost: addCost(byeCosts[first], tail.cost),
        pairings: [{ first, second: null }, ...tail.pairings],
      };
    }
    for (let second = first + 1; second < athletes.length; second += 1) {
      const secondBit = 1 << second;
      if (!(withoutFirst & secondBit)) continue;
      const tail = solve(withoutFirst ^ secondBit);
      const candidate: Solution = {
        cost: addCost(pairCosts[first][second], tail.cost),
        pairings: [{ first, second }, ...tail.pairings],
      };
      if (!best || compareCost(candidate.cost, best.cost) < 0) best = candidate;
    }
    if (!best) throw new Error("Não foi possível montar os confrontos da classe.");
    memo.set(mask, best);
    return best;
  };

  return solve((1 << athletes.length) - 1);
}

function findGreedyPairing(
  athletes: RankedAthlete[],
  pairCosts: Cost[][],
  byeCosts: Cost[],
): Solution {
  const byeCandidates: (number | null)[] = athletes.length % 2 ? athletes.map((_, index) => index) : [null];
  let best: Solution | null = null;

  for (const byeIndex of byeCandidates) {
    const remaining = athletes.map((_, index) => index).filter((index) => index !== byeIndex);
    const pairings: Pairing[] = byeIndex === null ? [] : [{ first: byeIndex, second: null }];
    while (remaining.length > 1) {
      let selected: [number, number] | null = null;
      for (let left = 0; left < remaining.length; left += 1) {
        for (let right = left + 1; right < remaining.length; right += 1) {
          const first = remaining[left];
          const second = remaining[right];
          if (!selected || compareCost(pairCosts[first][second], pairCosts[selected[0]][selected[1]]) < 0) {
            selected = [first, second];
          }
        }
      }
      if (!selected) break;
      pairings.push({ first: selected[0], second: selected[1] });
      const firstIndex = remaining.indexOf(selected[0]);
      const secondIndex = remaining.indexOf(selected[1]);
      remaining.splice(Math.max(firstIndex, secondIndex), 1);
      remaining.splice(Math.min(firstIndex, secondIndex), 1);
    }

    let cost = zeroCost();
    for (const pairing of pairings) {
      cost = addCost(cost, pairing.second === null ? byeCosts[pairing.first] : pairCosts[pairing.first][pairing.second]);
    }
    const candidate = { cost, pairings };
    if (!best || compareCost(candidate.cost, best.cost) < 0) best = candidate;
  }

  if (!best) throw new Error("Não foi possível montar os confrontos da classe.");
  let improved = true;
  while (improved) {
    improved = false;
    for (let firstIndex = 0; firstIndex < best.pairings.length && !improved; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < best.pairings.length && !improved; secondIndex += 1) {
        const firstPair = best.pairings[firstIndex];
        const secondPair = best.pairings[secondIndex];
        const originalCost = addCost(
          firstPair.second === null ? byeCosts[firstPair.first] : pairCosts[firstPair.first][firstPair.second],
          secondPair.second === null ? byeCosts[secondPair.first] : pairCosts[secondPair.first][secondPair.second],
        );
        const alternatives: [Pairing, Pairing][] = [];

        if (firstPair.second === null && secondPair.second !== null) {
          alternatives.push(
            [{ first: secondPair.first, second: null }, { first: firstPair.first, second: secondPair.second }],
            [{ first: secondPair.second, second: null }, { first: firstPair.first, second: secondPair.first }],
          );
        } else if (firstPair.second !== null && secondPair.second === null) {
          alternatives.push(
            [{ first: firstPair.first, second: null }, { first: firstPair.second, second: secondPair.first }],
            [{ first: firstPair.second, second: null }, { first: firstPair.first, second: secondPair.first }],
          );
        } else if (firstPair.second !== null && secondPair.second !== null) {
          alternatives.push(
            [{ first: firstPair.first, second: secondPair.first }, { first: firstPair.second, second: secondPair.second }],
            [{ first: firstPair.first, second: secondPair.second }, { first: firstPair.second, second: secondPair.first }],
          );
        }

        for (const [firstAlternative, secondAlternative] of alternatives) {
          const alternativeCost = addCost(
            firstAlternative.second === null ? byeCosts[firstAlternative.first] : pairCosts[firstAlternative.first][firstAlternative.second],
            secondAlternative.second === null ? byeCosts[secondAlternative.first] : pairCosts[secondAlternative.first][secondAlternative.second],
          );
          if (compareCost(alternativeCost, originalCost) >= 0) continue;
          const pairings: Pairing[] = [...best.pairings];
          pairings[firstIndex] = firstAlternative;
          pairings[secondIndex] = secondAlternative;
          best = { cost: addCost(subtractCost(best.cost, originalCost), alternativeCost), pairings };
          improved = true;
          break;
        }
      }
    }
  }
  return best;
}

export function buildRoundDraw(
  athletes: DrawAthlete[],
  existing: ExistingMatch[],
  seed: string,
  options: DrawOptions = {},
): DrawPair[] {
  const finalRound = options.finalRound ?? false;
  const rankedAthletes = getRankedAthletes(athletes, finalRound);
  const previousMeetings = new Map<string, number>();
  const previousByes = new Map<string, number>();

  for (const match of existing) {
    if (match.athlete_two_id && match.athlete_one_id !== match.athlete_two_id) {
      const key = pairKey(match.athlete_one_id, match.athlete_two_id);
      previousMeetings.set(key, (previousMeetings.get(key) ?? 0) + 1);
    } else if (!match.athlete_two_id && COMPLETED_BYE_TYPES.has(match.result_type ?? "")) {
      previousByes.set(match.athlete_one_id, (previousByes.get(match.athlete_one_id) ?? 0) + 1);
    }
  }

  const output: DrawPair[] = [];
  let drawOrder = 1;
  const classes = [...new Set(athletes.map((athlete) => athlete.current_class))].sort((a, b) => a - b);
  for (const classNumber of classes) {
    const participants = athletes
      .filter((athlete) => athlete.current_class === classNumber && athlete.status === "active")
      .map((athlete) => rankedAthletes.get(athlete.id))
      .filter((athlete): athlete is RankedAthlete => Boolean(athlete))
      .sort((first, second) => first.position - second.position);
    if (!participants.length) continue;

    const pairCosts = participants.map((first, firstIndex) => participants.map((second, secondIndex) =>
      firstIndex === secondIndex ? zeroCost() : getPairCost(first, second, previousMeetings, finalRound, seed),
    ));
    const byeCosts = participants.map((athlete) => getByeCost(athlete, previousByes.get(athlete.id) ?? 0, seed));
    const solution = participants.length <= 16
      ? findExactPairing(participants, pairCosts, byeCosts)
      : findGreedyPairing(participants, pairCosts, byeCosts);

    for (const pairing of solution.pairings) {
      const first = participants[pairing.first];
      if (pairing.second === null) {
        output.push({
          classNumber,
          athleteOneId: first.id,
          athleteTwoId: null,
          drawOrder,
          isBye: true,
          justification: `BYE atribuído com ${previousByes.get(first.id) ?? 0} bye(s) anterior(es) na temporada; ${classNumber}ª Classe; seed ${seed}.`,
        });
      } else {
        const second = participants[pairing.second];
        const meetings = previousMeetings.get(pairKey(first.id, second.id)) ?? 0;
        const stakeLabels: Record<Stake, string> = { title: "título", promotion: "acesso", relegation: "rebaixamento" };
        const sharedStakes = [...first.stakes]
          .filter((stake) => second.stakes.has(stake))
          .map((stake) => stakeLabels[stake]);
        const finalStake = finalRound && first.stakes.size && second.stakes.size
          ? sharedStakes.length
            ? `ambos em disputa (${sharedStakes.join(", ")})`
            : "atletas em disputas decisivas diferentes"
          : finalRound && (first.stakes.size || second.stakes.size)
            ? "confronto com atleta em zona decisiva"
            : finalRound
              ? "zona doce, sem disputa decisiva"
              : "rodada regular";
        output.push({
          classNumber,
          athleteOneId: first.id,
          athleteTwoId: second.id,
          drawOrder,
          isBye: false,
          justification: `Posições ${first.position} e ${second.position} (distância ${Math.abs(first.position - second.position)}); ${meetings} confronto(s) anterior(es); zonas ${first.zone}/${second.zone}; ${finalStake}; seed ${seed}.`,
        });
      }
      drawOrder += 1;
    }
  }

  return output;
}