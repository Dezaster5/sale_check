import type { Sale } from '../api/types'
import { currencyForPark } from './currency'
import { formatDate, formatDateTime, toNumber } from './format'

export interface ExportMeta {
  /** Подпись периода и фильтров в шапке листа. */
  periodFrom: string
  periodTo: string
  parkName?: string
  productName?: string
  userName: string
}

const HEADERS = [
  { title: 'Дата', width: 12 },
  { title: 'Парк', width: 28 },
  { title: 'Город', width: 16 },
  { title: 'Услуга', width: 30 },
  { title: 'Количество', width: 13 },
  { title: 'Цена', width: 14 },
  { title: 'Сумма', width: 16 },
  { title: 'Валюта', width: 10 },
  { title: 'Пользователь', width: 24 },
  { title: 'Внесено', width: 17 },
] as const

const BRAND = 'FF780BDB'
const MONEY_FORMAT = '#,##0.00'

/**
 * Собирает .xlsx и отдаёт его браузеру.
 *
 * exceljs весит около мегабайта, поэтому подключается динамически — только
 * когда пользователь действительно нажал «Выгрузить в Excel».
 */
export async function exportSalesToExcel(sales: Sale[], meta: ExportMeta): Promise<void> {
  const ExcelJS = await import('exceljs')
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Avatariya · Кабинет арендодателя'
  workbook.created = new Date()

  const sheet = workbook.addWorksheet('Продажи', {
    views: [{ state: 'frozen', ySplit: 4 }],
  })

  // --- шапка ---
  sheet.mergeCells(1, 1, 1, HEADERS.length)
  const title = sheet.getCell(1, 1)
  title.value = `Продажи Avatariya · ${formatDate(meta.periodFrom)} — ${formatDate(meta.periodTo)}`
  title.font = { bold: true, size: 14 }

  sheet.mergeCells(2, 1, 2, HEADERS.length)
  const subtitle = sheet.getCell(2, 1)
  subtitle.value = [
    `Пользователь: ${meta.userName}`,
    `Парк: ${meta.parkName ?? 'все доступные'}`,
    `Услуга: ${meta.productName ?? 'все доступные'}`,
    `Записей: ${sales.length}`,
  ].join('   ·   ')
  subtitle.font = { color: { argb: 'FF6B6473' }, size: 10 }

  // --- заголовки таблицы ---
  const headerRow = sheet.getRow(4)
  HEADERS.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.title
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BRAND } }
    cell.alignment = { vertical: 'middle' }
    sheet.getColumn(index + 1).width = column.width
  })
  headerRow.height = 20

  // --- данные ---
  sales.forEach((sale) => {
    const currency = currencyForPark(sale.park)
    const row = sheet.addRow([
      formatDate(sale.date),
      sale.park.park_name,
      sale.park.city_name || '—',
      sale.product.name,
      sale.count,
      toNumber(sale.price),
      toNumber(sale.sale_sum),
      currency.code,
      sale.user_full_name || sale.username,
      formatDateTime(sale.created_at),
    ])
    row.getCell(6).numFmt = MONEY_FORMAT
    row.getCell(7).numFmt = MONEY_FORMAT
  })

  // Автофильтр по шапке таблицы — с ним выгрузку удобно крутить в Excel.
  if (sales.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + sales.length, column: HEADERS.length },
    }
  }

  // --- итоги: отдельная строка на каждую валюту, тенге с сумами не смешиваем ---
  const totals = new Map<string, { count: number; sum: number; records: number }>()
  for (const sale of sales) {
    const code = currencyForPark(sale.park).code
    const bucket = totals.get(code) ?? { count: 0, sum: 0, records: 0 }
    bucket.count += sale.count
    bucket.sum += toNumber(sale.sale_sum)
    bucket.records += 1
    totals.set(code, bucket)
  }

  sheet.addRow([])
  for (const [code, bucket] of totals) {
    const row = sheet.addRow([
      `Итого, ${code}`,
      '',
      '',
      `записей: ${bucket.records}`,
      bucket.count,
      '',
      bucket.sum,
      code,
      '',
      '',
    ])
    row.font = { bold: true }
    row.getCell(7).numFmt = MONEY_FORMAT
  }

  const buffer = await workbook.xlsx.writeBuffer()
  downloadFile(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Продажи_${meta.periodFrom}_${meta.periodTo}.xlsx`,
  )
}

function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Освобождаем память после того, как браузер забрал файл.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
