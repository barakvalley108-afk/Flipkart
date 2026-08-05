"use client";

import { Printer } from "lucide-react";
export function PrintButton() { return <button className="invoice-print" type="button" onClick={() => window.print()}><Printer /> Print invoice</button>; }
