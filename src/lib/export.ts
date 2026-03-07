import Papa from "papaparse";

/**
 * Export data as a CSV file download.
 */
export function exportToCSV(
    data: Record<string, unknown>[],
    filename: string = "export"
) {
    if (data.length === 0) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export current page as PDF using browser print dialog.
 */
export function exportToPDF(title: string = "Export") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const content = document.querySelector("main")?.innerHTML || document.body.innerHTML;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #1a1a1a; }
                table { border-collapse: collapse; width: 100%; }
                th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; font-size: 13px; }
                th { background: #f9fafb; font-weight: 600; }
                h1, h2, h3 { margin: 0 0 12px; }
                @media print {
                    body { padding: 0; }
                    button, .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <h2>${title}</h2>
            <p style="color: #6b7280; font-size: 12px; margin-bottom: 16px;">Exported on ${new Date().toLocaleDateString()}</p>
            ${content}
        </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}
