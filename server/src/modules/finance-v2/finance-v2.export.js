import fs from 'node:fs';

const transactionLabels={receipt:'Tahsilat',expense:'Gider',refund:'İade',transfer_in:'Transfer Girişi',transfer_out:'Transfer Çıkışı',reversal:'Ters Kayıt'};
const directionLabels={in:'Giriş',out:'Çıkış'};
const statusLabels={draft:'Taslak',posted:'İşlendi',reversed:'Ters Kaydedildi',cancelled:'İptal'};

const dateTR=(value)=>value?new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Europe/Istanbul'}).format(new Date(value)):'';
const amountNumber=(value)=>{const n=Number(value||0);return Number.isFinite(n)?n:0;};
const amountTR=(value)=>new Intl.NumberFormat('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2,useGrouping:true}).format(amountNumber(value));

export const ledgerExportRows=(rows=[])=>rows.map(r=>({
  reference:r.reference_no||'',
  date:dateTR(r.transaction_date),
  type:transactionLabels[r.transaction_type]||r.transaction_type||'',
  direction:directionLabels[r.direction]||r.direction||'',
  amount:amountNumber(r.amount),
  currency:r.currency||'',
  accountCode:r.account_code||'',
  accountName:r.account_name||'',
  status:statusLabels[r.status]||r.status||'',
  description:r.description||'',
  externalReference:r.external_reference||'',
}));

export async function ledgerToXlsx(rows=[]){
  const ExcelJS=(await import('exceljs')).default;
  const workbook=new ExcelJS.Workbook();
  workbook.creator='Derkenar'; workbook.created=new Date();
  const sheet=workbook.addWorksheet('Finans Hareketleri',{views:[{state:'frozen',ySplit:1}]});
  sheet.columns=[
    {header:'Referans No',key:'reference',width:22},{header:'Tarih',key:'date',width:19},
    {header:'İşlem Türü',key:'type',width:18},{header:'Yön',key:'direction',width:11},
    {header:'Tutar',key:'amount',width:16,style:{numFmt:'#,##0.00'}},{header:'Para Birimi',key:'currency',width:13},
    {header:'Hesap Kodu',key:'accountCode',width:18},{header:'Hesap Adı',key:'accountName',width:26},
    {header:'Durum',key:'status',width:18},{header:'Açıklama',key:'description',width:42},
    {header:'Harici Referans',key:'externalReference',width:22},
  ];
  sheet.addRows(ledgerExportRows(rows));
  sheet.getRow(1).font={bold:true}; sheet.getRow(1).height=22;
  sheet.autoFilter={from:'A1',to:'K1'};
  sheet.eachRow((row,rowNumber)=>{row.alignment={vertical:'middle',wrapText:rowNumber>1};});
  return workbook.xlsx.writeBuffer();
}

const pdfFont=()=>{
  const candidates=[process.env.FINANCE_PDF_FONT_PATH,'/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf','/usr/share/fonts/opentype/noto/NotoSans-Regular.ttf'].filter(Boolean);
  return candidates.find(p=>fs.existsSync(p))||null;
};

export async function ledgerToPdf(rows=[],filters={}){
  const PDFDocument=(await import('pdfkit')).default;
  const font=pdfFont();
  if(!font){const e=new Error('PDF için Unicode font bulunamadı. Sunucuda FINANCE_PDF_FONT_PATH ile Noto Sans veya DejaVu Sans TTF yolu tanımlayın.');e.statusCode=500;throw e;}
  const doc=new PDFDocument({size:'A4',layout:'landscape',margin:32,bufferPages:true});
  doc.registerFont('DerkenarUnicode',font); doc.font('DerkenarUnicode');
  const chunks=[]; doc.on('data',c=>chunks.push(c));
  const done=new Promise((resolve,reject)=>{doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);});
  doc.fontSize(18).text('DERKENAR — Finans Hareketleri Raporu');
  const period=[filters.from,filters.to].filter(Boolean).join(' – ')||'Tüm dönem';
  doc.moveDown(.3).fontSize(9).text(`Dönem: ${period}   |   Oluşturulma: ${dateTR(new Date())}`);
  doc.moveDown(.8);
  const cols=[
    ['Referans',100],['Tarih',92],['Tür',82],['Yön',48],['Tutar',72],['PB',34],['Hesap',115],['Durum',82],['Açıklama',190],
  ];
  const startX=doc.page.margins.left; let y=doc.y;
  const drawHeader=()=>{let x=startX;doc.fontSize(8);for(const [h,w] of cols){doc.text(h,x,y,{width:w});x+=w;}doc.moveTo(startX,y+13).lineTo(startX+cols.reduce((s,c)=>s+c[1],0),y+13).stroke();y+=18;};
  const ensure=(h=24)=>{if(y+h>doc.page.height-doc.page.margins.bottom){doc.addPage();y=doc.page.margins.top;drawHeader();}};
  drawHeader();
  for(const r of ledgerExportRows(rows)){
    const values=[r.reference,r.date,r.type,r.direction,`${amountTR(r.amount)}`,r.currency,`${r.accountCode} ${r.accountName}`.trim(),r.status,r.description];
    const heights=values.map((v,i)=>doc.heightOfString(String(v||''),{width:cols[i][1]-4})); const h=Math.max(18,...heights)+5; ensure(h);
    let x=startX;doc.fontSize(7.5);values.forEach((v,i)=>{doc.text(String(v||''),x,y,{width:cols[i][1]-4,height:h-2,ellipsis:true});x+=cols[i][1];});
    y+=h;doc.moveTo(startX,y-2).lineTo(startX+cols.reduce((s,c)=>s+c[1],0),y-2).opacity(.12).stroke().opacity(1);
  }
  const range=doc.bufferedPageRange();
  for(let i=0;i<range.count;i++){doc.switchToPage(i);doc.fontSize(7).text(`Sayfa ${i+1} / ${range.count}`,0,doc.page.height-22,{align:'center'});}
  doc.end(); return done;
}
