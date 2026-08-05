export type BasketPair={itemA:string;itemB:string;coOccurrence:number;support:number;confidenceAtoB:number;confidenceBtoA:number;lift:number};
export type CustomerProfile={customerId:string;ordersCount:number;totalSpend:number;averageCheck:number;firstOrderDate:string;lastOrderDate:string;recencyDays:number;channels:string[];rScore:number;fScore:number;mScore:number;rfmScore:string;segment:string};
export type DrinkAttachmentRow={channel:string;orders:number;ordersWithDrink:number;foodOnlyOrders:number;revenue:number;attachmentRate:number;foodOnlyRate:number};
export type IntelligenceHeatmapCell={weekday:string;weekdayNumber:number;hour:number;orders:number;revenue:number;averageCheck:number};
export type IntelligenceDataQuality={expectedRevenue:number;revenueTotal:number;revenueControlDelta:number;revenueControlPassed:boolean;totalOrders:number;validOrders:number;zeroRevenueOrders:number;duplicateOrderIds:number;missingDateOrders:number;identifiedOrders:number;uniqueCustomers:number;phoneCoverage:number;ambiguousPhoneOrders:number;publicPhoneFieldsExposed:boolean};
export type IntelligencePayload={schemaVersion:number;generatedAt:string;source:{spreadsheetId:string;ordersRows:number;itemRows:number;validOrders:number;validItems:number;latestDate:string};dataQuality?:IntelligenceDataQuality;basketPairs:BasketPair[];customerProfiles:CustomerProfile[];drinkAttachment:DrinkAttachmentRow[];heatmap:IntelligenceHeatmapCell[]};

export const INTELLIGENCE_URL=`${import.meta.env.BASE_URL||'/'}intelligence-data.json`;

export async function loadIntelligence():Promise<IntelligencePayload>{
 const response=await fetch(`${INTELLIGENCE_URL}?_=${Date.now()}`,{cache:'no-store'});
 if(!response.ok)throw new Error(`Intelligence data request failed: ${response.status}`);
 const payload=await response.json() as IntelligencePayload;
 if(Number(payload.schemaVersion)!==1)throw new Error('Intelligence schemaVersion 1 required');
 return payload;
}
