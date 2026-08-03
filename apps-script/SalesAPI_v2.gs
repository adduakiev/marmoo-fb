/**
 * MARMOO SALES BI API v2
 * Повна заміна поточного SalesAPI.gs.
 *
 * Додає деталізацію по датах для:
 * - channelsDaily
 * - hourlyDaily
 * - productsDaily
 * - heatmap
 */

function doGet() {
  try {
    return ContentService
      .createTextOutput(JSON.stringify(buildMarmooSalesPayloadV2_()))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        ok: false,
        error: error.message,
        stack: error.stack || '',
        updatedAt: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function buildMarmooSalesPayloadV2_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const ordersSheet = spreadsheet.getSheetByName(MARMOO_CONFIG.SHEETS.ORDERS);
  const itemsSheet = spreadsheet.getSheetByName(MARMOO_CONFIG.SHEETS.ORDER_ITEMS);

  if (!ordersSheet) throw new Error('Не знайдено лист ' + MARMOO_CONFIG.SHEETS.ORDERS);
  if (!itemsSheet) throw new Error('Не знайдено лист ' + MARMOO_CONFIG.SHEETS.ORDER_ITEMS);

  const ordersData = readSalesSheetV2_(ordersSheet);
  const itemsData = readSalesSheetV2_(itemsSheet);
  const oc = buildHeaderMapV2_(ordersData.headers);
  const ic = buildHeaderMapV2_(itemsData.headers);

  validateColumnsV2_(oc, [
    'order_id','sale_date','weekday_number','weekday','open_hour','channel',
    'customer_id','order_revenue','order_markup','order_cost'
  ], 'BI_ORDERS');

  validateColumnsV2_(ic, [
    'sale_date','product_code','product_name','category','quantity','revenue','markup'
  ], 'BI_ORDER_ITEMS');

  const summary = { revenue: 0, orders: 0, markup: 0, cost: 0, identifiedOrders: 0 };
  const customers = new Set();
  const daily = new Map();
  const channels = new Map();
  const channelsDaily = new Map();
  const hourly = new Map();
  const hourlyDaily = new Map();
  const heatmap = new Map();
  let minDate = null;
  let maxDate = null;

  ordersData.rows.forEach(function(row) {
    const orderId = textV2_(row, oc.order_id);
    const date = normalizeDateV2_(valueV2_(row, oc.sale_date));
    if (!orderId || !date) return;

    const revenue = numberV2_(row, oc.order_revenue);
    const markup = numberV2_(row, oc.order_markup);
    const cost = numberV2_(row, oc.order_cost);
    const channel = textV2_(row, oc.channel) || 'Не визначено';
    const hour = numberV2_(row, oc.open_hour);
    const weekdayNumber = numberV2_(row, oc.weekday_number);
    const weekday = textV2_(row, oc.weekday) || '';
    const customerId = textV2_(row, oc.customer_id);

    summary.orders++;
    summary.revenue += revenue;
    summary.markup += markup;
    summary.cost += cost;
    if (customerId) {
      summary.identifiedOrders++;
      customers.add(customerId);
    }

    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    addMetricV2_(daily, date, { date: date }, revenue, markup, 1);
    addMetricV2_(channels, channel, { channel: channel }, revenue, markup, 1);
    addMetricV2_(channelsDaily, date + '|' + channel, { date: date, channel: channel }, revenue, markup, 1);

    if (hour >= 0 && hour <= 23) {
      addMetricV2_(hourly, String(hour), { hour: hour }, revenue, markup, 1);
      addMetricV2_(hourlyDaily, date + '|' + hour, { date: date, hour: hour }, revenue, markup, 1);

      const heatKey = weekdayNumber + '|' + hour;
      if (!heatmap.has(heatKey)) {
        heatmap.set(heatKey, {
          weekdayNumber: weekdayNumber,
          weekday: weekday,
          hour: hour,
          revenue: 0,
          orders: 0
        });
      }
      const heat = heatmap.get(heatKey);
      heat.revenue += revenue;
      heat.orders += 1;
    }
  });

  const products = new Map();
  const productsDaily = new Map();

  itemsData.rows.forEach(function(row) {
    const date = normalizeDateV2_(valueV2_(row, ic.sale_date));
    const productCode = textV2_(row, ic.product_code) || 'NO_CODE';
    const productName = textV2_(row, ic.product_name);
    if (!date || !productName) return;

    const category = textV2_(row, ic.category) || 'Без категорії';
    const quantity = numberV2_(row, ic.quantity);
    const revenue = numberV2_(row, ic.revenue);
    const markup = numberV2_(row, ic.markup);
    const base = { productCode: productCode, productName: productName, category: category };

    addProductMetricV2_(products, productCode + '|' + productName, base, quantity, revenue, markup);
    addProductMetricV2_(productsDaily, date + '|' + productCode + '|' + productName,
      { date: date, productCode: productCode, productName: productName, category: category },
      quantity, revenue, markup);
  });

  const result = {
    ok: true,
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    milestones: {
      softOpening: '2026-06-18',
      grandOpening: '2026-06-26'
    },
    period: { from: minDate || '', to: maxDate || '' },
    summary: {
      revenue: roundV2_(summary.revenue, 2),
      orders: summary.orders,
      averageCheck: summary.orders ? roundV2_(summary.revenue / summary.orders, 2) : 0,
      markup: roundV2_(summary.markup, 2),
      cost: roundV2_(summary.cost, 2),
      markupPercent: summary.revenue ? roundV2_(summary.markup / summary.revenue * 100, 2) : 0,
      identifiedOrders: summary.identifiedOrders,
      identifiedCustomers: customers.size
    },
    daily: finalizeMetricArrayV2_(daily, 'date'),
    channels: finalizeMetricArrayV2_(channels, 'revenue', true),
    channelsDaily: finalizeMetricArrayV2_(channelsDaily, 'date'),
    hourly: finalizeMetricArrayV2_(hourly, 'hour'),
    hourlyDaily: finalizeMetricArrayV2_(hourlyDaily, 'date'),
    products: finalizeProductArrayV2_(products, false),
    productsDaily: finalizeProductArrayV2_(productsDaily, true),
    heatmap: Array.from(heatmap.values()).map(function(item) {
      item.revenue = roundV2_(item.revenue, 2);
      return item;
    }).sort(function(a, b) {
      return a.weekdayNumber - b.weekdayNumber || a.hour - b.hour;
    })
  };

  return result;
}

function readSalesSheetV2_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) throw new Error('Лист ' + sheet.getName() + ' не містить даних');
  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  return {
    headers: values[0].map(function(v) { return String(v || '').trim(); }),
    rows: values.slice(1)
  };
}

