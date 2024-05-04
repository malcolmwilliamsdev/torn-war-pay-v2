<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import VueTableLite from 'vue3-table-lite'
import Slider from '@vueform/slider'

import {
  getWarReport,
  getFactionChainReports,
  getFactionWarAttacks,
  getFactionChainAttacks,
  getFactionScore,
  getPlayerList
} from '/torn-war-pay-v2/src/torn'

//#region store items
const STOREITEM_APIKEY = 'api-key'
const STOREITEM_FACTIONID = 'faction-id'
const STOREITEM_WARID = 'war-id'
const STOREITEM_PAYMENTMETHOD = 'payment-method'
const STOREITEM_FIXEDPAY = 'fixed-pay'
const STOREITEM_CHAINPAY = 'chain-pay'
const STOREITEM_FACTIONSPLIT = 'faction-split'
const STOREITEM_MEMBERSPLIT = 'member-split'
//#endregion

//#region refs
const apiKey = ref(readAPIKey())
const factionID = ref(readFactionID())
const warID = ref(readWarID())
const warReport = ref(null)
const warChainReports = ref([])
const totalHits = ref(0)
const totalScore = ref(0)
const playerList = ref([])

//toggles
const showHitExplanation = ref(false)
const showTable = ref(false)
const isLoading = ref(false)

//settings
const paymentMethodIndex = ref(readPaymentMethod())
const fixedPerHitPay = ref(readFixedPay())
const payoutTotal = ref(0)
const chainHitPayPercent = ref(readChainPay())
const factionSplit = ref(readFactionSplit())
const memberSplit = ref(readMemberSplit())

//computed
const hitExplanationText = computed(() => {
  return showHitExplanation.value ? 'Hide' : 'Show'
})

const factionSplitText = computed(() => {
  return ((payoutTotal.value * factionSplit.value) / 100).toFixed(2)
})

const memberSplitText = computed(() => {
  return ((payoutTotal.value * memberSplit.value) / 100).toFixed(2)
})

//table
const table = reactive({
  columns: [
    {
      label: 'ID',
      field: 'id',
      sortable: true,
      isKey: true
    },
    {
      label: 'Name',
      field: 'name',
      sortable: true
    },
    {
      label: 'War Hits',
      field: 'warAttacks',
      sortable: true
    },
    {
      label: 'War Hit Pay',
      field: 'warAttackPay',
      sortable: true
    },
    {
      label: 'Chain Hits',
      field: 'chainAttacks',
      sortable: true
    },
    {
      label: 'Chain Hit Pay',
      field: 'chainAttackPay',
      sortable: true
    },
    {
      label: 'Score',
      field: 'score',
      sortable: true
    },
    {
      label: 'Total Pay',
      field: 'payout',
      sortable: true
    },
    {
      label: 'Pay Member',
      field: 'pay',
      sortable: false,
      width: '100%',
      display: function (row) {
        var payURL = `https://www.torn.com/factions.php?step=your#/tab=controls&addMoneyTo=${row.id}&money=${row.payout}`
        return (
          '<button data-id="' +
          row.id +
          '" onClick="window.open(\'' +
          payURL +
          "', '_blank')\">Add To Balance</button>"
        )
      }
    }
  ],
  rows: [],
  totalRecordCount: computed(() => {
    return table.rows.length
  }),
  sortable: {
    order: 'payout',
    sort: 'desc'
  },
  pageOptions: [
    {
      value: 100,
      text: 100
    }
  ]
})
//#endregion

//#region read storage funcs
function readAPIKey() {
  return localStorage.getItem(STOREITEM_APIKEY) || ''
}

function readWarID() {
  return localStorage.getItem(STOREITEM_WARID) || ''
}

function readFactionID() {
  return localStorage.getItem(STOREITEM_FACTIONID) || ''
}

function readPaymentMethod() {
  return localStorage.getItem(STOREITEM_PAYMENTMETHOD) || 0
}

function readFixedPay() {
  return localStorage.getItem(STOREITEM_FIXEDPAY) || 1000000
}

