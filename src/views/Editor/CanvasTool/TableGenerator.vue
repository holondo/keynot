<template>
  <div class="table-generator">
    <div class="title">
      <div class="lef">Table {{endCell.length ? `${endCell[0]} x ${endCell[1]}` : ''}}</div>
      <div class="right" @click="isCustom = !isCustom">{{ isCustom ? 'Back' : 'Custom'}}</div>
    </div>
    <table 
      @mouseleave="endCell = []" 
      @click="handleClickTable()" 
      v-if="!isCustom"
    >
      <tbody>
        <tr v-for="row in 10" :key="row">
          <td 
            @mouseenter="endCell = [row, col]"
            v-for="col in 10" :key="col"
          >
            <div 
              class="cell" 
              :class="{ 'active': endCell.length && row <= endCell[0] && col <= endCell[1] }"
            ></div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="custom" v-else>
      <div class="row">
        <div class="label" style="width: 25%;">Rows:</div>
        <NumberInput
          :min="1"
          :max="20"
          v-model:value="customRow"
          style="width: 75%;"
        />
      </div>
      <div class="row">
        <div class="label" style="width: 25%;">Columns:</div>
        <NumberInput
          :min="1"
          :max="20"
          v-model:value="customCol"
          style="width: 75%;"
        />
      </div>
      <div class="btns">
        <Button class="btn" @click="close()">Cancel</Button>
        <Button class="btn" type="primary" @click="insertCustomTable()">Insert</Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import message from '@/utils/message'
import Button from '@/components/Button.vue'
import NumberInput from '@/components/NumberInput.vue'

interface InsertData {
  row: number
  col: number
}

const emit = defineEmits<{
  (event: 'insert', payload: InsertData): void
  (event: 'close'): void
}>()

const endCell = ref<number[]>([])
const customRow = ref(3)
const customCol = ref(3)
const isCustom = ref(false)

const handleClickTable = () => {
  if (!endCell.value.length) return
  const [row, col] = endCell.value
  emit('insert', { row, col })
}

const insertCustomTable = () => {
  if (customRow.value < 1 || customRow.value > 20) return message.warning('Rows and columns must be between 1 and 20!')
  if (customCol.value < 1 || customCol.value > 20) return message.warning('Rows and columns must be between 1 and 20!')
  emit('insert', { row: customRow.value, col: customCol.value })
  isCustom.value = false
}

const close = () => {
  emit('close')
  isCustom.value = false
}
</script>

<style lang="scss" scoped>
.table-generator {
  width: 100%;
  margin-top: -10px;
}
.title {
  height: 28px;
  line-height: 28px;
  background-color: var(--bg-control, rgba(128, 128, 128, 0.12));
  color: var(--text-primary, #1d1d1f);
  margin: 0 0 8px;
  padding: 0 10px;
  font-size: var(--text-sm);
  display: flex;
  justify-content: space-between;
  border-radius: var(--radius-menu-item);
  user-select: none;

  .right {
    cursor: pointer;

    &:hover {
      color: var(--accent-color, #007aff);
    }
  }
}
table {
  border-collapse: separate;
}
td {
  width: 23px;
  height: 23px;
  line-height: 23px;
  border: 2px solid var(--popover-bg, #ffffff);
  background-color: var(--bg-control, rgba(128, 128, 128, 0.12));
}
.cell {
  width: 100%;
  height: 100%;
  border: 1px solid var(--border-color, rgba(128, 128, 128, 0.2));

  &.active {
    background-color: rgba(0, 122, 255, 0.25);
    border-color: var(--accent-color, #007aff);
  }
}

.custom {
  width: min(230px, calc(100vw - 48px));
  color: var(--text-primary, #1d1d1f);

  .row {
    display: flex;
    align-items: center;

    .label {
      font-size: var(--text-sm);
      color: var(--text-primary, #1d1d1f);
    }

    & + .row {
      margin-top: 10px;
    }
  }
}

.btns {
  margin-top: 10px;
  text-align: right;

  .btn {
    margin-left: 10px;
  }
}
</style>