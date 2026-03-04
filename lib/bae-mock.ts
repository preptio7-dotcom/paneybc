export const BAE_VOL1_CODE = 'BAEIVI'
export const BAE_VOL2_CODE = 'BAEIV2E'

export const BAE_VOL1_NAME = 'Vol I - ITB'
export const BAE_VOL2_NAME = 'Vol II - ECO'

export type BaeVolume = 'VOL1' | 'VOL2'

export type BaeDistribution = {
  totalQuestions: number
  vol1Count: number
  vol2Count: number
  warning?: string
}

export type BaeSessionQuestionRef = {
  questionId: string
  volume: BaeVolume
}

export function calculateBaeTimeAllowedMinutes(totalQuestions: number) {
  return Math.max(1, Math.ceil((Number(totalQuestions) * 90) / 60))
}

export function shuffleArray<T>(input: T[]) {
  const items = input.slice()
  for (let index = items.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const temp = items[index]
    items[index] = items[swapIndex]
    items[swapIndex] = temp
  }
  return items
}

export function generateBAEDistribution(totalQuestions: number) {
  const safeTotal = Math.max(2, Math.floor(totalQuestions))
  const maxVol1 = Math.floor(safeTotal / 2)
  const minVol1 = Math.max(1, Math.floor(safeTotal * 0.2))

  const vol1Count = Math.floor(Math.random() * (maxVol1 - minVol1 + 1)) + minVol1
  const vol2Count = safeTotal - vol1Count

  if (vol2Count < vol1Count) {
    const half = Math.floor(safeTotal / 2)
    return {
      vol1Count: half,
      vol2Count: safeTotal - half,
    }
  }

  return { vol1Count, vol2Count }
}

function pickRandomCandidate(candidates: number[]) {
  if (!candidates.length) return null
  return candidates[Math.floor(Math.random() * candidates.length)]
}

export function resolveBaeDistributionWithAvailability(
  requestedTotalQuestions: number,
  availableVol1: number,
  availableVol2: number
): BaeDistribution {
  const safeRequested = Math.max(10, Math.min(100, Math.floor(requestedTotalQuestions || 50)))
  const maxAvailable = Math.max(0, Math.floor(availableVol1)) + Math.max(0, Math.floor(availableVol2))
  let totalQuestions = safeRequested
  let warning: string | undefined

  if (maxAvailable < totalQuestions) {
    totalQuestions = maxAvailable
    warning = `Test contains ${totalQuestions} questions (maximum available).`
  }

  if (totalQuestions <= 0) {
    return {
      totalQuestions: 0,
      vol1Count: 0,
      vol2Count: 0,
      warning,
    }
  }

  // Keep reducing total until a valid Vol II >= Vol I split exists with current inventory.
  while (totalQuestions > 0) {
    const minVol1Preferred = Math.max(1, Math.floor(totalQuestions * 0.2))
    const maxVol1 = Math.floor(totalQuestions / 2)

    const allCandidates: number[] = []
    const preferredCandidates: number[] = []

    for (let vol1 = 0; vol1 <= maxVol1; vol1 += 1) {
      const vol2 = totalQuestions - vol1
      if (vol1 > availableVol1) continue
      if (vol2 > availableVol2) continue
      if (vol2 < vol1) continue

      allCandidates.push(vol1)
      if (vol1 >= minVol1Preferred) {
        preferredCandidates.push(vol1)
      }
    }

    const selectedVol1 =
      pickRandomCandidate(preferredCandidates) ?? pickRandomCandidate(allCandidates)
    if (selectedVol1 !== null) {
      return {
        totalQuestions,
        vol1Count: selectedVol1,
        vol2Count: totalQuestions - selectedVol1,
        warning,
      }
    }

    totalQuestions -= 1
    if (!warning) {
      warning = `Test contains ${totalQuestions} questions (maximum available).`
    }
  }

  return {
    totalQuestions: 0,
    vol1Count: 0,
    vol2Count: 0,
    warning,
  }
}

export function getVolumeLabel(volume: BaeVolume) {
  return volume === 'VOL1' ? BAE_VOL1_NAME : BAE_VOL2_NAME
}

export function getVolumeBySubjectCode(subjectCode: string): BaeVolume {
  return String(subjectCode || '').toUpperCase() === BAE_VOL1_CODE ? 'VOL1' : 'VOL2'
}