function readChainPay() {
  return localStorage.getItem(STOREITEM_CHAINPAY) || 50
}

function readFactionSplit() {
  return localStorage.getItem(STOREITEM_FACTIONSPLIT) || 20
}

function readMemberSplit() {
  return localStorage.getItem(STOREITEM_MEMBERSPLIT) || 80
}
//#endregion

//#region write storage funcs
function writeAPIKey() {
  localStorage.setItem(STOREITEM_APIKEY, apiKey.value)
}

function writeWarID() {
  localStorage.setItem(STOREITEM_WARID, warID.value)
}

function writeFactionID() {
  localStorage.setItem(STOREITEM_FACTIONID, factionID.value)
}

function writePaymentMethod() {
  localStorage.setItem(STOREITEM_PAYMENTMETHOD, paymentMethodIndex.value)
}

function writeFixedPay() {
  localStorage.setItem(STOREITEM_FIXEDPAY, fixedPerHitPay.value)
}

function writeChainPay() {
  localStorage.setItem(STOREITEM_CHAINPAY, chainHitPayPercent.value)
}

function writeFactionSplit() {
  localStorage.setItem(STOREITEM_FACTIONSPLIT, factionSplit.value)
}

function writeMemberSplit() {
  localStorage.setItem(STOREITEM_MEMBERSPLIT, memberSplit.value)
}
//#endregion

function doSearch(offset, limit, order, sort) {
  var rows = playerList.value.sort((a, b) => {
    if (typeof a[order] === 'string') {
      // String comparison
      return sort === 'asc' ? a[order].localeCompare(b[order]) : b[order].localeCompare(a[order])
    } else {
      // Number comparison
      return sort === 'asc' ? a[order] - b[order] : b[order] - a[order]
    }
  })

  rows = rows.slice(offset, offset + limit)

  table.rows = rows
  table.sortable.order = order
  table.sortable.sort = sort
}

function toggleHitExplanation() {
  showHitExplanation.value = !showHitExplanation.value
}

function saveSettings() {
  writeAPIKey()
  writeFactionID()
  writeWarID()

  writeFixedPay()
  writeChainPay()
  writePaymentMethod()
  writeFactionSplit()
  writeMemberSplit()
}

async function AssignReport() {
  isLoading.value = true

  warReport.value = await getWarReport(apiKey.value, warID.value)

  warChainReports.value = await getFactionChainReports(
    apiKey.value,
    warReport.value,
    factionID.value
  )

  const warAttacks = getFactionWarAttacks(warReport.value, factionID.value)
  const chainAttacks = getFactionChainAttacks(
    warReport.value,
    warChainReports.value,
    factionID.value
  )

  totalHits.value = warAttacks + chainAttacks
  totalScore.value = getFactionScore(warReport.value, factionID.value)
}

function calculatePay() {
  saveSettings()

  showTable.value = true

  playerList.value = getPlayerList(
    warReport.value,
    warChainReports.value,
    factionID.value,
    totalHits.value,
    totalScore.value,
    payoutTotal.value,
    fixedPerHitPay.value,
    chainHitPayPercent.value,
    paymentMethodIndex.value
  )

  doSearch(0, table.pageOptions[0].value, table.sortable.order, table.sortable.sort)
}

onMounted(() => {
  warReport.value = null
  warChainReports.value = null
  showTable.value = false
})

watch(warChainReports, () => {
  if (warChainReports.value) {
    isLoading.value = false
  }
})
</script>

