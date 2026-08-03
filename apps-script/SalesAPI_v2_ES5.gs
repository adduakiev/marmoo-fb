/**
 * MARMOO SALES BI API v2 — ES5 compatible
 * Повна заміна SalesAPI.gs
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
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var ordersSheet = spreadsheet.getSheetByName(MARMOO_CONFIG.SHEETS.ORDERS);
  var itemsSheet = spreadsheet.getSheetByName(MARMOO_CONFIG.SHEETS.ORDER_ITEMS);

  if (!ordersSheet) throw new Error('Не знайдено лист ' + MARMOO_CONFIG.SHEETS.ORDERS);
  if (!itemsSheet) throw new Error('Не знайдено лист ' + MARMOO_CONFIG.SHEETS.ORDER_ITEMS);

  var ordersData = readSalesSheetV2_(ordersSheet);
  var itemsData = readSalesSheetV2_(itemsSheet);
  var oc = buildHeaderMapV2_(ordersData.headers);
  var ic = buildHeaderMapV2_(itemsData.headers);

  validateColumnsV2_(oc, [
    'order_id','sale_date','weekday_number','weekday','open_hour','channel',
    'customer_id','order_revenue','order_markup','order_cost'
  ], 'BI_ORDERS');

  validateColumnsV2_(ic, [
    'sale_date','product_code','product_name','category','quantity','revenue','markup'
  ], 'BI_ORDER_ITEMS');

  var summary = { revenue: 0, orders: 0, markup: 0, cost: 0, identifiedOrders: 0 };
  var customers = {};
  var daily = {};
  var channels = {};
  var channelsDaily = {};
  var hourly = {};
  var hourlyDaily = {};
  var heatmap = {};
  var products = {};
  var productsDaily = {};
  var minDate = '';
  var maxDate = '';

  ordersData.rows.forEach(function(row) {
    var orderId = textV2_(row, oc.order_id);
    var date = normalizeDateV2_(valueV2_(row, oc.sale_date));
    if (!orderId || !date) return;

    var revenue = numberV2_(row, oc.order_revenue);
    var markup = numberV2_(row, oc.order_markup);
    var cost = numberV2_(row, oc.order_cost);
    var channel = textV2_(row, oc.channel) || 'Не визначено';
    var hour = numberV2_(row, oc.open_hour);
    var weekdayNumber = numberV2_(row, oc.weekday_number);
    var weekday = textV2_(row, oc.weekday) || '';
    var customerId = textV2_(row, oc.customer_id);

    summary.orders += 1;
    summary.revenue += revenue;
    summary.markup += markup;
    summary.cost += cost;

    if (customerId) {
      summary.identifiedOrders += 1;
      customers[customerId] = true;
    }

    if (!minDate || date < minDate) minDate = date;
    if (!maxDate || date > maxDate) maxDate = date;

    addMetricV2_(daily, date, { date: date }, revenue, markup, 1);
    addMetricV2_(channels, channel, { channel: channel }, revenue, markup, 1);
    addMetricV2_(channelsDaily, date + '|' + channel, { date: date, channel: channel }, revenue, markup, 1);

    if (hour >= 0 && hour <= 23) {
      addMetricV2_(hourly, String(hour), { hour: hour }, revenue, markup, 1);
      addMetricV2_(hourlyDaily, date + '|' + hour, { date: date, hour: hour }, revenue, markup, 1);

      var heatKey = weekdayNumber + '|' + hour;
      if (!heatmap[heatKey]) {
        heatmap[heatKey] = {
          weekdayNumber: weekdayNumber,
          weekday: weekday,
          hour: hour,
          revenue: 0,
          orders: 0
        };
      }
      heatmap[heatKey].revenue += revenue;
      heatmap[heatKey].orders += 1;
    }
  });

  itemsData.rows.forEach(function(row) {
    var date = normalizeDateV2_(valueV2_(row, ic.sale_date));
    var productCode = textV2_(row, ic.product_code) || 'NO_CODE';
    var productName = textV2_(row, ic.product_name);
    if (!date || !productName) return;

    var category = textV2_(row, ic.category) || 'Без категорії';
    var quantity = numberV2_(row, ic.quantity);
    var revenue = numberV2_(row, ic.revenue);
    var markup = numberV2_(row, ic.markup);

    addProductMetricV2_(
      products,
      productCode + '|' + productName,
      { productCode: productCode, productName: productName, category: category },
      quantity,
      revenue,
      markup
    );

    addProductMetricV2_(
      productsDaily,
      date + '|' + productCode + '|' + productName,
      { date: date, productCode: productCode, productName: productName, category: category },
      quantity,
      revenue,
      markup
    );
  });

  return {
    ok: true,
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    milestones: {
      softOpening: '2026-06-18',
      grandOpening: '2026-06-26'
    },
    period: { from: minDate, to: maxDate },
    summary: {
      revenue: roundV2_(summary.revenue, 2),
      orders: summary.orders,
      averageCheck: summary.orders ? roundV2_(summary.revenue / summary.orders, 2) : 0,
      markup: roundV2_(summary.markup, 2),
      cost: roundV2_(summary.cost, 2),
      markupPercent: summary.revenue ? roundV2_(summary.markup / summary.revenue * 100, 2) : 0,
      identifiedOrders: summary.identifiedOrders,
      identifiedCustomers: Object.keys(customers).length
    },
    daily: finalizeMetricArrayV2_(daily, 'date', false),
    channels: finalizeMetricArrayV2_(channels, 'revenue', true),
    channelsDaily: finalizeMetricArrayV2_(channelsDaily, 'date', false),
    hourly: finalizeMetricArrayV2_(hourly, 'hour', false),
    hourlyDaily: finalizeMetricArrayV2_(hourlyDaily, 'date', false),
    products: finalizeProductArrayV2_(products, false),
    productsDaily: finalizeProductArrayV2_(productsDaily, true),
    heatmap: finalizeHeatmapV2_(heatmap)
  };
}

function readSalesSheetV2_(sheet) {
  var lastRow = sheet.getLastRow();
  var lastColumn = sheet.getLastColumn();
  if (lastRow < 2) throw new Error('Лист ' + sheet.getName() + ' не містить даних');
  var values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  return {
    headers: values[0].map(function(v) { return String(v || '').trim(); }),
    rows: values.slice(1)
  };
}

function buildHeaderMapV2_(headers) {
  var map = {};
  headers.forEach(function(header, index) {
    if (header) map[header] = index;
  });
  return map;
}

function validateColumnsV2_(map, required, sheetName) {
  var missing = required.filter(function(name) { return map[name] === undefined; });
  if (missing.length) throw new Error(sheetName + ': відсутні колонки ' + missing.join(', '));
}

function addMetricV2_(map, key, base, revenue, markup, orders) {
  if (!map[key]) {
    map[key] = copyObjectV2_(base);
    map[key].revenue = 0;
    map[key].markup = 0;
    map[key].orders = 0;
  }
  map[key].revenue += revenue;
  map[key].markup += markup;
  map[key].orders += orders;
}

function addProductMetricV2_(map, key, base, quantity, revenue, markup) {
  if (!map[key]) {
    map[key] = copyObjectV2_(base);
    map[key].quantity = 0;
    map[key].revenue = 0;
    map[key].markup = 0;
  }
  map[key].quantity += quantity;
  map[key].revenue += revenue;
  map[key].markup += markup;
}

function copyObjectV2_(source) {
  var output = {};
  Object.keys(source).forEach(function(key) {
    output[key] = source[key];
  });
  return output;
}

function objectValuesV2_(map) {
  return Object.keys(map).map(function(key) { return map[key]; });
}

function finalizeMetricArrayV2_(map, sortKey, descending) {
  var output = objectValuesV2_(map).map(function(item) {
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
  var output = objectValuesV2_(map).map(function(item) {
    item.quantity = roundV2_(item.quantity, 2);
    item.revenue = roundV2_(item.revenue, 2);
    item.markup = roundV2_(item.markup, 2);
    item.markupPercent = item.revenue ? roundV2_(item.markup / item.revenue * 100, 2) : 0;
    return item;
  });

  output.sort(function(a, b) {
    if (includeDate && a.date !== b.date) {
      return String(a.date || '').localeCompare(String(b.date || ''));
    }
    return b.revenue - a.revenue;
  });

  return output;
}

function finalizeHeatmapV2_(map) {
  var output = objectValuesV2_(map).map(function(item) {
    item.revenue = roundV2_(item.revenue, 2);
    return item;
  });

  output.sort(function(a, b) {
    return a.weekdayNumber - b.weekdayNumber || a.hour - b.hour;
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
  var value = valueV2_(row, index);
  if (typeof value === 'number' && isFinite(value)) return value;
  var parsed = Number(String(value || '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, ''));
  return isFinite(parsed) ? parsed : 0;
}

function normalizeDateV2_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, MARMOO_CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }

  var text = String(value || '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  var match = text.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if (!match) return '';

  return [
    match[3],
    pad2V2_(match[2]),
    pad2V2_(match[1])
  ].join('-');
}

function pad2V2_(value) {
  value = String(value);
  return value.length < 2 ? '0' + value : value;
}

function roundV2_(value, digits) {
  var multiplier = Math.pow(10, digits || 0);
  return Math.round((Number(value) || 0) * multiplier) / multiplier;
}
