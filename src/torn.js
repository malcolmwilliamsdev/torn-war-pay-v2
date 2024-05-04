//#region ASYNC
async function fetchJSON(url) {
  try {
    const response = await fetch(url)
    const parsed = await response.json()
    return parsed
  } catch (error) {
    console.log('error', error)
  }
}

export async function getWarReport(apiKey, warID) {
  const url = `https://api.torn.com/torn/${warID}?selections=rankedwarreport&key=${apiKey}`
  const report = await fetchJSON(url)
  return report.rankedwarreport
}

export async function getFactionChainReports(apiKey, warReport, factionID) {
  const warStart = warReport.war['start']
  const warEnd = warReport.war['end']
  const chainsURL = `https://api.torn.com/faction/${factionID}?key=${apiKey}&from=${warStart}&to=${warEnd}&selections=chains`
  const chainsReport = await fetchJSON(chainsURL)
  const chainIDs = Object.keys(chainsReport.chains)

  var chainReports = []
  for (const chainID of chainIDs) {
    const chainReportURL = `https://api.torn.com/torn/${chainID}?key=${apiKey}&selections=chainreport`
    const chainReport = await fetchJSON(chainReportURL)
    chainReports.push(chainReport.chainreport)
  }

  return chainReports
}
//#endregion

/*
export function getFactionIDs(warReport) {
  return Object.keys(warReport.factions)
}

export function getFactionName(warReport, factionID) {
  return warReport.factions[factionID].name
}
*/

export function getFactionScore(warReport, factionID) {
  return warReport.factions[factionID].score
}

export function getFactionWarAttacks(warReport, factionID) {
  return warReport.factions[factionID].attacks
}

export function getFactionChainAttacks(warReport, chainReportList, factionID) {
  const members = warReport.factions[factionID]['members']
  var totalChainAttacks = 0

  for (var memberID in members) {
    chainReportList.forEach((chainReport) => {
      try {
        const memberData = chainReport.members[memberID]
        totalChainAttacks += memberData.attacks - memberData.war
      } catch (error) {
        // member not found
      }
    })
  }

  return totalChainAttacks
}

export function getPlayerList(
  warReport,
  chainReportList,
  factionID,
  totalFactionHits,
  totalFactionScore,
  totalFactionPay,
  fixedRatePay,
  chainPayPercent,
  payMethod
) {
  //const totalFactionHits =
  //  getFactionWarAttacks(warReport, factionID) +
  //  getFactionChainAttacks(warReport, chainReportList, factionID)
  //const totalFactionScore = getFactionScore(warReport, factionID)

  const members = warReport.factions[factionID]['members']
  var playerList = []

  for (var memberID in members) {
    var memberChainHits = 0
    chainReportList.forEach((chainReport) => {
      try {
        var memberData = chainReport.members[memberID]
        memberChainHits += memberData.attacks - memberData.war
      } catch (error) {
        //member not found
      }
    })

    const member = members[memberID]
    var newPlayer = new Player(memberID, member.name, member.score, member.attacks, memberChainHits)

    if (payMethod == 0) {
      newPlayer.calculatePayPerHit(totalFactionHits, totalFactionPay, chainPayPercent)
    } else if (payMethod == 1) {
      newPlayer.caculatePayPerPoint(totalFactionScore, totalFactionPay)
    } else {
      newPlayer.calculatePayFixed(fixedRatePay, chainPayPercent)
    }

    playerList.push(newPlayer)
  }

  return playerList
}

class Player {
  constructor(id, name, score, warAttacks, chainAttacks = 0) {
    this.id = id
    this.name = name
    this.score = score
    this.warAttacks = warAttacks
    this.warAttackPay = 0
    this.chainAttacks = chainAttacks
    this.chainAttackPay = 0
    this.payout = 0
  }

  calculatePayPerHit(totalFactionHits, totalFactionPay, chainPayPercent) {
    this.warAttackPay = (totalFactionPay * this.warAttacks) / totalFactionHits
    this.chainAttackPay =
      (((totalFactionPay * this.chainAttacks) / totalFactionHits) * chainPayPercent) / 100

    this.warAttackPay = roundTo(this.warAttackPay, 2)
    this.chainAttackPay = roundTo(this.chainAttackPay, 2)
    this.payout = Math.round(this.warAttackPay + this.chainAttackPay)
  }

  caculatePayPerPoint(totalFactionScore, totalFactionPay) {
    this.warAttackPay = (totalFactionPay * this.score) / totalFactionScore
    this.chainAttackPay = 0

    this.warAttackPay = roundTo(this.warAttackPay, 2)
    this.chainAttackPay = roundTo(this.chainAttackPay, 2)
    this.payout = Math.round(this.warAttackPay + this.chainAttackPay)
  }

  calculatePayFixed(fixedRate, chainPayPercent) {
    this.warAttackPay = fixedRate * this.warAttacks
    this.chainAttackPay = ((fixedRate * chainPayPercent) / 100) * this.chainAttacks

    this.warAttackPay = roundTo(this.warAttackPay, 2)
    this.chainAttackPay = roundTo(this.chainAttackPay, 2)
    this.payout = Math.round(this.warAttackPay + this.chainAttackPay)
  }
}

function roundTo(n, digits) {
  if (digits === undefined) {
    digits = 0
  }
  const multiplicator = Math.pow(10, digits)
  n = parseFloat((n * multiplicator).toFixed(11))
  const test = Math.round(n) / multiplicator
  return +test.toFixed(digits)
}
