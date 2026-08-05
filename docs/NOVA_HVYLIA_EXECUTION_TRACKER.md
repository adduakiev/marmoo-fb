# НОВА ХВИЛЯ — MARMOO Intelligence Hub v2.0

## Статус

- [x] Створено резервну гілку `backup/nova-hvylia-2026-08-04`
- [x] Створено робочу гілку `work/nova-hvylia-v2`
- [x] Прийнято технічний план v2.0
- [ ] Єдиний FilterContext
- [ ] GlobalFilterBar
- [ ] Крос-фільтрація
- [ ] Розширена семантика товарів і упаковки
- [ ] Basket Analysis
- [ ] Customer Loyalty / RFM
- [ ] Kasavana & Smith Menu Engineering
- [ ] Drink Attachment Rate
- [ ] Net Contribution Margin
- [ ] Heatmap 7×24
- [ ] Treemap категорій і drill-down
- [ ] Пояснення методології через Info-підказки
- [ ] Перевірка контрольного обороту 2 251 259,18 грн
- [ ] Mobile QA 375px+
- [ ] Performance QA

## Принцип роботи

Усі зміни виконуються в `work/nova-hvylia-v2`. Гілка `main` не змінюється до завершення перевірки окремого етапу. Backup-гілка не редагується.

## Потрібні дані

Для Basket Analysis, Drink Attachment Rate та RFM необхідні доступні для build-процесу файли або експортовані масиви з полями:

- `BI_ORDERS.csv`: `order_id`, дата, канал, сума, `customer_phone`;
- `BI_ORDER_ITEMS.csv`: `order_id`, назва товару, категорія, кількість, оборот, націнка.

Після виявлення або підключення джерел ETL формує `basketPairs` і `customerProfiles` у `sales-data.json`.
