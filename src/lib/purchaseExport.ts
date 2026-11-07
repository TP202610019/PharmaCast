import { predictionService } from "../services/prediction.service";
import { purchasePlanService } from "../services/purchase-plan.service";
import { forecastResultsToProducts } from "./transforms";
export type PurchaseRow = {name:string; quantity:number; priority:string};
const labels:Record<string,string>={critical:"Crítico",high:"Alto",medium:"Medio",low:"Bajo"};
export const priorityRank:Record<string,number>={critical:0,high:1,medium:2,low:3};
export async function exportPurchase(format:"pdf"|"csv", rows:PurchaseRow[], days:number, reference:string) {
 const sorted=[...rows].sort((a,b)=>(priorityRank[a.priority]??4)-(priorityRank[b.priority]??4)||a.name.localeCompare(b.name));
 const body=sorted.map(r=>[r.name,String(Math.ceil(r.quantity)),labels[r.priority]??r.priority]);
 if(format==="csv"){
  const csv="\uFEFF"+[["Medicamento","Cantidad sugerida","Prioridad"],...body].map(row=>row.map(v=>'"'+v.replace(/"/g,'""')+'"').join(';')).join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement('a');a.href=url;a.download=`plan-compras-${reference}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
 }
 const [{jsPDF},{default:autoTable}]=await Promise.all([import('jspdf'),import('jspdf-autotable')]);
 const doc=new jsPDF();
 const ink:[number,number,number]=[29,29,31], blue:[number,number,number]=[0,122,255];
 const stamp=new Date().toLocaleDateString('es-PE');
 const text=(value:string,x:number,y:number,size=10,bold=false,color=ink)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(value,x,y);};
 const logo = await new Promise<string>((resolve,reject)=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=800;canvas.height=160;const context=canvas.getContext('2d')!;context.drawImage(image,0,0);resolve(canvas.toDataURL('image/png'));};image.onerror=reject;image.src='/brand/pharmacast-logo-light.svg';});
 doc.addImage(logo,'PNG',15,15,53,10.6);
 text('Plan de compras',112,21,22,true);text('Propuesta de reposición',112,29,10,false,[110,110,120]);
 const pharmacy=typeof localStorage!=='undefined' ? localStorage.getItem('pharmacast_pharmacy') || 'Mi Farmacia' : 'Mi Farmacia';
 text(pharmacy,15,43,13,true);text(`Referencia: ${reference}`,15,51,9,false,[110,110,120]);text(`Emisión: ${stamp}`,145,51,9,false,[110,110,120]);
 doc.setDrawColor(220,220,228);doc.line(15,58,195,58);
 const critical=sorted.filter(r=>r.priority==='critical').length;
 const metrics=[['HORIZONTE',`${days} días`],['MEDICAMENTOS',String(sorted.length)],['PRIORIDAD CRÍTICA',String(critical)]];
 metrics.forEach(([label,value],i)=>{const x=15+i*62;text(label,x,70,8,false,[110,110,120]);text(value,x,81,18,true);});
 text('Detalle de reposición',15,99,12,true);text('Ordenado de mayor a menor prioridad',15,106,9,false,[110,110,120]);
 autoTable(doc,{startY:114,head:[['MEDICAMENTO','CANTIDAD SUGERIDA','PRIORIDAD']],body,styles:{font:'helvetica',fontSize:10,cellPadding:4.5,textColor:ink,lineColor:[235,235,240],lineWidth:{bottom:0.2}},headStyles:{fillColor:[255,255,255],textColor:ink,fontStyle:'bold',fontSize:8,lineWidth:{bottom:0.5},lineColor:[210,210,220]},alternateRowStyles:{fillColor:[250,250,252]},columnStyles:{0:{cellWidth:93},1:{halign:'right',cellWidth:49},2:{cellWidth:38}},margin:{top:22,bottom:24,left:15,right:15},rowPageBreak:'avoid',didParseCell:data=>{if(data.section==='body'&&data.column.index===2){data.cell.styles.fontStyle='bold';data.cell.styles.textColor=ink;}},didDrawPage:()=>{}});
 const pages=doc.getNumberOfPages();for(let page=1;page<=pages;page++){doc.setPage(page);doc.setDrawColor(226,226,232);doc.line(15,279,195,279);text('PharmaCast · Plan de compras',15,286,8,false,[130,130,140]);text(`${page} / ${pages}`,185,286,8,false,[130,130,140]);}
 doc.save(`plan-compras-${reference}.pdf`);
}
export async function exportSavedPurchase(format:"pdf"|"csv",id:string,days:number){
 const [prediction, plan] = await Promise.all([
  predictionService.getById(id),
  purchasePlanService.getByExecution(id).catch(error => {
   if (error.status === 404) return null;
   throw error;
  }),
 ]);
 const products = forecastResultsToProducts(prediction.forecastResults, plan?.items ?? [], prediction.productMetrics ?? prediction.metrics);
 await exportPurchase(format, products.map(row => ({name:row.name,quantity:row.recommendedQty,priority:row.priority})), prediction.forecastPeriod, id.slice(0,8));
}
