import { describe, expect, it } from "vitest";
import { authorizeCampaignTaskSchema, campaignStrategySchema, campaignMeasurementSchema, recordCampaignDeliverySchema } from "@soravyn/shared";
describe("Campaign governance contracts",()=>{
 it("requires explicit model cost consent",()=>{expect(authorizeCampaignTaskSchema.safeParse({}).success).toBe(false);expect(authorizeCampaignTaskSchema.safeParse({confirmConfiguredModelCosts:false}).success).toBe(false);expect(authorizeCampaignTaskSchema.safeParse({confirmConfiguredModelCosts:true}).success).toBe(true);});
 it("rejects executable or ownership fields in a strategy",()=>{expect(campaignStrategySchema.safeParse({summary:"Valid strategic summary",positioning:"Premium",keyMessages:["Trust"],channels:["website"],command:"run",companyId:"other"}).success).toBe(false);});
 it("requires a source and observation date for manual metrics",()=>{expect(campaignMeasurementSchema.safeParse({metric:"views",value:100,unit:"views"}).success).toBe(false);expect(campaignMeasurementSchema.safeParse({metric:"views",value:100,unit:"views",source:"Client export",measuredAt:"2026-11-13T10:00:00Z"}).success).toBe(true);});
 it("rejects executable delivery URLs",()=>{expect(recordCampaignDeliverySchema.safeParse({externalUrl:"javascript:alert(1)"}).success).toBe(false);});
});
