export const CLASS_MOVEMENT_PERCENTAGE = 0.2;
export const MIN_CLASS_NUMBER = 1;
export const MAX_CLASS_NUMBER = 7;

export type AthleteStatus = "active" | "licensed" | "inactive" | "pendente" | "withdrawn" | "disqualified";
export type ClassMovementType = "promoted" | "relegated" | "stayed" | "ineligible";

export interface AthleteFinalStanding {
  athleteId: string;
  athleteName: string;
  classNumber: number;
  points: number;
  setBalance: number;
  gameBalance: number;
  birthDate: string;
  status: AthleteStatus;
  isMember?: boolean;
}

export interface AthleteClassMovement {
  athleteId: string;
  athleteName: string;
  previousClass: number;
  nextClass: number;
  finalPosition: number | null;
  movement: ClassMovementType;
  reason: "promotion_zone" | "relegation_zone" | "remained_in_class" | "not_eligible";
  description: string;
}

export interface ClassMovementSummary { classNumber: number; eligibleAthletes: number; movementSlots: number; promotedAthletes: number; relegatedAthletes: number; }
export interface SeasonClassMovementResult { movements: AthleteClassMovement[]; summary: ClassMovementSummary[]; }

export function isEligibleForClassMovement(athlete: AthleteFinalStanding): boolean {
  return (athlete.status === "active" || athlete.status === "licensed") && athlete.isMember !== false;
}

export function calculateMovementSlots(eligibleAthletes: number, percentage = CLASS_MOVEMENT_PERCENTAGE): number {
  if (!Number.isInteger(eligibleAthletes) || eligibleAthletes < 0) throw new Error("A quantidade de atletas elegíveis deve ser um inteiro não negativo.");
  if (percentage < 0 || percentage > 1) throw new Error("O percentual de movimentação deve estar entre 0 e 1.");
  return eligibleAthletes === 0 ? 0 : Math.ceil(eligibleAthletes * percentage);
}

export function sortFinalStandings(athletes: AthleteFinalStanding[]): AthleteFinalStanding[] {
  return [...athletes].sort((first, second) => {
    if (first.points !== second.points) return second.points - first.points;
    if (first.setBalance !== second.setBalance) return second.setBalance - first.setBalance;
    if (first.gameBalance !== second.gameBalance) return second.gameBalance - first.gameBalance;
    const firstBirthDate = Date.parse(first.birthDate); const secondBirthDate = Date.parse(second.birthDate);
    if (Number.isNaN(firstBirthDate) || Number.isNaN(secondBirthDate)) throw new Error("Data de nascimento inválida para desempate.");
    if (firstBirthDate !== secondBirthDate) return firstBirthDate - secondBirthDate;
    return first.athleteId.localeCompare(second.athleteId);
  });
}

export function calculateSeasonClassMovements(standings: AthleteFinalStanding[], totalClasses = MAX_CLASS_NUMBER, percentage = CLASS_MOVEMENT_PERCENTAGE): SeasonClassMovementResult {
  if (!Number.isInteger(totalClasses) || totalClasses < 2) throw new Error("A quantidade total de classes deve ser um inteiro maior ou igual a 2.");
  if (percentage < 0 || percentage > 1) throw new Error("O percentual de movimentação deve estar entre 0 e 1.");
  const ids = new Set<string>(); for (const athlete of standings) { if (!athlete.athleteId || ids.has(athlete.athleteId)) throw new Error("Cada atleta deve possuir um identificador único."); ids.add(athlete.athleteId); if (!Number.isInteger(athlete.classNumber) || athlete.classNumber < 1 || athlete.classNumber > totalClasses) throw new Error(`Classe inválida para ${athlete.athleteName}.`); }
  const movements: AthleteClassMovement[] = []; const summary: ClassMovementSummary[] = [];
  for (let classNumber = MIN_CLASS_NUMBER; classNumber <= totalClasses; classNumber++) {
    const classAthletes = standings.filter((athlete) => athlete.classNumber === classNumber); const eligible = sortFinalStandings(classAthletes.filter(isEligibleForClassMovement)); const ineligible = classAthletes.filter((athlete) => !isEligibleForClassMovement(athlete)); const slots = calculateMovementSlots(eligible.length, percentage); const promotions = classNumber === MIN_CLASS_NUMBER || classNumber === totalClasses ? 0 : slots; const relegations = classNumber === totalClasses ? 0 : slots;
    if (promotions + relegations > eligible.length) throw new Error(`A Classe ${classNumber} não possui atletas suficientes para zonas distintas.`);
    const promoted = new Set(promotions ? eligible.slice(0, promotions).map((athlete) => athlete.athleteId) : []); const relegated = new Set(relegations ? eligible.slice(-relegations).map((athlete) => athlete.athleteId) : []);
    eligible.forEach((athlete, index) => { const promotedHere = promoted.has(athlete.athleteId); const relegatedHere = relegated.has(athlete.athleteId); const movement = promotedHere ? "promoted" : relegatedHere ? "relegated" : "stayed"; const nextClass = promotedHere ? classNumber - 1 : relegatedHere ? classNumber + 1 : classNumber; movements.push({ athleteId: athlete.athleteId, athleteName: athlete.athleteName, previousClass: classNumber, nextClass, finalPosition: index + 1, movement, reason: promotedHere ? "promotion_zone" : relegatedHere ? "relegation_zone" : "remained_in_class", description: `${athlete.athleteName} permaneceu na Classe ${nextClass}.` }); });
    ineligible.forEach((athlete) => movements.push({ athleteId: athlete.athleteId, athleteName: athlete.athleteName, previousClass: classNumber, nextClass: classNumber, finalPosition: null, movement: "ineligible", reason: "not_eligible", description: `${athlete.athleteName} permaneceu na Classe ${classNumber} por não ser elegível.` }));
    summary.push({ classNumber, eligibleAthletes: eligible.length, movementSlots: slots, promotedAthletes: promoted.size, relegatedAthletes: relegated.size });
  }
  return { movements, summary };
}
