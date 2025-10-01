'use server';

/**
 * @fileOverview Generates a sales report summarizing sales data, identifying top-selling items, and sales trends.
 *
 * - generateSalesReport - A function that handles the sales report generation process.
 * - GenerateSalesReportInput - The input type for the generateSalesReport function.
 * - GenerateSalesReportOutput - The return type for the generateSalesReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSalesReportInputSchema = z.object({
  startDate: z.string().describe('The start date for the sales report period (YYYY-MM-DD).'),
  endDate: z.string().describe('The end date for the sales report period (YYYY-MM-DD).'),
  salesData: z.string().describe('Sales data in JSON format containing items sold, quantities, and total sale amounts.'),
});
export type GenerateSalesReportInput = z.infer<typeof GenerateSalesReportInputSchema>;

const GenerateSalesReportOutputSchema = z.object({
  reportSummary: z.string().describe('A summary of the sales report including total sales, top-selling items, and sales trends.'),
});
export type GenerateSalesReportOutput = z.infer<typeof GenerateSalesReportOutputSchema>;

const shouldFilterByTopSales = ai.defineTool({
  name: 'shouldFilterByTopSales',
  description: 'Determines if the sales data should be filtered to only show top sales.',
  inputSchema: z.object({
    salesData: z.string().describe('Sales data in JSON format.'),
  }),
  outputSchema: z.boolean().describe('True if the data should be filtered by top sales, false otherwise.'),
}, async (input) => {
  // Basic logic to determine if filtering is needed.  Can be expanded.
  try {
    const salesData = JSON.parse(input.salesData);
    if (!Array.isArray(salesData) || salesData.length === 0) {
      return false; // No sales data, so no need to filter.
    }
    return salesData.length > 10; // Filter if there are more than 10 sales records.
  } catch (e) {
    console.error('Error parsing sales data:', e);
    return false; // Default to no filtering in case of an error.
  }
});

export async function generateSalesReport(input: GenerateSalesReportInput): Promise<GenerateSalesReportOutput> {
  return generateSalesReportFlow(input);
}

const generateSalesReportPrompt = ai.definePrompt({
  name: 'generateSalesReportPrompt',
  input: {schema: GenerateSalesReportInputSchema},
  output: {schema: GenerateSalesReportOutputSchema},
  tools: [shouldFilterByTopSales],
  prompt: `You are an AI assistant tasked with generating sales reports.

  The report should cover the period from {{startDate}} to {{endDate}}.

  Here is the sales data in JSON format:
  {{salesData}}

  {% toolResult result=shouldFilterByTopSales.result %}
  {% if shouldFilterByTopSales.result %}
  The sales data should be filtered to only show top sales.
  {% else %}
  The sales data should not be filtered.
  {% endif %}

  Generate a concise summary of the sales report, highlighting:
  - Total sales
  - Top-selling items
  - Sales trends over the specified period
  `,
});

const generateSalesReportFlow = ai.defineFlow(
  {
    name: 'generateSalesReportFlow',
    inputSchema: GenerateSalesReportInputSchema,
    outputSchema: GenerateSalesReportOutputSchema,
  },
  async input => {
    const {output} = await generateSalesReportPrompt(input);
    return output!;
  }
);
