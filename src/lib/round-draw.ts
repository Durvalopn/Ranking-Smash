export type DrawAthlete = {
  id: string;
  current_class: number;
  status: string;
};

export type ExistingMatch = {
  athlete_one_id: string;
  athlete_two_id: string | null;
};

export type DrawPair = {
  classNumber: number;
  athleteOneId: string;
  athleteTwoId: string | null;
  drawOrder: number;
  isBye: boolean;
  justification: string;
};

function hashSeed(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededValue(seed: string, athleteId: string) {
  return hashSeed(`${seed}:${athleteId}`);
}

function alreadyPlayed(one: string, two: string, existing: ExistingMatch[]) {
  return existing.some((match) =>
    (match.athlete_one_id === one && match.athlete_two_id === two) ||
    (match.athlete_one_id === two && match.athlete_two_id === one),
  );
}

export function buildRoundDraw(athletes: DrawAthlete[], existing: ExistingMatch[], seed: string): DrawPair[] {
  const pairs: DrawPair[] = [];
  let drawOrder = 1;

  for (let classNumber = 1; classNumber <= 7; classNumber += 1) {
    const eligible = athletes
      .filter((athlete) => athlete.current_class === classNumber && athlete.status === "active")
      .sort((left, right) => seededValue(seed, left.id) - seededValue(seed, right.id));

    let index = 0;
    while (index + 1 < eligible.length) {
      const first = eligible[index];
      let opponentIndex = index + 1;
      while (opponentIndex < eligible.length && alreadyPlayed(first.id, eligible[opponentIndex].id, existing)) opponentIndex += 1;
      if (opponentIndex >= eligible.length) opponentIndex = index + 1;
      const second = eligible[opponentIndex];
      pairs.push({
        classNumber,
        athleteOneId: first.id,
        athleteTwoId: second.id,
        drawOrder,
        isBye: false,
        justification: `Sorteio determinístico da ${classNumber}ª Classe; seed ${seed}.`,
      });
      drawOrder += 1;
      eligible.splice(opponentIndex, 1);
      eligible.splice(index, 1);
    }

    if (eligible.length === 1) {
      pairs.push({
        classNumber,
        athleteOneId: eligible[0].id,
        athleteTwoId: null,
        drawOrder,
        isBye: true,
        justification: `Bye equilibrado por número ímpar de atletas na ${classNumber}ª Classe; seed ${seed}.`,
      });
      drawOrder += 1;
    }
  }

  return pairs;
}
