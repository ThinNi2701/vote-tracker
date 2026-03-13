export function classifyBallot(ballot, picksAllowed) {
  const selectedCount = ballot.selected?.length ?? 0
  const delta = picksAllowed - selectedCount

  if (delta === 0) {
    return {
      isValid: true,
      label: 'Hợp lệ',
      category: 'valid',
      selectedCount,
      trustValue: selectedCount,
    }
  }

  if (delta > 0) {
    return {
      isValid: true,
      isShort: true,
      category: 'short',
      label: `Phiếu thiếu (Thiếu ${delta})`,
      detailLabel: `Thiếu ${delta}`,
      selectedCount,
      trustValue: selectedCount,
    }
  }

  const detailLabel = `Thừa ${Math.abs(delta)}`
  return {
    isValid: false,
    category: 'over',
    label: `Không hợp lệ (${detailLabel})`,
    detailLabel,
    selectedCount,
    trustValue: selectedCount,
  }
}

export function computeBallotStats(election) {
  const voteMap = Object.fromEntries((election.candidates || []).map((name) => [name, 0]))
  const invalidBuckets = {}
  const shortBuckets = {}
  let validBallots = 0
  let shortBallots = 0

  ;(election.ballots || []).forEach((ballot) => {
    const ballotStatus = classifyBallot(ballot, election.picksAllowed)

    if (ballotStatus.isValid) {
      validBallots += 1
      if (ballotStatus.isShort) {
        shortBallots += 1
        const shortLabel = ballotStatus.detailLabel
        shortBuckets[shortLabel] = (shortBuckets[shortLabel] || 0) + 1
      }
      ;(ballot.selected || []).forEach((name) => {
        voteMap[name] = (voteMap[name] || 0) + 1
      })
      return
    }

    const bucketLabel = ballotStatus.detailLabel
    invalidBuckets[bucketLabel] = (invalidBuckets[bucketLabel] || 0) + 1
  })

  const sorted = Object.entries(voteMap)
    .map(([name, votes]) => ({
      name,
      votes,
      ratio: validBallots === 0 ? 0 : (votes / validBallots) * 100,
    }))
    .sort((a, b) => b.votes - a.votes)

  return { validBallots, shortBallots, sorted, invalidBuckets, shortBuckets }
}

export function buildBallotsWithMeta(election) {
  return (election?.ballots || []).map((ballot, index) => {
    const number = ballot.ballotNumber ?? index + 1
    const stackNumber = Math.ceil(number / 50)
    const stackIndex = ((number - 1) % 50) + 1
    return {
      ...ballot,
      displayNumber: number,
      stackNumber,
      stackIndex,
    }
  })
}
