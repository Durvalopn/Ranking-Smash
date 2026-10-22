export const CLASS_MOVEMENT_PERCENTAGE = 0.2;
export type MovementStatus = "promoted" | "relegated" | "stayed" | "not_eligible";
export type MovementRow = {
  athleteId: string;
  name: string;
  classNumber: number;
  finalPosition: number;
  points: number;
  setBalance: number;
  gameBalance: number;
  birthDate: string | null;
  status: string;
  eligibleForClassMovement?: boolean | null;
};
export type MovementDecision = MovementRow & { nextClass: number; movementStatus: MovementStatus; reason: string; slots: number };

export function isEligible(row: MovementRow) {
  if (row.eligibleForClassMovement !== null && row.eligibleForClassMovement !== undefined) return row.eligibleForClassMovement;
  return row.status === "active" || row.status === "licensed";
}

export function movementSlots(count: number) { return count <= 0 ? 0 : Math.ceil(count * CLASS_MOVEMENT_PERCENTAGE); }

export function sortFinalStandings(rows: MovementRow[]) {
  return [...rows].sort((a, b) => b.points - a.points || b.setBalance - a.setBalance || b.gameBalance - a.gameBalance || (a.birthDate ? new Date(a.birthDate).getTime() : Number.MAX_SAFE_INTEGER) - (b.birthDate ? new Date(b.birthDate).getTime() : Number.MAX_SAFE_INTEGER) || a.athleteId.localeCompare(b.athleteId));
}

export function calculateClassMovement(rows: MovementRow[], totalClasses = 6) {
  const decisions: MovementDecision[] = [];
  for (let classNumber = 1; classNumber <= totalClasses; classNumber += 1) {
    const classRows = sortFinalStandings(rows.filter((row) => row.classNumber === classNumber));
    const eligible = classRows.filter(isEligible);
    const slots = movementSlots(eligible.length);
    const promoted = new Set(classNumber === 1 ? [] : eligible.slice(0, slots).map((row) => row.athleteId));
    const relegated = new Set(classNumber === totalClasses ? [] : eligible.slice(Math.max(0, eligible.length - slots)).filter((row) => !promoted.has(row.athleteId)).map((row) => row.athleteId));
    classRows.forEach((row, index) => {
      const position = index + 1;
      const eligibleRow = isEligible(row);
      if (!eligibleRow) decisions.push({ ...row, finalPosition: position, nextClass: classNumber, movementStatus: "not_eligible", reason: "Não elegível para movimentação", slots: 0 });
      else if (promoted.has(row.athleteId)) decisions.push({ ...row, finalPosition: position, nextClass: classNumber - 1, movementStatus: "promoted", reason: `Acesso: top ${slots} da classe`, slots });
      else if (relegated.has(row.athleteId)) decisions.push({ ...row, finalPosition: position, nextClass: classNumber + 1, movementStatus: "relegated", reason: `Rebaixamento: bottom ${slots} da classe`, slots });
      else decisions.push({ ...row, finalPosition: position, nextClass: classNumber, movementStatus: "stayed", reason: classNumber === 1 ? "Limite da Classe 1" : classNumber === totalClasses ? "Limite da Classe 6" : "Permanece na classe", slots });
    });
  }
  return decisions;
}
