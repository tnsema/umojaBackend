// seed/seedRepaymentPlans.js

import mongoose from "mongoose";
import RepaymentPlan from "../schema/RepaymentPlan.js"; // adjust path if needed
import config from "../config/config.js"; // your DB connection config

/**
 * Repayment plan seeder
 */
async function seedRepaymentPlans() {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(config.mongoURI);

    const plans = [
      {
        code: "ONE_MONTH",
        label: "1 Month",
        numberOfMonths: 1,
      },
      {
        code: "TWO_MONTHS",
        label: "2 Months",
        numberOfMonths: 2,
      },
      {
        code: "THREE_MONTHS",
        label: "3 Months",
        numberOfMonths: 3,
      },
    ];

    for (const plan of plans) {
      const exists = await RepaymentPlan.findOne({ code: plan.code });

      if (exists) {
        console.log(`✔ RepaymentPlan '${plan.code}' already exists, skipping.`);
      } else {
        await RepaymentPlan.create(plan);
        console.log(`✓ Inserted RepaymentPlan: ${plan.code}`);
      }
    }

    console.log("🎉 Repayment Plans seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding repayment plans:", err);
    process.exit(1);
  }
}

seedRepaymentPlans();
