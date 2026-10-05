'use client';

import { useEffect, useState, use } from 'react';
import { apiGet } from '@/lib/api-client';
import { useSearchParams } from 'next/navigation';

export default function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const searchParams = useSearchParams();
  const type = searchParams.get('type') || 'invoice';

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invRes, cliRes, projRes] = await Promise.all([
          apiGet<{ invoices?: any[] }>('/api/invoices'),
          apiGet<{ clients?: any[] }>('/api/clients'),
          apiGet<{ projects?: any[] }>('/api/projects')
        ]);
        
        const invoice = invRes.invoices?.find(i => i.id === id);
        if (!invoice) throw new Error('Invoice not found');
        
        const client = cliRes.clients?.find(c => c.id === invoice.clientId);
        const project = projRes.projects?.find(p => p.id === invoice.projectId);

        setData({ invoice, client, project });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  useEffect(() => {
    if (!loading && data) {
      const isReceipt = type === 'receipt';
      const docId = isReceipt ? data.invoice.id.replace('INV', 'REC') : data.invoice.id;
      const projName = data.project?.title || data.project?.name || 'Project';
      const typeLabel = isReceipt ? 'Receipt' : 'Invoice';
      document.title = `${typeLabel} ${docId} - ${projName}`;
      
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [loading, data, type]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', background: '#fff', color: '#000' }}>Loading document...</div>;
  if (!data) return <div style={{ padding: 40, textAlign: 'center', background: '#fff', color: '#000' }}>Document not found.</div>;

  const { invoice, client, project } = data;
  const isReceipt = type === 'receipt';
  
  const dateObj = new Date(invoice.createdAt);
  const dateString = isNaN(dateObj.getTime()) ? invoice.createdAt : dateObj.toLocaleDateString('en-GB').replace(/\//g, '-');
  const dateStrVerbose = isNaN(dateObj.getTime()) ? invoice.createdAt : dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  
  const clientName = client?.companyName || client?.name || 'Unknown Client';
  const projectName = project?.title || project?.name || 'Unknown Project';
  const amountStr = `₹ ${Number(invoice.amount).toLocaleString('en-IN')}`;
  
  const redColor = '#E32626';
  const statusStr = String(invoice.status).toUpperCase();

  const flexRow = { display: 'flex', marginBottom: '8px' };
  const labelCol = { width: '130px', fontWeight: 'bold' as const };
  const valCol = { flex: 1 };

  return (
    <div style={{ background: '#fff', color: '#000', minHeight: '100vh', padding: '0', fontFamily: 'Arial, sans-serif' }} className="print-wrapper">
      <div style={{ maxWidth: '750px', margin: '0 auto', fontSize: '10px', lineHeight: '1.4' }}>
        
        {/* LOGO */}
        <div style={{ marginBottom: '15px' }}>
          <img src="/print-logo.png" alt="makewithus logo" style={{ height: '60px', objectFit: 'contain', filter: 'invert(1)' }} />
        </div>

        {/* Top Details */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ width: '300px' }}>
            <div style={flexRow}><div style={labelCol}>{isReceipt ? 'RECEIPT NO.' : 'INVOICE NO.'}</div><div style={valCol}>{isReceipt ? invoice.id.replace('INV', 'REC') : invoice.id}</div></div>
            <div style={flexRow}><div style={labelCol}>DATE</div><div style={valCol}>{dateString}</div></div>
            <div style={flexRow}><div style={labelCol}>{isReceipt ? 'FOR SERVICE' : 'PROJECT'}</div><div style={valCol}>{isReceipt ? '—' : '—'}</div></div>
            <div style={flexRow}><div style={labelCol}>{isReceipt ? 'PAYMENT MODE' : 'INTENDED'}</div><div style={valCol}>—</div></div>
          </div>
          <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
            <div>TRIVANDRUM</div>
            <div>KERALA</div>
            <div>INDIA</div>
            <div style={{ marginTop: '10px' }}>GSTIN: 32AAVCM0878J1ZX</div>
          </div>
        </div>

        {/* Receipt Specific block */}
        {isReceipt && (
          <div style={{ marginBottom: '20px' }}>
            <div style={flexRow}><div style={{...labelCol, color: redColor}}>RECEIVED FROM:</div><div style={valCol}>{clientName}</div></div>
            <div style={flexRow}><div style={{...labelCol, color: redColor}}>AMOUNT RECEIVED:</div><div style={valCol}>{amountStr}</div></div>
            <div style={flexRow}><div style={{...labelCol, color: redColor}}>PAYMENT MODE:</div><div style={valCol}>—</div></div>
            <div style={flexRow}><div style={{...labelCol, color: redColor}}>FOR SERVICE:</div><div style={valCol}>—</div></div>
            <div style={flexRow}><div style={{...labelCol, color: redColor}}>BALANCE:</div><div style={valCol}>₹ 0</div></div>
          </div>
        )}

        {/* Table (Built with Divs) */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', borderTop: '1px solid #000', borderBottom: '1px solid #000', padding: '6px 0', fontWeight: 'bold' }}>
            <div style={{ flex: 2 }}>DESCRIPTION</div>
            <div style={{ flex: 1, textAlign: 'center' }}>HOURS</div>
            <div style={{ flex: 1, textAlign: 'right' }}>UNIT PRICE</div>
            <div style={{ flex: 1, textAlign: 'right' }}>AMOUNT</div>
          </div>
          <div style={{ display: 'flex', padding: '15px 0' }}>
            <div style={{ flex: 2 }}>{projectName}</div>
            <div style={{ flex: 1, textAlign: 'center' }}>-</div>
            <div style={{ flex: 1, textAlign: 'right' }}>{amountStr}</div>
            <div style={{ flex: 1, textAlign: 'right' }}>{amountStr}</div>
          </div>
        </div>

        {/* Subtotal & Total */}
        <div style={{ borderTop: '1px solid #ccc', borderBottom: '1px solid #ccc', paddingTop: '8px', paddingBottom: '8px', marginBottom: '15px' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
            <div style={{ width: '300px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>SUBTOTAL</span>
              <span>{amountStr.replace('₹ ', '')}</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ width: '300px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>TOTAL</span>
              <span>{amountStr}</span>
            </div>
          </div>
        </div>

        {/* Below Total Layout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <div style={{ width: '350px' }}>
            {isReceipt ? (
              <>
                <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>PROJECT</div><div style={valCol}>—</div></div>
                <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>TAX/GST</div><div style={valCol}>0%</div></div>
                <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>BALANCE AFTER PAYMENT</div><div style={valCol}>₹ 0</div></div>
              </>
            ) : (
              <>
                <div style={flexRow}><div style={{width: '100px', fontWeight: 'bold'}}>Project Name</div><div style={valCol}>{projectName}</div></div>
                <div style={flexRow}><div style={{width: '100px', fontWeight: 'bold'}}>Total</div><div style={valCol}>{Number(invoice.amount).toLocaleString('en-IN')}/-</div></div>
              </>
            )}
          </div>

          <div style={{ textAlign: 'right' }}>
            {isReceipt ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <div style={{ marginRight: '15px' }}>PAYMENT STATUS</div>
                  <div style={{ fontWeight: 'bold', width: '80px', textAlign: 'right' }}>{statusStr}</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                  <div style={{ marginRight: '15px' }}>PAID ON</div>
                  <div style={{ fontWeight: 'bold', width: '80px', textAlign: 'right' }}>{statusStr === 'PAID' ? dateStrVerbose : ''}</div>
                </div>
              </>
            ) : (
              <div>
                <div style={{ fontWeight: 'bold', color: redColor }}>{statusStr} WITH DATE</div>
                <div style={{ color: redColor, marginTop: '4px', fontWeight: 'bold' }}>[{dateString}]</div>
              </div>
            )}
          </div>
        </div>
        
        <div style={{ borderBottom: '1px solid #ccc', margin: '15px 0' }}></div>

        {/* Paid/Unpaid (Receipt) */}
        {isReceipt && (
          <div style={{ textAlign: 'right', marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', color: redColor }}>PAID/UNPAID WITH DATE</div>
            <div style={{ color: redColor, marginTop: '2px', fontWeight: 'bold' }}>[{dateString}]</div>
          </div>
        )}

        {/* Note */}
        {isReceipt && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontWeight: 'bold', color: redColor, marginBottom: '4px' }}>NOTE:</div>
            <div>This receipt acknowledges the payment received against the above-mentioned service.</div>
            <div>The remaining balance, if any, shall be payable as per the agreed project schedule.</div>
            <div>This receipt serves as an official confirmation of payment received by <strong>makewithus®</strong>.</div>
          </div>
        )}

        {/* Bank Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div style={{ width: '50%' }}>
            All the information about the mode of payment, will be<br />
            given to you the respective people accordingly to the<br />
            client from <strong>makewithus®</strong>.
          </div>
          <div style={{ width: '40%' }}>
            <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>BANK:</div><div style={{fontWeight: 'bold'}}>SBI / UPI</div></div>
            <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>NAME OF THE COMPANY/PERSON</div><div style={{fontWeight: 'bold'}}></div></div>
            <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>PERSON PHONE NO.</div><div style={{fontWeight: 'bold'}}></div></div>
            <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>UPI PHONE NO.</div><div style={{fontWeight: 'bold'}}></div></div>
            <div style={flexRow}><div style={{width: '180px', fontWeight: 'bold'}}>UPI ID</div><div style={{fontWeight: 'bold'}}></div></div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold' }}>
          <div>©MAKEWITHUS 2026</div>
          <div>MAKEWITHUS.IN</div>
          <div>TRIVANDRUM, KERALA, TRIVANDRUM</div>
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .print-wrapper * {
           background-color: transparent !important;
           color: #000 !important;
           border-color: #000 !important;
        }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: #fff !important; margin: 0; padding: 0; }
          .print-wrapper { padding: 1cm 1cm !important; }
          @page { size: A4; margin: 0; }
        }
      `}} />
    </div>
  );
}