<template>
  <header>
    <h1>Ranked War Payout Tool</h1>
    <div>
      <span>Written by </span>
      <a href="https://www.torn.com/profiles.php?XID=2866181">Sixpathsmac[2866181]</a>
    </div>
    <label>Public API Key</label>
    <input id="api-key" type="text" v-model="apiKey" />
    <label>Faction ID</label>
    <input id="faction-id" type="text" v-model="factionID" />
    <label>War ID</label>
    <div>
      <input id="war-id" type="number" v-model="warID" />
      <button id="fetch-report" @click="AssignReport()">Fetch Report</button>
    </div>
    <img
      v-if="isLoading"
      src="../public/loading.gif"
      style="margin-top: 1em"
      :width="64"
      :height="64"
    />
  </header>
  <main v-if="warChainReports != null">
    <h1>Settings</h1>

    <div class="settings-section">
      <h3>Total Payout</h3>
      <label style="margin-right: 0.5em">$</label>
      <input type="number" v-model="payoutTotal" />
    </div>

    <div class="settings-section">
      <h3>Payment Method</h3>
      <input type="radio" id="radio-method-1" :value="0" v-model="paymentMethodIndex" />
      <label class="mr-half pointer" for="radio-method-1">Divided Per Hit</label>
      <input type="radio" id="radio-method-2" :value="1" v-model="paymentMethodIndex" />
      <label class="mr-half pointer" for="radio-method-2">Divided Per Point</label>
      <input type="radio" id="radio-method-3" :value="2" v-model="paymentMethodIndex" />
      <label class="mr-half pointer" for="radio-method-3">Fixed Per Hit</label>
      <div v-if="paymentMethodIndex == 2" style="margin-top: 0.25em">
        <label style="margin: 0 0.5em">Fixed Rate $</label>
        <input type="number" v-model="fixedPerHitPay" />
      </div>
    </div>

    <div class="settings-section" v-if="paymentMethodIndex != 1">
      <h3>Outside Hit Compensation</h3>
      <div class="text-sm text-warning">
        <span class="pointer" @click="toggleHitExplanation">
          {{ hitExplanationText }} Explanation
        </span>
        <ul style="list-style-type: none" v-if="showHitExplanation">
          <li><b>War Hit:</b> Any successful attack against a war target during the war</li>
          <li>
            <b>Chain Hit:</b> A successful attack that was not made on a war target, but contributed
            to a war chain
            <span class="text-alert">
              (Any hits from a chain that continued after the end of a war will be counted... Sorry)
            </span>
          </li>
          <li>0 -> Outside chain hits are not paid</li>
          <li>50 -> Outside chain hits earn half as much as war hits</li>
          <li>100 -> Outside chain hits are paid the same as war hits</li>
        </ul>
      </div>

      <div class="flex-row">
        <label>0%</label>
        <Slider class="slider" v-model="chainHitPayPercent" showTooltip="drag" />
        <label>100%</label>
      </div>
    </div>

    <div class="settings-section" v-if="paymentMethodIndex != 2">
      <h3>Pay Split</h3>
      <p class="text-sm text-warning">Please ensure a total of 100% for correct output</p>
      <label style="margin-right: 0.5em">To Faction %</label>
      <input type="number" class="input-pay-split" v-model="factionSplit" />
      <label style="margin-right: 0.5em">To Members %</label>
      <input type="number" class="input-pay-split" v-model="memberSplit" />

      <p>Faction Vault: ${{ factionSplitText }}</p>
      <p>Member Pay: ${{ memberSplitText }}</p>
    </div>

    <h1>Pay Table</h1>
    <button id="calculate" @click="calculatePay()">Calculate Pay</button>

    <VueTableLite
      v-if="showTable"
      :columns="table.columns"
      :rows="table.rows"
      :total="table.totalRecordCount"
      :sortable="table.sortable"
      :page-options="table.pageOptions"
      :is-hide-paging="true"
      @do-search="doSearch"
    />
  </main>
</template>

<style scoped>
header {
  display: flex;
  flex-direction: column;
  h1 {
    margin-top: 0;
    margin-bottom: 0.25em;
  }
}

main {
  margin-top: 1em;
}

label {
  margin: 1em 0 0.5em 0;
}

input[type='radio'] {
  margin-left: 0;
}

input[id='api-key'] {
  width: 25ch;
}

input[id='faction-id'] {
  width: 10ch;
}

input[id='war-id'] {
  width: 10ch;
}

button[id='fetch-report'] {
  margin-left: 1em;
}

button[id='calculate'] {
  margin-bottom: 1em;
}

.input-pay-split {
  width: 6ch;
  margin-right: 1em;
}

.slider {
  width: 20ch;
  margin: 1.5em 0.75em;
}
</style>