function buildHeaderMapV2_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    if (header) map[header] = index;
  });
  return map;
}

function validateColumnsV2_(map, required, sheetName) {
  const missing = required.filter(function(name) { return map[name] === undefined; });
  if (missing.length) throw new Error(sheetName + ': відсутні колонки ' + missing.join(', '));
}

function addMetricV2_(map, key, base, revenue, markup, orders) {
  if (!map.has(key)) {
    const row = Object.assign({}, base, { revenue: 0, markup: 0, orders: 0 });
    map.set(key, row);
  }
  const item = map.get(key);
  item.revenue += revenue;
  item.markup += markup;
  item.orders += orders;
}

function addProductMetricV2_(map, key, base, quantity, revenue, markup) {
  if (!map.has(key)) {
    const row = Object.assign({}, base, { quantity: 0, revenue: 0, markup: 0 });
    map.set(key, row);
  }
  const item = map.get(key);
  item.quantity += quantity;
  item.revenue += revenue;
  item.markup += markup;
}

function finalizeMetricArrayV2_(map, sortKey, descending) {
  const output = Array.from(map.values()).map(function(item) {
    item.revenue = roundV2_(item.revenue, 2);
    item.markup = roundV2_(item.markup, 2);
    item.averageCheck = item.orders ? roundV2_(item.revenue / item.orders, 2) : 0;
    item.markupPercent = item.revenue ? roundV2_(item.markup / item.revenue * 100, 2) : 0;
    return item;
  });

  output.sort(function(a, b) {
    if (descending) return Number(b[sortKey] || 0) - Number(a[sortKey] || 0);
    if (sortKey === 'date') return String(a.date || '').localeCompare(String(b.date || ''));
    return Number(a[sortKey] || 0) - Number(b[sortKey] || 0);
  });
  return output;
}

function finalizeProductArrayV2_(map, includeDate) {
  const output = Array.from(map.values()).map(function(item) {
    item.quantity = roundV2_(item.quantity, 2);
    item.revenue = roundV2_(item.revenue, 2);
    item.markup = roundV2_(item.markup, 2);
    item.markupPercent = item.revenue ? roundV2_(item.markup / item.revenue * 100, 2) : 0;
    return item;
  });

  output.sort(function(a, b) {
    if (includeDate && a.date !== b.date) return String(a.date).localeCompare(String(b.date));
    return b.revenue - a.revenue;
  });
  return output;
}

function valueV2_(row, index) {
  if (index === undefined || index === null || index < 0 || index >= row.length) return '';
  return row[index];
}

function textV2_(row, index) {
  return String(valueV2_(row, index) || '').trim();
}

function numberV2_(row, index) {
  const value = valueV2_(row, index);
  if (typeof value === 'number' && isFinite(value)) return value;
  const parsed = Number(String(value || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, ''));
  return isFinite(parsed) ? parsed : 0;
}

function normalizeDateV2_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, MARMOO_CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  const text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (!match) return '';
  return [match[3], String(match[2]).padStart(2, '0'), String(match[1]).padStart(2, '0')].join('-');
}

function roundV2_(value, digits) {
  const multiplier = Math.pow(10, digits || 0);
  return Math.round((Number(value) || 0) * multiplier) / multiplier;
}
