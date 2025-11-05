import * as XLSX from 'xlsx';
import { ColumnConfiguration } from '../services/columnConfigService';

export interface ExcelRow {
  [key: string]: any;
}

export const excelUtils = {
  generateTemplate(columns: ColumnConfiguration[]): void {
    const headers = ['EMPID', ...columns.map(col => col.display_name)];

    const sampleData = [
      [
        'EMP001',
        ...columns.map(col => {
          switch (col.column_name) {
            case 'customerName': return 'Rajesh Kumar';
            case 'loanId': return 'LN001234567';
            case 'loanAmount': return '500000';
            case 'mobileNo': return '9876543210';
            case 'dpd': return '45';
            case 'outstandingAmount': return '450000';
            case 'posAmount': return '50000';
            case 'emiAmount': return '15000';
            case 'pendingDues': return '75000';
            case 'address': return '123 MG Road, Sector 15, Gurgaon';
            case 'sanctionDate': return '2023-01-15';
            case 'lastPaidAmount': return '15000';
            case 'lastPaidDate': return '2024-11-15';
            case 'paymentLink': return 'https://pay.company.com/LN001234567';
            case 'branchName': return 'Gurgaon Branch';
            case 'loanType': return 'Personal Loan';
            case 'remarks': return 'Cooperative customer';
            default: return '';
          }
        })
      ],
      [
        'EMP002',
        ...columns.map(col => {
          switch (col.column_name) {
            case 'customerName': return 'Sunita Sharma';
            case 'loanId': return 'LN002345678';
            case 'loanAmount': return '350000';
            case 'mobileNo': return '9876543220';
            case 'dpd': return '30';
            case 'outstandingAmount': return '195000';
            case 'posAmount': return '155000';
            case 'emiAmount': return '12000';
            case 'pendingDues': return '36000';
            case 'address': return '456 Park Street, Mumbai';
            case 'sanctionDate': return '2023-09-20';
            case 'lastPaidAmount': return '12000';
            case 'lastPaidDate': return '2024-02-10';
            case 'paymentLink': return 'https://pay.company.com/LN002345678';
            case 'branchName': return 'Mumbai Branch';
            case 'loanType': return 'Home Loan';
            case 'remarks': return 'Needs follow-up';
            default: return '';
          }
        })
      ]
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    const colWidths = headers.map(header => ({
      wch: Math.max(header.length + 2, 15)
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases Template');

    XLSX.writeFile(wb, 'case_upload_template.xlsx');
  },

  async parseExcelFile(file: File, columns: ColumnConfiguration[]): Promise<ExcelRow[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });

          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];

          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

          if (jsonData.length < 2) {
            reject(new Error('Excel file is empty or has no data rows'));
            return;
          }

          const headers = jsonData[0];
          const rows = jsonData.slice(1);

          const empIdIndex = headers.findIndex((h: string) =>
            h?.toString().toLowerCase().trim() === 'empid'
          );

          if (empIdIndex === -1) {
            reject(new Error('EMPID column not found in Excel file'));
            return;
          }

          const parsedRows: ExcelRow[] = rows
            .filter(row => row && row.length > 0 && row[empIdIndex])
            .map(row => {
              const rowData: ExcelRow = {
                EMPID: row[empIdIndex]?.toString().trim()
              };

              headers.forEach((header: string, index: number) => {
                if (index !== empIdIndex && header) {
                  const columnConfig = columns.find(col =>
                    col.display_name.toLowerCase().trim() === header.toString().toLowerCase().trim()
                  );

                  if (columnConfig) {
                    const value = row[index];
                    rowData[columnConfig.column_name] = value !== undefined && value !== null ? value.toString().trim() : '';
                  }
                }
              });

              return rowData;
            });

          resolve(parsedRows);
        } catch (error) {
          reject(new Error('Failed to parse Excel file: ' + (error as Error).message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read Excel file'));
      };

      reader.readAsArrayBuffer(file);
    });
  },

  validateCaseData(row: ExcelRow, columns: ColumnConfiguration[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!row.EMPID || row.EMPID.trim() === '') {
      errors.push('EMPID is required');
    }

    const requiredColumns = ['customerName', 'loanId'];
    requiredColumns.forEach(colName => {
      if (!row[colName] || row[colName].trim() === '') {
        const displayName = columns.find(c => c.column_name === colName)?.display_name || colName;
        errors.push(`${displayName} is required`);
      }
    });

    if (row.mobileNo && !/^\d{10}$/.test(row.mobileNo.replace(/\D/g, ''))) {
      errors.push('Invalid mobile number format');
    }

    if (row.dpd && isNaN(parseInt(row.dpd))) {
      errors.push('DPD must be a number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  },

  exportCasesToExcel(cases: any[], columns: ColumnConfiguration[]): void {
    const headers = columns.map(col => col.display_name);

    const rows = cases.map(case_ =>
      columns.map(col => {
        const value = case_[col.column_name];
        return value !== undefined && value !== null ? value : '';
      })
    );

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    const colWidths = headers.map(header => ({
      wch: Math.max(header.length + 2, 15)
    }));
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customer Cases');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `customer_cases_${timestamp}.xlsx`);
  }
};
