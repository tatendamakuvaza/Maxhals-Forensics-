import { NextRequest, NextResponse } from "next/server";
import { runFraudDetection, modelReport } from "@/lib/ml/fraud";
import { buildSeedData } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const data = body?.data ?? buildSeedData();
  const flags = runFraudDetection(data);
  return NextResponse.json({ flags, report: modelReport(flags, data.income.length + data.expenses.length + data.bankTxns.length) });
}

export async function GET() {
  const data = buildSeedData();
  const flags = runFraudDetection(data);
  return NextResponse.json({ flags, report: modelReport(flags, data.income.length + data.expenses.length + data.bankTxns.length) });
}
